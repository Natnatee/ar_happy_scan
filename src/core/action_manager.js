import * as THREE from 'three';

export class ActionManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.handleClick = this.handleClick.bind(this);
        this.init();
    }

    init() {
        document.addEventListener('click', this.handleClick);
    }

    destroy() {
        document.removeEventListener('click', this.handleClick);
    }

    handleClick(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get intersections
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Iterate through hits to support click-through (clicking objects behind transparent ones)
            for (let i = 0; i < intersects.length; i++) {
                let hitObj = intersects[i].object;
                let object = hitObj;
                let foundInteraction = false;
                
                // Traverse up to find the root object with interaction data
                while (object) {
                    if (object.userData.interaction && object.userData.interaction.click) {
                        this.executeAction(object, object.userData.interaction.click);
                        foundInteraction = true;
                        break; 
                    }
                    object = object.parent;
                }
                
                if (foundInteraction) return; // Stop if we found and executed an interaction
            }
        }
    }

    executeAction(object, actionConfig) {
        console.log(`Action triggered on: ${object.name}`, actionConfig);

        // Handle Animation Toggle
        if (actionConfig.asset_animation === true && object.userData.action) {
            const action = object.userData.action;
            const mixer = object.userData.mixer;
            
            // ถ้ากำลังเล่นอยู่ -> หยุด
            if (action.isRunning()) {
                console.log("ActionManager: Stopping animation");
                action.stop();
                return;
            }

            // ดึงค่า config (default: เล่นทั้งคลิป, loop ตลอด)
            const startTime = actionConfig.start_time ?? 0;
            const endTime = actionConfig.end_time ?? action.getClip().duration;
            const shouldLoop = actionConfig.loop !== false; // default true

            // ตั้งค่า loop
            action.setLoop(shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce);
            action.clampWhenFinished = !shouldLoop; // ค้างเฟรมสุดท้ายถ้าไม่ loop

            // รีเซ็ตและกำหนดจุดเริ่มต้น
            action.reset();
            action.time = startTime;
            action.play();
            
            console.log(`ActionManager: Playing animation from ${startTime}s to ${endTime}s (loop: ${shouldLoop})`);

            // ถ้ามี endTime กำหนด ให้หยุดเมื่อถึงเวลา
            if (endTime < action.getClip().duration || !shouldLoop) {
                const duration = endTime - startTime;
                
                // ใช้ mixer event listener เพื่อหยุดที่ endTime
                const onLoop = (e) => {
                    if (e.action === action) {
                        if (action.time >= endTime) {
                            if (!shouldLoop) {
                                action.paused = true;
                                action.time = endTime;
                            } else {
                                action.time = startTime; // กลับไปเริ่มใหม่
                            }
                        }
                    }
                };

                // ลบ listener เก่าถ้ามี
                if (object.userData._animListener) {
                    mixer.removeEventListener('loop', object.userData._animListener);
                }
                object.userData._animListener = onLoop;
                mixer.addEventListener('loop', onLoop);

                // สำหรับ LoopOnce ใช้ setTimeout เป็น backup
                if (!shouldLoop) {
                    setTimeout(() => {
                        if (action.isRunning() && action.time >= endTime - 0.1) {
                            action.paused = true;
                        }
                    }, duration * 1000);
                }
            }
        }
    }
}

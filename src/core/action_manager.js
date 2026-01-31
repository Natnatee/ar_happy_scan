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
            
            if (action.isRunning()) {
                console.log("ActionManager: Stopping animation");
                action.stop();
            } else {
                console.log("ActionManager: Playing animation");
                action.reset().play();
            }
        }
    }
}

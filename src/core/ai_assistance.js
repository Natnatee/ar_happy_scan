import * as THREE from 'three';

export class AiAssistance {
    constructor(renderer, assetManager) {
        this.renderer = renderer;
        this.assetManager = assetManager;
        
        this.overlayScene = new THREE.Scene();
        
        // ใช้ OrthographicCamera เพื่อให้วางตำแหน่งได้เหมือน UI (ใช้พิกัด -1 ถึง 1)
        const aspect = window.innerWidth / window.innerHeight;
        this.overlayCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);
        this.overlayCamera.position.z = 10;

        this.model = null;
        this.bubbleElement = null;

        //เพิ่มแสงใน Overlay Scene
        const ambient = new THREE.AmbientLight(0xffffff, 2.5);
        this.overlayScene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(1, 1, 5);
        this.overlayScene.add(sun);
    }

    async init(config) {
        if (!config || !config.asset_model) return;

        //โหลดโมเดล
        this.model = await this.assetManager.createAsset(config.asset_model);
        if (this.model) {
            this.overlayScene.add(this.model);
            
            // หมุนน้องนิดนึง
            this.model.rotation.y = -Math.PI / 6;
            
            this.updatePosition();
        }

        this.createBubble(config.asset_model.action?.start?.text || "");

        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            this.overlayCamera.left = -aspect;
            this.overlayCamera.right = aspect;
            this.overlayCamera.top = 1;
            this.overlayCamera.bottom = -1;
            this.overlayCamera.updateProjectionMatrix();
            this.updatePosition();
        });
    }

    /**
     * วางตำแหน่งมุมขวาล่างแบบ Ratio (สัดส่วน)
     */
    updatePosition() {
        if (!this.model) return;

        const aspect = window.innerWidth / window.innerHeight;
        
        // --- คำนวณตาม Ratio ---
        // ในระบบ Ortho: กลางจอคือ 0, ขอบขวาคือ aspect, ขอบล่างคือ -1
        const xPos = aspect * 0.65; 
        const yPos = -0.85; // ขยับลงมาให้ต่ำลง (เดิม -0.75)

        this.model.position.set(xPos, yPos, 0); 

        // ปรับสเกลให้เล็กลงหน่อยบนมือถือแนวตั้ง
        const scaleBase = aspect < 1 ? 0.35 : 0.45;
        this.model.scale.set(scaleBase, scaleBase, scaleBase);
    }

    /**
     * เรนเดอร์ Overlay ทับบน Scene หลัก
     */
    render() {
        this.renderer.clearDepth();
        this.renderer.render(this.overlayScene, this.overlayCamera);
    }

    createBubble(text) {
        if (!text || this.bubbleElement) return;

        const bubble = document.createElement('div');
        bubble.className = 'ai-speech-bubble';
        bubble.innerHTML = `
            <div class="bubble-content">${text}</div>
            <div class="bubble-tail"></div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .ai-speech-bubble {
                position: fixed;
                /* ปรับตำแหน่งให้ต่ำลงเพื่อลด gap (เดิม 35vh) */
                bottom: 22vh; 
                right: 8vw;
                background: white;
                padding: 12px 18px;
                border-radius: 18px 18px 2px 18px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.12);
                border: 2px solid #f8f8f8;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 800;
                color: #222;
                z-index: 500; /* ให้อยู่หลัง popup (9999) แต่อยู่บน AR (canvas) */
                opacity: 0;
                transform: scale(0.5) translateY(20px);
                transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                pointer-events: none;
                max-width: 150px;
                text-align: center;
            }
            .ai-speech-bubble.visible { 
                opacity: 1; 
                transform: scale(1) translateY(0);
            }
            .bubble-tail {
                position: absolute;
                bottom: -12px;
                right: 15px;
                width: 0; height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 12px solid white;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(bubble);
        this.bubbleElement = bubble;
        setTimeout(() => bubble.classList.add('visible'), 1500);
    }
}

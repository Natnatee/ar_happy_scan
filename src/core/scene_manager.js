export class SceneManager {
    constructor(anchorGroup, assetManager) {
        this.anchorGroup = anchorGroup; // THREE.Group ที่ได้จาก anchor.group
        this.assetManager = assetManager;
        this.currentSceneId = null;
        this.scenesData = []; // ข้อมูล scenes จาก tracks ใน JSON
    }

    /**
     * ตั้งค่าข้อมูล Scene ทั้งหมดของ Track นี้
     */
    setScenes(scenesData) {
        this.scenesData = scenesData;
    }

    /**
     * สลับไปยัง Scene ที่ต้องการ (เช่น "S1", "S2")
     */
    async switchScene(sceneId) {
        if (this.currentSceneId === sceneId) return;

        console.log(`Switching to Scene: ${sceneId}`);
        
        // 1. เคลียร์ Assets เดิมใน Anchor ออกก่อน
        this.clearCurrentScene();

        // 2. หาข้อมูลของ Scene ใหม่
        const sceneData = this.scenesData.find(s => s.scene_id === sceneId);
        if (!sceneData) {
            console.error(`Scene ${sceneId} not found!`);
            return;
        }

        // 3. สร้างและเพิ่ม Assets ใหม่เข้าใน Anchor
        const loadPromises = sceneData.assets.map(async (assetDef) => {
            const object = await this.assetManager.createAsset(assetDef);
            if (object) {
                this.anchorGroup.add(object);
                
                // ถ้าเป็นวิดีโอ ให้เริ่มเล่น (หรือจัดการตามความเหมาะสม)
                if (object.userData.video) {
                    object.userData.video.play();
                }
                // ถ้าเป็นเสียง
                if (object.userData.audio) {
                    object.userData.audio.play();
                }
            }
        });

        await Promise.all(loadPromises);
        this.currentSceneId = sceneId;
    }

    clearCurrentScene() {
        // วนลูปเอาลูกๆ ใน Group ออกให้หมด (และจัดการ Memory)
        while(this.anchorGroup.children.length > 0) {
            const child = this.anchorGroup.children[0];
            
            // ปิดวิดีโอ/เสียงที่กำลังเล่น
            if (child.userData.video) child.userData.video.pause();
            if (child.userData.audio) child.userData.audio.pause();
            
            // ลบพวก Mixer ออกจากระบบ
            this.assetManager.removeAsset(child);
            
            this.anchorGroup.remove(child);
        }
    }
}


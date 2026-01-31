import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { getConfig } from '../core/config';
import { use_index_db } from '../core/index_db';
import { AssetManager } from '../core/asset_manager';
import { SceneManager } from '../core/scene_manager';
import { UIManager } from '../core/ui_manager';
import '../styles/main.css';

const start = async () => {
    // 1. Load Configuration
    const config = getConfig();
    if (!config) {
        window.location.href = '/';
        return;
    }

    const imageConfig = config.info.tracking_modes.image;
    if (!imageConfig) return;

    // 2. Initialize Core Managers
    const assetManager = new AssetManager();
    const uiManager = new UIManager();
    const sceneManagers = [];
    const currentSceneIndices = [];

    // 3. Prepare MindAR
    const mindFileBlob = await use_index_db(imageConfig.mindFile.mind_src);
    const mindFileUrl = URL.createObjectURL(mindFileBlob);

    const mindarThree = new MindARThree({
        container: document.querySelector("#container"),
        imageTargetSrc: mindFileUrl,
        filterMinCF: 0.001,
        filterBeta: 0,
        warmupTolerance: 15,
        missTolerance: 15,
    });

    const { renderer, scene, camera } = mindarThree;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directLight = new THREE.DirectionalLight(0xffffff, 1);
    directLight.position.set(0, 0, 1);
    scene.add(directLight);

    // 4. Initialize UI Manager
    let activeAnchorIndex = -1;

    const onNavigate = async (direction) => {
        if (activeAnchorIndex === -1) return;
        
        const track = imageConfig.tracks[activeAnchorIndex];
        let nextIndex = currentSceneIndices[activeAnchorIndex] + direction;

        if (nextIndex < 0) nextIndex = track.scenes.length - 1;
        if (nextIndex >= track.scenes.length) nextIndex = 0;

        currentSceneIndices[activeAnchorIndex] = nextIndex;
        await sceneManagers[activeAnchorIndex].switchScene(track.scenes[nextIndex].scene_id);
    };

    await uiManager.init(imageConfig.setting, onNavigate);

    // 5. Setup Anchors
    for (let i = 0; i < imageConfig.tracks.length; i++) {
        const track = imageConfig.tracks[i];
        const anchor = mindarThree.addAnchor(i);
        const sceneMgr = new SceneManager(anchor.group, assetManager);
        
        sceneMgr.setScenes(track.scenes);
        currentSceneIndices[i] = 0;
        await sceneMgr.switchScene(track.scenes[0].scene_id);

        anchor.onTargetFound = () => {
            activeAnchorIndex = i;
            // โชว์ปุ่มถ้า Track นี้มีมากกว่า 1 Scene
            uiManager.showNavigation(track.scenes.length > 1);
            
            anchor.group.children.forEach(obj => {
                if (obj.userData.video) obj.userData.video.play();
                if (obj.userData.audio) obj.userData.audio.play();
            });
        };

        anchor.onTargetLost = () => {
            if (activeAnchorIndex === i) {
                activeAnchorIndex = -1;
                uiManager.showNavigation(false);
            }
            anchor.group.children.forEach(obj => {
                if (obj.userData.video) obj.userData.video.pause();
                if (obj.userData.audio) obj.userData.audio.pause();
            });
        };

        sceneManagers.push(sceneMgr);
    }

    // 6. Start Engine
    try {
        await mindarThree.start();
        
        const clock = new THREE.Clock(); // สำหรับคำนวณเวลาแอนิเมชั่น

        renderer.setAnimationLoop(() => {
            const deltaTime = clock.getDelta();
            assetManager.update(deltaTime); // อัปเดตแอนิเมชั่นทั้งหมด
            renderer.render(scene, camera);
        });
    } catch (error) {
        console.error("AR Start Failure:", error);
    }

};

start();

import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { getConfig } from '../core/config';
import { use_index_db } from '../core/index_db';
import { AssetManager } from '../core/asset_manager';
import { SceneManager } from '../core/scene_manager';

const start = async () => {
    // 1. Load Configuration
    const config = getConfig();
    if (!config) {
        console.error("No config found, redirecting to home...");
        window.location.href = '/';
        return;
    }

    const imageConfig = config.info.tracking_modes.image;
    if (!imageConfig) {
        console.error("No image tracking configuration!");
        return;
    }

    // 2. Initialize Core Managers
    const assetManager = new AssetManager();
    const sceneManagers = []; // เก็บ SceneManager แยกตาม Anchor

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

    // Default Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directLight = new THREE.DirectionalLight(0xffffff, 1);
    directLight.position.set(0, 0, 1);
    scene.add(directLight);

    // 4. Setup Anchors and Scenes
    for (let i = 0; i < imageConfig.tracks.length; i++) {
        const track = imageConfig.tracks[i];
        const anchor = mindarThree.addAnchor(i);

        // สร้าง SceneManager คุม Anchor นี้
        const sceneMgr = new SceneManager(anchor.group, assetManager);
        sceneMgr.setScenes(track.scenes);
        
        // โหลด Scene แรก (S1) ทันที
        await sceneMgr.switchScene("S1");

        anchor.onTargetFound = () => {
            console.log(`Target ${track.track_id} Found`);
            // เมื่อเจอภาพ ให้เริ่มเล่นวิดีโอ/เสียงใน Scene ปัจจุบัน
            anchor.group.children.forEach(obj => {
                if (obj.userData.video) obj.userData.video.play();
                if (obj.userData.audio) obj.userData.audio.play();
            });
        };

        anchor.onTargetLost = () => {
            console.log(`Target ${track.track_id} Lost`);
            // เมื่อภาพหาย ให้หยุดวิดีโอ/เสียงเพื่อประหยัดทรัพยากร
            anchor.group.children.forEach(obj => {
                if (obj.userData.video) obj.userData.video.pause();
                if (obj.userData.audio) obj.userData.audio.pause();
            });
        };

        sceneManagers.push(sceneMgr);
    }

    // 5. Start Engine
    try {
        await mindarThree.start();
        console.log("AR System Ready (Modular)");

        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
        });
    } catch (error) {
        console.error("AR Start Failure:", error);
    }
};

start();

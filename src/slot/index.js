/**
 * Slot Page Entry Point
 * คล้ายกับ image/index.js แต่ใช้ SlotGame แทน ActionManager
 */

import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { getConfig } from '../core/config';
import { use_index_db } from '../core/index_db';
import { AssetManager } from '../core/asset_manager';
import { SceneManager } from '../core/scene_manager';
import { SlotGame } from './slot_game';
import { AiAssistance } from '../core/ai_assistance';
import '../styles/main.css';

const start = async () => {
    // 1. Load Configuration
    const config = getConfig();
    if (!config) {
        window.location.href = '/';
        return;
    }

    const slotConfig = config.info.tracking_modes.slot;
    if (!slotConfig) return;

    // Check Play Limit REMOVED - User wants to enter anyway
    // if (!canPlay()) {
    //     console.log('Play limit reached, showing popup instead of AR');
    //     showNoPlayPopup();
    //     return;
    // }

    // 2. Initialize Core Managers
    const assetManager = new AssetManager();
    const sceneManagers = [];
    const currentSceneIndices = [];

    // 3. Initialize Slot Game (ไม่ต้องรอ - ให้กล้องขึ้นก่อน)
    const slotGame = new SlotGame();
    // เรียก init แบบ async (ไม่ await) เพื่อให้กล้องขึ้นก่อน
    slotGame.init();


    // 4. Prepare MindAR
    const mindFileBlob = await use_index_db(slotConfig.mindFile.mind_src);
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
    renderer.autoClear = false; // สำคัญมาก: เพื่อให้เรนเดอร์ทับกันได้

    // AI Assistance Initialization
    // ใช้ renderer แทน เพื่อแยก Scene ออกมาเป็น Overlay
    const aiAssistance = new AiAssistance(renderer, assetManager);
    const aiConfig = slotConfig.setting?.ai_assistance;
    if (aiConfig) {
        await aiAssistance.init(aiConfig);
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directLight = new THREE.DirectionalLight(0xffffff, 1);
    directLight.position.set(0, 0, 1);
    scene.add(directLight);

    // 5. Setup Anchors
    for (let i = 0; i < slotConfig.tracks.length; i++) {
        const track = slotConfig.tracks[i];
        const anchor = mindarThree.addAnchor(i);
        const sceneMgr = new SceneManager(anchor.group, assetManager);
        
        sceneMgr.setScenes(track.scenes);
        currentSceneIndices[i] = 0;
        await sceneMgr.switchScene(track.scenes[0].scene_id);

        anchor.onTargetFound = () => {
            anchor.group.children.forEach(obj => {
                if (obj.userData.video) obj.userData.video.play();
                if (obj.userData.audio) obj.userData.audio.play();
            });
        };

        anchor.onTargetLost = () => {
            anchor.group.children.forEach(obj => {
                if (obj.userData.video) obj.userData.video.pause();
                if (obj.userData.audio) obj.userData.audio.pause();
            });
        };

        sceneManagers.push(sceneMgr);
    }

    // 6. Click Handler for Slot Game
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event) => {
        // Prevent interaction if any popup is open or video is playing
        if (document.querySelector('.slot-overlay') || 
            document.querySelector('.no-play-overlay') || 
            document.querySelector('.video-container')) {
            return;
        }

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {
                let object = intersects[i].object;
                
                // --- ตรวจสอบว่าวัตถุและบรรพบุรุษ (Anchor) ต้องมองเห็นเท่านั้น ---
                let isActuallyVisible = true;
                let tempObj = object;
                while (tempObj) {
                    if (!tempObj.visible) {
                        isActuallyVisible = false;
                        break;
                    }
                    tempObj = tempObj.parent;
                }
                if (!isActuallyVisible) continue;
                // -------------------------------------------------------

                // Traverse up to find root with interaction
                while (object) {
                    const action = object.userData.interaction?.click;
                    
                    if (action?.type === 'slot_game') {
                        slotGame.handleSlotClick(object, action);
                        return;
                    }
                    object = object.parent;
                }
            }
        }
    };

    document.addEventListener('click', handleClick);

    // 7. Start Engine
    try {
        await mindarThree.start();
        
        const clock = new THREE.Clock();

        renderer.setAnimationLoop(() => {
            const deltaTime = clock.getDelta();
            assetManager.update(deltaTime);
            
            // 1. วาดฉาก AR ปกติ
            renderer.render(scene, camera);
            
            // 2. วาดฉาก AI ทับลงไป (Overlay)
            if (aiAssistance) {
                aiAssistance.render();
            }
        });
    } catch (error) {
        console.error("AR Start Failure:", error);
    }
};

start();

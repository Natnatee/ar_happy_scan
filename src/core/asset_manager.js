import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { use_index_db } from './index_db';

export class AssetManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
        this.mixers = new Set(); // เก็บเครื่องเล่นแอนิเมชั่นของรุ่นต่างๆ
    }

    /**
     * อัปเดตแอนิเมชั่นในทุกเฟรม
     */
    update(deltaTime) {
        this.mixers.forEach(mixer => mixer.update(deltaTime));
    }

    /**
     * สร้าง Object ตามประเภทที่ระบุ
     */
    async createAsset(asset) {
        const blob = await use_index_db(asset.src);
        const url = URL.createObjectURL(blob);

        switch (asset.type) {
            case 'Image':
                return this.createImage(url, asset);
            case 'Video':
                return this.createVideo(url, asset);
            case '3D Model':
                return this.createModel(url, asset);
            case 'Audio':
                return this.createAudio(url, asset);
            default:
                console.warn(`Unknown asset type: ${asset.type}`);
                return null;
        }
    }

    async createImage(url, asset) {
        const texture = await this.textureLoader.loadAsync(url);
        const { width: imgW, height: imgH } = texture.image;
        const aspect = imgW / imgH;

        // ใช้ scale[0] เป็นความกว้างหลัก แล้วคำนวณความสูงตามสัดส่วนจริง
        const width = asset.scale[0];
        const height = width / aspect;

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true, 
            opacity: asset.opacity 
        });
        const mesh = new THREE.Mesh(geometry, material);
        this.applyTransform(mesh, asset);
        return mesh;
    }

    async createVideo(url, asset) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.src = url;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                const aspect = video.videoWidth / video.videoHeight;
                const width = asset.scale[0];
                const height = width / aspect;

                const texture = new THREE.VideoTexture(video);
                const geometry = new THREE.PlaneGeometry(width, height);
                const material = new THREE.MeshBasicMaterial({ 
                    map: texture, 
                    transparent: true, 
                    opacity: asset.opacity 
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.userData.video = video;
                this.applyTransform(mesh, asset);
                resolve(mesh);
            };
            
            video.load();
        });
    }

    async createModel(url, asset) {
        const gltf = await this.gltfLoader.loadAsync(url);
        const model = gltf.scene;

        // ตรวจสอบว่าจะเล่น Animation ทันทีหรือไม่ (Default: true)
        const shouldAnimate = asset.asset_animation !== false;

        if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            
            if (shouldAnimate) {
                action.play();
            }
            
            // เก็บ mixer ไว้เพื่อให้ update() มาเรียกใช้ (แม้ยังไม่เล่น ก็เก็บไว้รอ Action ในอนาคต)
            this.mixers.add(mixer);
            model.userData.mixer = mixer;
            model.userData.action = action; // เก็บ action ไว้ด้วยเพื่อให้สั่ง play/stop จากภายนอกง่ายๆ
        }

        model.scale.set(...asset.scale);
        this.applyTransform(model, asset);
        return model;
    }


    async createAudio(url, asset) {
        const audio = new Audio(url);
        audio.loop = true;
        
        const dummy = new THREE.Group();
        dummy.userData.audio = audio;
        this.applyTransform(dummy, asset);
        return dummy;
    }

    /**
     * สร้าง Hit Plane (โปร่งใส) เพื่อขยายพื้นที่คลิกและช่วยให้ Raycaster ทำงานง่ายขึ้น
     */
    addDebugPlane(object) {
        // สร้าง Plane ขนาด 1x1
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            side: THREE.DoubleSide, 
            transparent: true, 
             opacity: 0 // มองไม่เห็น แต่ Raycast โดน
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.name = "INTERACTION_HIT_BOX"; // เปลี่ยนชื่อให้สื่อความหมาย
        
        // ขยับมาข้างหน้านิดนึง
        plane.position.z = 0.1; 
        
        object.add(plane);
    }

    applyTransform(object, asset) {
        object.position.set(...asset.position);
        object.rotation.set(...asset.rotation);
        object.name = asset.asset_id;
        
        if (asset.action) {
            object.userData.interaction = asset.action;
            // สร้าง Hit Box เสมอถ้ามี Interaction
            this.addDebugPlane(object);
        }
    }

    /**
     * ลบ Mixer ออกเมื่อ Asset ถูกทำลาย (Memory Clean up)
     */
    removeAsset(object) {
        if (object.userData.mixer) {
            this.mixers.delete(object.userData.mixer);
        }
    }
}


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

        // ค้นหาและเล่น Animation (Default: เล่นตัวแรก)
        if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            
            // เก็บ mixer ไว้เพื่อให้ update() มาเรียกใช้
            this.mixers.add(mixer);
            model.userData.mixer = mixer;
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

    applyTransform(object, asset) {
        object.position.set(...asset.position);
        object.rotation.set(...asset.rotation);
        object.name = asset.asset_id;
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


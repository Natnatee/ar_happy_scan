import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { use_index_db } from './index_db';

export class AssetManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
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
        model.scale.set(...asset.scale);
        this.applyTransform(model, asset);
        return model;
    }

    async createAudio(url, asset) {
        // สำหรับ Audio เราอาจจะคืนเป็น Audio Object หรือ Dummy Entity ที่มีเสียง
        const audio = new Audio(url);
        audio.loop = true;
        
        // คืนค่าเป็น object เปล่าแต่มี logic เสียงติดไป
        const dummy = new THREE.Group();
        dummy.userData.audio = audio;
        this.applyTransform(dummy, asset);
        return dummy;
    }

    applyTransform(object, asset) {
        object.position.set(...asset.position);
        object.rotation.set(...asset.rotation);
        // ชื่อเพื่อใช้ในการค้นหา/ลบ
        object.name = asset.asset_id;
    }
}

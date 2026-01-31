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
        const geometry = new THREE.PlaneGeometry(asset.scale[0], asset.scale[1]);
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
        const video = document.createElement('video');
        video.src = url;
        video.loop = true;
        video.muted = true; // ส่วนใหญ่เบราว์เซอร์บังคับ muted ก่อนเล่นอัตโนมัติ
        video.playsInline = true;
        video.play();

        const texture = new THREE.VideoTexture(video);
        const geometry = new THREE.PlaneGeometry(asset.scale[0], asset.scale[1]);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true, 
            opacity: asset.opacity 
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.video = video; // เก็บไว้เผื่อสั่ง play/pause
        this.applyTransform(mesh, asset);
        return mesh;
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

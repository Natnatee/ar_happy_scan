/**
 * Slot Game Logic - จัดการ Animation และ Flow เกม
 */

import * as THREE from 'three';
import { 
    getOrCreateUID, 
    getRandomRewardAndVideo, 
    updateRow, 
    getUserById,
    canPlay 
} from './slot_api.js';
import { showResultPopup, showNoPlayPopup } from './slot_ui.js';

export class SlotGame {
    constructor() {
        this.isPlaying = false;
        this.currentResult = null;
        this.videoUrl = null;
        this.uid = getOrCreateUID();
    }

    /**
     * เริ่มต้นเกม - เช็คสิทธิ์ก่อน
     */
    async init() {
        console.log('[SlotGame] Initializing with UID:', this.uid);
        
        // ดึงข้อมูล user จาก server
        await getUserById(this.uid);
        
        // เช็คว่ายังเล่นได้ไหม
        if (!canPlay()) {
            showNoPlayPopup();
            return false;
        }
        
        return true;
    }

    /**
     * เรียกเมื่อ user คลิกสลอต
     * @param {Object3D} object - โมเดลสลอต
     * @param {Object} actionConfig - config จาก mockdata
     */
    async handleSlotClick(object, actionConfig) {
        // ป้องกันคลิกซ้ำขณะกำลังเล่น
        if (this.isPlaying) {
            console.log('[SlotGame] Already playing, ignoring click');
            return;
        }

        // เช็คสิทธิ์อีกครั้ง
        if (!canPlay()) {
            showNoPlayPopup();
            return;
        }

        this.isPlaying = true;
        console.log('[SlotGame] Starting slot spin...');

        try {
            // 1. เรียก API สุ่มผล
            const result = await getRandomRewardAndVideo();
            
            if (!result.ok) {
                console.error('[SlotGame] API error:', result);
                this.isPlaying = false;
                return;
            }

            this.currentResult = result.reward;
            this.videoUrl = result.video;

            // 2. หา animation timing จาก tier
            const tier = result.reward.tier; // win, fail1, fail2
            const animMap = actionConfig.animation_map;
            
            if (!animMap || !animMap[tier]) {
                console.error('[SlotGame] No animation mapping for tier:', tier);
                this.isPlaying = false;
                return;
            }

            const timing = animMap[tier];
            console.log(`[SlotGame] Playing ${tier} animation:`, timing);

            // 3. เล่น animation
            await this.playAnimation(object, timing.start_time, timing.end_time);

            // 4. แสดง popup ผล
            this.showResult();

        } catch (error) {
            console.error('[SlotGame] Error:', error);
            this.isPlaying = false;
        }
    }

    /**
     * เล่น animation ตามช่วงเวลา
     */
    playAnimation(object, startTime, endTime) {
        return new Promise((resolve) => {
            const action = object.userData.action;
            const mixer = object.userData.mixer;

            if (!action || !mixer) {
                console.error('[SlotGame] No animation data on object');
                resolve();
                return;
            }

            // ตั้งค่า animation
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.reset();
            action.time = startTime;
            action.play();

            // หยุดเมื่อถึง endTime
            const duration = (endTime - startTime) * 1000;
            
            setTimeout(() => {
                action.paused = true;
                this.isPlaying = false;
                resolve();
            }, duration);
        });
    }

    /**
     * แสดง popup ผลรางวัล
     */
    showResult() {
        showResultPopup(
            this.currentResult,
            this.videoUrl,
            // onSave callback
            async (name) => {
                const result = await updateRow(
                    this.uid,
                    name,
                    this.currentResult.value
                );
                console.log('[SlotGame] Save result:', result);
            },
            // onWatchVideo callback
            () => {
                console.log('[SlotGame] Video watched, can play again');
                // ไม่ต้องทำอะไร แค่ปิด video แล้ว user กดสลอตใหม่ได้
            }
        );
    }
}

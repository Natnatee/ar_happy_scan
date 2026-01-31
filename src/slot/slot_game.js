/**
 * Slot Game Logic - จัดการ Animation และ Flow เกม
 * ปรับปรุง: ใช้ rewards จาก cache, นับ play count เอง
 */

import * as THREE from 'three';
import { 
    getOrCreateUID, 
    fetchRewardsFromServer, 
    updateRow, 
    getUserById,
    canPlay,
    isRewardReady,
    getNextReward,
    incrementPlayCount
} from './slot_api.js';
import { showResultPopup, showNoPlayPopup } from './slot_ui.js';

export class SlotGame {
    constructor() {
        this.isPlaying = false;
        this.currentResult = null;
        this.videoUrl = null;
        this.uid = getOrCreateUID();
        this.isRewardsLoaded = false;
        this.loadingPromise = null;
    }

    /**
     * เริ่มต้นเกม - เช็คสิทธิ์ + โหลด rewards แบบ async
     * ไม่ต้องรอ API เสร็จ (ให้กล้องขึ้นก่อน)
     */
    async init() {
        console.log('[SlotGame] Initializing with UID:', this.uid);
        
        // เริ่มโหลด rewards แบบ async (ไม่ await)
        this.loadingPromise = this.loadRewardsAsync();
        
        // เช็คว่ายังเล่นได้ไหม (ใช้ local play count)
        if (!canPlay()) {
            showNoPlayPopup();
            return false;
        }
        
        return true;
    }

    /**
     * โหลด rewards จาก server แบบ async
     */
    async loadRewardsAsync() {
        try {
            // ถ้ายังมี cache เหลือพอใช้ ไม่ต้องยิงใหม่
            if (isRewardReady()) {
                console.log('[SlotGame] Using cached rewards');
                this.isRewardsLoaded = true;
                return;
            }

            // ยิง API ดึง rewards 3 ตัว
            console.log('[SlotGame] Fetching rewards from server...');
            const result = await fetchRewardsFromServer();
            
            if (result.ok) {
                this.isRewardsLoaded = true;
                console.log('[SlotGame] Rewards loaded successfully');
            } else {
                console.error('[SlotGame] Failed to load rewards:', result.error);
            }
        } catch (error) {
            console.error('[SlotGame] Error loading rewards:', error);
        }
    }

    /**
     * รอให้ rewards โหลดเสร็จ (ถ้ายังไม่เสร็จ)
     */
    async waitForRewards() {
        if (this.isRewardsLoaded) return true;
        
        if (this.loadingPromise) {
            await this.loadingPromise;
        }
        
        return isRewardReady();
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
            // 1. รอ rewards ถ้ายังไม่มี
            const hasRewards = await this.waitForRewards();
            
            if (!hasRewards) {
                console.error('[SlotGame] No rewards available');
                this.isPlaying = false;
                return;
            }

            // 2. ดึง reward ถัดไปจาก cache
            const rewardData = getNextReward();
            
            if (!rewardData) {
                console.error('[SlotGame] Failed to get next reward');
                this.isPlaying = false;
                return;
            }

            this.currentResult = rewardData.reward;
            this.videoUrl = rewardData.video;

            // 3. หา animation timing จาก tier
            const tier = rewardData.reward.tier; // win, fail1, fail2
            const animMap = actionConfig.animation_map;
            
            if (!animMap || !animMap[tier]) {
                console.error('[SlotGame] No animation mapping for tier:', tier);
                this.isPlaying = false;
                return;
            }

            const timing = animMap[tier];
            console.log(`[SlotGame] Playing ${tier} animation:`, timing);

            // 4. เพิ่ม play count ก่อนเล่น animation
            incrementPlayCount();

            // 5. เล่น animation
            await this.playAnimation(object, timing.start_time, timing.end_time);

            // 6. แสดง popup ผล
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

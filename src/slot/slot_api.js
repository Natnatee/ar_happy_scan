/**
 * Slot Game API - เชื่อมต่อกับ Google Apps Script
 * ปรับปรุง: API คืน results 3 ตัว, เก็บ play count ใน localStorage
 */

const API_BASE = 'https://script.google.com/macros/s/AKfycbwpjzNXx4PIgoYwVdbqz7hAf8QWyBmwzw__mybTIvtNIz9y4dU2bVWcjrV1UZ1tnOW0/exec';
const UID_KEY = 'SLOT_GAME_UID';
const USER_DATA_KEY = 'SLOT_GAME_USER';
const REWARDS_CACHE_KEY = 'SLOT_GAME_REWARDS_CACHE';
const PLAY_COUNT_KEY = 'SLOT_GAME_PLAY_COUNT';

/**
 * สร้างหรือดึง UID จาก localStorage
 */
export function getOrCreateUID() {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
        uid = 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem(UID_KEY, uid);
        console.log('[SlotAPI] Created new UID:', uid);
    }
    return uid;
}

/**
 * ดึงข้อมูล user จาก localStorage
 */
export function getLocalUserData() {
    try {
        const raw = localStorage.getItem(USER_DATA_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * บันทึกข้อมูล user ลง localStorage
 */
export function saveLocalUserData(data) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
}

/**
 * ดึงจำนวนครั้งที่เล่นแล้ว (0-3)
 */
export function getPlayCount() {
    const count = parseInt(localStorage.getItem(PLAY_COUNT_KEY) || '0', 10);
    return Math.min(Math.max(count, 0), 3);
}

/**
 * เพิ่มจำนวนครั้งที่เล่น
 */
export function incrementPlayCount() {
    const current = getPlayCount();
    const next = Math.min(current + 1, 3);
    localStorage.setItem(PLAY_COUNT_KEY, String(next));
    console.log('[SlotAPI] Play count:', next);
    return next;
}

/**
 * เช็คว่ายังมีสิทธิ์เล่นอยู่ไหม (< 3 ครั้ง)
 */
export function canPlay() {
    return getPlayCount() < 3;
}

/**
 * ดึง rewards cache จาก localStorage
 */
export function getRewardsCache() {
    try {
        const raw = localStorage.getItem(REWARDS_CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * บันทึก rewards cache ลง localStorage
 */
export function saveRewardsCache(results) {
    localStorage.setItem(REWARDS_CACHE_KEY, JSON.stringify(results));
    console.log('[SlotAPI] Rewards cache saved:', results.length, 'items');
}

/**
 * เช็คว่ามี rewards พร้อมใช้ไหม (ตรงกับ play count)
 */
export function isRewardReady() {
    const cache = getRewardsCache();
    const playCount = getPlayCount();
    return cache && cache.length > playCount;
}

/**
 * ดึง reward ถัดไปจาก cache ตาม play count ปัจจุบัน
 */
export function getNextReward() {
    const cache = getRewardsCache();
    const playCount = getPlayCount();
    
    if (!cache || playCount >= cache.length) {
        console.error('[SlotAPI] No reward available at index:', playCount);
        return null;
    }
    
    return cache[playCount];
}

/**
 * GET: ดึงข้อมูล user จาก server
 */
export async function getUserById(id) {
    try {
        const url = `${API_BASE}?action=get_user_by_id&id=${encodeURIComponent(id)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.ok && data.user) {
            saveLocalUserData(data);
        }
        
        return data;
    } catch (error) {
        console.error('[SlotAPI] getUserById error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * GET: สุ่มรางวัลและวิดีโอ (ได้ 3 ตัวต่อ call)
 * จะเก็บลง cache ใน localStorage
 */
export async function fetchRewardsFromServer() {
    try {
        const url = `${API_BASE}?action=random_reward_and_video`;
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('[SlotAPI] Fetched rewards:', data);
        
        if (data.ok && Array.isArray(data.results)) {
            saveRewardsCache(data.results);
            return { ok: true, results: data.results };
        }
        
        return { ok: false, error: 'Invalid response format' };
    } catch (error) {
        console.error('[SlotAPI] fetchRewardsFromServer error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * POST: บันทึกรางวัล
 */
/**
 * POST: บันทึกรางวัล
 * ส่งข้อมูล update_row ไปยัง GAS
 */
export async function updateRow(id, name, reward) {
    console.log(`[SlotAPI] Updating row for ${id}, Reward: ${reward}`);
    
    try {
        const payload = {
            action: 'update_row',
            payload: {
                id: id,
                name: name,
                reward: reward
            }
        };

        const response = await fetch(API_BASE, {
            method: 'POST',
            cache: 'no-store', // ห้าม cache
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // ใช้ text/plain เพื่อเลี่ยง CORS preflight บางกรณีของ GAS
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log('[SlotAPI] updateRow response:', data.ok ? 'Success' : 'Failed', data);
        
        // อัปเดตข้อมูล Local Storage ทันทีเพื่อความแม่นยำ
        if (data.ok) {
            // อาจจะดึงข้อมูลล่าสุดมาเก็บถ้าจำเป็น แต่ในเคสนี้แค่ส่งก็พอ
             await getUserById(id);
        }
        
        return data;
    } catch (error) {
        console.error('[SlotAPI] updateRow error:', error);
        return { ok: false, error: error.message };
    }
}

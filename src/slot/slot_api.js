/**
 * Slot Game API - เชื่อมต่อกับ Google Apps Script
 */

const API_BASE = 'https://script.google.com/macros/s/AKfycbwpjzNXx4PIgoYwVdbqz7hAf8QWyBmwzw__mybTIvtNIz9y4dU2bVWcjrV1UZ1tnOW0/exec';
const UID_KEY = 'SLOT_GAME_UID';
const USER_DATA_KEY = 'SLOT_GAME_USER';

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
 * นับจำนวน rewards ที่ได้รับแล้ว
 */
export function getRewardCount() {
    const userData = getLocalUserData();
    if (!userData?.user) return 0;
    
    let count = 0;
    if (userData.user.reward_1) count++;
    if (userData.user.reward_2) count++;
    if (userData.user.reward_3) count++;
    return count;
}

/**
 * เช็คว่ายังมีสิทธิ์เล่นอยู่ไหม (< 3 rewards)
 */
export function canPlay() {
    return getRewardCount() < 3;
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
 * GET: สุ่มรางวัลและวิดีโอ
 */
export async function getRandomRewardAndVideo() {
    try {
        const url = `${API_BASE}?action=random_reward_and_video`;
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('[SlotAPI] Random result:', data);
        return data;
    } catch (error) {
        console.error('[SlotAPI] getRandomRewardAndVideo error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * POST: บันทึกรางวัล
 */
export async function updateRow(id, name, reward) {
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'update_row',
                payload: { id, name, reward }
            })
        });
        
        const data = await response.json();
        console.log('[SlotAPI] updateRow response:', data);
        
        // อัปเดต local storage ด้วยข้อมูลใหม่
        if (data.ok || data.status === 409) {
            // ดึงข้อมูลล่าสุดมาเก็บ
            await getUserById(id);
        }
        
        return data;
    } catch (error) {
        console.error('[SlotAPI] updateRow error:', error);
        return { ok: false, error: error.message };
    }
}

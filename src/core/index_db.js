const DB_NAME = 'AR_ASSET_DB';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

/**
 * Initialize/Open IndexedDB
 */
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * ดึงข้อมูลหรือดาวน์โหลดมาเก็บไว้ใน IndexedDB (Key-Value)
 * @param {string} url - พาร์ทของไฟล์หรือ URL
 * @returns {Promise<Blob>}
 */
export async function use_index_db(url) {
    if (!url) return null;

    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(url);

        request.onsuccess = async () => {
            if (request.result) {
                console.log(`[Cache Hit] ${url}`);
                resolve(request.result);
            } else {
                console.log(`[Cache Miss] Fetching ${url}...`);
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
                    
                    const blob = await response.blob();
                    
                    // บันทึกลง DB
                    const writeTx = db.transaction(STORE_NAME, 'readwrite');
                    const writeStore = writeTx.objectStore(STORE_NAME);
                    writeStore.put(blob, url);
                    
                    resolve(blob);
                } catch (error) {
                    console.error(`[Error] Failed to load asset: ${url}`, error);
                    reject(error);
                }
            }
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * ไต่หา Asset ทั้งหมดใน Config (JSON) เพื่อเตรียมโหลด
 * @param {Object} config - ข้อมูล JSON ของโปรเจค
 * @returns {string[]} - รายการ URL/Path ทั้งหมดที่พบ
 */
export function scan_json(config) {
    const assetUrls = new Set();

    const extract = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        // รายการ Key ที่ต้องเช็คตามกฎ
        const targetKeys = [
            'src', 'asset_image', 'mind_src', 'background', 
            'icon', 'src_left', 'src_right', 'loop_sound'
        ];

        for (const key in obj) {
            const value = obj[key];
            
            if (targetKeys.includes(key) && typeof value === 'string' && value.trim() !== '') {
                assetUrls.add(value);
            } 
            // กรณีพิเศษ: mind_image เป็น object ที่เก็บ URL หลายตัว (T1, T2, ...)
            else if (key === 'mind_image' && typeof value === 'object') {
                Object.values(value).forEach(v => {
                    if (typeof v === 'string') assetUrls.add(v);
                });
            }
            // ไต่ลงไปชั้นถัดไป
            else if (typeof value === 'object') {
                extract(value);
            }
        }
    };

    extract(config);
    const result = Array.from(assetUrls);
    console.log(`[Scan] Found ${result.length} unique assets in JSON`);
    return result;
}

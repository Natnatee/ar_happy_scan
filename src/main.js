import './styles/main.css';
import { CONFIG_KEY } from './core/config';
import { scan_json, use_index_db } from './core/index_db';
import mockData from './image/mockdata.json';

async function init() {
    const appEl = document.querySelector('#app');
    appEl.innerHTML = `
        <div class="loading-container">
            <h1 id="status-text">Booting System...</h1>
            <div class="progress-bar">
                <div id="progress-fill"></div>
            </div>
            <p id="detail-text">Preparing assets...</p>
        </div>
    `;

    const statusText = document.querySelector('#status-text');
    const detailText = document.querySelector('#detail-text');
    const progressFill = document.querySelector('#progress-fill');

    try {
        // 1. อ่านข้อมูล (ลำดับ: URL Parameter -> Mock Data)
        const urlParams = new URLSearchParams(window.location.search);
        let config = null;

        // ตัวอย่างการอ่านจาก URL (ถ้ามี ?data=...)
        const rawData = urlParams.get('data');
        if (rawData) {
            try {
                config = JSON.parse(decodeURIComponent(rawData));
                console.log('Using config from URL');
            } catch (e) {
                console.error('Invalid JSON in URL parameter');
            }
        }

        // ถ้าไม่มีใน URL ให้ใช้ Mock Data
        if (!config) {
            console.log('Using mock data');
            config = mockData[0]; // ใช้ตัวแรกใน array
        }

        // 2. ตรวจสอบโครงสร้างพื้นฐาน (Validate)
        if (!config || !config.info) {
            throw new Error('Invalid configuration data');
        }

        // กำหนดหน้าที่จะไป (Default เป็น image.html ถ้าไม่ได้ระบุ)
        const targetPage = config.targetPage || 'image.html';
        statusText.innerText = 'Loading Assets...';

        // 3. Scan หา Assets ทั้งหมด
        const assets = scan_json(config);
        const total = assets.length;
        let loaded = 0;

        // 4. โหลด Assets ลง IndexedDB
        const loadPromises = assets.map(async (url) => {
            try {
                await use_index_db(url);
                loaded++;
                const percent = Math.floor((loaded / total) * 100);
                progressFill.style.width = `${percent}%`;
                detailText.innerText = `Downloaded ${loaded}/${total}: ${url.split('/').pop()}`;
            } catch (err) {
                console.warn(`Failed to preload: ${url}`, err);
                // เราไม่ throw error ที่นี่เพื่อให้ตัวอื่นโหลดต่อได้ 
                // แต่ในงานจริงอาจจะอยากให้หยุดถ้าไฟล์สำคัญพัง
            }
        });

        await Promise.all(loadPromises);

        // 5. บันทึก Config ลง localStorage ก่อนไป
        config.targetPage = targetPage; // มั่นใจว่ามีค่านี้
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

        statusText.innerText = 'Go!';
        detailText.innerText = 'Redirecting to AR Experience...';

        // 6. Redirect หลังจากโหลดเสร็จ (ทิ้งหน่วงไว้นิดนึงให้ UI แสดงผล)
        setTimeout(() => {
            window.location.href = `/${targetPage}`;
        }, 1000);

    } catch (error) {
        console.error('System Failure:', error);
        statusText.innerText = 'Error';
        statusText.style.color = 'red';
        detailText.innerText = error.message;
    }
}

init();

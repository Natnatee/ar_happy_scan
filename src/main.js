import './styles/main.css';
import { CONFIG_KEY } from './core/config';
import { scan_json, use_index_db } from './core/index_db';
import mockData from './slot/mockdata.json';

// ฟังก์ชันตรวจว่าเปิดจาก LINE หรือไม่
function isOpenedFromLINE() {
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    return ua.includes('line/') || ua.includes(' line');
}

async function init() {
    const appEl = document.querySelector('#app');

    // ───────────────────────────────────────────────
    // ตรวจสอบก่อนเลยว่ามาจาก LINE ในแอปหรือไม่
    // ───────────────────────────────────────────────
    if (isOpenedFromLINE()) {
        const currentUrl = window.location.href;

        appEl.innerHTML = `
            <div style="
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                text-align: center;
                padding: 20px;
                font-family: system-ui, -apple-system, sans-serif;
            ">
                <div style="max-width: 420px; width: 100%;">
                    <h2 style="color: #ff6b6b; margin-bottom: 16px; font-size: 1.8em;">
                        ไม่สามารถใช้ AR เต็มประสิทธิภาพใน LINE ได้
                    </h2>
                    
                    <p style="font-size: 1.15em; line-height: 1.5; margin: 0 0 32px;">
                        กรุณาเปิดลิงก์นี้ใน<br>
                        <strong style="color: #4fc3f7;">Safari</strong> หรือ 
                        <strong style="color: #4fc3f7;">Chrome</strong><br>
                        เพื่อประสบการณ์ AR ที่สมบูรณ์
                    </p>

                    <div style="margin: 24px 0; background: rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                        <input type="text" id="urlInput" value="${currentUrl}" readonly 
                               style="
                                   width: 100%;
                                   padding: 14px;
                                   font-size: 1em;
                                   background: rgba(255,255,255,0.1);
                                   border: 1px solid rgba(255,255,255,0.2);
                                   border-radius: 8px;
                                   color: white;
                                   text-align: center;
                                   margin-bottom: 16px;
                               ">
                        
                        <button id="copyBtn" style="
                            padding: 14px 40px;
                            font-size: 1.15em;
                            background: #00c853;
                            color: white;
                            border: none;
                            border-radius: 50px;
                            cursor: pointer;
                            font-weight: bold;
                            box-shadow: 0 4px 15px rgba(0,200,83,0.4);
                            transition: all 0.2s;
                        ">
                            คัดลอกลิงก์
                        </button>
                    </div>

                    <p style="font-size: 0.95em; opacity: 0.8; margin: 32px 0 16px;">
                        วิธีง่าย ๆ:<br>
                        1. กดคัดลอก<br>
                        2. เปิด Safari / Chrome<br>
                        3. วางลิงก์แล้วกดเข้า
                    </p>

                    <p style="font-size: 0.9em; opacity: 0.6; margin-top: 40px;">
                        กำลังโหลด... (หากยังอยู่ใน LINE กรุณาออกจากหน้าและเปิดเบราว์เซอร์ใหม่)
                    </p>
                </div>
            </div>
        `;

        // พยายามเปิดในเบราว์เซอร์ภายนอก (ผลลัพธ์ขึ้นกับ LINE แต่ก็ลองไว้)
        setTimeout(() => {
            window.open(currentUrl, '_system');
            // หรือบางกรณีใช้ location.href = 'googlechrome:' + currentUrl.replace(/^https?:/, ''); แต่ไม่เสถียร
        }, 1200);

        // จัดการปุ่ม copy
        const copyBtn = document.querySelector('#copyBtn');
        const urlInput = document.querySelector('#urlInput');

        if (copyBtn && urlInput) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(currentUrl);
                    copyBtn.textContent = 'คัดลอกแล้ว ✓';
                    copyBtn.style.background = '#4caf50';
                    copyBtn.style.boxShadow = '0 4px 20px rgba(76,175,80,0.5)';
                    
                    setTimeout(() => {
                        copyBtn.textContent = 'คัดลอกลิงก์';
                        copyBtn.style.background = '#00c853';
                        copyBtn.style.boxShadow = '0 4px 15px rgba(0,200,83,0.4)';
                    }, 2500);
                } catch (err) {
                    // fallback สำหรับ iOS/Android บางตัว
                    urlInput.select();
                    document.execCommand('copy');
                    copyBtn.textContent = 'คัดลอกแล้ว ✓';
                    setTimeout(() => {
                        copyBtn.textContent = 'คัดลอกลิงก์';
                    }, 2000);
                }
            });
        }

        // หยุดการทำงานทั้งหมด ไม่ให้ไป preload หรือ redirect ต่อ
        return;
    }

    // ───────────────────────────────────────────────
    // ถ้าไม่ใช่ LINE → ทำตาม logic เดิมทุกบรรทัด ไม่แตะต้อง
    // ───────────────────────────────────────────────
    appEl.innerHTML = `
        <div class="boot-screen">
            <div class="loading-container">
                <h1 id="status-text">Booting System...</h1>
                <div class="progress-bar">
                    <div id="progress-fill"></div>
                </div>
                <p id="detail-text">Preparing assets...</p>
            </div>
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

        // ดึง key แรกจาก tracking_modes มาทำเป็นชื่อไฟล์ .html ทันที
        const firstMode = Object.keys(config.info.tracking_modes)[0]; 
        const targetPage = `${firstMode}.html`;
        
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
            }
        });

        await Promise.all(loadPromises);

        // 5. บันทึก Config ลง localStorage ก่อนไป
        config.targetPage = targetPage;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

        statusText.innerText = 'Go!';
        detailText.innerText = 'Redirecting to AR Experience...';

        // 6. Redirect หลังจากโหลดเสร็จ
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
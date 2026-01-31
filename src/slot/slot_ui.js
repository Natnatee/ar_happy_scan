/**
 * Slot Game UI - Popup และ Video Player
 */

import { getRewardCount, canPlay } from './slot_api.js';

/**
 * สร้าง CSS สำหรับ UI
 */
function injectStyles() {
    if (document.getElementById('slot-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'slot-ui-styles';
    style.textContent = `
        .slot-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .slot-popup {
            background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 20px;
            padding: 30px;
            max-width: 90%;
            width: 400px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            border: 2px solid #e94560;
            animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        @keyframes popIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        .slot-popup h2 {
            color: #fff;
            margin: 0 0 10px;
            font-size: 24px;
        }
        
        .slot-popup .reward-text {
            color: #ffd700;
            font-size: 28px;
            font-weight: bold;
            margin: 20px 0;
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
        
        .slot-popup .reward-text.lose {
            color: #888;
            font-size: 20px;
            text-shadow: none;
        }
        
        .slot-popup input {
            width: 100%;
            padding: 15px;
            border: 2px solid #333;
            border-radius: 10px;
            background: #0f0f23;
            color: #fff;
            font-size: 16px;
            margin: 10px 0;
            box-sizing: border-box;
        }
        
        .slot-popup input:focus {
            outline: none;
            border-color: #e94560;
        }
        
        .slot-btn {
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin: 5px;
            transition: all 0.3s ease;
        }
        
        .slot-btn-primary {
            background: linear-gradient(45deg, #e94560, #ff6b6b);
            color: #fff;
        }
        
        .slot-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(233, 69, 96, 0.4);
        }
        
        .slot-btn-secondary {
            background: linear-gradient(45deg, #0f3460, #16213e);
            color: #fff;
            border: 2px solid #e94560;
        }
        
        .slot-btn-secondary:hover {
            background: linear-gradient(45deg, #16213e, #1a1a2e);
        }
        
        .slot-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        
        .video-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 10000;
        }
        
        .video-container video,
        .video-container iframe {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .video-close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            display: none;
        }
        
        .no-play-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        
        .no-play-popup {
            background: linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 90%;
        }
        
        .no-play-popup h2 {
            color: #e94560;
            margin-bottom: 20px;
        }
        
        .no-play-popup p {
            color: #888;
            font-size: 16px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * แสดง Popup หมดสิทธิ์
 */
export function showNoPlayPopup() {
    injectStyles();
    
    const overlay = document.createElement('div');
    overlay.className = 'no-play-overlay';
    overlay.innerHTML = `
        <div class="no-play-popup">
            <h2>😢 หมดสิทธิ์แล้ว</h2>
            <p>คุณได้รับรางวัลครบ 3 ครั้งแล้ว</p>
            <p>ขอบคุณที่ร่วมกิจกรรม!</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

/**
 * แสดง Popup ผลรางวัล
 * @param {Object} result - ผลจาก API { tier, value }
 * @param {string} videoUrl - URL วิดีโอสำหรับดูเพิ่มสิทธิ์
 * @param {Function} onSave - callback เมื่อกดบันทึก (name) => {}
 * @param {Function} onWatchVideo - callback เมื่อกดดูวิดีโอ
 */
export function showResultPopup(result, videoUrl, onSave, onWatchVideo) {
    injectStyles();
    
    const isWin = result.tier === 'win';
    const remainingPlays = 3 - getRewardCount() - 1; // -1 เพราะเพิ่งเล่นไป
    const canWatchVideo = remainingPlays > 0 && videoUrl;
    
    const overlay = document.createElement('div');
    overlay.className = 'slot-overlay';
    overlay.innerHTML = `
        <div class="slot-popup">
            <h2>${isWin ? '🎉 ยินดีด้วย!' : '😅 เสียใจด้วย'}</h2>
            <div class="reward-text ${isWin ? '' : 'lose'}">
                ${result.value || (isWin ? 'คุณได้รางวัล!' : 'ไม่ได้รางวัล')}
            </div>
            
            ${isWin ? `
                <input type="text" id="slot-name-input" placeholder="กรอกชื่อของคุณ" />
                <button class="slot-btn slot-btn-primary" id="slot-save-btn">
                    💾 บันทึก & ดาวน์โหลด
                </button>
            ` : ''}
            
            ${canWatchVideo ? `
                <p style="color: #888; margin-top: 20px;">เหลือสิทธิ์อีก ${remainingPlays} ครั้ง</p>
                <button class="slot-btn slot-btn-secondary" id="slot-video-btn">
                    🎬 ดูวิดีโอเพื่อสุ่มเพิ่ม
                </button>
            ` : `
                <p style="color: #888; margin-top: 20px;">
                    ${remainingPlays <= 0 ? 'นี่คือครั้งสุดท้ายแล้ว' : ''}
                </p>
                <button class="slot-btn slot-btn-secondary" id="slot-close-btn">
                    ปิด
                </button>
            `}
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Event: บันทึก
    const saveBtn = overlay.querySelector('#slot-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const nameInput = overlay.querySelector('#slot-name-input');
            const name = nameInput?.value.trim();
            
            if (!name) {
                nameInput.style.borderColor = '#e94560';
                nameInput.placeholder = 'กรุณากรอกชื่อ!';
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.textContent = 'กำลังบันทึก...';
            
            await onSave(name);
            
            // Download screenshot
            await captureAndDownload();
            
            overlay.remove();
        });
    }
    
    // Event: ดูวิดีโอ
    const videoBtn = overlay.querySelector('#slot-video-btn');
    if (videoBtn) {
        videoBtn.addEventListener('click', () => {
            overlay.remove();
            showVideoPlayer(videoUrl, onWatchVideo);
        });
    }
    
    // Event: ปิด
    const closeBtn = overlay.querySelector('#slot-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });
    }
}

/**
 * แสดง Video Player
 */
export function showVideoPlayer(videoUrl, onComplete) {
    injectStyles();
    
    const container = document.createElement('div');
    container.className = 'video-container';
    
    // ตรวจสอบว่าเป็น iframe URL หรือ video URL
    const isIframe = videoUrl.includes('screens.omg.group') || videoUrl.includes('youtube') || videoUrl.includes('vimeo');
    
    if (isIframe) {
        container.innerHTML = `
            <iframe src="${videoUrl}" frameborder="0" allowfullscreen></iframe>
            <button class="video-close-btn" id="video-done-btn">✓ ดูเสร็จแล้ว</button>
        `;
        
        // แสดงปุ่มหลังจาก 10 วินาที (หรือปรับตามความเหมาะสม)
        setTimeout(() => {
            const btn = container.querySelector('#video-done-btn');
            if (btn) btn.style.display = 'block';
        }, 10000);
        
    } else {
        container.innerHTML = `
            <video src="${videoUrl}" autoplay controls></video>
            <button class="video-close-btn" id="video-done-btn">✓ ดูเสร็จแล้ว</button>
        `;
        
        const video = container.querySelector('video');
        video.addEventListener('ended', () => {
            container.querySelector('#video-done-btn').style.display = 'block';
        });
    }
    
    document.body.appendChild(container);
    
    const doneBtn = container.querySelector('#video-done-btn');
    doneBtn.addEventListener('click', () => {
        container.remove();
        if (onComplete) onComplete();
    });
}

/**
 * แคปหน้าจอและดาวน์โหลด
 */
async function captureAndDownload() {
    try {
        // ใช้ html2canvas ถ้ามี หรือแจ้งให้ user screenshot เอง
        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(document.body);
            const link = document.createElement('a');
            link.download = `slot-reward-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } else {
            // ถ้าไม่มี html2canvas ให้ download แค่ข้อมูล
            alert('กรุณากด Screenshot หน้าจอเพื่อบันทึกรางวัล!');
        }
    } catch (error) {
        console.error('Capture error:', error);
        alert('กรุณากด Screenshot หน้าจอเพื่อบันทึกรางวัล!');
    }
}

---
trigger: always_on
---

# กติกาโปรเจกต์: AR แบบหลายหน้า (Vite + Pure JavaScript)

## ตัวตนของโปรเจกต์
- โปรเจกต์นี้เป็น AR Web App
- ใช้ Vite + JavaScript ล้วน (ไม่ใช้ framework)
- **ไม่ใช่ SPA**
- แยกหน้า HTML ตามโหมดของ AR
- ผมพยายามโคลน โปรเจค ar_for_free_scan ใหม่ แต่ให้มันคลีนขึ้น *****สำคัญ****

---

## โครงสร้างระดับสูง
- จุดเริ่มต้น: `index.html`
- ไฟล์บูตระบบ: `main.js`
- หน้า AR แยกตามโหมด:
  - `image.html` → image tracking
  - `face.html` → face tracking
  - `gps.html` → location-based AR
  - `gyro.html` → device orientation AR

---

## ลำดับการทำงานตอนเริ่มระบบ (ต้องทำตามนี้เท่านั้น)
1. `index.html` โหลด `main.js`
2. `main.js` อ่านข้อมูลตั้งค่าจาก URL parameter
3. ถ้าไม่มีหรือข้อมูลไม่ถูกต้อง  
   → ใช้ข้อมูล mock จากไฟล์ JSON
4. ตรวจสอบโครงสร้างข้อมูล (validate)
5. โหลด assets ทั้งหมดที่ข้อมูลระบุไว้
6. บันทึกข้อมูลที่ผ่านการตรวจสอบแล้วลง `localStorage`
7. redirect ไปยังหน้าที่ข้อมูลกำหนดไว้

> ❗ ถ้าขั้นตอนใดล้มเหลว **ห้าม redirect**  
> ❗ ต้องแสดง error ให้ชัดเจน

---

## ข้อตกลงของข้อมูล (Config Contract)
- เก็บข้อมูลไว้ใน `localStorage` เท่านั้น
- ใช้ key เดียวเท่านั้นคือ  
  **`AR_APP_CONFIG_V1`**
- โครงสร้างข้อมูลต้องมีอย่างน้อย:
  - `targetPage` (string เช่น `image.html`)
  - `mode` (`image | face | gps | gyro`)
  - `assets` (array)
  - `version` (string หรือ number)

- หน้าแต่ละหน้า:
  - **ห้ามอ่านข้อมูลจาก URL**
  - **ต้องอ่านจาก localStorage เท่านั้น**

---

## กติกาการเริ่มต้นของแต่ละหน้า
- หน้าแต่ละหน้าเป็นเจ้าของ logic ของตัวเอง
- เมื่อโหลดหน้า:
  1. อ่าน config จาก `localStorage`
  2. ตรวจสอบว่าข้อมูลตรงกับโหมดของหน้านั้น
  3. ถ้าข้อมูลหาย / ไม่ตรง  
     → redirect กลับ `index.html`

- ต้องรองรับกรณี:
  - ผู้ใช้ไม่ให้สิทธิ์กล้อง
  - อุปกรณ์ไม่รองรับ gyro / GPS
  - Safari บนมือถือ

---

## กติกาการโหลด Asset
- การโหลด asset **ต้องทำใน `main.js` เท่านั้น**
- ต้องโหลดเสร็จก่อน redirect
- แต่ละหน้าต้องถือว่า asset พร้อมใช้งานแล้ว
- ต้องมีสถานะ:
  - กำลังโหลด
  - โหลดไม่สำเร็จ (error ชัดเจน)

---

## กติกาเกี่ยวกับ Storage
- ใช้ localStorage แค่ key เดียว
- ห้ามเขียนข้อมูลบางส่วน
- ต้องเขียนทับทั้งก้อนเสมอ
- ถ้า clear storage  
  → ระบบต้องกลับไปเริ่มที่ `index.html`

---

## กติกาการ Redirect
- `targetPage` ต้องอยู่ใน allowlist ของไฟล์ HTML ที่มีจริง
- ห้าม redirect ไป URL ภายนอก
- หน้าหนึ่ง **ห้าม redirect ไปหน้า AR อื่นโดยตรง**

---

## กติกาการเขียนโค้ด
- ห้ามใช้ framework (React, Vue, ฯลฯ)
- ห้ามใช้ SPA router
- โค้ดต้องอ่านง่าย ชัดเจน แยกความรับผิดชอบ
- ใช้ `async / await`
- หลีกเลี่ยง global state ที่ซ่อนอยู่

---

## แนวคิดการจัดการ Error
- เจ๊งให้เร็ว (fail fast)
- ห้ามเงียบ
- redirect ได้เฉพาะตอน state ถูกต้องเท่านั้น

---

## สิ่งที่ไม่อยู่ในขอบเขต
- แปลงเป็น SPA
- แชร์ state ระหว่างหน้า
- routing ซับซ้อนระหว่าง runtime

---

## โครงสร้างโฟลเดอร์ (Folder Structure)
- **Root**: `index.html` และหน้า AR (`image.html`, `face.html`, ฯลฯ) อยู่ที่ root ทั้งหมด
- **Logic**: โค้ดทั้งหมดอยู่ใน `src/` แบ่งเป็น:
  - `src/core/`: Logic กลาง (Config, Loader, Utils)
  - `src/image/`: Logic เฉพาะของ image.html
  - `src/face/`: Logic เฉพาะของ face.html
  - `src/styles/`: ไฟล์ CSS (Vanilla CSS)
- **Assets**: ไฟล์รูป/โมเดล อยู่ใน `public/`
- **Entry Points**: 
  - `main.js` -> สำหรับ `index.html`
  - `image/index.js` -> สำหรับ `image.html`
  - ฯลฯ

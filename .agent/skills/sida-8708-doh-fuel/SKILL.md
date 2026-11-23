---
name: sida-8708-doh-fuel
description: ระบบเบิกค่าใช้จ่ายในการเดินทางไปราชการ แบบ 8708 + บก.111 + หน้างบ + แผน T&V (.docx) + ค้นหาระยะทางและแคปรูป DOH TO TRAVEL อัตโนมัติ (สำนักงานเกษตรอำเภอสีดา จ.นครราชสีมา) รองรับไฟล์ Standalone ออฟไลน์, ส่วนเสริม Chrome/Edge (DOH Auto-Bot) และ Google Apps Script
---

# สกิลระบบเบิกค่าน้ำมันและค่าใช้จ่ายเดินทาง (แบบ 8708 + DOH TO TRAVEL) — อ.สีดา

ใช้สกิลนี้เมื่อสร้าง ปรับปรุง แก้ไขบั๊ก หรือต่อยอดระบบเบิกค่าใช้จ่ายในการเดินทางไปราชการของ **สำนักงานเกษตรอำเภอสีดา จังหวัดนครราชสีมา** (แบบ 8708, บก.111, หน้างบ, ภาคผนวกแผนที่ DOH, ส่วนเสริม Chrome/Edge `DOH Auto-Bot`, และ Google Apps Script)

## กฎเกณฑ์ทางธุรกิจที่ห้ามละเมิด (Non-Negotiable Rules)

1. **เส้นทางไป–กลับตามแผนการเดินทาง T&V (`.docx`)**:
   - ต้องเริ่มต้นจาก **`สำนักงานเกษตรอำเภอสีดา`** (`หมู่ 1 ต.สีดา อ.สีดา จ.นครราชสีมา 30430`) → แวะหมู่บ้านตามลำดับในแผน → กลับมายัง **`สำนักงานเกษตรอำเภอสีดา`**
   - ต้องเรียงลำดับวันเดินทางตามวันที่จริง (`dateIso`) ไม่ใช่ตามลำดับแถวดิบในตาราง `.docx`
   - แยก **วันออกพื้นที่ (VISITING / เบิกน้ำมัน)** ออกจาก **วันประชุม ณ สำนักงาน (DM / WM — 0 กม.)** โดยค่าเริ่มต้นติ๊กเฉพาะวันออกพื้นที่
2. **แหล่งอ้างอิงระยะทางที่อนุญาตเท่านั้น**:
   - ใช้เฉพาะเว็บกรมทางหลวง **[DOH TO TRAVEL](https://dohgis.doh.go.th/dohtotravel/)** เงื่อนไข **`ถนนหลัก (สั้นและตรง)`** (`mode=c`, `type=25`)
   - ห้ามนำลิงก์จากระบบแผนที่อื่น (เช่น Google Maps) มาใช้เป็นหลักฐานระยะทาง
3. **กฎปัดเศษระยะทางลงเป็นจำนวนเต็มเสมอ (`floorKm`)**:
   - ระยะทางจาก DOH ต้องปัดเศษลงด้วย `Math.floor` เสมอ ทั้งเลขอารบิกและเลขไทย (`๐-๙`):
     - `42.66 กม.` → **`42 กม.`**
     - `35.99 กม.` → **`35 กม.`**
     - `๑๙.๘๕ กม.` → **`19 กม.`**
   - ใช้ระยะทางที่ปัดลงแล้วคำนวณค่าพาหนะ (`กม.ปัดลง × อัตราบาท/กม.` ค่าเริ่มต้น `4 บาท/กม.`) และต้องตรงกันทุกจุด: แบบ 8708, บก.111, หน้างบ, Word (`.doc`), PDF, และ Google Sheets
4. **นโยบายไม่ล็อกปุ่ม (Non-Blocking UX)**:
   - ห้ามปิดการใช้งานหรือล็อกปุ่มถัดไป / สร้างเอกสาร / พิมพ์ / ส่งออก Word-PDF
   - ให้แสดงแถบความคืบหน้า (`หลักฐาน DOH: X / N วัน`) และป้ายเตือนแบบกดย้อนกลับไปแนบรูปได้ทันทีหากวันที่ติ๊กเบิกน้ำมันยังขาดรูปแคปจาก DOH
5. **นโยบายความปลอดภัยกับเว็บ DOH (Strict Anti-Bot Compliance)**:
   - หากเว็บ DOH TO TRAVEL แสดงหน้าตรวจสอบความปลอดภัย (CAPTCHA / Verification) ต้องหยุดการทำงานทันที เปิดแท็บให้ผู้ใช้ยืนยันเอง ห้ามเขียนโค้ดแก้หรือบายพาสเด็ดขาด
   - ห้ามปลอม Header (`Referer`/`Origin`) จากนอกเบราว์เซอร์ ให้ทำงานผ่านส่วนเสริมในแท็บ `https://dohgis.doh.go.th/dohtotravel/` จริงบนเครื่องผู้ใช้เท่านั้น
6. **ไฟล์ Standalone ต้องออฟไลน์ 100%**:
   - ไฟล์ `dist/sida_8708_fuel_integrated.html` ต้องไม่มี External Network Request เมื่อโหลดหน้า (ฝัง Tailwind, jsPDF, html2canvas, ฟอนต์ TH SarabunIT๙, QR และ base64 ของ `sida-doh-auto-bot.zip` ไว้ในตัว)

---

## สถาปัตยกรรมระบบ (3 ส่วนหลัก)

### 1. เว็บแอปแบบ 8708 + บก.111 + หน้างบ (`sida-8708-integrated/`)
- `index.html` — UI 7 ขั้นตอน (Wizard), แถบสถานะ DOH (`#doh-progress-banner`), แถบควบคุมบอท (`#doh-bot-bar`), หน้าต่างคู่มือติดตั้งบอท (`#doh-bot-install-modal`), แถบ Cloud Sync (`#gas-cloud-bar`)
- `js/sida-tv-doh.js` — ตัวอ่านไฟล์ `.docx` (Zero-dependency ZIP/XML + `DecompressionStream`), ฐานข้อมูล 50 หมู่บ้าน 5 ตำบล อ.สีดา (`SIDA_VILLAGES_ROWS`), `floorKm()`, การจัดลำดับจุดแวะ `buildStopsForRow()`, ตัวอ่าน/ครอป PDF (`processRowPdfFile`), สะพานเชื่อมต่อบอท `window.__dohBot`, และสะพาน Google Apps Script `window.__tvDohCloud`
- `js/app.js` — ระบบคำนวณเบี้ยเลี้ยง/พาหนะ/เพดานงบรายเดือน, เอกสาร 8708/บก.111/หน้างบ/ภาคผนวกแผนที่, ส่งออก Word/PDF, `localStorage` draft
- `build_standalone.mjs` — สคริปต์รวมไฟล์สร้าง:
  - `dist/sida_8708_fuel_integrated.html` (ไฟล์เดียวออฟไลน์ ~2.3 MB)
  - ไฟล์แยกสำหรับ Google Apps Script (`Index.html`, `DohJs.html`, `AppJs.html`)

### 2. ส่วนเสริม Chrome / Edge (`sida-doh-auto-bot/`)
- `manifest.json` (Manifest V3) — รองรับ `http://localhost/*`, `http://127.0.0.1/*`, `file:///*`, `https://*.googleusercontent.com/*`, `https://script.google.com/*` ด้วย `all_frames: true`
- `bridge.js` — สะพาน `window.postMessage` (`SIDA_DOH_BOT_TO_EXT` ↔ `SIDA_DOH_BOT_FROM_EXT`)
- `background.js` — Service Worker เปิดแท็บ `https://dohgis.doh.go.th/dohtotravel/`, ฉีด `doh_logic.js` เข้า `world: 'MAIN'`, ค้นหาจุดแวะและคำนวณเส้นทางจริง, แคชพิกัดใน `chrome.storage.local`, ดึงภาพแผนที่จาก `mmmap15.longdo.com/mmmap/snippet/` + ลายน้ำ `logo_report.4717a982.png`, และส่งผลลัพธ์รายวันกลับไปยัง `tabId` + `frameId` เดิม
- `doh_logic.js` — ฟังก์ชัน Pure JS สำหรับแยกแยะหมู่บ้านชื่อซ้ำใน อ.สีดา (`scoreSearchCandidate`, `pickBestCandidate`), สูตรระยะทาง/เวลาเดียวกับ DOH (`distanceToUnit`, `intervalToUnit`), และตัววาดภาพใบรายงานมาตรฐาน DOH (`renderDohReportCardOnCanvas`)

### 3. Google Apps Script (`sida-fuel-apps-script/`)
- `Code.gs` — แบ็กเอนด์สร้าง 5 แท็บ Google Sheets อัตโนมัติ, อัปโหลดรูปแผนที่ขึ้น Google Drive โฟลเดอร์ `หลักฐานระยะทาง_DOH_TO_TRAVEL`, บันทึก/โหลดฉบับร่างแบบ 8708, และฟังก์ชัน `buildWebAppHtml_()` รวมไฟล์ `Index.html` + `DohJs.html` + `AppJs.html` (ใช้ callback `.replace()` เพื่อหลีกเลี่ยงปัญหา template tag `<?`)
- `Index.html`, `DohJs.html`, `AppJs.html` — แยกไฟล์หน้าเว็บเพื่อให้คัดลอกวางใน Apps Script Editor ได้รวดเร็วไม่ค้าง
- `appsscript.json` — ตั้งเขตเวลา `Asia/Bangkok` และ OAuth scopes (`spreadsheets`, `drive`)

---

## ขั้นตอน Build และทดสอบเมื่อมีการแก้ไขโค้ด

1. หากแก้ไฟล์ใน `sida-doh-auto-bot/` ให้แพ็ก ZIP ใหม่ลง `sida-8708-integrated/downloads/sida-doh-auto-bot.zip` ก่อน
2. รัน `node sida-8708-integrated/build_standalone.mjs` เพื่อสร้าง:
   - `dist/sida_8708_fuel_integrated.html`
   - `sida-fuel-apps-script/Index.html`, `DohJs.html`, `AppJs.html`
3. ตรวจสอบให้ผ่านทุกชุดทดสอบ (0 error, 0 unexpected dialog, 0 external request บนหน้า standalone):
   - ทดสอบ Google Apps Script (`test_gas.js` + ตรวจ `buildWebAppHtml_()`)
   - ทดสอบ Extension & การแยกหมู่บ้านซ้ำ + วาดภาพรายงาน (`verify_doh_bot_extension.mjs`)
   - ทดสอบ End-to-End แบบผสานรวม (`verify_integrated.mjs`)
   - ทดสอบ Regression ระบบ 8708/บก.111/เพดานงบ (`verify_baseline_regression.mjs`)

## ไฟล์อ้างอิงเพิ่มเติมในสกิลนี้
- `references/sida-50-villages.md` — รายชื่อครบ 50 หมู่บ้าน 5 ตำบล อำเภอสีดา พร้อมคำค้น DOH และจุดระวังหมู่บ้านชื่อซ้ำ
- `references/apps-script-deploy.md` — คู่มือการ Deploy Google Apps Script และโครงสร้างตาราง Google Sheets 5 แท็บ

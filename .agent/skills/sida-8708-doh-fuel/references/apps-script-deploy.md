# คู่มือการ Deploy ระบบ 8708 + DOH Auto-Bot บน Google Apps Script

## รายการไฟล์ในโปรเจกต์ Apps Script
| ชื่อไฟล์ใน Apps Script | ชนิดไฟล์ | แหล่งที่มา | หน้าที่ |
|---|---|---|---|
| `Code.gs` | Script | `Code.gs` | แบ็กเอนด์ Google Sheets (5 แท็บ), อัปโหลดรูปลง Google Drive, ประกอบ HTML (`buildWebAppHtml_()`) |
| `Index` | HTML | `Index.html` | โครงหน้าเว็บหลัก แบบ 8708 + บก.111 + หน้างบ |
| `DohJs` | HTML | `DohJs.html` | อ่าน `.docx`, DOH TO TRAVEL, สะพานบอท Auto-Bot, Cloud Sync |
| `AppJs` | HTML | `AppJs.html` | ระบบคำนวณงบ เบี้ยเลี้ยง พาหนะ พิมพ์ ส่งออก Word/PDF |
| `appsscript.json` | Manifest | `appsscript.json` | ตั้งเขตเวลา `Asia/Bangkok` และสิทธิ์ Spreadsheets + Drive |

## ขั้นตอนติดตั้ง (3 นาที)
1. สร้าง Google Sheets ใหม่ → เมนู **ส่วนขยาย (Extensions) → Apps Script**
2. วางโค้ดลง `Code.gs` → กด `Ctrl+S`
3. กด `+` → เลือก **HTML** → สร้างไฟล์ชื่อ **`Index`**, **`DohJs`**, **`AppJs`** (ตัวพิมพ์ใหญ่-เล็กตรงกัน) แล้ววางเนื้อหาจากแต่ละไฟล์ให้ครบ
4. เปิด **Project Settings (⚙️)** → ติ๊ก **"Show 'appsscript.json' manifest file in editor"** → วางเนื้อหาจาก `appsscript.json`
5. กด **Deploy → New deployment → Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Only myself` หรือ `Anyone with a Google account`
6. กด **Authorize access** → ยืนยันสิทธิ์ → เปิด Web App URL บน Chrome/Edge ที่ติดตั้งส่วนเสริม `DOH Auto-Bot` ไว้แล้ว

## โครงสร้าง 5 แท็บ Google Sheets (สร้างอัตโนมัติ)
1. `แบบ8708_บันทึกฉบับร่าง` — เก็บ JSON ฉบับร่าง + File ID รูปแผนที่บน Drive
2. `ประวัติแผนงาน` — สรุปรายการแผน T&V ที่อัปโหลด
3. `แผนเดินทางและระยะทาง` — รายการเดินทางรายวัน ระยะทางปัดลง (กม.) ค่าเชื้อเพลิง ลิงก์ภาพ
4. `ฐานข้อมูลหมู่บ้าน` — ข้อมูล 50 หมู่บ้านใน อ.สีดา
5. `ตั้งค่าระบบ` — อัตราบาท/กม. และข้อมูลเจ้าหน้าที่/ผู้รับรอง

## การทำงานร่วมกับ DOH Auto-Bot
- ส่วนเสริม `sida-doh-auto-bot` อนุญาต `https://*.googleusercontent.com/*` และ `https://script.google.com/*` พร้อม `all_frames: true`
- เมื่อเปิดเว็บแอป Apps Script ระบบจะเชื่อมบอทอัตโนมัติ (`🟢 เชื่อมต่อ DOH Auto-Bot`) และแถบ `☁️ บันทึกลง Drive/Sheets` จะแสดงด้านบนโดยอัตโนมัติ

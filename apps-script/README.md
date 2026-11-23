# คู่มือการ Deploy ระบบ 8708 + DOH Auto-Bot บน Google Apps Script

## รายการไฟล์ในโฟลเดอร์ `apps-script/`
| ชื่อไฟล์ใน Apps Script | ชนิดไฟล์ | แหล่งที่มา | หน้าที่ |
|---|---|---|---|
| `Code.gs` | Script | `Code.gs` | แบ็กเอนด์ Google Sheets (5 แท็บ), อัปโหลดรูปลง Google Drive, ประกอบ HTML (`buildWebAppHtml_()`) |
| `Index` | HTML | `Index.html` | โครงหน้าเว็บหลัก แบบ 8708 + บก.111 + หน้างบ |
| `DohJs` | HTML | `DohJs.html` | อ่าน `.docx`, DOH TO TRAVEL, สะพานบอท Auto-Bot, Cloud Sync |
| `AppJs` | HTML | `AppJs.html` | ระบบคำนวณงบ เบี้ยเลี้ยง พาหนะ พิมพ์ ส่งออก Word/PDF |
| `appsscript.json` | Manifest | `appsscript.json` | ตั้งเขตเวลา `Asia/Bangkok` และตั้งค่า Web App |

## วิธี Deploy ผ่าน Clasp CLI
```powershell
clasp push -f
clasp deploy -d "ระบบเบิกค่าน้ำมัน แบบ 8708 + DOH Auto-Bot (อ.สีดา)"
```

## วิธีติดตั้งด้วยตนเองผ่าน Google Sheets (ทางเลือก)
1. สร้าง Google Sheets ใหม่ → เมนู **ส่วนขยาย (Extensions) → Apps Script**
2. วางโค้ดลง `Code.gs` → กด `Ctrl+S`
3. กด `+` → เลือก **HTML** → สร้างไฟล์ชื่อ **`Index`**, **`DohJs`**, **`AppJs`** (ตัวพิมพ์ใหญ่-เล็กตรงกัน) แล้ววางเนื้อหาจากแต่ละไฟล์ให้ครบ
4. เปิด **Project Settings (⚙️)** → ติ๊ก **"Show 'appsscript.json' manifest file in editor"** → วางเนื้อหาจาก `appsscript.json`
5. กด **Deploy → New deployment → Web app**

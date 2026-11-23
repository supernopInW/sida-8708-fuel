# คู่มือยื่นส่วนเสริม DOH Auto-Bot ขึ้น Store (กดติดตั้ง 1 คลิก)

ไฟล์ทั้งหมดที่ต้องใช้อยู่ในโฟลเดอร์ `store-release/` แล้ว:
- **ไฟล์ส่วนเสริมสำหรับอัปโหลด:** `store-release/sida-doh-auto-bot-store-v1.1.0.zip` *(มี `manifest.json` อยู่ที่ root ตามกฎ Store และตัด `<all_urls>` ออกแล้ว)*
- **โลโก้สำหรับ Microsoft Edge Add-ons (300×300):** `store-release/store-logo-300x300.png`
- **โลโก้สำหรับ Chrome Web Store (128×128):** `store-release/store-logo-128x128.png`
- **ลิงก์ Privacy Policy (ออนไลน์พร้อมใช้):** `https://supernopinw.github.io/sida-8708-fuel/privacy.html`
- **ลิงก์หน้าเว็บหลัก:** `https://supernopinw.github.io/sida-8708-fuel/`

---

## ช่องทางที่ 1: Microsoft Edge Add-ons *(แนะนำ — ฟรี 100% ไม่มีค่าสมัคร!)*

1. ไปที่ **Microsoft Partner Center:** https://partner.microsoft.com/dashboard/microsoftedge/public/login
2. ลงชื่อเข้าใช้ด้วยบัญชี Microsoft (Outlook / Hotmail) → สมัครเป็นนักพัฒนา Microsoft Edge *(ฟรี ไม่ต้องใช้บัตรเครดิต)*
3. กด **Create new extension**
4. **หน้า Packages:** อัปโหลดไฟล์ `store-release/sida-doh-auto-bot-store-v1.1.0.zip`
5. **หน้า Properties:**
   - **Category:** `Productivity`
   - **Privacy Policy URL:** `https://supernopinw.github.io/sida-8708-fuel/privacy.html`
   - **Website URL:** `https://supernopinw.github.io/sida-8708-fuel/`
6. **หน้า Store listings (ภาษาไทย / English):**
   - **Logo:** อัปโหลด `store-release/store-logo-300x300.png`
   - **Short description:** คัดลอกจากหัวข้อ "ข้อความสำหรับ Copy-Paste" ด้านล่าง
   - **Description:** คัดลอกจากหัวข้อ "ข้อความสำหรับ Copy-Paste" ด้านล่าง
   - **Screenshot (บังคับอย่างน้อย 1 รูป ขนาด 1280×800 หรือ 640×400):** แคปภาพหน้าจอหน้าเว็บ `https://supernopinw.github.io/sida-8708-fuel/` มาอัปโหลด 1 รูป
7. **หน้า Availability:** เลือก **Public** (หรือ **Hidden** หากต้องการให้เข้าถึงเฉพาะคนที่มีลิงก์)
8. **หน้า Notes for certification:** คัดลอกข้อความด้านล่างไปวาง → กด **Publish** (รอตรวจประมาณ 1–3 วันทำการ)

---

## ช่องทางที่ 2: Chrome Web Store *(ค่าสมัครนักพัฒนาครั้งเดียว \$5 — ใช้ได้ทั้ง Chrome และ Edge)*

1. ไปที่ **Chrome Web Store Developer Dashboard:** https://chrome.google.com/webstore/devconsole
2. ลงชื่อเข้าใช้ด้วยบัญชี Google → ชำระค่าลงทะเบียนครั้งเดียว \$5
3. กด **New Item** → อัปโหลดไฟล์ `store-release/sida-doh-auto-bot-store-v1.1.0.zip`
4. กรอก **Store listing** (Logo 128×128, Screenshot 1280×800, Description)
5. กรอกแท็บ **Privacy practices** ด้วยข้อความ Permission Justifications ด้านล่าง และใส่ Privacy Policy URL: `https://supernopinw.github.io/sida-8708-fuel/privacy.html`
6. เลือก **Visibility:** `Unlisted` (เฉพาะคนที่มีลิงก์ติดตั้งได้) หรือ `Public` → กด **Submit for review**

---

## ข้อความสำหรับ Copy-Paste ในฟอร์มยื่น Store

### Short Description (ไม่เกิน 132 ตัวอักษร)
```text
ค้นหาระยะทางและแคปรูปแผนที่จาก DOH TO TRAVEL (กรมทางหลวง) อัตโนมัติ ส่งตรงเข้าแบบ 8708 สำนักงานเกษตรอำเภอสีดา
```

### Detailed Description (ภาษาไทย + English)
```text
DOH Auto-Bot เป็นส่วนเสริมสำหรับระบบจัดทำใบเบิกค่าใช้จ่ายในการเดินทางไปราชการ (แบบ 8708 และ บก.111) ของสำนักงานเกษตรอำเภอสีดา จังหวัดนครราชสีมา

ความสามารถหลัก:
• เชื่อมต่ออัตโนมัติกับหน้าเว็บระบบเบิกค่าน้ำมัน 8708 (https://supernopinw.github.io/sida-8708-fuel/)
• เปิดแท็บกรมทางหลวง DOH TO TRAVEL (dohgis.doh.go.th) ค้นหาเส้นทางถนนหลัก (สั้นและตรง) ตามแผนการเดินทาง T&V
• แคปภาพใบรายงานระยะทางและแผนที่ส่งกลับเข้าหน้าเว็บแบบ 8708 โดยอัตโนมัติ
• ประมวลผลบนเครื่องผู้ใช้ทั้งหมด ไม่มีการเก็บหรือส่งข้อมูลส่วนบุคคลออกภายนอก

---

DOH Auto-Bot is a companion extension for the Sida District Agricultural Extension Office Form 8708 travel reimbursement web app (https://supernopinw.github.io/sida-8708-fuel/). It automates official road distance lookup and route report capture from Thailand's Department of Highways (dohgis.doh.go.th/dohtotravel/). All processing runs locally in the user's browser with zero personal data collection.
```

### Permission Justifications (สำหรับแท็บ Privacy / Certification Notes)

- **Single Purpose Description:**
```text
Automate road distance lookups and route map report generation from Thailand's Department of Highways (dohgis.doh.go.th/dohtotravel/) for the Sida District Form 8708 travel reimbursement web application.
```

- **`tabs` justification:**
```text
Used only to open or locate the dohgis.doh.go.th/dohtotravel/ tab when the user clicks the fetch button on the Form 8708 web app, and to send route results back to the originating Form 8708 tab.
```

- **`scripting` justification:**
```text
Used only to execute the bundled local script (doh_logic.js) on dohgis.doh.go.th/dohtotravel/ to query village routes and render the official distance report image. No remote code is ever executed.
```

- **`storage` justification:**
```text
Used solely to cache public village coordinates in chrome.storage.local to reduce repeated search queries; users can clear the cache anytime via the extension popup.
```

- **`host_permissions` justification:**
```text
Restricted strictly to *.doh.go.th (Department of Highways distance/search API and watermark), *.longdo.com (route geometry and map snippet used by DOH TO TRAVEL), and the Form 8708 web application hosts (*.github.io, script.google.com, *.googleusercontent.com).
```

- **Notes for Certification (สำหรับทีมตรวจ Microsoft / Google):**
```text
This extension works together with our public web app at https://supernopinw.github.io/sida-8708-fuel/.
To test:
1. Install the extension and open https://supernopinw.github.io/sida-8708-fuel/
2. The green status badge will show that DOH Auto-Bot is connected.
3. No login or user account is required, and no user data is collected or sent to any external server.
```

---

## หลังจาก Store อนุมัติแล้ว
เมื่อได้ลิงก์จาก Microsoft Edge Add-ons หรือ Chrome Web Store แล้ว ส่งลิงก์นั้นกลับมาให้ผมได้เลยครับ ผมจะเอาไปทำเป็น **ปุ่ม "ติดตั้ง DOH Auto-Bot (1 คลิก)"** แปะไว้ด้านบนสุดของหน้าเว็บ https://supernopinw.github.io/sida-8708-fuel/ ให้ทันที!

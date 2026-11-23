/**
 * ระบบเบิกค่าน้ำมันและค่าใช้จ่ายเดินทางไปราชการ (แบบ 8708 + บก.111 + หน้างบ + DOH Auto-Bot)
 * สำนักงานเกษตรอำเภอสีดา จังหวัดนครราชสีมา (5 ตำบล 50 หมู่บ้าน)
 *
 * โครงสร้าง 5 แท็บ Google Sheets (สร้างอัตโนมัติ):
 * 1. แบบ8708_บันทึกฉบับร่าง
 * 2. ประวัติแผนงาน
 * 3. แผนเดินทางและระยะทาง
 * 4. ฐานข้อมูลหมู่บ้าน
 * 5. ตั้งค่าระบบ
 */

var SHEET_NAMES = {
  DRAFTS: 'แบบ8708_บันทึกฉบับร่าง',
  PLANS: 'ประวัติแผนงาน',
  TRIPS: 'แผนเดินทางและระยะทาง',
  VILLAGES: 'ฐานข้อมูลหมู่บ้าน',
  SETTINGS: 'ตั้งค่าระบบ'
};

var DRIVE_FOLDER_NAME = 'หลักฐานระยะทาง_DOH_TO_TRAVEL';
var PROP_SPREADSHEET_ID = 'SIDA_8708_SPREADSHEET_ID';
var PROP_FOLDER_ID = 'SIDA_8708_FOLDER_ID';

var SIDA_VILLAGES_ROWS = [
        // จุดเริ่มต้น / จุดกลับ
        ['OFFICE', 0, 'สำนักงานเกษตรอำเภอสีดา', 'สำนักงานเกษตรอำเภอสีดา', 'กรมส่งเสริมการเกษตร สำนักงานเกษตรอำเภอสีดา หมู่ 1 ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        // ตำบลหนองตาดใหญ่ (9 หมู่บ้าน)
        ['หนองตาดใหญ่', 1, 'บ้านหนองตาดใหญ่', 'บ้านหนองตาดใหญ่ หนองตาดใหญ่ สีดา', 'บ้านหนองตาดใหญ่ หมู่ที่ 1 บ้านหนองตาดใหญ่ ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 2, 'บ้านหนองตาด', 'บ้านหนองตาด หนองตาดใหญ่ สีดา', 'บ้านหนองตาด หมู่ที่ 2 บ้านหนองตาด ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 3, 'บ้านหนองจะบก', 'บ้านหนองจะบก หนองตาดใหญ่ สีดา', 'บ้านหนองจะบก หมู่ที่ 3 บ้านหนองจะบก ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 4, 'บ้านหัวนาคำ', 'บ้านหัวนาคำ หนองตาดใหญ่ สีดา', 'บ้านหัวนาคำ หมู่ที่ 4 บ้านหัวนาคำ ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 5, 'บ้านดอนเต็ง', 'บ้านดอนเต็ง หนองตาดใหญ่ สีดา', 'บ้านดอนเต็ง หมู่ที่ 5 บ้านดอนเต็ง ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 6, 'บ้านดอนสะแบง', 'บ้านดอนสะแบง หนองตาดใหญ่ สีดา', 'บ้านดอนสะแบง หมู่ที่ 6 บ้านดอนสะแบง ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 7, 'บ้านโสกนกเต็น', 'บ้านโสกนกเต็น หนองตาดใหญ่ สีดา', 'บ้านโสกนกเต็น หมู่ที่ 7 บ้านโสกนกเต็น ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 8, 'บ้านเมืองสูง', 'บ้านเมืองสูง หนองตาดใหญ่ สีดา', 'บ้านเมืองสูง หมู่ที่ 8 บ้านเมืองสูง ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        ['หนองตาดใหญ่', 9, 'บ้านหนองเทียมพัฒนา', 'บ้านหนองเทียมพัฒนา หนองตาดใหญ่ สีดา', 'บ้านหนองเทียมพัฒนา หมู่ที่ 9 บ้านหนองเทียมพัฒนา ต.หนองตาดใหญ่ อ.สีดา จ.นครราชสีมา 30430'],
        // ตำบลสีดา (11 หมู่บ้าน)
        ['สีดา', 1, 'บ้านสีดา', 'บ้านสีดา สีดา สีดา', 'บ้านสีดา หมู่ที่ 1 บ้านสีดา ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 2, 'บ้านหนองเรือ', 'บ้านหนองเรือ สีดา สีดา', 'บ้านหนองเรือ หมู่ที่ 2 บ้านหนองเรือ ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 3, 'บ้านโนนเมือง', 'บ้านโนนเมือง สีดา สีดา', 'บ้านโนนเมือง หมู่ที่ 3 บ้านโนนเมือง ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 4, 'บ้านเก่า', 'บ้านเก่า สีดา สีดา', 'บ้านเก่า หมู่ที่ 4 บ้านเก่า ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 5, 'บ้านหญ้าคา', 'บ้านหญ้าคา สีดา สีดา', 'บ้านหญ้าคา หมู่ที่ 5 บ้านหญ้าคา ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 6, 'บ้านหนองแก', 'บ้านหนองแก สีดา สีดา', 'บ้านหนองแก หมู่ที่ 6 บ้านหนองแก ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 7, 'บ้านดอนดู่', 'บ้านดอนดู่ สีดา สีดา', 'บ้านดอนดู่ หมู่ที่ 7 บ้านดอนดู่ ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 8, 'บ้านหินแห่', 'บ้านหินแห่ สีดา สีดา', 'บ้านหินแห่ หมู่ที่ 8 บ้านหินแห่ ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 9, 'บ้านถนนหัก', 'บ้านถนนหัก สีดา สีดา', 'บ้านถนนหัก หมู่ที่ 9 บ้านถนนหัก ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 10, 'บ้านดอนโก่ย', 'บ้านดอนโก่ย สีดา สีดา', 'บ้านดอนโก่ย หมู่ที่ 10 บ้านดอนโก่ย ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        ['สีดา', 11, 'บ้านหนองไข่เหี้ย', 'บ้านหนองไข่เหี้ย สีดา สีดา', 'บ้านหนองไข่เหี้ย หมู่ที่ 11 บ้านหนองไข่เหี้ย ต.สีดา อ.สีดา จ.นครราชสีมา 30430'],
        // ตำบลโพนทอง (10 หมู่บ้าน)
        ['โพนทอง', 1, 'บ้านตลาดนาบุญ', 'บ้านตลาดนาบุญ โพนทอง สีดา', 'บ้านตลาดนาบุญ หมู่ที่ 1 บ้านตลาดนาบุญ ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 2, 'บ้านลิงส่อง', 'บ้านลิงส่อง โพนทอง สีดา', 'บ้านลิงส่อง หมู่ที่ 2 บ้านลิงส่อง ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 3, 'บ้านโนนสัง', 'บ้านโนนสัง โพนทอง สีดา', 'บ้านโนนสัง หมู่ที่ 3 บ้านโนนสัง ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 4, 'บ้านมะค่า', 'บ้านมะค่า โพนทอง สีดา', 'บ้านมะค่า หมู่ที่ 4 บ้านมะค่า ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 5, 'บ้านหนองโน', 'บ้านหนองโน โพนทอง สีดา', 'บ้านหนองโน หมู่ที่ 5 บ้านหนองโน ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 6, 'บ้านหนองหว้า', 'บ้านหนองหว้า โพนทอง สีดา', 'บ้านหนองหว้า หมู่ที่ 6 บ้านหนองหว้า ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 7, 'บ้านแท่น', 'บ้านแท่น โพนทอง สีดา', 'บ้านแท่น หมู่ที่ 7 บ้านแท่น ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 8, 'บ้านใต้', 'บ้านใต้ โพนทอง สีดา', 'บ้านใต้ หมู่ที่ 8 บ้านใต้ ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 9, 'บ้านโพนทอง', 'บ้านโพนทอง โพนทอง สีดา', 'บ้านโพนทอง หมู่ที่ 9 บ้านโพนทอง ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        ['โพนทอง', 10, 'บ้านหนองพลวง', 'บ้านหนองพลวง โพนทอง สีดา', 'บ้านหนองพลวง หมู่ที่ 10 บ้านหนองพลวง ต.โพนทอง อ.สีดา จ.นครราชสีมา 30430'],
        // ตำบลโนนประดู่ (10 หมู่บ้าน)
        ['โนนประดู่', 1, 'บ้านดอนม่วง', 'บ้านดอนม่วง โนนประดู่ สีดา', 'บ้านดอนม่วง หมู่ที่ 1 บ้านดอนม่วง ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 2, 'บ้านทองหลางใหญ่', 'บ้านทองหลางใหญ่ โนนประดู่ สีดา', 'บ้านทองหลางใหญ่ หมู่ที่ 2 บ้านทองหลางใหญ่ ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 3, 'บ้านโนนประดู่', 'บ้านโนนประดู่ โนนประดู่ สีดา', 'บ้านโนนประดู่ หมู่ที่ 3 บ้านโนนประดู่ ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 4, 'บ้านสำโรง', 'บ้านสำโรง โนนประดู่ สีดา', 'บ้านสำโรง หมู่ที่ 4 บ้านสำโรง ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 5, 'บ้านหนองสะแก', 'บ้านหนองสะแก โนนประดู่ สีดา', 'บ้านหนองสะแก หมู่ที่ 5 บ้านหนองสะแก ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 6, 'บ้านเสว', 'บ้านเสว โนนประดู่ สีดา', 'บ้านเสว หมู่ที่ 6 บ้านเสว ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 7, 'บ้านตาลาด', 'บ้านตาลาด โนนประดู่ สีดา', 'บ้านตาลาด หมู่ที่ 7 บ้านตาลาด ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 8, 'บ้านหนองอ้ายแหนบ', 'บ้านหนองอ้ายแหนบ โนนประดู่ สีดา', 'บ้านหนองอ้ายแหนบ หมู่ที่ 8 บ้านหนองอ้ายแหนบ ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 9, 'บ้านงิ้วเก่า', 'บ้านงิ้วเก่า โนนประดู่ สีดา', 'บ้านงิ้วเก่า หมู่ที่ 9 บ้านงิ้วเก่า ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        ['โนนประดู่', 10, 'บ้านโนนสะอาด', 'บ้านโนนสะอาด โนนประดู่ สีดา', 'บ้านโนนสะอาด หมู่ที่ 10 บ้านโนนสะอาด ต.โนนประดู่ อ.สีดา จ.นครราชสีมา 30430'],
        // ตำบลสามเมือง (10 หมู่บ้าน)
        ['สามเมือง', 1, 'บ้านสามเมือง', 'บ้านสามเมือง สามเมือง สีดา', 'บ้านสามเมือง หมู่ที่ 1 บ้านสามเมือง ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 2, 'บ้านโนนเมือง', 'บ้านโนนเมือง สามเมือง สีดา', 'บ้านโนนเมือง หมู่ที่ 2 บ้านโนนเมือง ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 3, 'บ้านแฝก', 'บ้านแฝก สามเมือง สีดา', 'บ้านแฝก หมู่ที่ 3 บ้านแฝก ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 4, 'บ้านโนนสำราญ', 'บ้านโนนสำราญ สามเมือง สีดา', 'บ้านโนนสำราญ หมู่ที่ 4 บ้านโนนสำราญ ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 5, 'บ้านโนนกอก', 'บ้านโนนกอก สามเมือง สีดา', 'บ้านโนนกอก หมู่ที่ 5 บ้านโนนกอก ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 6, 'บ้านโนนสมบูรณ์', 'บ้านโนนสมบูรณ์ สามเมือง สีดา', 'บ้านโนนสมบูรณ์ หมู่ที่ 6 บ้านโนนสมบูรณ์ ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 7, 'บ้านหัวตะโมน', 'บ้านหัวตะโมน สามเมือง สีดา', 'บ้านหัวตะโมน หมู่ที่ 7 บ้านหัวตะโมน ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 8, 'บ้านชาด', 'บ้านชาด สามเมือง สีดา', 'บ้านชาด หมู่ที่ 8 บ้านชาด ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 9, 'บ้านตะกุดขอน', 'บ้านตะกุดขอน สามเมือง สีดา', 'บ้านตะกุดขอน หมู่ที่ 9 บ้านตะกุดขอน ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430'],
        ['สามเมือง', 10, 'บ้านตะคร้อ', 'บ้านตะคร้อ สามเมือง สีดา', 'บ้านตะคร้อ หมู่ที่ 10 บ้านตะคร้อ ต.สามเมือง อ.สีดา จ.นครราชสีมา 30430']
    ];

function doGet(e) {
  return HtmlService.createHtmlOutput(buildWebAppHtml_())
    .setTitle('ระบบเบิกค่าน้ำมันและค่าใช้จ่ายเดินทาง แบบ 8708 + DOH Auto-Bot (อ.สีดา)')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/**
 * รวมไฟล์ Index.html + DohJs.html + AppJs.html
 * ใช้ callback function ใน .replace() เพื่อป้องกันปัญหารูปแบบพิเศษ ($&, $') และหลีกเลี่ยง template tag <?
 */
function buildWebAppHtml_() {
  var indexHtml = HtmlService.createHtmlOutputFromFile('Index').getContent();
  var dohJs = HtmlService.createHtmlOutputFromFile('DohJs').getContent();
  var appJs = HtmlService.createHtmlOutputFromFile('AppJs').getContent();
  var out = indexHtml
    .replace('<script id="sida-doh-js-placeholder"></script>', function() { return dohJs; })
    .replace('<script id="sida-app-js-placeholder"></script>', function() { return appJs; });
  if (out.indexOf('triggerTvDocxPicker') === -1) {
    out = out.replace('</body>', function() { return dohJs + '\n' + appJs + '\n</body>'; });
  }
  return out;
}

/**
 * ปัดระยะทางกิโลเมตรลงเป็นจำนวนเต็มเสมอ (Math.floor) รองรับเลขอารบิกและเลขไทย
 */
function floorKm_(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isFinite(val) && val > 0 ? Math.floor(val) : 0;
  var thaiDigits = '๐๑๒๓๔๕๖๗๘๙';
  var s = String(val).replace(/[๐-๙]/g, function(ch) {
    var idx = thaiDigits.indexOf(ch);
    return idx >= 0 ? String(idx) : ch;
  }).replace(/,/g, '').trim();
  var m = s.match(/\d+(?:\.\d+)?/);
  if (!m) return 0;
  var n = parseFloat(m[0]);
  return isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function nowThaiIso_() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
}

function getOrCreateSpreadsheet_() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (ss) {
    ensureSheetsInitialized_(ss);
    return ss;
  }
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty(PROP_SPREADSHEET_ID);
  if (savedId) {
    try {
      ss = SpreadsheetApp.openById(savedId);
    } catch (e) {
      ss = null;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('ระบบเบิกค่าน้ำมัน_แบบ8708_DOH_อำเภอสีดา');
    props.setProperty(PROP_SPREADSHEET_ID, ss.getId());
  }
  ensureSheetsInitialized_(ss);
  return ss;
}

function getOrCreateMapFolder_() {
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty(PROP_FOLDER_ID);
  if (savedId) {
    try {
      var f = DriveApp.getFolderById(savedId);
      if (f && !f.isTrashed()) return f;
    } catch (e) {}
  }
  var iter = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (iter.hasNext()) {
    var existing = iter.next();
    props.setProperty(PROP_FOLDER_ID, existing.getId());
    return existing;
  }
  var created = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  props.setProperty(PROP_FOLDER_ID, created.getId());
  return created;
}

function ensureSheetWithHeader_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  }
  return sh;
}

function ensureSheetsInitialized_(ss) {
  ensureSheetWithHeader_(ss, SHEET_NAMES.DRAFTS, [
    'draftId', 'title', 'officerName', 'periodText', 'grandTotal', 'dayCount', 'updatedAt', 'formStateJson', 'mapFilesJson'
  ]);
  ensureSheetWithHeader_(ss, SHEET_NAMES.PLANS, [
    'planId', 'fileName', 'reportTitle', 'officerName', 'officerPosition', 'periodText',
    'approverName', 'approverPosition', 'totalTrips', 'fieldTrips', 'totalDistanceKm', 'fuelRate', 'totalFuelCost', 'updatedAt'
  ]);
  ensureSheetWithHeader_(ss, SHEET_NAMES.TRIPS, [
    'planId', 'seqNo', 'dateIso', 'dateDisplay', 'category', 'activity', 'detail',
    'locationRaw', 'isFieldTrip', 'routeSummary', 'distanceKm', 'fuelRate', 'fuelCost', 'imageFileId', 'imageUrl'
  ]);
  var vSheet = ensureSheetWithHeader_(ss, SHEET_NAMES.VILLAGES, [
    'ตำบล', 'หมู่ที่', 'ชื่อหมู่บ้าน', 'คำค้นหา_DOH', 'ที่อยู่เต็ม_DOH'
  ]);
  if (vSheet.getLastRow() <= 1 && SIDA_VILLAGES_ROWS && SIDA_VILLAGES_ROWS.length) {
    vSheet.getRange(2, 1, SIDA_VILLAGES_ROWS.length, 5).setValues(SIDA_VILLAGES_ROWS);
  }
  var sSheet = ensureSheetWithHeader_(ss, SHEET_NAMES.SETTINGS, [
    'คีย์ (Key)', 'ค่า (Value)', 'คำอธิบาย'
  ]);
  if (sSheet.getLastRow() <= 1) {
    var defaultSettings = [
      ['fuelRatePerKm', '4', 'อัตราค่าน้ำมันเชื้อเพลิง (บาท/กิโลเมตร)'],
      ['officeName', 'สำนักงานเกษตรอำเภอสีดา', 'สถานที่ตั้งสำนักงานเริ่มต้นและสิ้นสุดการเดินทาง'],
      ['amphoeName', 'สีดา', 'อำเภอ'],
      ['provinceName', 'นครราชสีมา', 'จังหวัด'],
      ['dohCondition', 'ถนนหลัก (สั้นและตรง) (mode=c, type=25)', 'เงื่อนไขการคำนวณระยะทาง DOH TO TRAVEL'],
      ['roundingRule', 'Math.floor (ปัดเศษทศนิยมลงเป็นจำนวนเต็มเสมอ)', 'กติกาการปัดระยะทางกิโลเมตร']
    ];
    sSheet.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings);
  }
}

function getSettingsMap_(ss) {
  var sh = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  var out = {};
  if (!sh || sh.getLastRow() <= 1) return out;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i][0] || '').trim();
    if (k) out[k] = rows[i][1];
  }
  return out;
}

function listPlans_(ss) {
  var sh = ss.getSheetByName(SHEET_NAMES.PLANS);
  if (!sh || sh.getLastRow() <= 1) return [];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues();
  var list = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (!r[0]) continue;
    list.push({
      planId: String(r[0]),
      fileName: String(r[1] || ''),
      reportTitle: String(r[2] || ''),
      officerName: String(r[3] || ''),
      officerPosition: String(r[4] || ''),
      periodText: String(r[5] || ''),
      approverName: String(r[6] || ''),
      approverPosition: String(r[7] || ''),
      totalTrips: Number(r[8] || 0),
      fieldTrips: Number(r[9] || 0),
      totalDistanceKm: floorKm_(r[10]),
      fuelRate: Number(r[11] || 4),
      totalFuelCost: Number(r[12] || 0),
      updatedAt: String(r[13] || '')
    });
  }
  return list;
}

function getInitialState() {
  var ss = getOrCreateSpreadsheet_();
  var folder = getOrCreateMapFolder_();
  return {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    plans: listPlans_(ss),
    settings: getSettingsMap_(ss)
  };
}

function listForm8708CloudDrafts() {
  var ss = getOrCreateSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.DRAFTS);
  if (!sh || sh.getLastRow() <= 1) return [];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  var out = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (!r[0]) continue;
    out.push({
      draftId: String(r[0]),
      title: String(r[1] || r[0]),
      officerName: String(r[2] || ''),
      periodText: String(r[3] || ''),
      grandTotal: r[4] || 0,
      dayCount: Number(r[5] || 0),
      updatedAt: String(r[6] || '')
    });
  }
  return out;
}

function saveDataUrlToDrive_(folder, dataUrl, fileName) {
  var m = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  var mimeType = m[1];
  var b64 = m[2];
  var bytes = Utilities.base64Decode(b64);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var file = folder.createFile(blob);
  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    mimeType: mimeType
  };
}

function readDriveImageAsDataUrl_(fileId) {
  if (!fileId) return '';
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var mime = blob.getContentType() || 'image/png';
    var b64 = Utilities.base64Encode(blob.getBytes());
    return 'data:' + mime + ';base64,' + b64;
  } catch (e) {
    return '';
  }
}

function saveForm8708CloudDraft(payload) {
  payload = payload || {};
  var ss = getOrCreateSpreadsheet_();
  var folder = getOrCreateMapFolder_();
  var nowStr = nowThaiIso_();
  var draftId = String(payload.draftId || '').trim() || ('DRAFT_' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss'));
  var state = payload.formState || {};
  var fields = state.fields || {};
  var officerName = String(payload.officerName || fields['in-name'] || 'ผู้เบิก').trim();
  var officerPos = String(fields['in-pos'] || '').trim();
  var periodText = String(payload.periodText || fields['in-dep-my'] || '').trim();
  var title = String(payload.title || (officerName + (periodText ? ' (' + periodText + ')' : ''))).trim();
  var fuelRate = Number(fields['in-vehicle-rate'] || fields['in-budget-fuel-rate'] || 4) || 4;

  var travelDays = Array.isArray(state.travelDays) ? state.travelDays : [];
  var uploadedMaps = 0;
  var mapFilesMeta = [];
  var totalKm = 0;
  var fieldTripCount = 0;

  var clonedDays = [];
  for (var i = 0; i < travelDays.length; i++) {
    var d = Object.assign({}, travelDays[i]);
    var kmInt = floorKm_(d.km);
    if (d.km !== '' && d.km !== null && d.km !== undefined) {
      d.km = String(kmInt);
    }
    if (d.fuel || kmInt > 0) {
      fieldTripCount++;
      totalKm += kmInt;
    }
    if (d.mapDataUrl && String(d.mapDataUrl).indexOf('data:image/') === 0) {
      var safeDate = String(d.date || ('day_' + (i + 1))).replace(/[^a-zA-Z0-9ก-๙_-]+/g, '_');
      var fname = draftId + '_' + (i + 1) + '_' + safeDate + '.png';
      var saved = saveDataUrlToDrive_(folder, d.mapDataUrl, fname);
      if (saved) {
        d.mapFileId = saved.fileId;
        d.mapFileUrl = saved.fileUrl;
        d.mapDataUrl = '';
        uploadedMaps++;
        mapFilesMeta.push({ index: i, date: d.date || '', fileId: saved.fileId, fileUrl: saved.fileUrl });
      }
    }
    clonedDays.push(d);
  }

  var stateToStore = Object.assign({}, state, { travelDays: clonedDays });
  var stateJson = JSON.stringify(stateToStore);
  if (stateJson.length > 45000) {
    var jsonBlob = Utilities.newBlob(stateJson, 'application/json', draftId + '_state.json');
    var jsonFile = folder.createFile(jsonBlob);
    stateJson = JSON.stringify({ __driveJsonFileId: jsonFile.getId() });
  }

  var totalFuelCost = totalKm * fuelRate;
  var grandTotal = fields['in-vehicle-claim'] || totalFuelCost;

  // 1. Upsert in แบบ8708_บันทึกฉบับร่าง
  var dSheet = ss.getSheetByName(SHEET_NAMES.DRAFTS);
  var dRowValues = [
    draftId, title, officerName, periodText, grandTotal, travelDays.length, nowStr, stateJson, JSON.stringify(mapFilesMeta)
  ];
  upsertRowByKey_(dSheet, 1, draftId, dRowValues);

  // 2. Sync summary to ประวัติแผนงาน
  var pSheet = ss.getSheetByName(SHEET_NAMES.PLANS);
  var pRowValues = [
    draftId,
    title,
    'แผนการเดินทางและเบิกค่าน้ำมัน แบบ 8708',
    officerName,
    officerPos,
    periodText,
    String(fields['in-approver-name'] || ''),
    String(fields['in-approver-pos'] || ''),
    travelDays.length,
    fieldTripCount,
    totalKm,
    fuelRate,
    totalFuelCost,
    nowStr
  ];
  upsertRowByKey_(pSheet, 1, draftId, pRowValues);

  // 3. Sync daily rows to แผนเดินทางและระยะทาง
  var tSheet = ss.getSheetByName(SHEET_NAMES.TRIPS);
  deleteRowsByKey_(tSheet, 1, draftId);
  if (clonedDays.length > 0) {
    var tRows = [];
    for (var j = 0; j < clonedDays.length; j++) {
      var cd = clonedDays[j];
      var tv = cd.tvMeta || {};
      var rowKm = floorKm_(cd.km);
      var isField = Boolean(cd.fuel || rowKm > 0);
      var routeSum = 'สำนักงานเกษตรอำเภอสีดา -> ' + (cd.dest || '-') + ' -> สำนักงานเกษตรอำเภอสีดา';
      tRows.push([
        draftId,
        j + 1,
        tv.dateIso || '',
        cd.date || '',
        tv.category || (isField ? 'VISITING' : 'OFFICE'),
        tv.activity || cd.sum || '',
        tv.detail || cd.sum || '',
        cd.dest || '',
        isField,
        routeSum,
        rowKm,
        fuelRate,
        isField ? (rowKm * fuelRate) : 0,
        cd.mapFileId || '',
        cd.mapFileUrl || ''
      ]);
    }
    tSheet.getRange(tSheet.getLastRow() + 1, 1, tRows.length, tRows[0].length).setValues(tRows);
  }

  return {
    ok: true,
    draftId: draftId,
    uploadedMaps: uploadedMaps,
    updatedAt: nowStr,
    spreadsheetUrl: ss.getUrl(),
    folderUrl: folder.getUrl()
  };
}

function loadForm8708CloudDraft(draftId) {
  var ss = getOrCreateSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.DRAFTS);
  if (!sh || sh.getLastRow() <= 1) throw new Error('ไม่พบฉบับร่างใน Google Sheets');
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (String(r[0]) === String(draftId)) {
      var rawJson = String(r[7] || '{}');
      var parsed = JSON.parse(rawJson);
      if (parsed && parsed.__driveJsonFileId) {
        var jf = DriveApp.getFileById(parsed.__driveJsonFileId);
        parsed = JSON.parse(jf.getBlob().getDataAsString('UTF-8'));
      }
      var days = Array.isArray(parsed.travelDays) ? parsed.travelDays : [];
      for (var j = 0; j < days.length; j++) {
        if (days[j].km !== '' && days[j].km !== null && days[j].km !== undefined) {
          days[j].km = String(floorKm_(days[j].km));
        }
        if (!days[j].mapDataUrl && days[j].mapFileId) {
          days[j].mapDataUrl = readDriveImageAsDataUrl_(days[j].mapFileId);
        }
      }
      return {
        ok: true,
        draftId: String(r[0]),
        title: String(r[1] || ''),
        formState: parsed
      };
    }
  }
  throw new Error('ไม่พบฉบับร่างรหัส: ' + draftId);
}

function getPlanData(planId) {
  var ss = getOrCreateSpreadsheet_();
  var plans = listPlans_(ss);
  var tSheet = ss.getSheetByName(SHEET_NAMES.TRIPS);
  var trips = [];
  if (tSheet && tSheet.getLastRow() > 1) {
    var rows = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 15).getValues();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (planId && String(r[0]) !== String(planId)) continue;
      trips.push({
        planId: String(r[0]),
        seqNo: Number(r[1] || (i + 1)),
        dateIso: String(r[2] || ''),
        dateDisplay: String(r[3] || ''),
        category: String(r[4] || ''),
        activity: String(r[5] || ''),
        detail: String(r[6] || ''),
        locationRaw: String(r[7] || ''),
        isFieldTrip: Boolean(r[8]),
        routeSummary: String(r[9] || ''),
        distanceKm: floorKm_(r[10]),
        fuelRate: Number(r[11] || 4),
        fuelCost: Number(r[12] || 0),
        imageFileId: String(r[13] || ''),
        imageUrl: String(r[14] || '')
      });
    }
  }
  return {
    ok: true,
    plans: plans,
    trips: trips
  };
}

function getPlanPrintImages(planId) {
  var data = getPlanData(planId);
  var trips = data.trips || [];
  var out = {};
  for (var i = 0; i < trips.length; i++) {
    var fid = trips[i].imageFileId;
    if (fid && !out[fid]) {
      var dataUrl = readDriveImageAsDataUrl_(fid);
      if (dataUrl) out[fid] = dataUrl;
    }
  }
  return out;
}

function upsertRowByKey_(sheet, keyCol1Based, keyVal, rowValues) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var keys = sheet.getRange(2, keyCol1Based, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(keyVal)) {
        sheet.getRange(i + 2, 1, 1, rowValues.length).setValues([rowValues]);
        return;
      }
    }
  }
  sheet.getRange(lastRow + 1, 1, 1, rowValues.length).setValues([rowValues]);
}

function deleteRowsByKey_(sheet, keyCol1Based, keyVal) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  var keys = sheet.getRange(2, keyCol1Based, lastRow - 1, 1).getValues();
  for (var i = keys.length - 1; i >= 0; i--) {
    if (String(keys[i][0]) === String(keyVal)) {
      sheet.deleteRow(i + 2);
    }
  }
}

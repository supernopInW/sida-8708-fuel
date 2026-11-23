/**
 * ระบบเบิกค่าน้ำมันและค่าใช้จ่ายเดินทางไปราชการ (แบบ 8708 + บก.111 + หน้างบ + DOH Auto-Bot)
 * สำนักงานเกษตรอำเภอสีดา จังหวัดนครราชสีมา (5 ตำบล 50 หมู่บ้าน)
 *
 * โหมด Web App พร้อมใช้งานทันที (Zero-Auth Immediate Access)
 * หากต้องการเปิดใช้งานระบบฐานข้อมูล Google Sheets 5 แท็บ + Google Drive
 * สามารถใช้ไฟล์ Code_Sheets_Drive.gs แล้วกด Run > Authorize access ในหน้า Apps Script Editor ได้ทันที
 */
function doGet(e) {
  return HtmlService.createHtmlOutput(buildWebAppHtml_())
    .setTitle('ระบบเบิกค่าน้ำมันและค่าใช้จ่ายเดินทาง แบบ 8708 + DOH Auto-Bot (อ.สีดา)')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

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

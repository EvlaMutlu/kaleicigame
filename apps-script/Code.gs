/**
 * Kaleiçi Keşif – Google E-Tablolar alıcısı.
 * Uygulamadan gelen olayları "Olaylar" sayfasına satır satır yazar.
 * Kurulum adımları README.md dosyasında.
 */
const SHEET_NAME = 'Olaylar';
const HEADERS = ['zaman', 'kod', 'grup', 'olay', 'durak', 'ayrinti', 'cihaz', 'alindi'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    const body = JSON.parse(e.postData.contents);
    const list = Array.isArray(body) ? body : [body];
    const now = new Date();
    const rows = list.map(r => [r.ts, r.code, r.group, r.event, r.stop, r.data, r.device, now]);
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Kaleiçi Keşif alıcısı çalışıyor.');
}

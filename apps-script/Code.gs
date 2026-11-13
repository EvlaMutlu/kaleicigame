/**
 * Kaleiçi Kaşifi – Google E-Tablolar alıcısı.
 * Uygulamadan gelen olayları "Olaylar" sayfasına satır satır yazar.
 * Kurulum adımları README.md dosyasında.
 */
const SHEET_NAME = 'Olaylar';
const HEADERS = ['zaman', 'kod', 'grup', 'olay', 'durak', 'ayrinti', 'cihaz', 'alindi'];
// Katılımcıların önerdiği yeni yerler: ayrı sayfa + fotoğraflar Drive'da ayrı klasör.
const SUG_SHEET = 'Öneriler';
const SUG_HEADERS = ['zaman', 'oneri_id', 'kod', 'grup', 'yer_adi', 'kategori', 'kisa_bilgi', 'enlem', 'boylam', 'konum_dogrulugu_m', 'konum_nasil', 'fotograflar', 'harita', 'alindi', 'karar'];
const PHOTO_FOLDER = 'Kaleiçi Kaşifi – Öneri Fotoğrafları';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    const body = JSON.parse(e.postData.contents);
    if (body && body.type === 'oneri') return saveSuggestion(ss, body);
    const list = Array.isArray(body) ? body : [body];
    const now = new Date();
    const rows = list.map(r => [r.ts, r.code, r.group, r.event, r.stop, r.data, r.device, now]);
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function saveSuggestion(ss, s) {
  const sh = ss.getSheetByName(SUG_SHEET) || ss.insertSheet(SUG_SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(SUG_HEADERS);
  // aynı öneri iki kez gelirse (bağlantı kopması) tekrar yazma
  const ids = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat() : [];
  if (ids.indexOf(s.id) !== -1) return ContentService.createTextOutput('ok');
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  const links = (s.photos || []).map((d, i) => {
    const b64 = String(d).split(',')[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', `${s.id}_${s.code}_${i + 1}.jpg`);
    return folder.createFile(blob).getUrl();
  });
  sh.appendRow([s.ts, s.id, s.code, s.group, s.name, s.cat, s.note, s.lat, s.lon, s.acc, s.how,
    links.join('\n'), `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=19/${s.lat}/${s.lon}`, new Date(), '']);
  return ContentService.createTextOutput('ok');
}

function doGet() {
  return ContentService.createTextOutput('Kaleiçi Kaşifi alıcısı çalışıyor.');
}

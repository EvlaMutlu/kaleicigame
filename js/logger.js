// Olay kaydı: her olay telefonda saklanır ve Google E-Tablolar'a gönderilir.
// İnternet yoksa kuyrukta bekler, bağlantı gelince gönderilir.
import { CONFIG } from './config.js';

const ALL = 'kaleici_log', PENDING = 'kaleici_pending';
let ctx = { code: '', group: '' };

const load = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* depolama dolu/kapalı */ } };

export function setContext(code, group) { ctx = { code, group }; }

export function log(event, stopId = '', data = {}) {
  const row = {
    ts: new Date().toISOString(), code: ctx.code, group: ctx.group,
    event, stop: stopId, data: JSON.stringify(data),
    device: navigator.userAgent.slice(0, 120),
  };
  save(ALL, [...load(ALL), row]);
  save(PENDING, [...load(PENDING), row]);
  flush();
}

let flushing = false;
export async function flush() {
  if (flushing || !CONFIG.SHEETS_URL || !navigator.onLine) return;
  const batch = load(PENDING);
  if (!batch.length) return;
  flushing = true;
  try {
    // Apps Script CORS başlığı döndürmediği için "no-cors" + düz metin gönderilir.
    await fetch(CONFIG.SHEETS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(batch) });
    const rest = load(PENDING).slice(batch.length);
    save(PENDING, rest);
  } catch { /* sonra tekrar denenir */ }
  flushing = false;
}

// Yer önerileri (fotoğraflı) ayrı kuyrukta tutulur ve tek tek gönderilir; olay kaydını şişirmez.
const SUG = 'kaleici_oneriler';
export function queueSuggestion(s) {
  const q = load(SUG); q.push(s); save(SUG, q);
  if (load(SUG).length !== q.length) { // depolama doluysa fotoğrafsız sakla
    s.photos = []; s.note += ' [fotoğraf telefonda saklanamadı]'; save(SUG, [...load(SUG), s]);
  }
  flushSuggestions();
}
let sending = false;
export async function flushSuggestions() {
  if (sending || !CONFIG.SHEETS_URL || !navigator.onLine) return;
  sending = true;
  try {
    for (let q = load(SUG); q.length; q = load(SUG)) {
      await fetch(CONFIG.SHEETS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ type: 'oneri', ...q[0] }) });
      save(SUG, load(SUG).filter(x => x.id !== q[0].id));
    }
  } catch { /* sonra tekrar denenir */ }
  sending = false;
}

export const pendingCount = () => load(PENDING).length;

export function downloadCsv() {
  const rows = load(ALL);
  const cols = ['ts', 'code', 'group', 'event', 'stop', 'data', 'device'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `kaleici_${ctx.code || 'veri'}.csv`;
  a.click();
}

window.addEventListener('online', () => { flush(); flushSuggestions(); });
setInterval(() => { flush(); flushSuggestions(); }, 15000);

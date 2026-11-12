import { CONFIG } from './config.js';
import { CATEGORIES, haversineM, recommendRoute, orderStops, routeTime, rankByInterest } from './route.js';
import { log, setContext, downloadCsv, pendingCount, flush } from './logger.js';
import { BADGES, newlyEarned, recommendations } from './badges.js';

const $ = sel => document.querySelector(sel);
const app = $('#app');
const TEST = new URLSearchParams(location.search).has('test');
const CAT_LABEL = { sanat: 'Sanat', tarih: 'Tarih', eglence: 'Eğlence', kultur: 'Kültür', gastronomi: 'Gastronomi' };
const LEVELS = [['kolay', 'Kolay'], ['orta', 'Orta'], ['zor', 'Zor']];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let STOPS = [], STOP = {}, QUESTIONS = {}, CODES = {};
let st = null;               // kalıcı durum
let map = null, layers = {}, pos = null, watchId = null, wakeLock = null;

// ---------- durum ----------
const KEY = 'kaleici_state';
const fresh = () => ({ phase: 'welcome', code: '', group: '', profile: null, route: [], visited: [], arrivals: {}, answers: {}, badges: [], qLevel: 'kolay', pendingQuestion: null, startedAt: null });
function save() { try { localStorage.setItem(KEY, JSON.stringify({ ...st, stopsById: undefined })); } catch { } }
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function go(phase) { st.phase = phase; save(); render(); }

// ---------- başlat ----------
async function init() {
  const [stops, q, codes] = await Promise.all(['data/stops.json', 'data/questions.json', 'data/codes.json'].map(u => fetch(u).then(r => r.json())));
  STOPS = stops; STOPS.forEach(s => STOP[s.id] = s);
  QUESTIONS = q.questions || {}; CODES = codes;
  st = { ...fresh(), ...(load() || {}) };
  if (st.code) setContext(st.code, st.group);
  render();
}

function render() {
  Object.defineProperty(st, 'stopsById', { value: STOP, enumerable: false, writable: true, configurable: true });
  const views = { welcome, consent, profile, preview, tour, end };
  (views[st.phase] || welcome)();
}

// ---------- 1. kod girişi ----------
function welcome() {
  app.innerHTML = `
  <section class="screen center">
    <div class="brand"><div class="logo">K</div><h1>Kaleiçi Keşif</h1><p class="muted">Antalya Kaleiçi kültürel miras rotası</p></div>
    <label class="field">Katılımcı kodunuz
      <input id="code" autocomplete="off" autocapitalize="characters" placeholder="KLC-XXXX" value="${esc(st.code)}">
    </label>
    <p id="err" class="error" hidden>Bu kod tanınmadı. Lütfen araştırmacıya danışın.</p>
    <button id="go" class="btn primary">Devam</button>
    ${TEST ? '<p class="muted small">Test modu: TEST-A, TEST-B veya TEST-C kodlarını kullanabilirsiniz.</p>' : ''}
  </section>`;
  $('#go').onclick = () => {
    const code = $('#code').value.trim().toUpperCase();
    const group = CODES[code] || (TEST && /^TEST-[ABC]$/.test(code) ? code.slice(-1) : null);
    if (!group) { $('#err').hidden = false; return; }
    Object.assign(st, { code, group }); setContext(code, group);
    log('kod_girildi', '', { test: TEST });
    go('consent');
  };
}

// ---------- 2. onam ----------
function consent() {
  app.innerHTML = `
  <section class="screen">
    <h2>Bilgilendirme ve onam</h2>
    <div class="card prose">
      <p><b>[Etik kurul onaylı onam metni buraya gelecek.]</b></p>
      <p>Bu uygulama, Antalya Bilim Üniversitesi tarafından yürütülen bir araştırmanın parçasıdır. Tur sırasında uygulamadaki seçimleriniz, ziyaret ettiğiniz duraklar ve konumunuza bağlı varış bilgileri kişisel bilgileriniz olmadan, yalnızca katılımcı kodunuzla kaydedilir.</p>
      <p>Katılım gönüllüdür; istediğiniz anda gerekçe göstermeden ayrılabilirsiniz.</p>
    </div>
    <button id="ok" class="btn primary">Okudum, katılmayı kabul ediyorum</button>
    <button id="back" class="btn ghost">Geri</button>
  </section>`;
  $('#ok').onclick = () => { log('onam_verildi'); st.startedAt = new Date().toISOString(); go(st.group === 'A' ? 'tour' : 'profile'); };
  $('#back').onclick = () => go('welcome');
}

// ---------- 3. kişiselleştirme (B, C) ----------
function profile() {
  const p = st.profile || { minutes: 60, pace: 'orta', routeDifficulty: 'orta', interests: Object.fromEntries(CATEGORIES.map(c => [c, 3])) };
  const chips = (name, opts, val) => `<div class="chips" data-name="${name}">${opts.map(([v, l]) => `<button type="button" class="chip ${String(v) === String(val) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
  app.innerHTML = `
  <section class="screen">
    <h2>Rotanızı birlikte oluşturalım</h2>
    <div class="q"><h3>Bu gezide ne kadar vaktiniz var?</h3>${chips('minutes', CONFIG.TIME_OPTIONS.map(m => [m, m < 60 ? `${m} dk` : `${m / 60} sa`]), p.minutes)}</div>
    <div class="q"><h3>Yürüme hızınız nasıldır?</h3>${chips('pace', [['yavas', 'Yavaş'], ['orta', 'Orta'], ['hizli', 'Hızlı']], p.pace)}</div>
    <div class="q"><h3>Rotanız ne kadar zorlu olsun?</h3>
      ${chips('routeDifficulty', [['kolay', 'Kolay'], ['orta', 'Orta'], ['zor', 'Zor']], p.routeDifficulty)}
      <p class="muted small">Kolay: düz yollar; zor: yokuş ve merdivenler de dahil.</p></div>
    <div class="q"><h3>Hangi tür yerler ilginizi çeker?</h3><p class="muted small">0: hiç ilgimi çekmez, 5: çok ilgimi çeker</p>
      ${CATEGORIES.map(c => `<label class="slider"><span>${CAT_LABEL[c]}</span><input type="range" min="0" max="5" step="1" data-cat="${c}" value="${p.interests[c]}"><output>${p.interests[c]}</output></label>`).join('')}
    </div>
    ${st.group === 'C' ? `<div class="q"><h3>Soruların zorluğu nasıl olsun?</h3>${chips('qLevel', LEVELS, st.qLevel)}<p class="muted small">Tur sırasında istediğiniz zaman değiştirebilirsiniz.</p></div>` : ''}
    <button id="next" class="btn primary">Rotamı göster</button>
  </section>`;
  app.querySelectorAll('.chips').forEach(g => g.onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    g.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
  });
  app.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => r.nextElementSibling.textContent = r.value);
  $('#next').onclick = async () => {
    const val = n => app.querySelector(`.chips[data-name="${n}"] .on`)?.dataset.v;
    st.profile = {
      minutes: +val('minutes'), pace: val('pace'), routeDifficulty: val('routeDifficulty'),
      interests: Object.fromEntries([...app.querySelectorAll('input[type=range]')].map(r => [r.dataset.cat, +r.value])),
    };
    if (st.group === 'C') st.qLevel = val('qLevel');
    log('profil', '', { ...st.profile, qLevel: st.group === 'C' ? st.qLevel : null });
    $('#next').textContent = 'Rota hazırlanıyor…';
    const start = await startPoint();
    const r = recommendRoute(STOPS, st.profile, routeOpts(start));
    st.start = start; st.route = r.stops.map(s => s.id);
    log('rota_onerildi', '', { route: st.route, totalMin: Math.round(r.time.totalMin), start, knn: r.ranked.slice(0, 10) });
    go('preview');
  };
}

const routeOpts = start => ({ start, pace: st.profile?.pace || 'orta', detour: CONFIG.DETOUR, dwellMin: CONFIG.DWELL_MIN });

function startPoint() {
  return new Promise(resolve => {
    const fallback = { ...CONFIG.DEFAULT_START, source: 'varsayilan' };
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(p => {
      const here = { lat: p.coords.latitude, lon: p.coords.longitude };
      resolve(haversineM(here, CONFIG.KALEICI_CENTER) <= CONFIG.START_RADIUS_M ? { ...here, name: 'Konumunuz', source: 'gps' } : fallback);
    }, () => resolve(fallback), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  });
}

// ---------- 4. rota önizleme ve düzenleme (B, C) ----------
function preview() {
  const stops = st.route.map(id => STOP[id]);
  const t = routeTime(st.start, stops, routeOpts(st.start));
  const over = t.totalMin > st.profile.minutes;
  const others = rankByInterest(STOPS.filter(s => !st.route.includes(s.id)), st.profile.interests).map(r => r.stop);
  app.innerHTML = `
  <section class="screen">
    <h2>Size önerilen rota</h2>
    <p class="muted">${esc(st.start.name)} noktasından başlayarak ${stops.length} durak · yaklaşık ${Math.round(t.totalMin)} dk
      (${Math.round(t.walkMin)} dk yürüyüş)</p>
    ${over ? `<p class="warn">Rota seçtiğiniz ${st.profile.minutes} dakikayı aşıyor.</p>` : ''}
    <ol class="route">${t.legs.map(l => `
      <li><div><b>${esc(l.stop.title)}</b><span class="muted small">${Math.max(1, Math.round(l.walkMin))} dk yürüme · ${topCats(l.stop)}</span></div>
      <button class="icon" data-rm="${l.stop.id}" aria-label="Çıkar">✕</button></li>`).join('')}</ol>
    <details class="add"><summary>Durak ekle</summary>
      <ul>${others.map(s => `<li><span>${esc(s.title)}<span class="muted small"> · ${topCats(s)}${s.difficulty === 'zor' ? ' · yokuşlu' : ''}</span></span><button class="icon add" data-add="${s.id}" aria-label="Ekle">＋</button></li>`).join('')}</ul>
    </details>
    <button id="start" class="btn primary" ${stops.length ? '' : 'disabled'}>Turu başlat</button>
    <button id="back" class="btn ghost">Tercihleri değiştir</button>
  </section>`;
  const reorder = ids => orderStops(st.start, ids.map(id => STOP[id])).map(s => s.id);
  app.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { st.route = reorder(st.route.filter(id => id !== b.dataset.rm)); log('rota_duzenlendi', b.dataset.rm, { islem: 'cikar' }); save(); preview(); });
  app.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { st.route = reorder([...st.route, b.dataset.add]); log('rota_duzenlendi', b.dataset.add, { islem: 'ekle' }); save(); preview(); });
  $('#start').onclick = () => { log('tur_basladi', '', { route: st.route }); go('tour'); };
  $('#back').onclick = () => go('profile');
}
const topCats = s => CATEGORIES.filter(c => s.scores[c] >= 4).map(c => CAT_LABEL[c]).join(', ') || 'Genel';

// ---------- 5. tur ----------
function tour() {
  const isA = st.group === 'A';
  app.innerHTML = `
  <section class="tour">
    <header class="bar">
      <div><b>Kaleiçi Keşif</b><span class="muted small" id="progress"></span></div>
      <div class="bar-actions">
        ${st.group === 'C' ? `<button id="lvl" class="chip on small">Soru: ${levelLabel(st.qLevel)}</button><button id="badges" class="icon" aria-label="Rozetler">🏅</button>` : ''}
        ${isA ? '<button id="list" class="icon" aria-label="Duraklar">☰</button>' : ''}
      </div>
    </header>
    <div id="map"></div>
    <div id="gpsnote" class="note" hidden></div>
    <div class="sheet" id="sheet"></div>
  </section>`;
  setupMap();
  startWatch();
  keepAwake();
  if (st.group === 'C') { $('#lvl').onclick = levelPicker; $('#badges').onclick = showBadges; }
  if (isA) $('#list').onclick = showStopList;
  if (st.pendingQuestion) askQuestion(st.pendingQuestion, () => {});
  updateTour();
}
const levelLabel = v => LEVELS.find(l => l[0] === v)?.[1] || v;

function setupMap() {
  map = L.map('map', { zoomControl: false }).setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  layers.stops = L.layerGroup().addTo(map);
  layers.line = L.polyline([], { color: '#9a3b1b', weight: 4, opacity: .6, dashArray: '6 8' }).addTo(map);
  layers.me = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 });
  if (TEST) {
    map.on('click', e => onPosition({ coords: { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: 5 } }));
    showNote('Test modu: haritaya dokunarak konumunuzu taşıyın.');
  }
}

function drawStops() {
  layers.stops.clearLayers();
  const isA = st.group === 'A';
  const list = isA ? STOPS : st.route.map(id => STOP[id]);
  const next = nextStop();
  list.forEach((s, i) => {
    const visited = st.visited.includes(s.id);
    const cls = visited ? 'done' : (s === next ? 'next' : '');
    const icon = L.divIcon({ className: '', html: `<div class="pin ${cls}">${isA ? (visited ? '✓' : '•') : (visited ? '✓' : i + 1)}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    L.marker([s.lat, s.lon], { icon }).on('click', () => isA ? stopCard(s) : null).addTo(layers.stops);
  });
  layers.line.setLatLngs(isA ? [] : [[st.start.lat, st.start.lon], ...list.map(s => [s.lat, s.lon])]);
  if (!map._fitted) { map._fitted = true; const b = L.latLngBounds(list.map(s => [s.lat, s.lon])); if (b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 18 }); }
}

const nextStop = () => st.group === 'A' ? null : st.route.map(id => STOP[id]).find(s => !st.visited.includes(s.id)) || null;

function nearestUnvisited() {
  if (!pos) return null;
  return STOPS.filter(s => !st.visited.includes(s.id)).map(s => ({ s, d: haversineM(pos, s) })).sort((a, b) => a.d - b.d)[0] || null;
}

function updateTour() {
  if (st.phase !== 'tour' || !$('#sheet')) return;
  drawStops();
  const isA = st.group === 'A';
  $('#progress').textContent = isA ? ` · ${st.visited.length} durak gezildi` : ` · ${st.visited.length}/${st.route.length} durak`;
  if (isA) {
    const n = nearestUnvisited();
    $('#sheet').innerHTML = `
      <p class="muted small">En yakın durak</p>
      <h3>${n ? esc(n.s.title) : 'Haritadan bir durak seçin'}</h3>
      ${n ? `<p class="muted">${Math.round(n.d)} m uzakta</p>` : '<p class="muted">Konumunuz bekleniyor ya da duraklara haritadan ulaşabilirsiniz.</p>'}
      <div class="row">${n ? `<button id="here" class="btn primary">Durağa vardım</button>` : ''}<button id="finish" class="btn ghost">Turu bitir</button></div>`;
    if (n) $('#here').onclick = () => arrive(n.s, 'manuel');
  } else {
    const next = nextStop();
    if (!next) {
      $('#sheet').innerHTML = `<h3>Rotanızı tamamladınız 🎉</h3><button id="finish" class="btn primary">Turu bitir</button>`;
    } else {
      const d = pos ? Math.round(haversineM(pos, next)) : null;
      const mins = pos ? Math.max(1, Math.round(routeTime(pos, [next], routeOpts(pos)).walkMin)) : null;
      $('#sheet').innerHTML = `
        <p class="muted small">Sıradaki durak</p>
        <h3>${esc(next.title)}</h3>
        <p class="muted">${d != null ? `${d} m · yaklaşık ${mins} dk yürüme` : 'Konumunuz bekleniyor…'}</p>
        ${st.group === 'C' ? recoLine() : ''}
        <div class="row"><button id="here" class="btn primary">Durağa vardım</button><button id="finish" class="btn ghost">Turu bitir</button></div>`;
      $('#here').onclick = () => arrive(next, 'manuel');
    }
  }
  $('#finish').onclick = finishTour;
}

function recoLine() {
  const r = recommendations(st, 1)[0];
  return r ? `<p class="reco">${r.icon} Sıradaki rozet önerisi: <b>${esc(r.name)}</b> – ${esc(r.hint)} (${r.now}/${r.goal})</p>` : '';
}

// ---------- konum ----------
function startWatch() {
  if (TEST || !navigator.geolocation) { if (!TEST) showNote('Bu cihazda konum yok: durağa vardığınızda "Durağa vardım" düğmesini kullanın.'); return; }
  watchId = navigator.geolocation.watchPosition(onPosition, err => {
    showNote(err.code === 1 ? 'Konum izni verilmedi: durağa vardığınızda "Durağa vardım" düğmesini kullanın.' : 'Konum alınamıyor; "Durağa vardım" düğmesini kullanabilirsiniz.');
    log('konum_hatasi', '', { code: err.code });
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}

function onPosition(p) {
  pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
  if (layers.me) layers.me.setLatLng([pos.lat, pos.lon]).addTo(map);
  if (st.phase !== 'tour' || document.querySelector('.modal')) { updateTour(); return; }
  if (pos.acc <= CONFIG.MAX_ACCURACY_M) {
    const targets = st.group === 'A' ? STOPS.filter(s => !st.visited.includes(s.id)) : st.route.map(id => STOP[id]).filter(s => !st.visited.includes(s.id));
    const hit = targets.find(s => haversineM(pos, s) <= CONFIG.ARRIVAL_RADIUS_M);
    if (hit) { arrive(hit, 'gps'); return; }
  }
  updateTour();
}

async function keepAwake() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch { }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st?.phase === 'tour') keepAwake(); });

function showNote(t) { const n = $('#gpsnote'); if (n) { n.textContent = t; n.hidden = false; } }

// ---------- varış ----------
function arrive(stop, how) {
  if (st.visited.includes(stop.id)) return;
  const prev = st.visited.length ? st.visited[st.visited.length - 1] : null;
  st.visited.push(stop.id);
  st.arrivals[stop.id] = new Date().toISOString();
  log('varis', stop.id, { yontem: how, acc: pos?.acc ?? null, sira: st.visited.length });
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  save();
  // C grubu: bir önceki durağın sorusu, bu durağa varınca sorulur (hatırlamayı destekler).
  if (st.group === 'C' && prev && hasQuestion(prev) && !st.answers[prev]) {
    st.pendingQuestion = prev; save();
    askQuestion(prev, () => showInfo(stop));
  } else showInfo(stop);
}

function showInfo(stop) {
  const opened = Date.now();
  modal(`
    <div class="photo" style="--hue:${hashHue(stop.id)}">${stop.images?.length ? `<img src="${esc(stop.images[0])}" alt="">` : `<span>${esc(stop.title)}</span>`}</div>
    <h2>${esc(stop.title)}</h2>
    <div class="prose">${esc(stop.text).split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ“"])/).reduce((acc, s, i) => acc + (i && i % 3 === 0 ? '</p><p>' : ' ') + s, '<p>') + '</p>'}</div>
    <p class="muted small">Kaynak: ${esc(stop.source)}</p>
    <button class="btn primary" data-close>Devam</button>`, () => {
    log('bilgi_okundu', stop.id, { saniye: Math.round((Date.now() - opened) / 1000) });
    afterStop();
  });
}

function afterStop() {
  if (st.group === 'C') {
    const got = newlyEarned(st);
    if (got.length) { st.badges.push(...got.map(b => b.id)); save(); got.forEach(b => log('rozet', '', { rozet: b.id })); toast(got.map(b => `${b.icon} Yeni rozet: ${b.name}`).join('<br>')); }
  }
  updateTour();
  if (st.group !== 'A' && !nextStop()) setTimeout(finishTour, 600);
}

// ---------- sorular (C) ----------
const hasQuestion = id => !!QUESTIONS[id];
function pickQuestion(id, level) {
  const q = QUESTIONS[id] || {};
  if (q[level]) return { q: q[level], level };
  const alt = ['kolay', 'orta', 'zor'].find(l => q[l]);
  return alt ? { q: q[alt], level: alt, fallback: true } : null;
}

function askQuestion(stopId, done) {
  const stop = STOP[stopId];
  let attempts = 0;
  const draw = () => {
    const pick = pickQuestion(stopId, st.qLevel);
    if (!pick) { st.pendingQuestion = null; save(); return done(); }
    const shown = Date.now();
    modal(`
      <p class="muted small">Bir önceki durak: ${esc(stop.title)}</p>
      <div class="chips levels">${LEVELS.map(([v, l]) => `<button class="chip ${v === st.qLevel ? 'on' : ''}" data-lv="${v}">${l}</button>`).join('')}</div>
      ${pick.fallback ? `<p class="muted small">Bu durak için ${levelLabel(st.qLevel).toLowerCase()} soru yok; ${levelLabel(pick.level).toLowerCase()} soru gösteriliyor.</p>` : ''}
      <h2>${esc(pick.q.text)}</h2>
      <div class="options">${pick.q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <p id="fb" class="small"></p>`, null, true);
    document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
      log('soru_zorlugu_degisti', stopId, { eski: st.qLevel, yeni: b.dataset.lv, yer: 'soru' });
      st.qLevel = b.dataset.lv; save(); closeModal(); draw(); refreshLevelChip();
    });
    document.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      attempts++;
      const ok = +b.dataset.i === pick.q.answer;
      log('cevap', stopId, { seviye: pick.level, secenek: +b.dataset.i, dogru: ok, deneme: attempts, saniye: Math.round((Date.now() - shown) / 1000) });
      if (!ok) { b.classList.add('wrong'); b.disabled = true; $('#fb').textContent = 'Tekrar deneyin.'; return; }
      b.classList.add('right'); $('#fb').textContent = 'Doğru!';
      st.answers[stopId] = { level: pick.level, attempts }; st.pendingQuestion = null; save();
      setTimeout(() => { closeModal(); done(); }, 800);
    });
  };
  draw();
}

function levelPicker() {
  modal(`<h2>Soru zorluğu</h2><p class="muted">Soruların zorluğunu istediğiniz zaman değiştirebilirsiniz.</p>
    <div class="chips">${LEVELS.map(([v, l]) => `<button class="chip ${v === st.qLevel ? 'on' : ''}" data-lv="${v}">${l}</button>`).join('')}</div>
    <button class="btn ghost" data-close>Kapat</button>`);
  document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
    log('soru_zorlugu_degisti', '', { eski: st.qLevel, yeni: b.dataset.lv, yer: 'menu' });
    st.qLevel = b.dataset.lv; save(); closeModal(); refreshLevelChip();
  });
}
const refreshLevelChip = () => { const c = $('#lvl'); if (c) c.textContent = `Soru: ${levelLabel(st.qLevel)}`; };

function showBadges() {
  const reco = recommendations(st, 2);
  modal(`<h2>Rozetlerim</h2>
    <p class="muted small">Rozetler yalnızca sizin keşfinizi gösterir; sıralama ya da puan yoktur.</p>
    <div class="badges">${BADGES.map(b => `<div class="badge ${st.badges.includes(b.id) ? 'on' : ''}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>${esc(st.badges.includes(b.id) ? b.desc : b.hint)}</small></div>`).join('')}</div>
    ${reco.length ? `<h3>Önerilen sıradaki rozetler</h3><ul class="reco-list">${reco.map(r => `<li>${r.icon} <b>${esc(r.name)}</b>: ${esc(r.hint)} (${r.now}/${r.goal})</li>`).join('')}</ul>` : ''}
    <button class="btn ghost" data-close>Kapat</button>`);
  log('rozetler_acildi');
}

// ---------- A grubu: durak listesi ----------
function showStopList() {
  const list = [...STOPS].sort((a, b) => pos ? haversineM(pos, a) - haversineM(pos, b) : a.title.localeCompare(b.title, 'tr'));
  modal(`<h2>Duraklar</h2><ul class="stoplist">${list.map(s => `<li data-id="${s.id}"><span>${st.visited.includes(s.id) ? '✓ ' : ''}${esc(s.title)}</span><span class="muted small">${pos ? Math.round(haversineM(pos, s)) + ' m' : ''}</span></li>`).join('')}</ul><button class="btn ghost" data-close>Kapat</button>`);
  log('durak_listesi_acildi');
  document.querySelectorAll('.stoplist li').forEach(li => li.onclick = () => { closeModal(); stopCard(STOP[li.dataset.id]); });
}

function stopCard(s) {
  map.setView([s.lat, s.lon], 18);
  const visited = st.visited.includes(s.id);
  $('#sheet').innerHTML = `<p class="muted small">Seçilen durak</p><h3>${esc(s.title)}</h3>
    <p class="muted">${pos ? Math.round(haversineM(pos, s)) + ' m uzakta' : ''}</p>
    <div class="row">${visited ? `<button id="read" class="btn">Bilgiyi tekrar oku</button>` : `<button id="here" class="btn primary">Durağa vardım</button>`}<button id="finish" class="btn ghost">Turu bitir</button></div>`;
  if (visited) $('#read').onclick = () => showInfo(s); else $('#here').onclick = () => arrive(s, 'manuel');
  $('#finish').onclick = finishTour;
  log('durak_secildi', s.id);
}

// ---------- 6. bitiş ----------
function finishTour() {
  const last = st.visited[st.visited.length - 1];
  const remaining = st.group === 'A' ? 0 : st.route.filter(id => !st.visited.includes(id)).length;
  modal(`<h2>Turu bitirmek istiyor musunuz?</h2>
    ${remaining ? `<p class="muted">Rotanızda ${remaining} durak kaldı.</p>` : ''}
    <button id="yes" class="btn primary">Evet, bitir</button><button class="btn ghost" data-close>Devam et</button>`);
  $('#yes').onclick = () => {
    closeModal();
    const done = () => { log('tur_bitti', '', { gezilen: st.visited, rozetler: st.badges, sureDk: st.startedAt ? Math.round((Date.now() - Date.parse(st.startedAt)) / 60000) : null }); stopWatch(); go('end'); };
    if (st.group === 'C' && last && hasQuestion(last) && !st.answers[last]) askQuestion(last, done); else done();
  };
}
function stopWatch() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; try { wakeLock?.release(); } catch { } }

function end() {
  const survey = CONFIG.SURVEY_URL ? `${CONFIG.SURVEY_URL}${CONFIG.SURVEY_URL.includes('?') ? '&' : '?'}kod=${encodeURIComponent(st.code)}` : '';
  flush();
  app.innerHTML = `
  <section class="screen center">
    <h1>Teşekkürler!</h1>
    <p>${st.visited.length} durağı keşfettiniz.</p>
    ${st.group === 'C' && st.badges.length ? `<div class="badges small-badges">${BADGES.filter(b => st.badges.includes(b.id)).map(b => `<div class="badge on"><span>${b.icon}</span><b>${esc(b.name)}</b></div>`).join('')}</div>` : ''}
    ${survey ? `<a class="btn primary" href="${esc(survey)}" target="_blank" rel="noopener">Değerlendirme anketine geç</a>` : '<p class="muted">Lütfen araştırmacının vereceği değerlendirme anketini doldurun.</p>'}
    <p class="muted small" id="sync"></p>
    <button id="csv" class="btn ghost">Verileri yedek olarak indir</button>
    <button id="reset" class="btn ghost small">Yeni katılımcı (araştırmacı için)</button>
  </section>`;
  const sync = () => { const n = pendingCount(); $('#sync').textContent = n ? `${n} kayıt gönderilmeyi bekliyor (internet gelince gönderilecek).` : (CONFIG.SHEETS_URL ? 'Tüm kayıtlar gönderildi.' : 'Veriler bu telefonda saklanıyor.'); };
  sync(); setInterval(sync, 5000);
  $('#csv').onclick = downloadCsv;
  $('#reset').onclick = () => { if (confirm('Bu telefondaki tur bilgisi sıfırlansın mı? (Kayıtlar silinmez.)')) { localStorage.removeItem(KEY); location.reload(); } };
}

// ---------- ortak ----------
let onModalClose = null;
function modal(html, onClose = null, locked = false) {
  closeModal(true);
  onModalClose = onClose;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-body">${html}</div>`;
  document.body.appendChild(m);
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal());
  if (!locked) m.onclick = e => { if (e.target === m && !onClose) closeModal(); };
}
function closeModal(silent = false) {
  document.querySelectorAll('.modal').forEach(m => m.remove());
  const cb = onModalClose; onModalClose = null;
  if (cb && !silent) cb();
}
function toast(html) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
  document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
}
const hashHue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

init();

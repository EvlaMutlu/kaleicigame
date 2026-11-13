import { CONFIG } from './config.js';
import { CATEGORIES, haversineM, recommendRoute, orderStops, routeTime, rankByInterest } from './route.js';
import { log, setContext, downloadCsv, pendingCount, flush, queueSuggestion } from './logger.js';
import { BADGES, newlyEarned, recommendations } from './badges.js';
import { ICON, LOGO } from './icons.js';
import { AVATARS, avatarById } from './avatars.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const app = $('#app');
const TEST = new URLSearchParams(location.search).has('test');
const CAT = {
  tarih: { label: 'Tarih', emoji: '🏛️' }, sanat: { label: 'Sanat', emoji: '🎨' }, kultur: { label: 'Kültür', emoji: '🎭' },
  eglence: { label: 'Eğlence', emoji: '🎶' }, gastronomi: { label: 'Restoran', emoji: '🍽️' },
};
const LEVELS = [['kolay', 'Kolay'], ['orta', 'Orta'], ['zor', 'Zor']];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const levelLabel = v => LEVELS.find(l => l[0] === v)?.[1] || v;
const MAX_DIST = Math.sqrt(CATEGORIES.length * 25); // ilgi uzayındaki en büyük uzaklık

let STOPS = [], STOP = {}, QUESTIONS = {}, CODES = {};
let st = null, map = null, layers = {}, pos = null, watchId = null, wakeLock = null;

// ---------- durum ----------
const KEY = 'kaleici_state';
const fresh = () => ({ phase: 'welcome', code: '', group: '', profile: null, draft: null, obStep: 0, route: [], visited: [], arrivals: {}, answers: {}, badges: [], qLevel: 'kolay', pendingQuestion: null, startedAt: null, target: null, view: 'list' });
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { } };
const loadState = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
function go(phase) { st.phase = phase; save(); render(); }
const ctx = () => ({ ...st, stopsById: STOP });

async function init() {
  const [stops, q, codes] = await Promise.all(['data/stops.json', 'data/questions.json', 'data/codes.json'].map(u => fetch(u).then(r => r.json())));
  STOPS = stops; STOPS.forEach(s => STOP[s.id] = s);
  QUESTIONS = q.questions || {}; CODES = codes;
  st = { ...fresh(), ...(loadState() || {}) };
  if (st.code) setContext(st.code, st.group);
  render();
}

function render() {
  if (map) { map.remove(); map = null; }
  ({ welcome, consent, onboarding, preview, tour, end }[st.phase] || welcome)();
}

// ---------- ortak iskelet: gradyan üst bar + alt menü ----------
function shell(inner, { nav = true, active = '' } = {}) {
  return `
  <header class="topbar">
    <button class="tb-btn" id="menuBtn" aria-label="Menü">${ICON.menu}</button>
    <span class="tb-title">Kaleiçi Kaşifi</span>
    <button class="tb-btn ${myAvatar() ? 'has-av' : ''}" id="userBtn" aria-label="Profil">${myAvatar()?.svg || ICON.user}</button>
  </header>
  <main class="page">${inner}</main>
  ${nav ? `<nav class="bottombar">
    <button class="nb ${active === 'list' ? 'on' : ''}" id="nbList" aria-label="Hedefler">${ICON.clipboard}</button>
    <button class="fab ${active === 'map' ? 'on' : ''}" id="nbPlay" aria-label="Hedefe git">${ICON.play}</button>
    <button class="nb ${st.group === 'A' ? 'invisible' : ''}" id="nbAdd" aria-label="Durak ekle">${ICON.pinPlus}</button>
  </nav>` : ''}`;
}
function wireShell() {
  $('#menuBtn').onclick = openMenu;
  $('#userBtn').onclick = () => (avatarOn() ? profileSheet() : modal(`<p class="eyebrow">Katılımcı</p><h2>${esc(st.code || 'Giriş yapılmadı')}</h2><p class="muted">Sorun yaşarsanız bu kodu araştırmacıya söyleyin.</p><button class="btn ghost" data-close>Kapat</button>`));
  const l = $('#nbList'); if (l) l.onclick = () => { st.view = 'list'; save(); tour(); };
  const p = $('#nbPlay'); if (p) p.onclick = () => { st.view = 'map'; save(); tour(); };
  const mv = $('#motiv'); if (mv) mv.onclick = showJournal;
  const a = $('#nbAdd'); if (a && st.group !== 'A') a.onclick = addChooser;
}
// ---------- profil: takma ad + avatar ----------
const inG = k => (CONFIG[k] || []).includes(st.group);
const hasQ = () => inG('QUESTION_GROUPS');
const avatarOn = () => inG('AVATAR_GROUPS') && !!st.code;
const myAvatar = () => (avatarOn() ? avatarById(st.avatar) : null);
function profileSheet() {
  let pick = st.avatar || '';
  modal(`<p class="eyebrow">Profilim</p><h2 class="q-title">Kâşif kimliğin</h2>
    <label class="small muted" for="nick">Takma ad</label>
    <input id="nick" class="input" maxlength="20" autocomplete="off" placeholder="ör. Kale Kartalı" value="${esc(st.nick || '')}">
    <p class="muted small">Lütfen gerçek adınızı yazmayın. Takma ad yalnızca bu telefonda saklanır.</p>
    <p class="small muted">Avatarını seç</p>
    <div class="av-grid">${AVATARS.map(a => `<button class="av ${a.id === pick ? 'on' : ''}" data-av="${a.id}" aria-label="${esc(a.name)}">${a.svg}<span>${esc(a.name)}</span></button>`).join('')}</div>
    <p class="muted small">Avatarlar, Kaleiçi'nin tarihinde adı geçen kişilerden esinlenen temsilî çizimlerdir.</p>
    <button id="pSave" class="btn primary">Kaydet</button>
    <p class="muted small center">Katılımcı kodu: ${esc(st.code)}</p>`);
  $$('[data-av]').forEach(b => b.onclick = () => { pick = b.dataset.av; $$('[data-av]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#pSave').onclick = () => {
    const nick = $('#nick').value.trim().slice(0, 20);
    if (pick !== st.avatar || nick !== (st.nick || '')) log('profil_guncellendi', '', { avatar: pick, takma_ad: !!nick });
    st.avatar = pick; st.nick = nick; save(); closeModal(true); render();
  };
}

function openMenu() {
  const inTour = st.phase === 'tour';
  modal(`<p class="eyebrow">Menü</p>
    ${inTour && hasQ() ? `<button class="menu-item" data-m="level">Soru zorluğu: <b>${levelLabel(st.qLevel)}</b></button>` : ''}
    ${inTour ? `<button class="menu-item" data-m="view">${st.view === 'map' ? 'Listeye dön' : 'Haritayı göster'}</button><button class="menu-item" data-m="finish">Turu bitir</button>` : ''}
    ${st.group === 'C' ? '<button class="menu-item" data-m="badges">Rozetlerim</button>' : ''}
    ${inG('JOURNAL_GROUPS') && st.code ? '<button class="menu-item" data-m="journal">Ziyaret günlüğüm</button>' : ''}
    <button class="menu-item" data-m="guide">Rehberim</button>
    ${st.code && inG('SUGGEST_GROUPS') ? '<button class="menu-item" data-m="suggest">Haritaya yeni yer öner</button>' : ''}
    <button class="btn ghost" data-close>Kapat</button>`);
  $$('[data-m]').forEach(b => b.onclick = () => {
    const m = b.dataset.m; closeModal(true);
    if (m === 'level') levelPicker(); if (m === 'finish') finishTour(); if (m === 'guide') showGuide(); if (m === 'badges') showBadges(); if (m === 'suggest') suggestPlace(); if (m === 'journal') showJournal();
    if (m === 'view') { st.view = st.view === 'map' ? 'list' : 'map'; save(); tour(); }
  });
}

// ---------- 1. kod ----------
function welcome() {
  app.innerHTML = `
  <section class="hero">
    <div class="hero-band">${CONFIG.MASCOT_IMG ? `<img class="mascot" src="${CONFIG.MASCOT_IMG}" alt="">` : ''}<div class="logo">${LOGO}</div><h1>Kaleiçi Kaşifi</h1><p>Antalya Kaleiçi kültürel miras rotası</p></div>
    <div class="hero-body">
      <p class="eyebrow">Hoş geldin</p>
      <h2 class="q-title">Katılımcı kodunu gir</h2>
      <input id="code" class="input" autocomplete="off" autocapitalize="characters" placeholder="KLC-XXXX" value="${esc(st.code)}">
      <p id="err" class="error" hidden>Bu kod tanınmadı. Lütfen araştırmacıya danışın.</p>
      <button id="go" class="btn primary">Başla</button>
      ${TEST ? '<p class="muted small">Test modu: TEST-A, TEST-B veya TEST-C kodlarını kullanabilirsiniz.</p>' : ''}
    </div>
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
  app.innerHTML = shell(`
    <p class="eyebrow">Bilgilendirme</p>
    <h2 class="q-title">Bilgilendirme ve onam</h2>
    <div class="paper prose">
      <p>Bu uygulama, Antalya Bilim Üniversitesi tarafından yürütülen bir araştırmanın parçasıdır. Tur sırasında uygulamadaki seçimleriniz, ziyaret ettiğiniz duraklar ve konumunuza bağlı varış bilgileri kişisel bilgileriniz olmadan, yalnızca katılımcı kodunuzla kaydedilir.</p>
      <p>Katılım gönüllüdür; istediğiniz anda gerekçe göstermeden ayrılabilirsiniz.</p>
    </div>
    <button id="ok" class="btn primary">Okudum, katılmayı kabul ediyorum</button>
    <button id="back" class="btn ghost">Geri</button>`, { nav: false });
  wireShell();
  $('#ok').onclick = () => { log('onam_verildi'); st.startedAt = new Date().toISOString(); st.obStep = 0; go(st.group === 'A' ? 'tour' : 'onboarding'); };
  $('#back').onclick = () => go('welcome');
}

// ---------- 3. adım adım tercihler (B, C) ----------
const steps = () => ['interests', 'pace', 'minutes', 'routeDifficulty', ...(hasQ() ? ['qLevel'] : [])];

function onboarding() {
  st.draft = st.draft || { interests: Object.fromEntries(CATEGORIES.map(c => [c, 0])), pace: null, minutes: null, routeDifficulty: null, qLevel: hasQ() ? null : undefined };
  const list = steps(), key = list[st.obStep], d = st.draft;
  const dots = `<div class="dots">${list.map((_, i) => `<i class="${i === st.obStep ? 'on' : i < st.obStep ? 'done' : ''}"></i>`).join('')}</div>`;
  const cards = (opts, val) => `<div class="choice-grid">${opts.map(o => `<button class="choice ${String(o.v) === String(val) ? 'on' : ''}" data-v="${o.v}">${o.icon || ''}<b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</button>`).join('')}</div>`;
  let eyebrow = 'Seyahat Seçenekleri', title = '', body = '', hint = '';
  if (key === 'interests') {
    eyebrow = 'Tercihler'; title = 'Bize kendini tanıt!';
    hint = 'Seyahatinde en çok neyle ilgilenirsin? Yıldızlarla puanla (0–5).';
    body = `<div class="rate-list">${['gastronomi', 'tarih', 'kultur', 'eglence', 'sanat'].map(c => {
      const v = d.interests[c], img = CONFIG.CATEGORY_IMAGES?.[c];
      return `<div class="rate-row">
        <div class="rate-img ${v > 0 ? 'on' : ''}" style="${img ? `background-image:url('${esc(img)}')` : `--hue:${hashHue(c)}`}">${img ? '' : `<span class="tile-emoji">${CAT[c].emoji}</span>`}<span class="tile-label">${CAT[c].label}</span></div>
        <div class="stars" role="radiogroup" aria-label="${CAT[c].label}">${[1, 2, 3, 4, 5].map(i => `<button class="star ${i <= v ? 'on' : ''}" data-cat="${c}" data-v="${i}" aria-label="${i}">★</button>`).join('')}</div>
      </div>`;
    }).join('')}</div>`;
  } else if (key === 'pace') {
    title = 'Nasıl yürümek istersin?';
    body = cards([{ v: 'yavas', label: 'Yavaş yürü', icon: ICON.walkSlow }, { v: 'orta', label: 'Yürü', icon: ICON.walk }, { v: 'hizli', label: 'Hızlı yürü', icon: ICON.walkFast }], d.pace);
  } else if (key === 'minutes') {
    title = 'Bu gezide ne kadar vaktin var?';
    body = cards(CONFIG.TIME_OPTIONS.map((m, i) => ({ v: m, label: m < 60 ? `${m} dk` : `${m / 60} sa`, icon: `<span class="pin-ring" style="--r:${0.55 + i * 0.09}">${ICON.pin}</span>` })), d.minutes);
  } else if (key === 'routeDifficulty') {
    title = 'Rotan ne kadar zorlu olsun?';
    body = cards([{ v: 'kolay', label: 'Kolay', sub: 'Düz yollar', icon: ICON.flat }, { v: 'orta', label: 'Orta', sub: 'Hafif eğimler', icon: ICON.slope }, { v: 'zor', label: 'Zor', sub: 'Yokuş ve merdivenler', icon: ICON.stairs }], d.routeDifficulty);
  } else if (key === 'qLevel') {
    title = 'Sorular ne kadar zor olsun?'; hint = 'Tur sırasında istediğin zaman değiştirebilirsin.';
    body = cards([{ v: 'kolay', label: 'Kolay', icon: ICON.q1 }, { v: 'orta', label: 'Orta', icon: ICON.q2 }, { v: 'zor', label: 'Zor', icon: ICON.q3 }], d.qLevel);
  }
  const ready = key === 'interests' ? true : d[key] != null;
  app.innerHTML = shell(`
    ${dots}
    <p class="eyebrow">${eyebrow}</p>
    <h2 class="q-title">${title}</h2>
    ${hint ? `<p class="hint">${hint}</p>` : ''}
    ${body}
    <div class="step-nav">
      <button class="arrow back ${st.obStep === 0 ? 'invisible' : ''}" id="prev" aria-label="Geri">${ICON.back}</button>
      <button class="arrow next" id="next" aria-label="İleri" ${ready ? '' : 'disabled'}>${ICON.next}</button>
    </div>`, { nav: false });
  wireShell();
  $$('.star').forEach(t => t.onclick = () => { const c = t.dataset.cat, v = +t.dataset.v; d.interests[c] = d.interests[c] === v ? v - 1 : v; save(); onboarding(); });
  $$('.choice').forEach(b => b.onclick = () => { d[key] = key === 'minutes' ? +b.dataset.v : b.dataset.v; save(); onboarding(); });
  $('#prev').onclick = () => { st.obStep = Math.max(0, st.obStep - 1); save(); onboarding(); };
  $('#next').onclick = async () => {
    if (st.obStep < list.length - 1) { st.obStep++; save(); onboarding(); return; }
    st.profile = { minutes: d.minutes, pace: d.pace, routeDifficulty: d.routeDifficulty, interests: { ...d.interests } };
    if (hasQ()) st.qLevel = d.qLevel;
    log('profil', '', { ...st.profile, qLevel: hasQ() ? st.qLevel : null });
    $('#next').classList.add('busy');
    const start = await startPoint();
    const r = recommendRoute(STOPS, st.profile, routeOpts(start));
    st.start = start; st.route = r.stops.map(s => s.id);
    log('rota_onerildi', '', { route: st.route, totalMin: Math.round(r.time.totalMin), start, knn: r.ranked.slice(0, 10) });
    go('preview');
  };
}

const routeOpts = start => ({ start, pace: st.profile?.pace || 'orta', detour: CONFIG.DETOUR, dwellMin: CONFIG.DWELL_MIN });
const similarity = s => st.profile ? Math.round(100 * (1 - Math.sqrt(CATEGORIES.reduce((a, c) => a + ((st.profile.interests[c] ?? 0) - (s.scores[c] ?? 0)) ** 2, 0)) / MAX_DIST)) : null;
const fmtDist = m => m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`;

function startPoint() {
  return new Promise(resolve => {
    const fallback = { ...CONFIG.DEFAULT_START, source: 'varsayilan' };
    if (TEST || !navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(p => {
      const here = { lat: p.coords.latitude, lon: p.coords.longitude };
      const nearest = Math.min(...STOPS.map(s => haversineM(here, s)));
      resolve(nearest <= CONFIG.START_RADIUS_M ? { ...here, name: 'Konumunuz', source: 'gps' } : fallback);
    }, () => resolve(fallback), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  });
}

// ---------- kart ----------
function thumb(s) {
  return s.images?.length ? `<img class="thumb" src="${esc(s.images[0])}" alt="">` : `<div class="thumb ph" style="--hue:${hashHue(s.id)}">${esc(s.title.split(' ')[0])}</div>`;
}
function stopCard(s, { from, extra = '', cls = '', action = '' } = {}) {
  const sim = similarity(s);
  return `<article class="scard ${cls}" data-id="${s.id}">
    <div class="scard-head"><h3>${esc(s.title)}</h3>${thumb(s)}</div>
    <dl class="meta">
      ${from ? `<div><dt>Bulunduğun konuma yakınlık</dt><dd>${fmtDist(haversineM(from, s))}</dd></div>` : ''}
      ${sim != null ? `<div><dt>İlgi alanına benzerlik</dt><dd>%${sim}</dd></div>` : ''}
      ${extra}
    </dl>${sim != null ? `<div class="mini-gauge" style="--p:${sim}"><span>%${sim}</span></div>` : ''}${action}
  </article>`;
}

// ---------- 4. önerilen rota (B, C) ----------
function preview() {
  const stops = st.route.map(id => STOP[id]);
  const t = routeTime(st.start, stops, routeOpts(st.start));
  const over = t.totalMin > st.profile.minutes;
  const others = rankByInterest(STOPS.filter(s => !st.route.includes(s.id)), st.profile.interests).map(r => r.stop);
  app.innerHTML = shell(`
    <p class="eyebrow">Sana özel</p>
    <h2 class="q-title">Sana özel rota</h2>
    <p class="hint">${stops.length} durak · yaklaşık ${Math.round(t.totalMin)} dk (${Math.round(t.walkMin)} dk yürüyüş) · başlangıç: ${esc(st.start.name)}</p>
    ${over ? `<p class="warn">Rota seçtiğin ${st.profile.minutes} dakikayı aşıyor.</p>` : ''}
    <div class="cards">${t.legs.map((l, i) => stopCard(l.stop, {
      extra: `<div><dt>Yürüme</dt><dd>${Math.max(1, Math.round(l.walkMin))} dk</dd></div>`,
      action: `<button class="card-x" data-rm="${l.stop.id}" aria-label="Rotadan çıkar">${ICON.close}</button><span class="card-no">${i + 1}</span>`,
    })).join('')}</div>
    <details class="add"><summary>${ICON.plus} Durak ekle</summary>
      <ul>${others.map(s => `<li><span>${esc(s.title)}<small> · %${similarity(s)} benzerlik${s.difficulty === 'zor' ? ' · yokuşlu' : ''}</small></span><button class="round-add" data-add="${s.id}" aria-label="Ekle">${ICON.plus}</button></li>`).join('')}</ul>
    </details>
    <button id="start" class="btn primary" ${stops.length ? '' : 'disabled'}>Turu başlat</button>
    <button id="back" class="btn ghost">Tercihleri değiştir</button>`, { nav: false });
  wireShell();
  const reorder = ids => orderStops(st.start, ids.map(id => STOP[id])).map(s => s.id);
  $$('[data-rm]').forEach(b => b.onclick = () => { st.route = reorder(st.route.filter(id => id !== b.dataset.rm)); log('rota_duzenlendi', b.dataset.rm, { islem: 'cikar' }); save(); preview(); });
  $$('[data-add]').forEach(b => b.onclick = () => { st.route = reorder([...st.route, b.dataset.add]); log('rota_duzenlendi', b.dataset.add, { islem: 'ekle' }); save(); preview(); });
  $('#start').onclick = () => { log('tur_basladi', '', { route: st.route }); st.view = 'list'; go('tour'); };
  $('#back').onclick = () => { st.obStep = 0; go('onboarding'); };
}

// ---------- 5. tur ----------
const tourStops = () => st.group === 'A' ? STOPS : st.route.map(id => STOP[id]);
const unvisited = () => tourStops().filter(s => !st.visited.includes(s.id));
function suggestedNext() {
  const left = unvisited();
  if (!left.length) return null;
  if (st.group !== 'A' && !CONFIG.USER_PICKS_NEXT) return left[0];
  const from = pos || (st.visited.length ? STOP[st.visited.at(-1)] : st.start) || CONFIG.DEFAULT_START;
  return [...left].sort((a, b) => haversineM(from, a) - haversineM(from, b))[0];
}

function tour() {
  if (map) { map.remove(); map = null; }
  const all = tourStops(), done = st.visited.filter(id => all.some(s => s.id === id)).length;
  const pct = all.length ? Math.round(100 * done / all.length) : 0;
  const isA = st.group === 'A';
  if (!st.target || st.visited.includes(st.target) || !all.some(s => s.id === st.target)) st.target = suggestedNext()?.id || null;
  const head = `
    <p class="eyebrow">${isA ? 'Duraklar' : 'Rotan'}</p>
    <div class="title-row"><h2 class="q-title">${unvisited().length ? 'Bir hedef seç' : 'Rotanı tamamladın 🎉'}</h2>
      <div class="gauge" style="--p:${pct}"><span>%${pct}</span></div></div>
    <p class="hint">${isA ? `${done} durak gezdin` : `Rotanın %${pct}'ini tamamladın · ${done}/${all.length} durak`}</p>
    <div id="gpsnote" class="note" hidden></div>`;
  if (st.view === 'map') {
    const t = st.target ? STOP[st.target] : null;
    app.innerHTML = shell(`${head}
      <div id="map" class="mapbox"></div>
      ${t ? targetPanel(t) : finishPanel()}`, { active: 'map' });
  } else {
    const from = pos || null;
    const list = isA ? [...all].sort((a, b) => from ? haversineM(from, a) - haversineM(from, b) : a.title.localeCompare(b.title, 'tr')) : all;
    app.innerHTML = shell(`${head}
      ${inG('JOURNAL_GROUPS') ? motivLine() : ''}${st.group === 'C' ? recoLine() : ''}
      <div class="cards">${list.map(s => {
        const v = st.visited.includes(s.id), isT = s.id === st.target;
        return stopCard(s, {
          from, cls: v ? 'visited' : isT ? 'target' : '',
          extra: v ? `<div><dt>Durum</dt><dd>${ICON.check} Gezildi</dd></div>` : isT ? `<div><dt>Durum</dt><dd>Seçili hedef</dd></div>` : '',
        });
      }).join('')}</div>
      ${unvisited().length ? '' : finishPanel()}`, { active: 'list' });
  }
  wireShell();
  $$('.scard').forEach(c => c.onclick = () => {
    const s = STOP[c.dataset.id];
    if (st.visited.includes(s.id)) { showInfo(s, true); return; }
    st.target = s.id; save(); log('hedef_secildi', s.id); st.view = 'map'; save(); tour();
  });
  wireTargetPanel();
  if (st.view === 'map') setupMap();
  startWatch(); keepAwake();
  if (st.pendingQuestion && !document.querySelector('.modal')) askQuestion(st.pendingQuestion, () => tour());
}

function targetPanel(t) {
  const d = pos ? haversineM(pos, t) : null;
  const mins = pos ? Math.max(1, Math.round(routeTime(pos, [t], routeOpts(pos)).walkMin)) : null;
  return `<div class="panel">
    <p class="eyebrow">Hedefin</p><h3>${esc(t.title)}</h3>
    <p class="muted">${d != null ? `${fmtDist(d)} · yaklaşık ${mins} dk yürüme` : 'Konumun bekleniyor…'}</p>
    <div class="row"><button id="here" class="btn primary">Durağa vardım</button><button id="toList" class="btn ghost">${ICON.list} Hedefler</button></div>
  </div>`;
}
const finishPanel = () => `<div class="panel"><button id="finish" class="btn primary">Turu bitir</button></div>`;
function wireTargetPanel() {
  const h = $('#here'); if (h) h.onclick = () => arrive(STOP[st.target], 'manuel');
  const l = $('#toList'); if (l) l.onclick = () => { st.view = 'list'; save(); tour(); };
  const f = $('#finish'); if (f) f.onclick = finishTour;
}
// ---------- ziyaret günlüğü (yalnız kendi geçmişiyle karşılaştırma; sıralama yok) ----------
const JKEY = 'kaleici_gunluk';
const jAll = () => { try { return JSON.parse(localStorage.getItem(JKEY) || '{}'); } catch { return {}; } };
const journal = () => jAll()[st.code] || [];
function journalAdd(stopId) {
  const all = jAll(); (all[st.code] = all[st.code] || []).push({ ts: new Date().toISOString(), stop: stopId });
  try { localStorage.setItem(JKEY, JSON.stringify(all)); } catch { }
}
const DAY = 864e5;
function journalStats() {
  const j = journal(), now = Date.now(), ago = e => now - Date.parse(e.ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    total: j.length,
    today: j.filter(e => Date.parse(e.ts) >= today.getTime()).length,
    week: j.filter(e => ago(e) < 7 * DAY).length,
    lastWeek: j.filter(e => ago(e) >= 7 * DAY && ago(e) < 14 * DAY).length,
    recent: j.filter(e => ago(e) < CONFIG.ACTIVE_WINDOW_MIN * 6e4).length,
    idleMin: Math.round((now - Math.max(j.length ? Date.parse(j.at(-1).ts) : 0, st.startedAt ? Date.parse(st.startedAt) : 0)) / 6e4),
  };
}
function motivation() {
  const s = journalStats();
  if (s.lastWeek && s.week > s.lastWeek) return { k: 'hafta_artti', icon: '🔥', text: `Geçen haftaya göre ${s.week - s.lastWeek} durak daha fazla keşfettin. Bu ara çok aktifsin!` };
  if (s.recent >= 2) return { k: 'cok_aktif', icon: '🔥', text: `Son ${CONFIG.ACTIVE_WINDOW_MIN} dakikada ${s.recent} durak keşfettin. Çok aktifsin!` };
  if (st.phase === 'tour' && unvisited().length && s.idleMin >= CONFIG.PASSIVE_MIN) {
    const n = pos ? [...unvisited()].sort((a, b) => haversineM(pos, a) - haversineM(pos, b))[0] : null;
    return { k: 'pasif', icon: '🧭', text: `Keşfedilecek yerler seni bekliyor!${n ? ` En yakını ${n.title}, ${fmtDist(haversineM(pos, n))} uzakta.` : ''}` };
  }
  if (s.lastWeek && s.week < s.lastWeek) return { k: 'hafta_azaldi', icon: '🧭', text: `Geçen hafta ${s.lastWeek} durak gezmiştin, bu hafta ${s.week}. Keşfedilecek yerler seni bekliyor!` };
  if (!s.total) return { k: 'baslangic', icon: '🧭', text: 'Keşfedilecek yerler seni bekliyor! İlk hedefini seç.' };
  return { k: 'devam', icon: '✨', text: `Bugün ${s.today} durak keşfettin. Böyle devam!` };
}
function motivLine() {
  const m = motivation();
  if (st.lastMotiv !== m.k) { st.lastMotiv = m.k; save(); log('motivasyon', '', { tur: m.k }); }
  return `<button class="motiv ${m.k}" id="motiv">${m.icon} ${esc(m.text)}</button>`;
}
function showJournal() {
  const s = journalStats(), j = journal();
  const days = {};
  [...j].reverse().forEach(e => { const d = new Date(e.ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }); (days[d] = days[d] || []).push(e); });
  const mx = Math.max(s.week, s.lastWeek, 1), m = motivation();
  modal(`<p class="eyebrow">Ziyaret günlüğüm</p><h2 class="q-title">Keşif geçmişin</h2>
    <p class="motiv ${m.k}">${m.icon} ${esc(m.text)}</p>
    <div class="jstats"><div><b>${s.today}</b><small>Bugün</small></div><div><b>${s.week}</b><small>Son 7 gün</small></div><div><b>${s.total}</b><small>Toplam</small></div></div>
    <div class="wbars">
      <div><small>Geçen hafta</small><span style="--w:${100 * s.lastWeek / mx}%"></span><b>${s.lastWeek}</b></div>
      <div><small>Bu hafta</small><span class="now" style="--w:${100 * s.week / mx}%"></span><b>${s.week}</b></div>
    </div>
    <p class="hint">Burada yalnızca kendi geçmişin var; başkalarıyla karşılaştırma yapılmaz.</p>
    ${j.length ? Object.entries(days).map(([d, es]) => `<h3 class="jday">${esc(d)}</h3><ul class="stoplist">${es.map(e => `<li><span>${ICON.check} ${esc(STOP[e.stop]?.title || e.stop)}</span><span class="muted small">${new Date(e.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></li>`).join('')}</ul>`).join('') : '<p class="hint">Henüz kayıt yok. Bir durağa ulaştığında günlüğüne eklenecek.</p>'}
    <button class="btn ghost" data-close>Kapat</button>`);
  log('gunluk_acildi', '', { bugun: s.today, hafta: s.week, gecen_hafta: s.lastWeek, toplam: s.total });
}

function recoLine() {
  const r = recommendations(ctx(), 1)[0];
  return r ? `<p class="reco">${r.icon} Sıradaki rozet önerisi: <b>${esc(r.name)}</b> – ${esc(r.hint)} (${r.now}/${r.goal})</p>` : '';
}

function setupMap() {
  map = L.map('map', { zoomControl: false }).setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  layers.stops = L.layerGroup().addTo(map);
  layers.me = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#0e5c9e', fillOpacity: 1 });
  const list = tourStops();
  list.forEach((s, i) => {
    const v = st.visited.includes(s.id), cls = v ? 'done' : s.id === st.target ? 'next' : '';
    const icon = L.divIcon({ className: '', html: `<div class="pin ${cls}">${v ? '✓' : st.group === 'A' ? '•' : i + 1}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    L.marker([s.lat, s.lon], { icon }).on('click', () => { if (!v) { st.target = s.id; save(); log('hedef_secildi', s.id, { yer: 'harita' }); tour(); } }).addTo(layers.stops);
  });
  const t = st.target ? STOP[st.target] : null;
  if (pos) layers.me.setLatLng([pos.lat, pos.lon]).addTo(map);
  if (t) map.setView([t.lat, t.lon], 18); else map.fitBounds(L.latLngBounds(list.map(s => [s.lat, s.lon])), { padding: [30, 30] });
  if (TEST) map.on('click', e => onPosition({ coords: { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: 5 } }));
}

// ---------- konum ----------
function startWatch() {
  if (TEST) { showNote('Test modu: haritada dokunduğun yer konumun olur; "Durağa vardım" da çalışır.'); return; }
  if (!navigator.geolocation) { showNote('Bu cihazda konum yok: durağa varınca "Durağa vardım" düğmesini kullan.'); return; }
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(onPosition, err => {
    showNote(err.code === 1 ? 'Konum izni verilmedi: durağa varınca "Durağa vardım" düğmesini kullan.' : 'Konum alınamıyor; "Durağa vardım" düğmesini kullanabilirsin.');
    log('konum_hatasi', '', { code: err.code });
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
let lastRender = 0;
function onPosition(p) {
  pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
  if (st.phase !== 'tour') return;
  if (layers.me && map) layers.me.setLatLng([pos.lat, pos.lon]).addTo(map);
  if (document.querySelector('.modal')) return;
  if (pos.acc <= CONFIG.MAX_ACCURACY_M) {
    const hit = unvisited().find(s => haversineM(pos, s) <= CONFIG.ARRIVAL_RADIUS_M);
    if (hit) { arrive(hit, 'gps'); return; }
  }
  // yakınlık değerlerini güncelle (sık yeniden çizimi önle)
  if (Date.now() - lastRender > 8000 || TEST) { lastRender = Date.now(); if (st.view === 'map' && map) { const p2 = $('.panel'); const t = st.target && STOP[st.target]; if (p2 && t) { p2.outerHTML = targetPanel(t); wireTargetPanel(); } } else if (st.view !== 'map') tour(); }
}
async function keepAwake() { try { if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch { } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st?.phase === 'tour') { wakeLock = null; keepAwake(); } });
function showNote(t) { const n = $('#gpsnote'); if (n) { n.textContent = t; n.hidden = false; } }

// ---------- varış ----------
function arrive(stop, how) {
  if (!stop || st.visited.includes(stop.id)) return;
  const prev = st.visited.length ? st.visited.at(-1) : null;
  st.visited.push(stop.id); st.arrivals[stop.id] = new Date().toISOString();
  if (st.target === stop.id) st.target = null;
  log('varis', stop.id, { yontem: how, acc: pos?.acc ?? null, sira: st.visited.length });
  journalAdd(stop.id);
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  save();
  if (hasQ() && prev && QUESTIONS[prev] && !st.answers[prev]) {
    st.pendingQuestion = prev; save();
    askQuestion(prev, () => showInfo(stop));
  } else showInfo(stop);
}

function showInfo(stop, reread = false) {
  const opened = Date.now();
  const paras = esc(stop.text).split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ“"])/).reduce((acc, s, i) => acc + (i && i % 3 === 0 ? '</p><p>' : ' ') + s, '<p>') + '</p>';
  modal(`
    <div class="photo" style="--hue:${hashHue(stop.id)}">${stop.images?.length ? `<img src="${esc(stop.images[0])}" alt="">` : `<span>${esc(stop.title)}</span>`}</div>
    <p class="eyebrow">${reread ? 'Rehberim' : 'Hedefe ulaştın'}</p>
    <h2 class="q-title">${esc(stop.title)}</h2>
    <div class="prose">${paras}</div>
    <p class="muted small">Kaynak: ${esc(stop.source)}</p>
    <button class="btn primary" data-close>${reread ? 'Kapat' : 'Devam'}</button>`, () => {
    log(reread ? 'bilgi_tekrar_okundu' : 'bilgi_okundu', stop.id, { saniye: Math.round((Date.now() - opened) / 1000) });
    if (!reread) afterStop();
  });
}

function afterStop() {
  if (st.group === 'C') {
    const got = newlyEarned(ctx());
    if (got.length) { st.badges.push(...got.map(b => b.id)); save(); got.forEach(b => log('rozet', '', { rozet: b.id })); toast(got.map(b => `${b.icon} Yeni rozet: ${b.name}`).join('<br>')); }
  }
  st.target = suggestedNext()?.id || null; st.view = 'list'; save();
  tour();
  if (st.group !== 'A' && !unvisited().length) setTimeout(finishTour, 700);
}

// ---------- sorular (C) ----------
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
      <p class="eyebrow">Hatırla · ${esc(stop.title)}</p>
      <div class="seg">${LEVELS.map(([v, l]) => `<button class="${v === st.qLevel ? 'on' : ''}" data-lv="${v}">${l}</button>`).join('')}</div>
      ${pick.fallback ? `<p class="muted small">Bu durak için ${levelLabel(st.qLevel).toLowerCase()} soru yok; ${levelLabel(pick.level).toLowerCase()} soru gösteriliyor.</p>` : ''}
      <h2 class="q-title">${esc(pick.q.text)}</h2>
      <div class="options">${shuffle(pick.q.options.map((o, i) => i)).map(i => `<button class="opt" data-i="${i}">${esc(pick.q.options[i])}</button>`).join('')}</div>
      <p id="fb" class="small"></p>`, null, true);
    $$('[data-lv]').forEach(b => b.onclick = () => {
      if (b.dataset.lv === st.qLevel) return;
      log('soru_zorlugu_degisti', stopId, { eski: st.qLevel, yeni: b.dataset.lv, yer: 'soru' });
      st.qLevel = b.dataset.lv; save(); closeModal(true); draw();
    });
    $$('.opt').forEach(b => b.onclick = () => {
      attempts++;
      const ok = +b.dataset.i === pick.q.answer;
      log('cevap', stopId, { seviye: pick.level, secenek: +b.dataset.i, dogru: ok, deneme: attempts, saniye: Math.round((Date.now() - shown) / 1000) });
      if (!ok) { b.classList.add('wrong'); b.disabled = true; $('#fb').textContent = 'Tekrar dene.'; return; }
      b.classList.add('right'); $('#fb').textContent = 'Doğru!';
      st.answers[stopId] = { level: pick.level, attempts }; st.pendingQuestion = null; save();
      setTimeout(() => { closeModal(true); done(); }, 800);
    });
  };
  draw();
}
function levelPicker() {
  modal(`<p class="eyebrow">Ayarlar</p><h2 class="q-title">Soru zorluğu</h2><p class="hint">Soruların zorluğunu istediğin zaman değiştirebilirsin.</p>
    <div class="seg">${LEVELS.map(([v, l]) => `<button class="${v === st.qLevel ? 'on' : ''}" data-lv="${v}">${l}</button>`).join('')}</div>
    <button class="btn ghost" data-close>Kapat</button>`);
  $$('[data-lv]').forEach(b => b.onclick = () => {
    log('soru_zorlugu_degisti', '', { eski: st.qLevel, yeni: b.dataset.lv, yer: 'menu' });
    st.qLevel = b.dataset.lv; save(); closeModal(true);
  });
}

// ---------- turda durak ekleme (B, C) ----------
// İki ayrı işlev: (1) hazır duraklardan rotaya ekleme, (2) araştırma ekibine yeni yer önerme.
function addChooser() {
  modal(`<p class="eyebrow">Ne yapmak istersin?</p>
    <button class="pick-card route" id="chRoute"><span class="pc-ic">${ICON.route}</span><span><b>Rotama durak ekle</b><small>Uygulamadaki hazır duraklardan birini kendi rotana ekle.</small></span></button>
    <button class="pick-card suggest" id="chSuggest"><span class="pc-ic">${ICON.camera}</span><span><b>Haritaya yeni yer öner</b><small>Haritada olmayan bir yeri fotoğrafla ve ekibimize bildir. Rotanı değiştirmez.</small></span></button>
    <button class="btn ghost" data-close>Vazgeç</button>`);
  if (!inG('SUGGEST_GROUPS')) { closeModal(true); addStopSheet(); return; }
  $('#chRoute').onclick = () => { closeModal(true); addStopSheet(); };
  $('#chSuggest').onclick = () => { closeModal(true); suggestPlace(); };
}

const CAT_LABEL = { gastronomi: 'Restoran / Lezzet', tarih: 'Tarih', kultur: 'Kültür', eglence: 'Eğlence', sanat: 'Sanat' };
let sMap = null;
function suggestPlace() {
  const d = { name: '', cat: '', note: '', photos: [], loc: pos ? { lat: pos.lat, lon: pos.lon, acc: Math.round(pos.acc || 0), how: 'gps' } : null };
  modal(`<div class="suggest-head">${ICON.camera}<span><b>Haritaya yeni yer öner</b><small>Bu yer rotana eklenmez. Ekibimiz inceler; uygun bulunursa haritaya eklenir.</small></span></div>
    <label class="lbl" for="sgName">Yerin adı</label>
    <input id="sgName" class="input plain" maxlength="60" placeholder="ör. Eski çeşme">
    <span class="lbl">Kategori</span>
    <div class="chips">${CATEGORIES.map(c => `<button class="chip" data-cat="${c}">${CAT_LABEL[c] || c}</button>`).join('')}</div>
    <label class="lbl" for="sgNote">Kısa bilgi <small class="muted" id="sgCount">0/300</small></label>
    <textarea id="sgNote" class="input plain" rows="3" maxlength="300" placeholder="Bu yer hakkında bildiklerin, neden önerdiğin…"></textarea>
    <span class="lbl">Fotoğraflar <small class="muted">(en fazla 3)</small></span>
    <div class="photos" id="sgPhotos"></div>
    <label class="btn ghost file-btn">${ICON.camera} Fotoğraf çek / seç<input id="sgFile" type="file" accept="image/*" multiple hidden></label>
    <p class="muted small">Lütfen fotoğraflarda insanların yüzü ve araç plakaları görünmesin.</p>
    <span class="lbl">Konum</span>
    <p class="muted small" id="sgLocTxt"></p>
    <div id="sgMap" class="mini-map"></div>
    <p id="sgErr" class="error" hidden></p>
    <button id="sgSend" class="btn primary">Öneriyi gönder</button>
    <button class="btn ghost" data-close>Vazgeç</button>`);
  const locTxt = () => { $('#sgLocTxt').textContent = d.loc ? (d.loc.how === 'gps' ? 'Bulunduğun konum alındı. Yer başka bir noktadaysa haritada o noktaya dokun.' : 'Haritada işaretlediğin nokta kullanılacak.') : 'Konumun alınamadı. Yerin bulunduğu noktaya haritada dokun.'; };
  locTxt();
  // küçük harita: işaretçiyi dokunarak taşı
  const c = d.loc ? [d.loc.lat, d.loc.lon] : CONFIG.MAP_CENTER;
  sMap = L.map('sgMap', { zoomControl: false, attributionControl: false }).setView(c, 18);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(sMap);
  const mk = L.circleMarker(c, { radius: 10, color: '#fff', weight: 3, fillColor: '#f6c21c', fillOpacity: 1 });
  if (d.loc) mk.addTo(sMap);
  sMap.on('click', e => { d.loc = { lat: +e.latlng.lat.toFixed(6), lon: +e.latlng.lng.toFixed(6), acc: 0, how: 'harita' }; mk.setLatLng(e.latlng).addTo(sMap); locTxt(); });
  setTimeout(() => sMap && sMap.invalidateSize(), 250);

  $$('[data-cat]').forEach(b => b.onclick = () => { d.cat = b.dataset.cat; $$('[data-cat]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#sgNote').oninput = e => { $('#sgCount').textContent = `${e.target.value.length}/300`; };
  const drawPhotos = () => {
    $('#sgPhotos').innerHTML = d.photos.map((p, i) => `<span class="ph"><img src="${p}" alt=""><button data-rm="${i}" aria-label="Kaldır">${ICON.close}</button></span>`).join('');
    $$('[data-rm]').forEach(b => b.onclick = () => { d.photos.splice(+b.dataset.rm, 1); drawPhotos(); });
    $('.file-btn').style.display = d.photos.length >= 3 ? 'none' : '';
  };
  $('#sgFile').onchange = async e => {
    for (const f of [...e.target.files].slice(0, 3 - d.photos.length)) {
      try { d.photos.push(await shrinkImage(f)); } catch { /* okunamayan dosya atlanır */ }
    }
    e.target.value = ''; drawPhotos();
  };
  $('#sgSend').onclick = () => {
    d.name = $('#sgName').value.trim(); d.note = $('#sgNote').value.trim();
    const miss = [!d.name && 'yerin adını', !d.cat && 'bir kategori', !d.loc && 'konumu (haritaya dokun)', !d.photos.length && 'en az bir fotoğraf'].filter(Boolean);
    if (miss.length) { const er = $('#sgErr'); er.hidden = false; er.textContent = `Lütfen ${miss.join(', ')} ekle.`; return; }
    const id = 'Y' + Date.now().toString(36);
    queueSuggestion({ id, ts: new Date().toISOString(), code: st.code, group: st.group, name: d.name, cat: d.cat, note: d.note, lat: d.loc.lat, lon: d.loc.lon, acc: d.loc.acc, how: d.loc.how, photos: d.photos });
    log('yer_onerildi', '', { oneri: id, ad: d.name, kategori: d.cat, foto: d.photos.length, konum: d.loc.how });
    st.suggested = (st.suggested || 0) + 1; save();
    closeModal(true); sMap = null;
    toast(`${ICON.check} Teşekkürler! Önerin ekibimize iletildi. Rotan değişmedi.`);
    render();
  };
  onModalClose = () => { sMap = null; };
}
// Fotoğrafı telefonda küçült (uzun kenar 1280 px, JPEG): gönderim hızlı olsun.
function shrinkImage(file, max = 1280) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(); };
    img.src = url;
  });
}

function addStopSheet() {
  const others = rankByInterest(STOPS.filter(s => !st.route.includes(s.id)), st.profile?.interests || {}).map(r => r.stop);
  modal(`<p class="eyebrow">Rotama durak ekle</p><h2 class="q-title">Hazır duraklar</h2>
    <p class="hint">Bunlar uygulamadaki duraklar; eklediğin durak rotana girer. İlgi alanına en çok benzeyenler üstte.</p>
    <ul class="stoplist">${others.map(s => `<li><span>${esc(s.title)}<small class="muted"> · %${similarity(s)} benzerlik${pos ? ' · ' + fmtDist(haversineM(pos, s)) : ''}${s.difficulty === 'zor' ? ' · yokuşlu' : ''}</small></span><button class="round-add" data-add="${s.id}" aria-label="Ekle">${ICON.plus}</button></li>`).join('')}</ul>
    <button class="btn ghost" data-close>Kapat</button>`);
  $$('[data-add]').forEach(b => b.onclick = () => {
    st.route.push(b.dataset.add); log('rota_duzenlendi', b.dataset.add, { islem: 'ekle', yer: 'tur' }); save();
    b.replaceWith(Object.assign(document.createElement('span'), { className: 'added', innerHTML: ICON.check }));
  });
  onModalClose = () => tour();
}

// ---------- rozetler ve rehber ----------
function showBadges() {
  const c = ctx(), reco = recommendations(c, 2);
  modal(`<p class="eyebrow">Rozetlerim</p><h2 class="q-title">Keşif rozetlerin</h2>
    <p class="hint">Rozetler yalnızca senin keşfini gösterir; sıralama ya da puan yoktur.</p>
    <div class="badges">${BADGES.map(b => `<div class="badge ${st.badges.includes(b.id) ? 'on' : ''}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>${esc(st.badges.includes(b.id) ? b.desc : b.hint)}</small></div>`).join('')}</div>
    ${reco.length ? `<h3>Önerilen sıradaki rozetler</h3><ul class="reco-list">${reco.map(r => `<li>${r.icon} <b>${esc(r.name)}</b>: ${esc(r.hint)} (${r.now}/${r.goal})</li>`).join('')}</ul>` : ''}
    <button class="btn ghost" data-close>Kapat</button>`);
  log('rozetler_acildi');
}
function showGuide() {
  const v = st.visited.map(id => STOP[id]).filter(Boolean);
  modal(`<p class="eyebrow">Rehberim</p><h2 class="q-title">Gezdiğin duraklar</h2>
    ${v.length ? `<ul class="stoplist">${v.map(s => `<li data-id="${s.id}"><span>${ICON.check} ${esc(s.title)}</span><span class="muted small">Oku</span></li>`).join('')}</ul>` : '<p class="hint">Henüz bir durağa ulaşmadın. Ulaştığın durakların bilgileri burada birikir.</p>'}
    <button class="btn ghost" data-close>Kapat</button>`);
  log('rehber_acildi');
  $$('.stoplist li').forEach(li => li.onclick = () => { closeModal(true); showInfo(STOP[li.dataset.id], true); });
}

// ---------- 6. bitiş ----------
function finishTour() {
  const last = st.visited.at(-1);
  const remaining = st.group === 'A' ? 0 : unvisited().length;
  modal(`<p class="eyebrow">Tur</p><h2 class="q-title">Turu bitirmek istiyor musun?</h2>
    ${remaining ? `<p class="hint">Rotanda ${remaining} durak kaldı.</p>` : ''}
    <button id="yes" class="btn primary">Evet, bitir</button><button class="btn ghost" data-close>Devam et</button>`);
  $('#yes').onclick = () => {
    closeModal(true);
    const done = () => { log('tur_bitti', '', { gezilen: st.visited, rozetler: st.badges, sureDk: st.startedAt ? Math.round((Date.now() - Date.parse(st.startedAt)) / 60000) : null }); stopWatch(); go('end'); };
    if (hasQ() && last && QUESTIONS[last] && !st.answers[last]) askQuestion(last, done); else done();
  };
}
function stopWatch() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; try { wakeLock?.release(); } catch { } wakeLock = null; }

function end() {
  const survey = CONFIG.SURVEY_URL ? `${CONFIG.SURVEY_URL}${CONFIG.SURVEY_URL.includes('?') ? '&' : '?'}kod=${encodeURIComponent(st.code)}` : '';
  flush();
  app.innerHTML = shell(`
    <p class="eyebrow">Tur tamamlandı</p>
    <h2 class="q-title">Teşekkürler!</h2>
    <p class="hint">${st.visited.length} durağı keşfettin.</p>
    ${st.group === 'C' && st.badges.length ? `<div class="badges">${BADGES.filter(b => st.badges.includes(b.id)).map(b => `<div class="badge on"><span>${b.icon}</span><b>${esc(b.name)}</b></div>`).join('')}</div>` : ''}
    ${survey ? `<a class="btn primary" href="${esc(survey)}" target="_blank" rel="noopener">Değerlendirme anketine geç</a>` : '<p class="hint">Lütfen araştırmacının vereceği değerlendirme anketini doldur.</p>'}
    <p class="muted small" id="sync"></p>
    <button id="csv" class="btn ghost">Verileri yedek olarak indir</button>
    <button id="reset" class="btn ghost small">Yeni katılımcı (araştırmacı için)</button>`, { nav: false });
  wireShell();
  const sync = () => { const el = $('#sync'); if (!el) return; const n = pendingCount(); el.textContent = n ? `${n} kayıt gönderilmeyi bekliyor (internet gelince gönderilecek).` : (CONFIG.SHEETS_URL ? 'Tüm kayıtlar gönderildi.' : 'Veriler bu telefonda saklanıyor.'); };
  sync(); setInterval(sync, 5000);
  $('#csv').onclick = downloadCsv;
  $('#reset').onclick = () => { if (confirm('Bu telefondaki tur bilgisi sıfırlansın mı? (Kayıtlar silinmez.)')) { localStorage.removeItem(KEY); location.reload(); } };
}

// ---------- yardımcılar ----------
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
  $$('.modal').forEach(m => m.remove());
  const cb = onModalClose; onModalClose = null;
  if (cb && !silent) cb();
}
function toast(html) { const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; document.body.appendChild(t); setTimeout(() => t.remove(), 4000); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const hashHue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

init();

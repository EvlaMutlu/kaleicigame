// Rekabetsiz rozetler: puan ya da sıralama yok; yalnızca kişinin kendi ilerlemesi.
const visitedStops = st => st.visited.map(id => st.stopsById[id]).filter(Boolean);
const countCat = (st, cat, min) => visitedStops(st).filter(s => (s.scores[cat] ?? 0) >= min).length;
const answered = st => Object.values(st.answers || {});

export const BADGES = [
  { id: 'ilk-adim', name: 'İlk Adım', icon: '👣', desc: 'İlk durağını keşfettin.', hint: 'Bir durağa ulaş.', goal: 1, progress: st => st.visited.length },
  { id: 'merakli', name: 'Meraklı Gezgin', icon: '🧭', desc: 'Üç durağı keşfettin.', hint: 'Üç durağa ulaş.', goal: 3, progress: st => st.visited.length },
  { id: 'kasif', name: 'Kaleiçi Gezgini', icon: '🗝️', desc: 'Beş durağı keşfettin.', hint: 'Beş durağa ulaş.', goal: 5, progress: st => st.visited.length },
  { id: 'tarih', name: 'Tarihin İzinde', icon: '🏛️', desc: 'Üç tarihî durağı ziyaret ettin.', hint: 'Tarih ağırlıklı üç durağı ziyaret et.', goal: 3, progress: st => countCat(st, 'tarih', 4), cat: 'tarih' },
  { id: 'sanat', name: 'Sanat Gözü', icon: '🎨', desc: 'İki sanat durağını ziyaret ettin.', hint: 'Sanat ağırlıklı iki durağı ziyaret et.', goal: 2, progress: st => countCat(st, 'sanat', 4), cat: 'sanat' },
  { id: 'lezzet', name: 'Lezzet Durağı', icon: '🍽️', desc: 'İki gastronomi durağını ziyaret ettin.', hint: 'Gastronomi ağırlıklı iki durağı ziyaret et.', goal: 2, progress: st => countCat(st, 'gastronomi', 4), cat: 'gastronomi' },
  { id: 'kultur', name: 'Kültür Elçisi', icon: '🎭', desc: 'İki kültür durağını ziyaret ettin.', hint: 'Kültür ağırlıklı iki durağı ziyaret et.', goal: 2, progress: st => countCat(st, 'kultur', 4), cat: 'kultur' },
  { id: 'eglence', name: 'Keyif Durağı', icon: '🎈', desc: 'İki eğlence durağını ziyaret ettin.', hint: 'Eğlence ağırlıklı iki durağı ziyaret et.', goal: 2, progress: st => countCat(st, 'eglence', 4), cat: 'eglence' },
  { id: 'bilgi', name: 'Bilgi Toplayıcı', icon: '📜', desc: 'Üç soruyu yanıtladın.', hint: 'Üç soruyu yanıtla.', goal: 3, progress: st => answered(st).length },
  { id: 'cesur', name: 'Cesur Soru Avcısı', icon: '⛰️', desc: 'Zor seviyede bir soruyu yanıtladın.', hint: 'Zor seviyede bir soruyu yanıtla.', goal: 1, progress: st => answered(st).filter(a => a.level === 'zor').length },
  { id: 'rota', name: 'Rotanı Tamamladın', icon: '🏁', desc: 'Kendi rotanın tüm duraklarını gezdin.', hint: 'Rotandaki tüm durakları gez.', goal: 1, progress: st => (st.route.length && st.route.every(id => st.visited.includes(id))) ? 1 : 0 },
];

export function newlyEarned(st) {
  return BADGES.filter(b => !st.badges.includes(b.id) && b.progress(st) >= b.goal);
}

// Öneri: rotada kalan duraklarla kazanılabilecek, en çok ilerlenmiş rozetler.
export function recommendations(st, limit = 2) {
  const remaining = st.route.filter(id => !st.visited.includes(id)).map(id => st.stopsById[id]);
  return BADGES
    .filter(b => !st.badges.includes(b.id))
    .filter(b => !b.cat || countCat(st, b.cat, 4) + remaining.filter(s => (s.scores[b.cat] ?? 0) >= 4).length >= b.goal)
    .map(b => ({ ...b, now: Math.min(b.progress(st), b.goal) }))
    .sort((x, y) => (y.now / y.goal) - (x.now / x.goal))
    .slice(0, limit);
}

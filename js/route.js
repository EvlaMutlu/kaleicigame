// Rota önerisi: k-NN (içerik tabanlı) + süre bütçesine sığdırma + en yakın komşu sıralaması.
// Saf fonksiyonlar; tarayıcıda ve Node testlerinde aynı kod çalışır.

export const CATEGORIES = ['sanat', 'tarih', 'eglence', 'kultur', 'gastronomi'];

const PACE_KMH = { yavas: 3.0, orta: 4.5, hizli: 5.5 };

// Rota zorluğuna göre izin verilen durak zorlukları.
// "bilinmiyor": saha notu girilene kadar kolay sayılır.
const ALLOWED = {
  kolay: ['kolay', 'bilinmiyor'],
  orta: ['kolay', 'orta', 'bilinmiyor'],
  zor: ['kolay', 'orta', 'zor', 'bilinmiyor'],
};

export function haversineM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Kaleiçi sokakları dolambaçlı: kuş uçuşu mesafe bir katsayıyla büyütülür.
export function walkMinutes(a, b, pace, detour) {
  const metersPerMin = (PACE_KMH[pace] || PACE_KMH.orta) * 1000 / 60;
  return (haversineM(a, b) * detour) / metersPerMin;
}

// k-NN: kullanıcının ilgi vektörü ile durakların kategori vektörü arasındaki Öklid uzaklığı.
export function rankByInterest(stops, interests) {
  return stops
    .map(s => ({
      stop: s,
      distance: Math.sqrt(CATEGORIES.reduce((sum, c) => sum + ((interests[c] ?? 0) - (s.scores[c] ?? 0)) ** 2, 0)),
    }))
    .sort((x, y) => x.distance - y.distance);
}

// Başlangıçtan itibaren her adımda en yakın durağa giderek sıralar, sonra 2-opt ile kısaltır.
export function orderStops(start, stops) {
  const rest = [...stops], ordered = [];
  let cur = start;
  while (rest.length) {
    let bi = 0, bd = Infinity;
    rest.forEach((s, i) => { const d = haversineM(cur, s); if (d < bd) { bd = d; bi = i; } });
    cur = rest.splice(bi, 1)[0];
    ordered.push(cur);
  }
  return twoOpt(start, ordered);
}

function pathLength(start, seq) {
  let len = 0, cur = start;
  for (const s of seq) { len += haversineM(cur, s); cur = s; }
  return len;
}

function twoOpt(start, seq) {
  let best = seq, improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const cand = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        if (pathLength(start, cand) + 0.01 < pathLength(start, best)) { best = cand; improved = true; }
      }
    }
  }
  return best;
}

export function routeTime(start, ordered, opts) {
  let walk = 0, cur = start;
  const legs = ordered.map(s => {
    const m = walkMinutes(cur, s, opts.pace, opts.detour);
    walk += m; cur = s;
    return { stop: s, walkMin: m };
  });
  const visit = ordered.length * opts.dwellMin;
  return { legs, walkMin: walk, visitMin: visit, totalMin: walk + visit };
}

// Ana fonksiyon: ilgiye en yakın durakları, süre bütçesine sığdıkça ekler.
export function recommendRoute(allStops, profile, opts) {
  const allowed = ALLOWED[profile.routeDifficulty] || ALLOWED.orta;
  const eligible = allStops.filter(s => allowed.includes(s.difficulty || 'bilinmiyor'));
  const ranked = rankByInterest(eligible, profile.interests);
  let chosen = [];
  for (const { stop } of ranked) {
    const trial = orderStops(opts.start, [...chosen, stop]);
    if (routeTime(opts.start, trial, opts).totalMin <= profile.minutes) chosen = trial;
  }
  if (!chosen.length && ranked.length) chosen = [ranked[0].stop]; // en az bir durak
  return {
    stops: chosen,
    ranked: ranked.map(r => ({ id: r.stop.id, distance: Math.round(r.distance * 100) / 100 })),
    excluded: allStops.filter(s => !allowed.includes(s.difficulty || 'bilinmiyor')).map(s => s.id),
    time: routeTime(opts.start, chosen, opts),
  };
}

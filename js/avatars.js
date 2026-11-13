// Avatarlar (Julia Sancta: rehberde Hadrianus Kapısı güney burcunu yaptıran Romalı kadın olarak geçer): Kaleiçi rehberinde geçen tarihî kişilerden esinlenen özgün, sembolik çizimler (gerçek portre değildir)
// ve iki tarafsız gezgin figürü. Her avatar 100x100 viewBox'ta, yuvarlak.

const SKIN = '#f1c9a5', SKIN2 = '#e0b088', INK = '#3b2a20';

const face = (o = {}) => `
  <circle cx="50" cy="${o.cy ?? 50}" r="17" fill="${o.skin ?? SKIN}"/>
  <circle cx="44" cy="${(o.cy ?? 50) - 1}" r="1.8" fill="${INK}"/>
  <circle cx="56" cy="${(o.cy ?? 50) - 1}" r="1.8" fill="${INK}"/>
  <path d="M45 ${(o.cy ?? 50) + 7}q5 4 10 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <circle cx="40" cy="${(o.cy ?? 50) + 4}" r="2.4" fill="#f4a0a0" opacity=".5"/>
  <circle cx="60" cy="${(o.cy ?? 50) + 4}" r="2.4" fill="#f4a0a0" opacity=".5"/>`;
const body = c => `<path d="M18 100c0-18 14-28 32-28s32 10 32 28z" fill="${c}"/>`;
const beard = (c, cy = 50) => `<path d="M34 ${cy + 1}c0 14 7 22 16 22s16-8 16-22c-3 5-8 8-16 8s-13-3-16-8z" fill="${c}"/>
  <path d="M45 ${cy + 8}q5 3 10 0" stroke="${SKIN}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
const wrap = (bg, inner) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clip-path="url(#c)"><rect width="100" height="100" fill="${bg}"/>${inner}</g></svg>`;

export const AVATARS = [
  {
    id: 'attalos', name: 'Kral Attalos', note: 'Şehrin kurucusu',
    svg: wrap('#e9dcf5', `${body('#7b4fa3')}<path d="M38 72l12 10 12-10" fill="#f6c21c"/>
      <path d="M31 48c-2-16 8-24 19-24s21 8 19 24c-2-6-4-9-6-10-4 2-22 2-26 0-2 1-4 4-6 10z" fill="#6b4a2e"/>
      ${face()}${beard('#6b4a2e')}
      <path d="M32 38q18-7 36 0" stroke="#fff" stroke-width="4" fill="none"/>
      <path d="M67 38l6 8M67 38l3 10" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`),
  },
  {
    id: 'hadrianus', name: 'İmparator Hadrianus', note: 'İ.S. 131 ziyareti',
    svg: wrap('#fbe3d6', `${body('#b3322b')}<path d="M24 86q26-14 52 0" stroke="#f6c21c" stroke-width="3" fill="none"/>
      <path d="M32 46c-1-14 8-21 18-21s19 7 18 21c-2-5-6-8-18-8s-16 3-18 8z" fill="#5a3b25"/>
      ${face()}${beard('#5a3b25')}
      ${[...Array(6)].map((_, i) => `<ellipse cx="${33 + i * 3.5}" cy="${39 - i * 1.6}" rx="3.6" ry="1.8" transform="rotate(${-35 + i * 6} ${33 + i * 3.5} ${39 - i * 1.6})" fill="#3f8a3a"/>
        <ellipse cx="${67 - i * 3.5}" cy="${39 - i * 1.6}" rx="3.6" ry="1.8" transform="rotate(${35 - i * 6} ${67 - i * 3.5} ${39 - i * 1.6})" fill="#3f8a3a"/>`).join('')}`),
  },
  {
    id: 'julia', name: 'Julia Sancta', note: 'Hadrianus Kapısı güney kulesi',
    svg: wrap('#f3e6d8', `${body('#c96f3b')}<path d="M18 100c4-16 14-24 24-27l-6 27z" fill="#efe3cf"/>
      <path d="M44 72l6 6 6-6" fill="#efe3cf"/>
      <circle cx="50" cy="27" r="9" fill="#4a2d1a"/>
      <path d="M31 54c-3-18 6-26 19-26s22 8 19 26c-3-8-8-12-19-12s-16 4-19 12z" fill="#4a2d1a"/>
      ${face({ cy: 52 })}
      <path d="M33 40q17-9 34 0" stroke="#f6c21c" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="33" cy="58" r="2" fill="#f6c21c"/><circle cx="67" cy="58" r="2" fill="#f6c21c"/>`),
  },
  {
    id: 'keyhusrev', name: 'Sultan Gıyaseddin Keyhüsrev', note: '1207, Selçuklu dönemi',
    svg: wrap('#d8e8f7', `${body('#1f5fa8')}<path d="M50 72v28" stroke="#f6c21c" stroke-width="3"/>
      ${face({ cy: 54 })}${beard('#2f2219', 54)}
      <path d="M30 44c0-14 9-20 20-20s20 6 20 20z" fill="#f4f1ea"/>
      <path d="M30 44h40" stroke="#d9d2c2" stroke-width="3"/>
      <path d="M38 26l4-10 4 8 4-10 4 10 4-8 4 10z" fill="#f6c21c" stroke="#c99a00" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="50" cy="34" r="3" fill="#2a9d8f"/>`),
  },
  {
    id: 'korkut', name: 'Şehzade Korkut', note: 'Osmanlı şehzadesi',
    svg: wrap('#d9efdf', `${body('#1e7a46')}<path d="M44 72l6 10 6-10" fill="#f4f1ea"/>
      ${face({ cy: 56 })}<path d="M38 66q12 8 24 0" stroke="#4a3322" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="36" rx="23" ry="15" fill="#f8f6f0"/>
      <path d="M29 34q21 8 42 0M30 40q20 7 40 0" stroke="#dcd5c4" stroke-width="2" fill="none"/>
      <path d="M50 24c-3-8 0-14 4-16-1 6 1 10-1 16z" fill="#e8553a"/><circle cx="50" cy="25" r="3" fill="#f6c21c"/>`),
  },
  {
    id: 'nigar', name: 'Nigar Hatun', note: 'Nigar Hatun Türbesi',
    svg: wrap('#fde4ea', `${body('#b23a5b')}
      <path d="M27 56c0-22 10-32 23-32s23 10 23 32v30H27z" fill="#e8b4c3"/>
      ${face({ cy: 52 })}
      <path d="M33 34q17-14 34 0l1 6q-18-9-36 0z" fill="#f6c21c"/>
      ${[38, 44, 50, 56, 62].map(x => `<circle cx="${x}" cy="${x === 50 ? 28 : 30 + Math.abs(x - 50) / 6}" r="1.6" fill="#fff"/>`).join('')}`),
  },
  {
    id: 'tekeli', name: 'Tekeli Mehmed Paşa', note: 'Tekeli Mehmet Paşa Camii',
    svg: wrap('#f6ead2', `${body('#8a5a1f')}<path d="M34 76h32" stroke="#f6c21c" stroke-width="3"/>
      ${face({ cy: 56 })}${beard('#7a7a7a', 56)}
      <path d="M38 62q12-5 24 0" stroke="#5b5b5b" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M28 42c0-6 10-10 22-10s22 4 22 10c0 4-10 6-22 6s-22-2-22-6z" fill="#f8f6f0"/>
      <path d="M38 34c0-10 5-16 12-16s12 6 12 16z" fill="#b8302a"/>`),
  },
  {
    id: 'kaptan', name: 'Liman Kaptanı', note: 'Yat Limanı',
    svg: wrap('#d3ecf5', `${body('#fff')}
      ${[78, 86, 94].map(y => `<path d="M18 ${y}h64" stroke="#0d5aa7" stroke-width="3"/>`).join('')}
      <path d="M33 50c-2-10 6-16 17-16s19 6 17 16z" fill="#3a2a1d"/>
      ${face({ cy: 54 })}
      <path d="M30 40h40l-3-10H33z" fill="#fff" stroke="#0d5aa7" stroke-width="2"/>
      <path d="M28 40h44" stroke="#14273e" stroke-width="5" stroke-linecap="round"/>
      <circle cx="50" cy="34" r="2.6" fill="#f6c21c"/>`),
  },
  {
    id: 'gezgin', name: 'Genç Gezgin', note: 'Kaleiçi sokakları',
    svg: wrap('#fff3c4', `${body('#0c8a3e')}
      <path d="M32 74v26M68 74v26" stroke="#f6c21c" stroke-width="5"/>
      <path d="M31 52c-2-18 7-26 19-26s21 8 19 26l-4-10H35z" fill="#7a4a24"/>
      <path d="M67 46q10 6 6 20" stroke="#7a4a24" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${face({ cy: 52 })}
      <path d="M32 40q18-14 36 0z" fill="#0d5aa7"/><path d="M60 39h14" stroke="#0d5aa7" stroke-width="4" stroke-linecap="round"/>`),
  },
];

export const avatarById = id => AVATARS.find(a => a.id === id);

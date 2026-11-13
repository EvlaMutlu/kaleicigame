// Basit çizgi simgeler (SVG). Her platformda aynı görünür.
const s = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  menu: s('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  user: s('<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor"/>'),
  trophy: s('<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>'),
  flags: s('<path d="M5 21V4M5 4h6l-1 3 1 3H5M19 21V4M19 4h-6l1 3-1 3h6"/><path d="M5 4h6M13 4h6" stroke-dasharray="1.5 1.5"/>'),
  book: s('<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>'),
  clipboard: s('<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V3h6v1M8 10h1M11 10h5M8 14h1M11 14h5M8 18h1M11 18h5"/>'),
  play: s('<path d="M8 5l12 7-12 7z" fill="currentColor"/>'),
  pinPlus: s('<path d="M11 21s-6-5.4-6-10.5A6 6 0 0 1 16 7"/><circle cx="11" cy="10" r="2" fill="currentColor"/><path d="M19 3v6M16 6h6"/><path d="M17 12c0 4-6 9-6 9"/>'),
  next: s('<path d="M9 5l7 7-7 7"/>'),
  back: s('<path d="M15 5l-7 7 7 7"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  check: s('<path d="M5 12l5 5 9-10"/>'),
  pin: s('<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/>'),
  list: s('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>'),
  map: s('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
  // yürüme hızı: aynı figür, artan hareket çizgileri
  walkSlow: s('<circle cx="13" cy="4" r="2" fill="currentColor"/><path d="M13 7l-1 6 3 3v5M12 13l-3 3-1 5M12 9l3 2h2M12 9l-3 2"/><path d="M18 14v7"/>'),
  walk: s('<circle cx="13" cy="4" r="2" fill="currentColor"/><path d="M13 7l-1 6 3 3v5M12 13l-3 3-1 5M12 9l3 2h2M12 9l-3 2"/>'),
  walkFast: s('<circle cx="14" cy="4" r="2" fill="currentColor"/><path d="M14 7l-2 5 4 3-1 6M12 12l-4 3-3 0M13 8l4 3h3M13 8l-4 1-2 3"/><path d="M2 9h3M1 13h3"/>'),
  // rota zorluğu
  flat: s('<path d="M2 17h20"/><circle cx="7" cy="13" r="2" fill="currentColor"/>'),
  slope: s('<path d="M2 19h20M2 19L22 9"/><circle cx="9" cy="12" r="2" fill="currentColor"/>'),
  stairs: s('<path d="M2 20h5v-4h5v-4h5V8h5"/><circle cx="9" cy="8" r="2" fill="currentColor"/>'),
  // soru zorluğu
  q1: s('<rect x="3" y="14" width="4" height="7" rx="1" fill="currentColor"/><rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor" stroke="none" opacity=".22"/><rect x="17" y="4" width="4" height="17" rx="1" fill="currentColor" stroke="none" opacity=".22"/>'),
  q2: s('<rect x="3" y="14" width="4" height="7" rx="1" fill="currentColor"/><rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor"/><rect x="17" y="4" width="4" height="17" rx="1" fill="currentColor" stroke="none" opacity=".22"/>'),
  q3: s('<rect x="3" y="14" width="4" height="7" rx="1" fill="currentColor"/><rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor"/><rect x="17" y="4" width="4" height="17" rx="1" fill="currentColor"/>'),
};

// Oyun logosu: Hadrianus Kapısı'nın üç kemeri + pusula yıldızı (özgün çizim)
export const LOGO = `<svg class="logo-svg" viewBox="0 0 120 120" aria-label="Kaleiçi Kaşifi logosu">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c8a3e"/><stop offset="1" stop-color="#0d5aa7"/></linearGradient></defs>
  <circle cx="60" cy="60" r="56" fill="#fff"/>
  <circle cx="60" cy="60" r="50" fill="none" stroke="url(#lg)" stroke-width="4"/>
  <path d="M60 14l5 13-5-3-5 3z" fill="#f6c21c" stroke="#c99a00" stroke-width="1" stroke-linejoin="round"/>
  <rect x="22" y="44" width="76" height="8" rx="2" fill="url(#lg)"/>
  <rect x="26" y="38" width="8" height="8" rx="1" fill="url(#lg)"/>
  <rect x="86" y="38" width="8" height="8" rx="1" fill="url(#lg)"/>
  <path fill="url(#lg)" fill-rule="evenodd" d="M24 54h72v38H24z
    M30 92V74a7 7 0 0 1 14 0v18z
    M51 92V70a9 9 0 0 1 18 0v22z
    M76 92V74a7 7 0 0 1 14 0v18z"/>
  <path d="M18 96h84" stroke="#f6c21c" stroke-width="4" stroke-linecap="round"/>
</svg>`;

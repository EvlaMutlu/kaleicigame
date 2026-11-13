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
  q1: s('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/>'),
  q2: s('<circle cx="12" cy="12" r="9"/><path d="M9 9.5a3 3 0 1 1 3.5 3c-.4.1-.5.4-.5.8V15M12 18v.5"/>'),
  q3: s('<path d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"/>'),
};

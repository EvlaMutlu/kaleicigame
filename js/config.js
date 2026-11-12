// Araştırmacının değiştirebileceği ayarlar.
export const CONFIG = {
  // Google Apps Script web uygulaması adresi (README'deki adımlarla alınır). Boşsa veriler sadece telefonda saklanır.
  SHEETS_URL: '',
  // Etkinlik sonu anketinin bağlantısı. Katılımcı kodu "?kod=..." olarak eklenir.
  SURVEY_URL: '',

  ARRIVAL_RADIUS_M: 35,   // durağa bu mesafede "varıldı" sayılır
  MAX_ACCURACY_M: 60,     // GPS hassasiyeti bundan kötüyse otomatik varış yapılmaz
  DWELL_MIN: 7,           // durak başına tahmini ziyaret süresi (dk)
  DETOUR: 1.3,            // kuş uçuşu mesafeyi sokak mesafesine çeviren katsayı
  TIME_OPTIONS: [30, 45, 60, 90, 120, 180],

  // Rota başlangıcı: katılımcı Kaleiçi'ne yakınsa kendi konumu, değilse bu nokta.
  DEFAULT_START: { lat: 36.885341, lon: 30.708581, name: 'Hadrianus Kapısı' },
  KALEICI_CENTER: { lat: 36.8848, lon: 30.7056 },
  START_RADIUS_M: 1500,
  MAP_CENTER: [36.8848, 30.7056],
  MAP_ZOOM: 17,
};

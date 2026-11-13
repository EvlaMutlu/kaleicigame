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

  // Rota başlangıcı: katılımcı Kaleiçi'nin içindeyse (bir durağa bu mesafeden yakınsa) kendi konumu,
  // değilse DEFAULT_START. Test modunda her zaman DEFAULT_START.
  DEFAULT_START: { lat: 36.885341, lon: 30.708581, name: 'Hadrianus Kapısı' },
  START_RADIUS_M: 400,
  // İlgi alanı kartlarının fotoğrafları (ör. 'img/kategori/tarih.jpg'). Boşsa renkli kart gösterilir.
  CATEGORY_IMAGES: { sanat: '', tarih: '', kultur: '', eglence: '', gastronomi: '' },
  // Açılış ekranındaki oyun figürü (ör. 'img/maskot.png'). Boşsa sadece logo görünür.
  MASCOT_IMG: '',
  // Profil (takma ad + avatar) hangi gruplarda açık? Oyunlaştırma öğesi olduğu için yalnız C.
  AVATAR_GROUPS: ['C'],
  // B ve C gruplarında sıradaki durağı kullanıcı mı seçsin (true) yoksa uygulama sırayla mı göstersin (false)?
  USER_PICKS_NEXT: true,

  MAP_CENTER: [36.8848, 30.7056],
  MAP_ZOOM: 17,
};

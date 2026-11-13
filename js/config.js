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
  // Hangi özellik hangi grupta? (A: bilgi rehberi, B: kişisel rota, C: kişisel + oyunlaştırma)
  QUESTION_GROUPS: ['C'],       // durak soruları + soru zorluğu seçimi (girişte ve tur sırasında)
  AVATAR_GROUPS: ['B', 'C'],    // profil: takma ad + avatar
  AVATAR_MODE: { B: 'photo', C: 'character' }, // B: kendi fotoğrafı (telefonda kalır), C: tarihî karakter avatarları
  SUGGEST_GROUPS: ['C'],        // haritaya yeni yer önerme (empowerment)
  JOURNAL_GROUPS: ['C'],        // ziyaret günlüğü + motivasyon mesajları (rozetler de yalnız C)
  ACTIVE_WINDOW_MIN: 30,        // "çok aktifsin": bu süre içinde en az 2 durak
  PASSIVE_MIN: 20,              // "keşfedilecek yerler seni bekliyor": bu süredir yeni durak yoksa
  // B ve C gruplarında sıradaki durağı kullanıcı mı seçsin (true) yoksa uygulama sırayla mı göstersin (false)?
  USER_PICKS_NEXT: true,

  MAP_CENTER: [36.8848, 30.7056],
  MAP_ZOOM: 17,
};

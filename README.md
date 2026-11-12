# Kaleiçi Keşif – araştırma uygulaması (ilk sürüm)

Telefon tarayıcısında çalışan HTML uygulaması. Bir sonraki adımda aynı kod Android uygulamasına (APK) dönüştürülecek.

## Klasörler

| Dosya | Ne işe yarar |
|---|---|
| `index.html`, `css/`, `js/` | Uygulamanın kendisi |
| `js/config.js` | **Sizin değiştireceğiniz ayarlar**: E-Tablolar adresi, anket bağlantısı, varış mesafesi vb. |
| `data/stops.json` | 27 durak: koordinat, 5 kategori puanı, zorluk, metin, görseller |
| `data/questions.json` | Soru bankası (şu an 3 durak için **örnek taslak**) |
| `data/codes.json` | Katılımcı kodları ve grupları (A/B/C) |
| `katilimci_kodlari.csv` | Aynı kodlar, sırayla dağıtmak için (bkz. Rastgele atama). Zip'te uygulama klasörünün **yanında** durur; GitHub'a yüklemeyin. |
| `apps-script/Code.gs` | Google E-Tablolar'a veri yazan kod |
| `vendor/leaflet/` | Harita kütüphanesi |

## 1. GitHub'da yayınlama (yaklaşık 5 dakika)

1. GitHub'da yeni bir depo açın (ör. `kaleici-kesif`). **Public** seçin; GitHub Pages ücretsiz hesapta yalnızca public depolarda çalışır.
2. "Add file → Upload files" ile bu klasörün **içindekileri** (index.html en üstte olacak şekilde) yükleyin.
3. Depoda **Settings → Pages → Branch: main / root → Save**.
4. Birkaç dakika sonra adres hazır olur: `https://KULLANICIADINIZ.github.io/kaleici-kesif/`

> Not: Depo public olduğu için `codes.json` içindeki kod–grup eşleşmesi teknik olarak görülebilir. Katılımcıların bunu inceleme olasılığı düşük; isterseniz APK aşamasında kodları uygulamanın içine gömeriz.

## 2. Evde test etme

Adresin sonuna `?test=1` ekleyin: `https://…/kaleici-kesif/?test=1`

- Kod olarak `TEST-A`, `TEST-B` veya `TEST-C` girin.
- Test modunda GPS yerine **haritaya dokunduğunuz yer konumunuz olur**. Bir durağın üstüne dokunursanız ona "varmış" olursunuz.
- "Durağa vardım" düğmesi her modda çalışır.
- Yeni bir deneme için bitiş ekranındaki "Yeni katılımcı" düğmesini kullanın.

## 3. Google E-Tablolar bağlantısı

1. Google Drive'da yeni bir E-Tablo açın (ör. "Kaleiçi Keşif Verileri").
2. Menüden **Uzantılar → Apps Script**. Açılan sayfadaki kodu silin, `apps-script/Code.gs` içeriğini yapıştırın, kaydedin.
3. **Dağıt → Yeni dağıtım → Tür: Web uygulaması**
   - Şu kullanıcı olarak çalıştır: **Ben**
   - Erişimi olanlar: **Herkes**
4. "Dağıt"a basın, Google'ın istediği izni verin. Size `https://script.google.com/macros/s/…/exec` biçiminde bir adres verilecek.
5. Bu adresi `js/config.js` içinde `SHEETS_URL: ''` tırnaklarının arasına yapıştırın ve GitHub'a yeniden yükleyin.

Her olay "Olaylar" sayfasına bir satır olarak düşer: zaman, kod, grup, olay, durak, ayrıntı (JSON), cihaz.
İnternet yoksa kayıtlar telefonda bekler ve bağlantı gelince gönderilir. Bitiş ekranındaki **"Verileri yedek olarak indir"** düğmesi o telefondaki tüm kayıtları CSV olarak indirir.

### Kaydedilen olaylar

| olay | ne zaman | ayrıntı |
|---|---|---|
| `kod_girildi`, `onam_verildi` | başlangıç | |
| `profil` | giriş soruları (B, C) | süre, hız, rota zorluğu, 5 ilgi puanı, soru zorluğu (C) |
| `rota_onerildi` | algoritmanın önerisi | duraklar, tahmini süre, başlangıç noktası, k-NN sıralaması |
| `rota_duzenlendi` | katılımcı durak ekledi/çıkardı | ekle / çıkar |
| `tur_basladi`, `tur_bitti` | | gezilen duraklar, rozetler, toplam süre |
| `varis` | durağa varış | yöntem (`gps` / `manuel`), GPS hassasiyeti, sıra |
| `bilgi_okundu` | bilgi ekranı kapandı | ekranda kalınan saniye |
| `cevap` | her cevap denemesi (C) | seviye, seçenek, doğru mu, kaçıncı deneme, saniye |
| `soru_zorlugu_degisti` | (C) | eski, yeni, nereden değiştirildi |
| `rozet`, `rozetler_acildi` | (C) | rozet adı |
| `durak_listesi_acildi`, `durak_secildi` | (A) | |
| `konum_hatasi` | konum izni yok vb. | hata kodu |

## 4. Rastgele atama

`katilimci_kodlari.csv` içindeki 180 kod (her gruptan 60) **önceden karıştırılmıştır**. Katılımcılara kodları listedeki sırayla verin; böylece atama rastgele olur. Kimin hangi kodu aldığını ayrı bir listede tutun.

## 5. Gruplar

| | A: Bilgi rehberi | B: Kişiselleştirilmiş | C: Kişiselleştirilmiş + oyunlaştırılmış |
|---|---|---|---|
| Giriş soruları | – | ✓ | ✓ (+ soru zorluğu) |
| Kişiye özel rota (k-NN) ve rota düzenleme | – (tüm duraklar haritada) | ✓ | ✓ |
| Bilgi ekranları | ✓ | ✓ | ✓ |
| Sorular (zorluğu kullanıcı seçer) | – | – | ✓ |
| Rekabetsiz rozetler ve rozet önerisi | – | – | ✓ |

C grubunda soru, bir sonraki durağa varıldığında **bir önceki durak hakkında** sorulur (hatırlamayı destekler). Son durağın sorusu tur bitirilirken sorulur. Yanlış cevapta katılımcı tekrar dener.

## 6. Rota algoritması (`js/route.js`)

1. Uygun duraklar: seçilen rota zorluğuna göre (`kolay`: yalnızca kolay/bilinmiyor; `orta`: + orta; `zor`: hepsi).
2. k-NN: katılımcının 5 ilgi puanı ile her durağın 5 kategori puanı arasındaki Öklid uzaklığına göre sıralama.
3. En yakın duraklardan başlayarak, toplam süre (yürüme + durak başına 7 dk) seçilen süreyi aşmayana kadar ekleme.
4. Sıralama: en yakın komşu + 2-opt. Yürüme süresi = kuş uçuşu × 1,3 / hız (yavaş 3, orta 4,5, hızlı 5,5 km/sa).
5. Başlangıç: katılımcı Kaleiçi'ne 1,5 km'den yakınsa kendi konumu, değilse Hadrianus Kapısı.

## 7. İçeriği düzenleme

**Durak metinleri** (`data/stops.json` → `text`): Hepsi Oyunlaştırma Rehberi'nden alındı (Varuna için sizin gönderdiğiniz resmi metin). Hepsinin durumu `"status": "taslak"`, onaylamanız gerekiyor.

**Zorluk** (`difficulty`): `kolay`, `orta`, `zor` ya da `bilinmiyor`. Şu an yalnızca liman seviyesindeki 3 durak (Yat Limanı, İskele Camii, Fatma Doman) `zor`. Saha notlarınızdan sonra güncellenecek.

**Fotoğraflar:** Her durak için `img/stops/` klasörüne koyun ve `images` listesine ekleyin. Örnek: `"images": ["img/stops/hadrian-1.jpg"]`. Telefonda hızlı açılması için yaklaşık 1200 piksel genişliğe küçültülmüş JPG önerilir. Fotoğraf yoksa durak adının yazdığı renkli bir kutu görünür.

**Sorular** (`data/questions.json`): Durak kimliği altında `kolay` / `orta` / `zor`. Her biri `text`, `options` ve `answer` (doğru seçeneğin sırası, 0'dan başlar) içerir. Bir seviye eksikse uygulama var olan başka bir seviyeyi gösterir ve bunu katılımcıya söyler.

## 8. Bu sürümün sınırları

- Tarayıcı sürümünde konum **yalnızca ekran açıkken** izlenir. Ekranın kapanmaması istenir, ama bazı telefonlar buna izin vermez. Arka planda takip APK aşamasında eklenecek.
- Harita karoları internetten (OpenStreetMap) gelir. İnternet yoksa harita boş görünür, ama tur ve kayıt çalışmaya devam eder.
- Onam metni yer tutucudur (`js/app.js` → `consent`). Etik kurul onaylı metinle değiştirilecek.

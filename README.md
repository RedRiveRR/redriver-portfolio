# RedRiverLab — Cloudflare Pages failover

Bu depo, ana sunucudan bağımsız çalışacak statik RedRiverLab portföyüdür. Sayfa; RedRiver tasarım dilini, marka görsellerini, ana sunucunun durum bildirimini ve GitHub'daki herkese açık depoları içerir.

## İçerik

- `index.html`: Ana sayfa, marka alanı, sunucu durumu ve proje vitrini.
- `styles.css`: Koyu arayüz, tipografi, kartlar, responsive düzen ve animasyonlar.
- `app.js`: Sunucu durumunu yapılandırmadan işler ve herkese açık GitHub depolarını listeler.
- `site-config.js`: Marka adı, GitHub kullanıcı adı, logo yolu ve sunucu durumunu içerir. **Gizli anahtar veya kimlik bilgisi buraya eklenmemelidir.**
- `assets/`: Logo, wordmark ve favicon dosyaları.
- `404.html`: Markalı bulunamadı sayfası.
- `_headers`: Statik yanıtlar için güvenlik başlıkları.

## Yapılandırma

`site-config.js` dosyasındaki alanlar:

- `brandName`: Görünen marka adı.
- `githubUsername`: Herkese açık depoları listelenecek GitHub hesabı.
- `logoPath`: Üst menüde kullanılacak yatay logo dosyası.
- `serverStatus`: Ana sunucu kapalıysa `"offline"`, geri döndüğünde `"online"`.
- `serverStatusTitle` ve `serverStatusMessage`: Durum panelindeki açıklama.

Proje vitrini özel depoları göstermez; ziyaretçiye yalnızca herkese açık GitHub depoları sunulur. GitHub API geçici olarak yanıt vermezse sayfa yüklenmeye devam eder ve profil bağlantısını korur.

## Cloudflare Pages

Git entegrasyonu ile yayınlamak için:

1. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** akışını aç.
2. GitHub deposu olarak `RedRiveRR/redriver-portfolio` seç.
3. Production branch olarak `main` kullan.
4. Framework preset: **None**.
5. Build command: boş bırakılabilir; istenirse `exit 0` kullanılabilir.
6. Build output directory: `.` (depo kökü).
7. **Save and Deploy** ile yayınla.

Bu statik site için Node.js kurulumu veya paket derlemesi gerekmez. Git entegrasyonu açıkken `main` dalına birleştirilen değişiklikler Cloudflare Pages tarafından otomatik yayınlanır.

Alan adını Pages projesinin **Custom domains** ekranından bağla. E-posta kullanıyorsan mevcut MX ve e-posta doğrulama TXT kayıtlarını silme.

## Yerel önizleme

Depo kökünde `python -m http.server 8000` çalıştır ve `http://localhost:8000` adresini aç. GitHub proje listesini görüntülemek için internet erişimi gerekir.

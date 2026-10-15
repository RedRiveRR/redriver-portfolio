# RedRive — Cloudflare Pages Portfolio

Ana sunucudan bağımsız çalışan, statik ve siyah-beyaz portföy sitesi. Node.js veya build komutu gerektirmez. GitHub'daki herkese açık depoları GitHub API üzerinden otomatik listeler.

## Önce kişiselleştir

1. `site-config.js` dosyasını aç.
2. `brandName` değerini marka adına göre değiştir.
3. `githubUsername` değerinin GitHub kullanıcı adın olduğundan emin ol. Başlangıç değeri `RedRiveRR`.
4. Ana sunucu geri geldiğinde `serverStatus: "online"` yapabilirsin. Çevrimdışı uyarısı için `"offline"` olarak bırak.
5. Kendi logonu `assets/logo.svg` dosyasının yerine koy. PNG kullanırsan `site-config.js` içindeki `logoPath` değerini örneğin `/assets/logo.png` yap; favicon için `assets/favicon.svg` dosyasını da kendi ikonunla değiştir.

> Projeler bölümü herkese açık depoları gösterir; özel depolar ziyaretçilere gösterilmez. GitHub API geçici olarak sınırlandırılırsa bağlantı üzerinden profilin yine açılır.

## Önerilen yayınlama: GitHub bağlantısı ile Cloudflare Pages

Bu yöntemle dosyaları GitHub'a her gönderdiğinde site otomatik güncellenir.

1. Bu klasörü yeni bir GitHub deposuna yükle (ör. `portfolio-site`).
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → Git bağlantısı ile başlat.
3. GitHub hesabını bağla ve bu depoyu seç.
4. Framework preset: **None**; Build command: boş; Build output directory: `.` (repo kökündeki `index.html`).
5. Deploy et. Cloudflare sana bir `*.pages.dev` adresi verir.
6. Projede **Custom domains** → **Set up a domain** kısmından kullanmak istediğin alan adını veya alt alan adını ekle ve ekrandaki adımları izle.

## Alternatif: sürükle-bırak ile hızlı yayınlama

1. Bu klasörün içeriğini ZIP olarak paketle.
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Get started** → **Drag and drop your files**.
3. Proje adı ver, ZIP'i sürükle ve **Deploy site** seç.
4. Yayından sonra **Custom domains** ekranından alan adını bağla.

**Önemli:** Cloudflare'ın güncel dokümantasyonuna göre Direct Upload ile oluşturulan bir Pages projesi sonradan Git entegrasyonuna çevrilemiyor. İleride otomatik güncelleme istiyorsan baştan GitHub bağlantısını seç.

## DNS notu

Alan adının nameserver'ları Cloudflare'daysa, Pages projesindeki **Custom domains** akışını kullan. Sadece DNS'te gelişigüzel CNAME oluşturma; önce alan adını Pages projesine ekle. E-posta kullanıyorsan MX ve e-posta doğrulama TXT kayıtlarını silme.

## Yerelde önizleme

Dosyaları doğrudan açarak tasarımı görebilirsin; GitHub API isteği için mümkünse basit bir yerel web sunucusu kullan. Örneğin Python kuruluysa bu klasörde `python -m http.server 8000` çalıştırıp `http://localhost:8000` adresini aç.

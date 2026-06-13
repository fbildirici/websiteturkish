# Fatih Bildirici Kisisel Site

Fatih Bildirici'nin yapay zeka arastirmalari, konusmalari, podcast icerikleri, akademik calismalari ve iletisim sayfalarini iceren statik web sitesi.

## Icerik

- `index.html`: Ana sayfa
- `hakkinda.html`: Biyografi ve newsroom akisi
- `hizmetler.html`: Egitim, konusma ve danismanlik sayfasi
- `gelismeler.html`: Yazilar, haberler ve dinamik kart listesi
- `podcast.html`: Podcast RSS uzerinden bolum listesi
- `akademik.html`: Akademik calismalar ve kaynaklar
- `iletisim.html`: Iletisim formu
- `aydinlatma-metni.html`, `acik-riza-metni.html`, `gizlilik-politikasi.html`: Yasal metinler

## Calistirma

Statik dosyalar dogrudan acilabilir; yerel gelistirme icin basit bir HTTP sunucu kullanabilirsiniz:

```bash
python3 -m http.server 8080
```

Ardindan tarayicida `http://localhost:8080` adresini acin.

## Notlar

- Site saf HTML, CSS ve JavaScript ile calisir; build adimi yoktur.
- Podcast bolumleri RSS kaynagindan ve tarayici cache'inden yuklenir.
- Bulten formlari Substack abonelik endpoint'ine gider.
- Ortak header/footer bloklari su an HTML dosyalarinda tekrar eder; site buyurse basit bir static generator veya partial sistemi onerilir.

# Kişisel Site (Statik)

Bu depo, vorgacan.com yapısına benzeyen, tamamen özgün içerik ve yer tutucu görsellerle oluşturulmuş statik bir kişisel site şablonudur.

## Özellikler
- Hero bölümü, logo ızgarası, son paylaşımlar, kesitler ve bülten kartı
- Mobil uyumlu, hafif ve hızlı
- Sade ve modern koyu tema tasarımı

## Çalıştırma
Yerel geliştirme için basitçe bir HTTP sunucu kullanın:

```bash
python3 -m http.server 8080
```

Ardından tarayıcıda: http://localhost:8080

## Yapı
- `index.html`: Sayfa iskeleti
- `styles.css`: Stil dosyaları
- `script.js`: Dinamik içerik ve bülten formu
- `assets/`: Logo ve görsel yer tutucuları

## Notlar
- Metinler özgün ve örnek niteliğindedir; gerçek markaların logoları yerine yer tutucu SVG kullanılmıştır.
- Gerçek bülten entegrasyonu için bir servis (Buttondown, Mailchimp, Brevo vb.) eklenmelidir.

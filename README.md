Tarih Çevirici (TTK) — Tinycast eklentisi
=========================================

Tarih yazınca Milâdî, Hicrî ve Rûmî karşılıklarını birden verir. Hesap, Türk Tarih Kurumu'nun
[Tarih Çevirme Kılavuzu](https://ttk.gov.tr/tarih-cevirme-kilavuzu/) sayfasındaki betiğin
**birebir uyarlanmasıdır** (`assets/takvim.js`): sınırlar, uyarı metinleri ve SİVİŞ yılı kuralları
siteyle aynıdır. Ağ kullanılmaz; hızlı ve istikrarlıdır.

## Kullanım

- Paletten **"Tarihi Çevir"** açılır ve tarih yazılır:
  - `23 Nisan 1920` · `10 Kanunusani 1335` · `4 Ramazan 1338` — ay adıyla
  - `1453` — yalnız yıl (çıktı yılın baş ve sonuna göre bir aralıktır: `1919/1920` gibi)
  - `1453 5` — yalnız ay-yıl · `29.5.1453` — noktalı · `20 10 2026` — sayılı gün-ay-yıl
- Şapkalı harfler şart değildir: `kanunu sani` = Kanunusani. Arap rakamları da kabul edilir (`١٤٤٧`).
- Sağ üstten **girdi takvimi** seçilir:
  - **Kendiliğinden** ay adına bakar: hicrî adlar (Muharrem…Zilhicce) ve Teşrin*/Kanun*
    (yalnız Rûmî) girişin takvimini belirler; öbür ay adları ve sayılı girdiler Milâdî sayılır.
  - Rûmî girişte (ör. `23 Nisan 1336`) takvimi elle Rûmî'ye almak gerekir.
- Satırın detay bölümünde üç tarih, hafta günü, sınır notları ve sayısal biçimler görünür.
- Kopyalama: `⌘C` yazıyı satırı; `⌘⇧C` sayısal tarihi; `⌘⌥C` tüm detayı; `⌘↵` TTK Kılavuzu.

## Sınırlar (TTK'nın kendi kuraldır)

- Milâdî 16/7/622 öncesi işlenmez.
- 5-14 Ekim 1582 Gregoryen düzeltmesi arası: reddedilir.
- Hicrî ve Rûmî 26 Aralık 1925'te kaldırıldı (H./R. 1341): bu yıldan sonrası çevrilmez.
- Rûmî R.1086'den önce ve 1341 sonrası işlenmez; 1087, 1121, 1154, 1188, 1221, 1255 yılları SİVİŞ'tir: çevrilmez.
- R.1332'de 15 Şubat'tan sonraki günler ve R.1333'ün son iki ayı Milâdî'ye uyum için atlanmıştır;
  TTK sitesi bunları da reddeder, eklenti aynı davranışı gösterir.

## Dosyalar

- `assets/takvim.js` — TTK `tarih_cevirme.js` betiği değişmeden + arayüz kapısı (parse, cevir, kontrol, yazi, sayisal)
- `takvim-test.js` — bilinen tarihlerle deneme: `node takvim-test.js`
- `tarih.js` — arayüz (List, kopyalama eylemleri, detay)
- `assets/icon.png` — ikon


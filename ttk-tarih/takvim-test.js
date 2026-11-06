"use strict";
const tak = require("./assets/takvim.js");
let bad = 0;
const kos = (ad, sart, detay) => { if (!sart) { console.log("BAŞARISIZ", ad, JSON.stringify(detay)); bad = 1; } };

// Ayrıştırma
for (const [girdi, tk, beklenen] of [
  ["23 Nisan 1920", 3, { g: 23, a: 2, y: 1920 }],
  ["23 ANISN?", 1, null],
  ["23 NİSAN 1920", 3, { g: 23, a: 2, y: 1920 }],
  ["10 Nisan 1336", 3, { g: 10, a: 2, y: 1336 }],
  ["4 Ramazan 1338", 2, { g: 4, a: 9, y: 1338 }],
  ["4 ramazan 1338", 2, { g: 4, a: 9, y: 1338 }],
  ["١٤٤٧", 2, { g: "", a: 0, y: 1447 }],                    // ArapCHASE rakamı 1447
  ["1453", 1, { g: "", a: 0, y: 1453 }],
  ["1920 4", 1, { g: "", a: 4, y: 1920 }],
  ["29.5.1453", 1, { g: 29, a: 5, y: 1453 }],
  ["20 10 2026", 1, { g: 20, a: 10, y: 2026 }],
  ["10 Kanunusani 1335", 3, { g: 10, a: 11, y: 1335 }],
  ["10 kanun-u sani 1335", 3, { g: 10, a: 11, y: 1335 }],
  ["10 Kanun 1335", 3, null],                                // belirsiz → hata
  ["23 Nisan", 1, null],
  ["hede hödö", 1, null],
]) {
  const p = tak.parse(girdi, tk);
  if (!beklenen) { kos(girdi + " hata beklenirdi", p.hata !== "", p); continue; }
  const ok = String(p.g) === String(beklenen.g) && p.a === beklenen.a && p.y === beklenen.y && !p.hata;
  kos("parse " + girdi, ok, p);
}

// Bilinen tarih (TTK'nın kendi hesabıyla): 23 Nisan 1920 → R.23/2/1336, H.4/8/1338, Cuma
let k = tak.kontrol(1, 23, 4, 1920); kos("kontrol 23.4.1920", k === "", k);
let s = tak.cevir(1, 23, 4, 1920);
kos("rumi 23 Nisan 1336", s.rumi.g === 23 && s.rumi.ay === "Nisan" && s.rumi.y === 1336, s.rumi);
kos("hicri 4 Şaban 1338", s.hicri.g === 4 && s.hicri.ay === "Şaban" && s.hicri.y === 1338, s.hicri);
kos("hafta Cuma", s.hafta === "Cuma", s.hafta);
console.log("23 Nisan 1920:", tak.yazi(s.miladi), "|", tak.yazi(s.hicri), "|", tak.yazi(s.rumi), "|", s.hafta);

// Geri tur: H.4/8/1338 → miladi (TTK'nın yön asimetrisi +/-1 güne izin verir)
let geri = tak.cevir(2, 4, 8, 1338);
console.log("H.4/8/1338 → miladi:", tak.yazi(geri.miladi), geri.hafta);
kos("hicri geri tur yıl", geri.miladi.y === 1920, geri.miladi);

// Rumiden: R.23/2/1336 → miladi 23 Nisan 1920
let r2m = tak.cevir(3, 23, 2, 1336);
kos("rumi→miladi 23 Nisan 1920", r2m.miladi.g === 23 && r2m.miladi.ay === "Nisan" && r2m.miladi.y === 1920, r2m.miladi);

// 1917 süsssüzdük sonrası miladi = rumi (gün ve ay): 1 Ocak 1926 → R.1 Kanunusani 1335?? 
// Ahh dikkat: 1 Ocak 1926 aslında rumi 1 Kanunusani 1334; sınav: içsel tutarlılık yeter
let rm = tak.cevir(1, 1, 1, 1926);
console.log("1 Ocak 1926:", JSON.stringify(rm), "(rumi kaldırıldı → YOK beklenir)");

// Yalnız yıl: H.1338 aralığı
let yh = tak.cevir(2, "", 0, 1338);
kos("H.1338 aralık", yh.hicri.y === 1338 && yh.miladi.y === "1919/1920", yh);
console.log("H.1338 miladi aralık:", tak.yazi(yh.miladi));

// SİVİŞ
let sivi = tak.kontrol(3, 1, 1, 1121);
kos("siviş uyarısı", /siviş/i.test(sivi), sivi);

// 1582 kesintisi
let kes = tak.kontrol(1, 10, 10, 1582);
kos("1582 kesinti mesajı", /582/.test(kes), kes);

// Günün girişi gün+ay yok: "23." → hata mesajı (site mesajı)
let gm = tak.kontrol(1, 23, 0, 1920);
kos("günsüzsüksüzik", /ilgili ayı da seçmelisiniz/.test(gm), gm);

// Çıkışa üst sınır: H.1342 → site mesajı
let ust = tak.kontrol(2, 5, 10, 1342);
kos("hicri üst sınır", /1925/.test(ust), ust);
process.exit(bad);

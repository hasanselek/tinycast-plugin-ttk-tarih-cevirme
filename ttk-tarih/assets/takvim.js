// takvim.js — Milâdî / Hicrî / Rûmî tarih çevirisi (Tinycast eklentisi)
// Hesap, TTK'nın (Türk Tarih Kurumu) Tarih Çevirme Kılavuzu sayfasındaki betiğin birebir uyarlanmasıdır:
//   https://ttk.gov.tr/tarih-cevirme-kilavuzu/  (wp-content/plugins/tarihcevirme/assets/js/tarih_cevirme.js)
// Sınırlar (16/7/622'den öncesi, R.1086-1341, SİVİŞ yılları, 5-14 Ekim 1582 arası) ve site
// mesajları korunmuştur; "Eklenti kapısı" bölümü yalnız arayüz yardımcılarını ekler, TTK koduna
// dokunulmamıştır (sağlamlık ve siteyle birebir anlaşma için).

// ---- Eklenti kapısı: TTK betiği aynen kullanılır, bu bölüm yalnız arayüz yardımcılarını ekler ----

// TTK betiği sonuçları document.getElementById ile ekrana yazdığından alaycı bir taklit yeterlidir.
var document = { getElementById: function () { return { innerHTML: "" }; } };

// Küçük harfe indirip Türkçe harf farklarını eşitler; yalnız harfleri bırakır (şapkasız yazım eşleşir).
function cevKat(s) {
  var kucuk = String(s).toLowerCase();
  kucuk = kucuk
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
  return kucuk.replace(/[^a-z]/g, "");
}

// Takvim kodu (1 miladi, 2 hicri, 3 rumi) → ay adları.
function cevAyAdlari(tak) {
  return isimaylar(tak === 2 ? "h" : tak === 3 ? "r" : "m").slice(1);
}

// Ay adını bulur: tam katlı eşleşme ya da yeterince uzun tek eşleşen ön ek.
// Kirpin captain "kanun" hem KanunuEvvel hem KanunuSani'yi çağrıştırdığından tek başına kabul edilmez,
// "kanunu sani" ve "kanunusani" aynı harf dizisine katlanır.
function cevAyBul(tokens, tak) {
  var kany = cevAyAdlari(tak).map(function (m) { return cevKat(m); });
  var enIyi = null;
  for (var bas = 0; bas < tokens.length; bas++) {
    for (var uz = 1; uz <= 4 && bas + uz <= tokens.length; uz++) {
      var dilim = tokens.slice(bas, bas + uz);
      var yazi = "";
      for (var t = 0; t < dilim.length; t++) {
        if (dilim[t].sayi !== undefined) { yazi = null; break; }
        yazi += dilim[t].metin;
      }
      if (yazi === null) break;
      var kat = cevKat(yazi);
      if (!kat) continue;
      var aday = -1;
      for (var k = 0; k < kany.length; k++) {
        if (kany[k] === kat || (kat.length >= 3 && kany[k].slice(0, kat.length) === kat)) {
          if (aday >= 0 && kany[k] !== kany[aday]) { aday = -2; break; }
          aday = k;
        }
      }
      if (aday >= 0 && (!enIyi || uz > enIyi.uzunluk)) {
        enIyi = { i: bas, uzunluk: uz, ay: aday + 1 };
      }
    }
  }
  return enIyi;
}

// Şarkiyat rakamlarını (٠-٩, ۰-۹) standart saymaya çevirir.
function cevSayi(s) {
  return parseInt(String(s).replace(/[٠-٩۰-۹]/g, function (c) {
    var d = c.charCodeAt(0);
    return String(d >= 0x0660 && d <= 0x0669 ? d - 0x0660 : d - 0x06F0);
  }), 10);
}

// Girdiyi gün-ay-yıl üçlüsüne çözümler.
// Örnekler: "23 Nisan 1920", "10 Nisan 1336", "4 Ramazan 1338", "1453", "1920 4", "29.5.1453"
function cevParse(girdi, tak) {
  var metin = String(girdi || "").trim();
  if (!metin) return { g: "", a: 0, y: 0, hata: "" };
  var ham = metin.split(/[\s.,/·•–—-]+/).filter(Boolean);
  var tokens = [];
  var nums = [];
  for (var i = 0; i < ham.length; i++) {
    var t = ham[i];
    if (/^[٠-٩۰-۹0-9]+$/.test(t)) {
      var n = cevSayi(t);
      if (isNaN(n)) return { g: "", a: 0, y: 0, hata: "Sayı anlaşılmadı: “" + t + "”." };
      tokens.push({ sayi: n, metin: t });
      nums.push(n);
    } else {
      tokens.push({ metin: t });
    }
  }
  var bulu = cevAyBul(tokens, tak);
  if (bulu) {
    var ay = bulu.ay;
    var kalanSayi = [];
    for (var j = 0; j < tokens.length; j++) {
      if (j >= bulu.i && j < bulu.i + bulu.uzunluk) continue;
      if (tokens[j].sayi === undefined) return { g: "", a: 0, y: 0, hata: "Anlaşılmayan kısım: “" + tokens[j].metin + "”. Tam ay adını yazmak ya da gün-ay-yılı sayıyla vermek gerek (ör. 23 Nisan 1920)." };
      kalanSayi.push(tokens[j].sayi);
    }
    if (kalanSayi.length === 1) {
      var tek = kalanSayi[0];
      if (tek > 31) return { g: "", a: ay, y: tek, hata: "" };
      return { g: "", a: 0, y: 0, hata: "Yıl sayısı eksik: “" + cevAyAdlari(tak)[ay - 1] + "” ile birlikte 31'den büyük bir yıl yazın (ör. Nisan 1920)." };
    }
    if (kalanSayi.length === 2) {
      var s0 = kalanSayi[0], s1 = kalanSayi[1];
      if (s0 > 31 && s1 <= 31) return { g: s1 > 0 ? s1 : "", a: ay, y: s0, hata: "" };
      if (s1 > 31 && s0 <= 31) return { g: s0 > 0 ? s0 : "", a: ay, y: s1, hata: "" };
      return { g: "", a: 0, y: 0, hata: "Yıl sayısı 31'den büyük olmalı: gün, ay ve yıl yazın (ör. 23 Nisan 1920)." };
    }
    return { g: "", a: 0, y: 0, hata: kalanSayi.length === 0 ? "Yıl sayısını da yazın (ör. Nisan 1920)." : "Fazla sayı yazıldı: gün, ay ve yıl yazın (ör. 23 Nisan 1920)." };
  }
  // Ay adı hiçbir takvimde eşleşmediyse sayısal dal sayılar dışında ne varsa hata sayar
  // (yanlış yazılmış ay adı, belirsiz "Kanun" gibi kısaltmalar buraya düşer).
  for (var x = 0; x < tokens.length; x++) {
    if (tokens[x].sayi === undefined) return { g: "", a: 0, y: 0, hata: "Ay adı anlaşılmadı: “" + tokens[x].metin + "”. Tam adı yazın (KanunuEvvel / Kanunusani gibi) ya da yalnız sayı kullanın." };
  }
  // Yalnız sayılar: [yıl] | [ay yıl] | [gün ay yıl]
  if (nums.length === 1) {
    if (nums[0] < 1) return { g: "", a: 0, y: 0, hata: "Yıl sayısı gerekli (ör. 1453)." };
    return { g: "", a: 0, y: nums[0], hata: "" };
  }
  if (nums.length === 2) {
    if (nums[0] > 31 && nums[1] >= 1 && nums[1] <= 12) return { g: "", a: nums[1], y: nums[0], hata: "" };
    if (nums[1] > 31 && nums[0] >= 1 && nums[0] <= 12) return { g: "", a: nums[0], y: nums[1], hata: "" };
    return { g: "", a: 0, y: 0, hata: "Ay ve yıl yazın (ör. 10 1919) ya da tam tarih (ör. 23.4.1920)." };
  }
  if (nums.length === 3) {
    var yIdx = -1;
    for (var m = 0; m < 3; m++) {
      if (nums[m] > 31) {
        if (yIdx >= 0) return { g: "", a: 0, y: 0, hata: "İki büyük sayı çözemedim: gün-ay-yıl sırasıyla yazın (ör. 23.4.1920)." };
        yIdx = m;
      }
    }
    if (yIdx < 0) return { g: "", a: 0, y: 0, hata: "Yıl sayısı 31'den büyük olmalı: gün-ay-yıl sırasıyla yazın (ör. 23.4.1920)." };
    var digerler = nums.filter(function (_, k) { return k !== yIdx; });
    var g, a;
    if (digerler[0] > 12) { g = digerler[0]; a = digerler[1]; }
    else if (digerler[1] > 12) { g = digerler[1]; a = digerler[0]; }
    else { g = digerler[0]; a = digerler[1]; }
    return { g: g, a: a, y: nums[yIdx], hata: "" };
  }
  return { g: "", a: 0, y: 0, hata: "Girdiyi çözemedim. Örnekler: 23 Nisan 1920 · 10 Nisan 1336 · 4 Ramazan 1338 · 1453." };
}

// Sonuçları temizleyip üç takvimin tarihini birden verir.
function cevCevir(tak, g, a, y) {
  mg = may = mayadi = my = null;
  hg = hay = hayadi = hy = null;
  rg = ray = rayadi = ry = null;
  hgun = null;
  tarihDonustur(tak, g, a, y);
  function d(v) { return v === null || v === undefined ? "YOK" : v; }
  return {
    tak: tak,
    girdi: { g: g, a: a, y: y },
    miladi: { g: d(mg), ay: d(mayadi), ayNum: d(may), y: d(my) },
    hicri: { g: d(hg), ay: d(hayadi), ayNum: d(hay), y: d(hy) },
    rumi: { g: d(rg), ay: d(rayadi), ayNum: d(ray), y: d(ry) },
    hafta: d(hgun),
  };
}

// TTK'ların kendi sınırlarını uygular; kural dışıyken açıklama döner.
function cevKontrol(tak, g, a, y) {
  // Sitenin gonder işlevi sinirgun'dan önce buna bakar; site mesajı korunur.
  if (g !== "" && g > 0 && !a) return "Bir gün verisi girdiğiniz için ilgili ayı da seçmelisiniz!";
  var msj = sinirgun(g, a, y, tak);
  if (msj !== "tamam") return msj;
  if (tak === 3) {
    var rumiMesaj = rumigec(g, a, y);
    if (rumiMesaj !== "tamam") return rumiMesaj;
  }
  return "";
}

// Tarih satırını kurar: boş yerine kısa çizgi, "1/2" gibi ikili sonuç korunur.
function cevYazi(h) {
  var parcalar = [];
  if (h.g && String(h.g) !== "YOK") parcalar.push(String(h.g));
  if (h.ay && String(h.ay) !== "YOK") parcalar.push(String(h.ay));
  if (h.y && String(h.y) !== "YOK" && h.y !== "İlk Kısım Yok") parcalar.push(String(h.y));
  return parcalar.length ? parcalar.join(" ") : "—";
}

// Sayısal tarih (girdi toplanabilir): gün-ay-yıl rakamlarından.
function cevSayisal(h) {
  if (!h.g || !h.ay || String(h.g) === "YOK" || String(h.ay) === "YOK" || !h.y || h.y === "YOK") return "";
  return h.g + " " + h.ayNum + " " + h.y;
}

module.exports = {
  KODLAR: { 1: "Milâdî", 2: "Hicrî", 3: "Rûmî" },
  ayAdlari: cevAyAdlari,
  kat: cevKat,
  parse: cevParse,
  cevir: cevCevir,
  kontrol: cevKontrol,
  yazi: cevYazi,
  sayisal: cevSayisal,
};


// ---- TTK betiği değişmeden alınmıştır ----

function intPart(floatNum) {
    if (floatNum < -0.0000001) {
        return Math.ceil(floatNum - 0.0000001)
    }
    return Math.floor(floatNum + 0.0000001)
}
var hy, hg, hay, hayadi, my, mg, may, mayadi, ry, ray, rg, rayadi, hgun;

function tarihDonustur(takvim, g, a, y) {
    yilal = false; ayal = false;
    if (g == "") { g = 0 }
    var gvar = g; var avar = a; var yvar = y;
    if (takvim == 1) {
        if (gvar == 0 && avar == 0) {
            yilal = true;
            miladiden(1, 1, yvar);
            ilkhyil = hy; ilkryil = ry;
            yilal = false;
            miladiden(31, 12, yvar);
            sonhyil = hy; sonryil = ry;
            mg = "YOK"; mayadi = "YOK"; hg = "YOK"; hayadi = "YOK"; rg = "YOK"; rayadi = "YOK"; hgun = "YOK";
            hy = ilkhyil; if (ilkhyil != sonhyil) { if (hy == "YOK") { hy = "İlk Kısım Yok"; } hy = hy + "/" + sonhyil }
            ry = ilkryil; if (ilkryil != sonryil) { if (ry == "YOK") { ry = "İlk Kısım Yok"; } ry = ry + "/" + sonryil }
        }
        if (gvar == 0 && avar > 0) {
            ayal = true;
            miladiden(1, avar, yvar);
            ilkhay = hayadi; ilkray = rayadi;
            ilkhyil = hy; ilkryil = ry;
            aylar = miladiaylar(yvar);
            songun = aylar[avar]
            ayal = false;
            miladiden(songun, avar, yvar);
            sonhay = hayadi; sonray = rayadi;
            sonhyil = hy; sonryil = ry;
            mg = "YOK"; hg = "YOK"; rg = "YOK"; hgun = "YOK";
            hayadi = ilkhay; if (ilkhay != sonhay) { if (hayadi == "YOK") { hayadi = "İlk Kısım Yok"; } hayadi = hayadi + "/" + sonhay }
            rayadi = ilkray; if (ilkray != sonray) { if (rayadi == "YOK") { rayadi = "İlk Kısım Yok"; } rayadi = rayadi + "/" + sonray }
            hy = ilkhyil; if (ilkhyil != sonhyil) { if (hy == "YOK") { hy = "İlk Kısım Yok"; } hy = hy + "/" + sonhyil }
            ry = ilkryil; if (ilkryil != sonryil) { if (ry == "YOK") { ry = "İlk Kısım Yok"; } ry = ry + "/" + sonryil }
        }
        if (gvar > 0 && avar > 0 && yvar > 0) {
            miladiden(gvar, avar, yvar);
        }
    }
    if (takvim == 2) {
        if (gvar == 0 && avar == 0) {
            yilal = true;
            hicriden(1, 1, yvar);
            ilkmyil = my; ilkryil = ry;
            yilal = false;
            aylar = hicriaylar(yvar);
            hicriden(aylar[12], 12, yvar);
            sonmyil = my; sonryil = ry;
            mg = "YOK"; mayadi = "YOK"; hg = "YOK"; hayadi = "YOK"; rg = "YOK"; rayadi = "YOK"; hgun = "YOK";
            my = ilkmyil; if (ilkmyil != sonmyil) { if (my == "YOK") { my = "İlk Kısım Yok"; } my = my + "/" + sonmyil }
            ry = ilkryil; if (ilkryil != sonryil) { if (ry == "YOK") { ry = "İlk Kısım Yok"; } ry = ry + "/" + sonryil }
        }
        if (gvar == 0 && avar > 0) {
            ayal = true;
            hicriden(1, avar, yvar);
            ilkmay = mayadi; ilkray = rayadi;
            ilkmyil = my; ilkryil = ry;
            aylar = hicriaylar(yvar);
            songun = aylar[avar]
            ayal = false;
            hicriden(songun, avar, yvar);
            sonmay = mayadi; sonray = rayadi;
            sonmyil = my; sonryil = ry;
            mg = "YOK"; hg = "YOK"; rg = "YOK"; hgun = "YOK";
            mayadi = ilkmay; if (ilkmay != sonmay) { if (mayadi == "YOK") { mayadi = "İlk Kısım Yok"; } mayadi = mayadi + "/" + sonmay }
            rayadi = ilkray; if (ilkray != sonray) { if (rayadi == "YOK") { rayadi = "İlk Kısım Yok"; } rayadi = rayadi + "/" + sonray }
            my = ilkmyil; if (ilkmyil != sonmyil) { if (my == "YOK") { my = "İlk Kısım Yok"; } my = my + "/" + sonmyil }
            ry = ilkryil; if (ilkryil != sonryil) { if (ry == "YOK") { ry = "İlk Kısım Yok"; } ry = ry + "/" + sonryil }
        }
        if (gvar > 0 && avar > 0 && yvar > 0) {
            hicriden(gvar, avar, yvar);
        }

    }
    if (takvim == 3) {
        if (gvar == 0 && avar == 0) {
            yilal = true;
            rumiden(1, 1, yvar);
            ilkmyil = my; ilkhyil = hy;
            yilal = false;
            aylar = rumiaylar(yvar);
            rumiden(aylar[12], 12, yvar);
            sonmyil = my; sonhyil = hy;
            mg = "YOK"; mayadi = "YOK"; hg = "YOK"; hayadi = "YOK"; rg = "YOK"; rayadi = "YOK"; hgun = "YOK";
            my = ilkmyil; if (ilkmyil != sonmyil) { if (my == "YOK") { my = "İlk Kısım Yok"; } my = my + "/" + sonmyil }
            hy = ilkhyil; if (ilkhyil != sonhyil) { if (hy == "YOK") { hy = "İlk Kısım Yok"; } hy = hy + "/" + sonhyil }
        }
        if (gvar == 0 && avar > 0) {
            ayal = true;
            rumiden(1, avar, yvar);
            ilkmay = mayadi; ilkhay = hayadi;
            ilkmyil = my; ilkhyil = hy;
            aylar = rumiaylar(yvar);
            songun = aylar[avar]
            ayal = false;
            rumiden(songun, avar, yvar);
            sonmay = mayadi; sonhay = hayadi;
            sonmyil = my; sonhyil = hy;
            mg = "YOK"; hg = "YOK"; rg = "YOK"; hgun = "YOK";
            mayadi = ilkmay; if (ilkmay != sonmay) { if (mayadi == "YOK") { mayadi = "İlk Kısım Yok"; } mayadi = mayadi + "/" + sonmay }
            hayadi = ilkhay; if (ilkhay != sonhay) { if (hayadi == "YOK") { hayadi = "İlk Kısım Yok"; } hayadi = hayadi + "/" + sonhay }
            my = ilkmyil; if (ilkmyil != sonmyil) { if (my == "YOK") { my = "İlk Kısım Yok"; } my = my + "/" + sonmyil }
            hy = ilkhyil; if (ilkhyil != sonhyil) { if (hy == "YOK") { hy = "İlk Kısım Yok"; } hy = hy + "/" + sonhyil }
        }
        if (gvar > 0 && avar > 0 && yvar > 0) {
            rumiden(gvar, avar, yvar);
        }
    }
    
    document.getElementById("mg").innerHTML = mg;
    document.getElementById("ma").innerHTML = mayadi;
    document.getElementById("my").innerHTML = my;    
    document.getElementById("hg").innerHTML = hg;
    document.getElementById("ha").innerHTML = hayadi;
    document.getElementById("hy").innerHTML = hy;    
    document.getElementById("rg").innerHTML = rg;
    document.getElementById("ra").innerHTML = rayadi;
    document.getElementById("ry").innerHTML = ry;
    document.getElementById("hgun").innerHTML = hgun;
}

function artikmiladi(ymiladi) {
    yt = ymiladi;
    if (yt > 1500 && yt % 100 == 0) {
        yt = yt / 100;
        if (yt % 4 == 0) { return true } else { return false }
    }
    else {
        if (yt % 4 == 0) { return true } else { return false }
    }
    return;
}
function artikrumi(yrumi) {
    if (yrumi <= 1086) { olc = 5 }
    if (yrumi > 1086 && yrumi <= 1121) { olc = 2 }
    if (yrumi > 1121 && yrumi <= 1154) { olc = 3 }
    if (yrumi > 1154 && yrumi <= 1187) { olc = 0 }
    if (yrumi > 1187 && yrumi <= 1220) { olc = 1 }
    if (yrumi > 1220 && yrumi <= 1256) { olc = 2 }
    if (yrumi > 1256 && yrumi < 1335) { olc = 3 }
    if (yrumi >= 1335) { olc = 0 }
    ymod = yrumi % 4;
    if (ymod == olc) { return true; }
    return false;
}

//Ay isimlerini hazırlayan fonksyon
function isimaylar(takviminilkharfi) {
    switch (takviminilkharfi) {
        case "r":
            return Array("[Aylar]", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Teşrinievvel", "Teşrinisani", "Kanunuevvel", "Kanunusani", "Şubat");
        case "m":
            return Array("[Aylar]", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık");
        case "h":
            return Array("[Aylar]", "Muharrem", "Safer", "Rabiulevvel", "Rabiulahir", "Cemaziyelevvel", "Cemaziyelahir", "Recep", "Şaban", "Ramazan", "Şevval", "Zilkade", "Zilhicce");
        default:
            return 0;
    }
}
function julyenaylar(yjulyen) {
    yt = yjulyen;
    if (yt % 4 == 0) { sbt = 29 } else { sbt = 28 }
    oca = 31; mar = 31; nis = 30; mayis = 31; haz = 30; tem = 31; agu = 31; eyl = 30; eki = 31; kas = 30; ara = 31;
    return Array(0, oca, sbt, mar, nis, mayis, haz, tem, agu, eyl, eki, kas, ara);
}

//Miladi ay sürelerini hazırlayan fonksyon
function miladiaylar(ymil) {
    var dogru = artikmiladi(ymil);
    if (dogru == true) { sbt = 29 } else { sbt = 28 }
    oca = 31; mar = 31; nis = 30; mayis = 31; haz = 30; tem = 31; agu = 31; eyl = 30; eki = 31; kas = 30; ara = 31;
    return Array(0, oca, sbt, mar, nis, mayis, haz, tem, agu, eyl, eki, kas, ara);
}
//Hicri ay sürelerini hazırlayan fonksyon
function hicriaylar(yhicri) {
    var ymod = yhicri % 30;
    if (ymod == 2 || ymod == 5 || ymod == 7 || ymod == 10 || ymod == 13 || ymod == 16 || ymod == 18 || ymod == 21 || ymod == 24 || ymod == 26 || ymod == 29) { zlh = 30; } else { zlh = 29; }
    return Array(0, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, zlh);
}
//Rumi ay sürelerini hazırlayan fonksyon
function rumiaylar(yrumi) {
    //ASP yapılınca rumiartik, artikrumi'yle değişecek
    var rdogrumu = artikrumi(yrumi);
    if (rdogrumu == true) { var sbt = 29 } else { var sbt = 28 }
    return Array(0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, sbt);
}
//Haftanın hangi günü olduğunu döndüren fonksyon (1/1/1=Cumartesi)
function haftagun(hgun) {
    switch (hgun) {
        case 1:
            return "Salı"
        case 2:
            return "Çarşamba"
        case 3:
            return "Perşembe"
        case 4:
            return "Cuma"
        case 5:
            return "Cumartesi"
        case 6:
            return "Pazar"
        case 0:
            return "Pazartesi"
    }
}

//Hicri takvimden julyen takvime geçiş yapılacak
function hicrijulyen(ghic, ahic, yhic) {
    //Girilen tarihin kaç güne denk geldiği hesaplanacak
    var toplamgun = 0;
    var y = yhic;
    var d = ghic;
    var m = ahic;
    jd = intPart((11 * y + 3) / 30) + 354 * y + 30 * m - intPart((m - 1) / 2) + d + 1948440 - 385;
    return jd;
}


//Miladi takvimden julyen takvime geçiş yapılacak

function miladijulyen(gmil, amil, ymil) {
    //Girilen tarihin kaç güne denk geldiği hesaplanacak
    var toplamgun = 0;
    var y = ymil;
    var d = gmil;
    var m = amil;
    if ((y > 1582) || ((y == 1582) && (m > 10)) || ((y == 1582) && (m == 10) && (d > 14))) { jd = intPart((1461 * (y + 4800 + intPart((m - 14) / 12))) / 4) + intPart((367 * (m - 2 - 12 * (intPart((m - 14) / 12)))) / 12) - intPart((3 * (intPart((y + 4900 + intPart((m - 14) / 12)) / 100))) / 4) + d - 32075 }
    else {
        jd = 367 * y - intPart((7 * (y + 5001 + intPart((m - 9) / 7))) / 4) + intPart((275 * m) / 9) + d + 1729777
    }

    return jd;
}

//Rumi takvimden Jülyen takvime geçiş yapılacak

function rumijulyen(grum, arum, yrum) {
    var toplamgun = 0;
    var y = yrum;
    var d = grum;
    var m = arum;
    if (y < 1086) {
        return 0
    }
    chk = y;
    if (chk == 1087 || chk == 1121 || chk == 1154 || chk == 1188 || chk == 1221 || chk == 1255) {
        rg = "SİVİŞ";
        ray = "SİVİŞ";
        rayadi = "SİVİŞ";
        ry = "SİVİŞ";
        return 0;
    }
    if (y < 1333) {
        if (y == 1086) { rumifaktor = 590 }
        if (y > 1087 && y < 1121) { rumifaktor = 589 }
        if (y > 1121 && y < 1154) { rumifaktor = 588 }
        if (y > 1154 && y < 1188) { rumifaktor = 587 }
        if (y > 1188 && y < 1221) { rumifaktor = 586 }
        if (y > 1221 && y < 1255) { rumifaktor = 585 }
        if (y > 1255) { rumifaktor = 584 }
        y += rumifaktor;
        ftay = (m + 2) % 12;
        if (ftay == 0) { ftay = 12 }
        m = ftay;
        if (m < 3) { y++ }
        jd = 367 * y - intPart((7 * (y + 5001 + intPart((m - 9) / 7))) / 4) + intPart((275 * m) / 9) + d + 1729777;
        return jd;
    }
    if (y == 1333) {
        y += 584;
        m += 2;
        var gmil = d;
        var amil = m;
        var ymil = y;
        return miladijulyen(gmil, amil, ymil);
    }
    if (y > 1333) {
        ftay = (m + 2) % 12;
        if (ftay == 0) { ftay = 12 }
        y += 584;
        var gmil = d;
        var amil = ftay;
        var ymil = y;
        return miladijulyen(gmil, amil, ymil);
    }

}


//Jülyen takvimden hicri takvime geçiş yapılacak

function julyenhicri(jg) {
    jd = jg;
    if (jd < 1948440) {
        hg = "YOK";
        hay = "YOK";
        hy = "YOK";
        hayadi = "YOK";
        return;
    }

    l = jd - 1948440 + 10632;
    n = intPart((l - 1) / 10631);
    l = l - 10631 * n + 354;
    j = (intPart((10985 - l) / 5316)) * (intPart((50 * l) / 17719)) + (intPart(l / 5670)) * (intPart((43 * l) / 15238));
    l = l - (intPart((30 - j) / 15)) * (intPart((17719 * j) / 50)) - (intPart(j / 16)) * (intPart((15238 * j) / 43)) + 29;
    m = intPart((24 * l) / 709);
    d = l - intPart((709 * m) / 24);
    y = 30 * n + j - 30;

    var ayisimleri = isimaylar("h");
    hg = d;
    hay = m;
    hy = y;
    hayadi = ayisimleri[m];
    return;
}

//Jülyen takvimden miladi takvime çeviri

function julyenmiladi(jg) {
    jd = jg;
    if (jd > 2299160) {
        l = jd + 68569;
        n = intPart((4 * l) / 146097);
        l = l - intPart((146097 * n + 3) / 4);
        i = intPart((4000 * (l + 1)) / 1461001);
        l = l - intPart((1461 * i) / 4) + 31;
        j = intPart((80 * l) / 2447);
        d = l - intPart((2447 * j) / 80);
        l = intPart(j / 11);
        m = j + 2 - 12 * l;
        y = 100 * (n - 49) + i + l;
    }
    else {
        j = jd + 1402;
        k = intPart((j - 1) / 1461);
        l = j - 1461 * k;
        n = intPart((l - 1) / 365) - intPart(l / 1461);
        i = l - 365 * n + 30;
        j = intPart((80 * i) / 2447);
        d = i - intPart((2447 * j) / 80);
        i = intPart(j / 11);
        m = j + 2 - 12 * i;
        y = 4 * k + n + i - 4716;
    }

    aylar = isimaylar("m");
    mg = d;
    may = m;
    mayadi = aylar[m];
    my = y;
    return;
}


//Jülyen takvimden rumi takvime geçiş

function julyenrumi(jg) {
    if (jg < 2333277) {
        rg = "YOK";
        rayadi = "YOK";
        ray = "YOK";
        ry = "YOK";
        return;
    }
    jd = jg;
    if (jd >= 2333277 && jd < 2421289) {
        j = jd + 1402;
        k = intPart((j - 1) / 1461);
        l = j - 1461 * k;
        n = intPart((l - 1) / 365) - intPart(l / 1461);
        i = l - 365 * n + 30;
        j = intPart((80 * i) / 2447);
        d = i - intPart((2447 * j) / 80);
        i = intPart(j / 11);
        m = j + 2 - 12 * i;
        y = 4 * k + n + i - 4716;
        m -= 2;
        if (m < 1) { m += 12; y-- }


        if (y >= 1676 && y < 1677) { rumifaktor = 590 }
        if (y >= 1677 && y < 1710) { rumifaktor = 589 }
        if (y >= 1710 && y < 1742) { rumifaktor = 588 }
        if (y >= 1742 && y < 1775) { rumifaktor = 587 }
        if (y >= 1775 && y < 1807) { rumifaktor = 586 }
        if (y >= 1807 && y < 1840) { rumifaktor = 585 }
        if (y >= 1840) { rumifaktor = 584 }
        //Bundan sonra Rumi=Miladi olduğu için bu araya julyen miladi fonksyonu girecek
        rg = d;
        ray = m;
        aylar = isimaylar("r");
        rayadi = aylar[ray];
        ry = y - rumifaktor;
        return;
    }

    if (jd >= 2421289 && jd < 2424517) {
        l = jd + 68569;
        n = intPart((4 * l) / 146097);
        l = l - intPart((146097 * n + 3) / 4);
        i = intPart((4000 * (l + 1)) / 1461001);
        l = l - intPart((1461 * i) / 4) + 31;
        j = intPart((80 * l) / 2447);
        d = l - intPart((2447 * j) / 80);
        l = intPart(j / 11);
        m = j + 2 - 12 * l;
        y = 100 * (n - 49) + i + l;
        m -= 2;
        if (m < 1) { m += 12 }
        rg = d;
        ray = m;
        aylar = isimaylar("r");
        rayadi = aylar[ray];
        ry = y - 584;
    }

    if (jd >= 2424517) {
        //Rumi takvim kaldırılma sınırı
        rg = "YOK";
        ray = "YOK";
        rayadi = "YOK";
        ry = "YOK";
        return;
    }

}


function tarihcevir(g, a, y, takvim, nesne) {

    return;
}

function miladiden(gmil, amil, ymil) {
    var gjul = parseInt(gmil);
    var ajul = parseInt(amil);
    var yjul = parseInt(ymil);
    var jg = miladijulyen(gjul, ajul, yjul);
    aylar = isimaylar("m");
    mg = gjul; may = ajul; mayadi = aylar[ajul]; my = yjul;
    julyenhicri(jg);
    julyenrumi(jg);
    hgun = haftagun(jg % 7);
    return;
}
function hicriden(gh, ah, yh) {
    var gjul = parseInt(gh);
    var ajul = parseInt(ah);
    var yjul = parseInt(yh);
    var jg = hicrijulyen(gjul, ajul, yjul);
    aylar = isimaylar("h");
    hg = gjul; hay = ajul; hayadi = aylar[ajul]; hy = yjul;
    julyenmiladi(jg);
    julyenrumi(jg);
    hgun = haftagun(jg % 7);
    return;
}
function rumiden(gr, aru, yr) {
    var grum = parseInt(gr);
    var arum = parseInt(aru);
    var yrum = parseInt(yr);
    if (yrum == 1332 && arum == 12 && grum > 15) { grum = 15; }
    if (yrum == 1333 && arum > 10) { arum = 10; grum = 31; }
    var jg = rumijulyen(grum, arum, yrum);
    aylar = isimaylar("r");
    rg = grum; ray = arum; rayadi = aylar[arum]; ry = yrum;
    if (jg == 0) { return }
    julyenmiladi(jg);
    julyenhicri(jg);
    hgun = haftagun(jg % 7);
    return;
}
// Server Ends
function artikmiladi(ymiladi) {
    yt = ymiladi;
    if (yt > 1500 && yt % 100 == 0) {
        yt = yt / 100;
        if (yt % 4 == 0) { return true } else { return false }
    }
    else {
        if (yt % 4 == 0) { return true } else { return false }
    }
    return;
}
function artikrumi(yrumi) {
    if (yrumi <= 1086) { olc = 5 }
    if (yrumi > 1086 && yrumi <= 1121) { olc = 2 }
    if (yrumi > 1121 && yrumi <= 1154) { olc = 3 }
    if (yrumi > 1154 && yrumi <= 1187) { olc = 0 }
    if (yrumi > 1187 && yrumi <= 1220) { olc = 1 }
    if (yrumi > 1220 && yrumi <= 1256) { olc = 2 }
    if (yrumi > 1256 && yrumi < 1335) { olc = 3 }
    if (yrumi >= 1335) { olc = 0 }
    ymod = yrumi % 4;
    if (ymod == olc) { return true; }
    return false;
}

//Ay isimlerini hazırlayan fonksyon
function isimaylar(takviminilkharfi) {
    switch (takviminilkharfi) {
        case "r":
            return Array("[Aylar]", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Teşrinievvel", "Teşrinisani", "Kanunuevvel", "Kanunusani", "Şubat");
        case "m":
            return Array("[Aylar]", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık");
        case "h":
            return Array("[Aylar]", "Muharrem", "Safer", "Rabiulevvel", "Rabiulahir", "Cemaziyelevvel", "Cemaziyelahir", "Recep", "Şaban", "Ramazan", "Şevval", "Zilkade", "Zilhicce");
        default:
            return 0;
    }
}
function julyenaylar(yjulyen) {
    yt = yjulyen;
    if (yt % 4 == 0) { sbt = 29 } else { sbt = 28 }
    oca = 31; mar = 31; nis = 30; mayis = 31; haz = 30; tem = 31; agu = 31; eyl = 30; eki = 31; kas = 30; ara = 31;
    return Array(0, oca, sbt, mar, nis, mayis, haz, tem, agu, eyl, eki, kas, ara);
}

//Miladi ay sürelerini hazırlayan fonksyon
function miladiaylar(ymil) {
    var dogru = artikmiladi(ymil);
    if (dogru == true) { sbt = 29 } else { sbt = 28 }
    oca = 31; mar = 31; nis = 30; mayis = 31; haz = 30; tem = 31; agu = 31; eyl = 30; eki = 31; kas = 30; ara = 31;
    return Array(0, oca, sbt, mar, nis, mayis, haz, tem, agu, eyl, eki, kas, ara);
}
//Hicri ay sürelerini hazırlayan fonksyon
function hicriaylar(yhicri) {
    var ymod = yhicri % 30;
    if (ymod == 2 || ymod == 5 || ymod == 7 || ymod == 10 || ymod == 13 || ymod == 16 || ymod == 18 || ymod == 21 || ymod == 24 || ymod == 26 || ymod == 29) { zlh = 30; } else { zlh = 29; }
    return Array(0, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, zlh);
}
//Rumi ay sürelerini hazırlayan fonksyon
function rumiaylar(yrumi) {
    //ASP yapılınca rumiartik, artikrumi'yle değişecek
    var rdogrumu = artikrumi(yrumi);
    if (rdogrumu == true) { var sbt = 29 } else { var sbt = 28 }
    return Array(0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, sbt);
}

//Seçilen takvim türüne göre işlem yapma
function mayadial(nesne) {
    var kac = nesne.girtakvim.selectedIndex;
    nesne.giraylar.options[0].selected = true;
    switch (kac) {
        case 0:
            for (i = 0; i <= 12; i++) { secenekYap("m", i, nesne) }
            break;
        case 1:
            for (i = 0; i <= 12; i++) { secenekYap("h", i, nesne) }
            break;
        case 2:
            for (i = 0; i <= 12; i++) { secenekYap("r", i, nesne) }
            break;
    }
}
function secenekYap(takvimadi, deger, nesne) {
    aylar = isimaylar(takvimadi);
    nesne.giraylar.options[deger].text = aylar[deger];
}
//Veri düğmesi fonksyonu
function gonder(nesne) {
    g = nesne.d.value;
    a = nesne.giraylar.selectedIndex;
    y = nesne.y.value;
    takvim = parseInt(nesne.girtakvim.value);
    if (gecerli(g) == false && gecerli(y) == false) { alert("Gün ve yıl bölümlerine geçersiz veriler girdiniz. Lütfen daha farklı bir tarih deneyiniz!"); return }
    if (gecerli(y) == false) { alert("Yıl bölümüne geçersiz bir veri girdiniz. Lütfen daha farklı bir yıl deneyiniz!"); return }
    if (gecerli(g) == true && a == 0) { alert("Bir gün verisi girdiğiniz için ilgili ayı da seçmelisiniz!"); return }
    if (gecerli(y) == false && gecerli(g) == false) { alert("Gün ve yıl bölümlerine geçersiz veriler girdiniz. Lütfen daha farklı bir tarih deneyiniz!"); return }
    if (g != "" && gecerli(g) == false) { alert("Gün bölümüne geçersiz bir veri girdiniz. Lütfen daha farklı bir gün deneyiniz!"); return }
    if (takvim == 3) { var gecti = rumigec(g, a, y) }
    if (takvim == 3 && gecti != "tamam") { alert(gecti); return }

    var gecti = sinirgun(g, a, y, takvim);
    if (gecti == "tamam") {
        if (g == "" && gecerli(y) == true) { tarihDonustur(takvim, g, a, y); return }
        tarihDonustur(takvim, g, a, y);
        return
    }
    alert(gecti);
    return;
}
//Veri nitelikleri uygun mu?
function gecerli(kac) {
    sd = parseInt(kac);
    dg = isNaN(sd);
    return !dg;
}

//Girilen gün doğru mu?
function sinirgun(g, a, y, takvim) {
    gtakvim = parseInt(takvim);
    gecy = parseInt(y);
    geca = parseInt(a);
    gecg = parseInt(g);
    switch (gtakvim) {
        case 1:
            ayadi = isimaylar("m"); aylar = miladiaylar(y);
            ymod = artikmiladi(gecy);
            if (g == "" && a == 0) {
                if (y < 622) { return "M.622'den daha küçük yıllar işlenmemektedir! Lütfen başka bir yıl giriniz!"; }
            }
            if (g == "" && a > 0) {
                if (y < 622) { return "M.622'den daha önceki yıllar işlenmemektedir! Lütfen başka bir yıl giriniz!"; }
                if (y == 622 && a < 7) { return "M.Temmuz 622'den daha önceki aylar işlenmemektedir! Lütfen başka bir ay giriniz!"; }
            }
            if (g > 0 && a > 0 && y > 0) {
                if ((y == 1582 && a == 10 && g >= 5) && (y == 1582 && a == 10 && g < 15)) {
                    return ("Girmiş olduğunuz tarih Gregoryen takvim düzenlemesinin yapıldığı 5-14/Ekim/1582 tarihleri arasına denk düşmektedir. 5/Ekim/1582 günü 15/Ekim/1582 olarak kabul edilmiştir!");
                }
                var ktrl01 = aylar[geca];
                ekmsj = " (M." + gecy + " yılı artık yıl değildir!)";
                ilkmsj = ""
                if (geca == 2 && ymod == true) { ilkmsj = "M." + gecy + " yılı artık yıl olduğu için " }
                msj = ilkmsj + ayadi[geca] + " ayı " + ktrl01 + " gün sürmektedir. Girmiş olduğunuz tarih bu ayın sınırları dışındadır!";
                if (geca == 2 && ymod != true) { msj += ekmsj }
                if (gecg < 1 || gecg > ktrl01) { return msj }
                if ((gecy < 622) || (gecy == 622 && geca < 7) || (gecy == 622 && geca == 7 && gecg < 16)) { return "M.16/7/622 tarihinden daha önceki tarihler işlenmemektedir. Lütfen daha farklı bir tarih deneyiniz!" }
            }
            // if (gecy > 1925) { return "26 Aralık 1925 tarihinden sonra Hicri ve Rumi takvimler yürürlükten kaldırılmıştır. Bu program sadece geçmiş tarihleri çevirme amacıyla düzenlenmiş olup, dini tarihler için Diyanet İşleri Başkanlığı'nın ilan ettiği takvim esas alınmalıdır!" }
            break;
        case 2:
            var artik;
            ayadi = isimaylar("h"); aylar = hicriaylar(y);
            ymod = gecy % 30;
            if (ymod == 2 || ymod == 5 || ymod == 7 || ymod == 10 || ymod == 13 || ymod == 16 || ymod == 18 || ymod == 21 || ymod == 24 || ymod == 26 || ymod == 29) { artik = 1; } else { artik = 0 }
            var ktrl01 = aylar[geca];
            ilkmsj = ""
            if (artik == 1 && geca == 12) { ilkmsj = "H." + gecy + " yılı artık yıl olduğu için "; }
            msj = ilkmsj + ayadi[geca] + " ayı " + ktrl01 + " gün sürmektedir. Girmiş olduğunuz tarih bu ayın sınırları dışındadır."
            ekmsj = " (H." + gecy + " yılı artık yıl değildir!)";
            if (artik == 0 && geca == 12) { msj += ekmsj }
            if (gecg < 1 || gecg > ktrl01) { return msj }
            if (gecy < 1) { return "H.1/1/1 tarihinden daha önceki tarihler işlenmemektedir. Lütfen daha farklı bir tarih deneyiniz!" }
            if (gecy > 1341) { return "26 Aralık 1925 tarihinden sonra Hicri ve Rumi takvimler yürürlükten kaldırılmıştır. Bu program sadece geçmiş tarihleri çevirme amacıyla düzenlenmiş olup, dini tarihler için Diyanet İşleri Başkanlığı'nın ilan ettiği takvim esas alınmalıdır!" }

            break;
        case 3:
            var rdogrumu = rumiartik(gecy);
            ayadi = isimaylar("r"); aylar = rumiaylar(gecy);
            ktrl01 = aylar[geca];
            ilkmsj = "";
            ekmsj = " (R." + gecy + " yılı artık yıl değildir!)";
            if (rdogrumu == true && geca == 12) { ilkmsj = "R." + gecy + " yılı artık yıl olduğu için " }
            msj = ilkmsj + ayadi[geca] + " ayı " + ktrl01 + " gün sürmektedir. Girmiş olduğunuz tarih bu ayın sınırları dışındadır.";
            if (geca == 12 && rdogrumu != true) { msj += ekmsj }
            if (gecg < 1 || gecg > ktrl01) { return msj }
            if (gecy < 1086) { return "R.1/1/1086 tarihinden daha önceki tarihler işlenmemektedir. Lütfen daha farklı bir tarih deneyiniz!" }
            if (gecy > 1341) { return "Rumi takvim R.26 Kanunuevvel 1341 (26 Aralık 1925) tarihinden sonra yürürlükten kaldırılmıştır. R.1333 yılından sonra, Miladi takvim ile Rumi takvim arasındaki gün ve ay farklılıkları kaldırılmış olduğu için bu tarihleri çevirmek pratik olarak da anlamlı değildir.(Sadece girdiğiniz tarihe 584 yıl eklemeniz yeterli olacaktır)!" }
            break;
    }
    return "tamam";
}

//Rumi yil artık yıl mı?
function rumiartik(yrumi) {
    if (yrumi <= 1086) { olc = 5 }
    if (yrumi > 1086 && yrumi <= 1121) { olc = 2 }
    if (yrumi > 1121 && yrumi <= 1154) { olc = 3 }
    if (yrumi > 1154 && yrumi <= 1187) { olc = 0 }
    if (yrumi > 1187 && yrumi <= 1220) { olc = 1 }
    if (yrumi > 1220 && yrumi <= 1256) { olc = 2 }
    if (yrumi > 1256 && yrumi < 1335) { olc = 3 }
    if (yrumi >= 1335) { olc = 0 }
    var ymod = yrumi % 4;
    if (ymod == olc) { return true; }
    return false;
}
//Rumi takvim geçerlilik koşulları sınanacak

function rumigec(g, a, y) {
    sivyt = siviskontrol(y);
    if (sivyt == true) { return y + " yılı siviş yılıdır!" }
    if ((g > 15) && (a == 12) && (y == 1332)) {
        return "R.1332 senesinde 15 Şubat'tan sonraki günler Miladi takvime uyum sağlamak için atılmıştır. Lütfen daha farklı bir tarih deneyiniz!";
    }
    if ((y == 1333) && (a > 10)) {
        return ("R. 1333 senesinin son iki ayı Miladi takvime uyum sağlamak için atılmıştır. Lütfen daha farklı bir tarih deneyiniz!")
    }

    return "tamam";
}

//Siviş yıl kontrolü
function siviskontrol(tarih) {
    chk = parseInt(tarih);
    if (chk == 1087 || chk == 1121 || chk == 1154 || chk == 1188 || chk == 1221 || chk == 1255) {
        return true;
    }
}
"use strict";
// Tarih Çevirici — Miladi / Hicri / Rumi (TTK Tarih Çevirme Kılavuzu betiği, takvim.js)
// Arayüz: arama kutusuna tarih yazılır, üç takvimin karşılığı liste halinde gösterilir;
// satırlar kopyalanır. Hesap yereldir: ağ yok, bağımlılık yok — hızlı ve istikrarlı.

const React = require("react");
const { List, Icon, Action, ActionPanel } = require("@raycast/api");
const tak = require("./assets/takvim.js");
const h = React.createElement;

const TAKVIM_SECENEKLERI = [
  { value: "auto", title: "Kendiliğinden" },
  { value: "1", title: "Milâdî" },
  { value: "2", title: "Hicrî" },
  { value: "3", title: "Rûmî" },
];
const TAKVIM_ADI = { 1: "Milâdî", 2: "Hicrî", 3: "Rûmî" };
const TAKVIM_ICON = { 1: Icon.Calendar, 2: Icon.Moon, 3: Icon.Sun };

// Girdi takvimini metnin kendisinden okur:
// hicrî ay adları ve Teşrin*/Kanun* (yalnız Rûmî) önceliklidir; öbür ay adları ve
// sayılı girdi Milâdî sayılır (Rûmî girdiyi takvimi elle seçmek gerek).
function takvimSec(metin) {
  const kat = tak.kat(metin);
  for (const ad of tak.ayAdlari(2).map(tak.kat)) {
    if (ad.length >= 5 && kat.includes(ad)) return 2;
  }
  for (const ad of tak.ayAdlari(3).map(tak.kat)) {
    if (["tesrinievvel", "tesrinisani", "kanunuevvel", "kanunusani"].includes(ad) && kat.includes(ad)) return 3;
  }
  return 1;
}

// Kısa gecikmeyle yazıyı durdurup çevirmeyi yeniler.
function useDebounced(value, delay) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value]);
  return v;
}

function detayMetni(son, takAdi, otomatik, girdiMetni) {
  let md = `Tarihler, TTK'nın [Tarih Çevirme Kılavuzu](https://ttk.gov.tr/tarih-cevirme-kilavuzu/) betiğiyle hesaplandı; hesap yereldir, ağ kullanılmaz.\n`;
  md += `\n**Milâdî:** ${tak.yazi(son.miladi)}\n`;
  md += `**Hicrî:** ${tak.yazi(son.hicri)}\n`;
  md += `**Rûmî:** ${tak.yazi(son.rumi)}\n`;
  if (son.hafta && son.hafta !== "YOK") md += `\nHafta günü: **${son.hafta}**\n`;
  md += `\n*Girdi:* “${girdiMetni}” · ${takAdi}${otomatik ? " (ay adına göre kendiliğinden)" : ""}\n`;
  const s = [
    ["milâdî", tak.sayisal(son.miladi)],
    ["hicrî", tak.sayisal(son.hicri)],
    ["rûmî", tak.sayisal(son.rumi)],
  ].filter(([, x]) => x);
  if (s.length) md += `\n*Sayısal:* ${s.map(([ad, x]) => `${ad} ${x}`).join(" · ")}\n`;
  md += `\n*Sınırlar:* Milâdî 16/7/622'den öncesi işlenmez; Hicrî ve Rûmî 26 Aralık 1925'te (H./R. 1341) kaldırıldı; Rûmî 1086-1341 arasında, SİVİŞ yıllarında (1087, 1121, 1154, 1188, 1221, 1255) çevirme yapılmaz; 5-14 Ekim 1582 Gregoryen düzeltmesi arası işlenmez. Yalnız yıl girdisinde çıktı o yılın ucu ve ucudur.`;
  return md;
}

function eylemler(d, yazi, detay) {
  const panel = h(
    ActionPanel,
    null,
    h(Action.CopyToClipboard, {
      title: "Tarihi Kopyala",
      content: yazi,
      shortcut: { modifiers: ["cmd"], key: "c" },
    }),
    tak.sayisal(d) &&
      h(Action.CopyToClipboard, {
        title: "Sayısal Tarih Kopyala",
        content: tak.sayisal(d),
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      }),
    h(Action.CopyToClipboard, {
      title: "Tüm Detayı Kopyala",
      content: detay,
      shortcut: { modifiers: ["cmd", "opt"], key: "c" },
    }),
    h(Action.OpenInBrowser, {
      title: "TTK Kılavuzunu Aç",
      url: "https://ttk.gov.tr/tarih-cevirme-kilavuzu/",
      shortcut: { modifiers: ["cmd"], key: "return" },
    }),
  );
  return panel;
}

function Command() {
  const [metin, setMetin] = React.useState("");
  const [mode, setMode] = React.useState("auto");
  const debounced = useDebounced(metin.trim(), 150);

  const sonuc = React.useMemo(() => {
    if (!debounced) return null;
    const tk = mode === "auto" ? takvimSec(debounced) : parseInt(mode, 10);
    const p = tak.parse(debounced, tk);
    if (p.hata) return { hata: p.hata, tk };
    const kural = tak.kontrol(tk, p.g, p.a, p.y);
    if (kural) return { kural, tk };
    return { deger: tak.cevir(tk, p.g, p.a, p.y), tk, otomatik: mode === "auto" };
  }, [debounced, mode]);

  const satirlar = sonuc && sonuc.deger
    ? [
        { kod: 1, d: sonuc.deger.miladi, kodAd: "Milâdî" },
        { kod: 2, d: sonuc.deger.hicri, kodAd: "Hicrî" },
        { kod: 3, d: sonuc.deger.rumi, kodAd: "Rûmî" },
      ]
    : [];
  const tumDetay = sonuc && sonuc.deger
    ? detayMetni(sonuc.deger, TAKVIM_ADI[sonuc.tk], sonuc.otomatik, debounced)
    : "";

  return h(
    List,
    {
      isLoading: false,
      isShowingDetail: !!sonuc && !!sonuc.deger,
      filtering: false,
      throttle: true,
      searchBarPlaceholder: "Tarih yazın: 23 Nisan 1920 gibi",
      onSearchTextChange: setMetin,
      searchBarAccessory: h(
        List.Dropdown,
        { tooltip: "Girdi takvimi", value: mode, onChange: setMode },
        TAKVIM_SECENEKLERI.map((o) => h(List.Dropdown.Item, { key: o.value, title: o.title, value: o.value })),
      ),
    },
    !sonuc &&
      h(List.EmptyView, {
        icon: Icon.Calendar,
        title: "Tarih yazın",
        description:
          "Örnekler: 23 Nisan 1920 · 10 Kanunusani 1335 · 4 Ramazan 1338 · 1453 · 29.5.1453 “Kendiliğinden” ay adına göre takvimi seçer; sayılı girdi Milâdî sayılır (gün-ay-yıl sırasıyla). Rûmî girişte takvimi elle seçmek gerek.",
      }),
    sonuc && sonuc.hata &&
      h(List.EmptyView, {
        icon: Icon.ExclamationMark,
        title: "Girdi anlaşılamadı",
        description: sonuc.hata,
      }),
    sonuc && sonuc.kural &&
      h(List.EmptyView, {
        icon: Icon.MinusCircle,
        title: "Bu tarih TTK Kilavuzu'nda çevrilemez",
        description: sonuc.kural,
        actions: h(ActionPanel, null,
          h(Action.OpenInBrowser, {
            title: "TTK Kılavuzunu Aç",
            url: "https://ttk.gov.tr/tarih-cevirme-kilavuzu/",
          }),
        ),
      }),
    sonuc && sonuc.deger &&
      h(List.Section, {
        title: sonuc.deger.hafta && sonuc.deger.hafta !== "YOK"
          ? `${sonuc.deger.hafta} · Girdi takvimi: ${TAKVIM_ADI[sonuc.tk]}`
          : `Girdi takvimi: ${TAKVIM_ADI[sonuc.tk]}`,
      },
        satirlar.map((s) => {
          const yazi = tak.yazi(s.d);
          return h(List.Item, {
            key: s.kod,
            id: String(s.kod),
            title: yazi,
            subtitle: s.kodAd,
            icon: TAKVIM_ICON[s.kod],
            detail: h(List.Item.Detail, { markdown: tumDetay }),
            actions: eylemler(s.d, yazi, tumDetay),
          });
        }),
      ),
  );
}

module.exports = { default: Command };

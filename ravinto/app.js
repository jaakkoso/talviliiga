// Käyttöliittymä: näkymät, reititys ja tallennus. Logiikka on js/-kansion puhtaissa funktioissa.
import { IKKUNAT, SAANNOT } from "./js/saannot.js";
import { kello, minuutit } from "./js/aika.js";
import { ohjelmanPaivat } from "./js/aikajana.js";
import { ehdotus, ikkunanTila, ostoslista, paivanYhteenveto, seuraavaIkkuna, tankkausTaso, tuotteetIkkunaan } from "./js/tavoitteet.js";
import { luoTurnaus } from "./js/turnaus.js";
import { pelipaivanOhje } from "./js/ohje.js";
import { tuoOhjelma } from "./js/tuonti.js";
import { lataa, tallenna, tyhjenna } from "./js/tallennus.js";
import { luoOmaTuote, omaHuomio, tuoOmatTuotteet } from "./js/omat-tuotteet.js";

const sisalto = document.getElementById("sisalto");
const valikko = document.getElementById("valikko");
const dialogi = document.getElementById("dialogi");

const varasto = (() => {
  try { return window.localStorage; } catch { return { getItem: () => null, setItem() {}, removeItem() {} }; }
})();

let tila = lataa(varasto);
let tuotteet = [];
let tuoteVirhe = false;
const ui = { kaikkiTuotteet: false, lahteet: null, viesti: null, kierros: {}, haku: "", ryhma: null };

const TASOT = { lepo: "Lepopäivä", kevyt: "Kevyt päivä", peli: "Pelipäivä", kova: "Kova pelipäivä", turnaus: "Turnauspäivä" };
const RYHMAT = { hedelma: "Hedelmät ja marjat", vilja: "Viljat", leipa: "Leivät", maito: "Maitotuotteet", juoma: "Juomat", ateria: "Ateriat", patukka: "Patukat", makeinen: "Makeiset", keksi: "Keksit ja leivonnaiset", pahkina: "Pähkinät", valmisruoka: "Valmisruoat", oma: "Omat tuotteet" };
const ATERIAT = { aamiainen: "Aamiainen", lounas: "Lounas", paivallinen: "Päivällinen", iltapala: "Iltapala", valipala: "Välipala" };
const OSIOT = { peli: "Peli", harjoitus: "Harjoitus", testi: "Testi", ateria: "Ateria" };
// Valmiit ohjelmat. Tuleva turnaus näkyy aloituksessa päiväänsä asti.
const VALMIIT = [
  { id: "jyvaskyla", tiedosto: "data/ohjelma-jyvaskyla-2026-11-07.json", pvm: "2026-11-07", nimi: "JJK talviliiga, Jyväskylä", kuvaus: "La 7.11. Huhtahalli. 5 peliä ja järjestäjän ruokailu." },
  { id: "eerikkila", tiedosto: "data/ohjelma-eerikkila-2026-11.json", pvm: "2026-11-01", nimi: "Huuhkajaliiga, Eerikkilä", kuvaus: "1.–3.11. Kolme päivää, pelit, testit ja ateriat." },
];
const TILAT = { lisaa: "Lisää tankkausta", tankissa: "Tankki täynnä", reilusti: "Reilusti tankissa" };
const KOOT = { pieni: "Pieni tankkaus", perus: "Perustankkaus", iso: "Iso tankkaus", juoma: "Juominen" }; // A10

const POLUT = {
  kalenteri: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  kassi: '<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  asetus: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  ruoka: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 1-3 4-3 7s1 4 3 4v7"/>',
  pisara: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  pallo: '<circle cx="12" cy="12" r="9"/><path d="M12 8l3.8 2.8-1.5 4.4H9.7l-1.5-4.4L12 8zM12 3v5M21 10l-5.2.8M18 19.5l-3.7-4.3M6 19.5l3.7-4.3M3 10l5.2.8"/>',
  juoksu: '<circle cx="15" cy="5" r="2"/><path d="M6 21l4-5 1-5 4 3 3 1M11 11l-3 1-2 3M11 11l1-3 3 1"/>',
  vinkki: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  oikea: '<path d="M9 5l7 7-7 7"/>',
  vasen: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  miinus: '<path d="M5 12h14"/>',
  kyna: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/>',
  roska: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  kuittaus: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  sulje: '<path d="M6 6l12 12M18 6L6 18"/>',
  haku: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  salama: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
  kierto: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/>',
};
// Ryhmän viivapiirros tuotteille, joilla ei ole omaa kuvaa.
const RYHMAKUVAT = {
  hedelma: '<path d="M12 7c-2-2-7-1.5-7 4 0 5 3 9 5 9 1 0 1.3-.6 2-.6s1 .6 2 .6c2 0 5-4 5-9 0-5.5-5-6-7-4z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  vilja: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 8c1-2 3-2 4 0 1-2 3-2 4 0"/>',
  leipa: '<path d="M6 20V11a4 4 0 0 1-2-3.5C4 5 7.5 3 12 3s8 2 8 4.5A4 4 0 0 1 18 11v9z"/>',
  maito: '<path d="M7 8l2-4h6l2 4v13H7z"/><path d="M7 8h10M12 12v4"/>',
  juoma: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
  ateria: POLUT.ruoka,
  patukka: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M8 8v8M13 8v8"/>',
  makeinen: '<ellipse cx="12" cy="12" rx="5" ry="4"/><path d="M7 12L3 9v6zM17 12l4-3v6z"/>',
  keksi: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r=".8"/><circle cx="15" cy="10" r=".8"/><circle cx="10" cy="15" r=".8"/><circle cx="15" cy="15" r=".8"/>',
  pahkina: '<path d="M12 3c4 0 6 3 6 7s-3 11-6 11-6-7-6-11 2-7 6-7z"/><path d="M8 9h8"/>',
  valmisruoka: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18"/>',
  oma: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
};
const ikoni = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${POLUT[n]}</svg>`;
const tuoteKuva = (t) => `<div class="kuvaruutu r-${esc(t?.ryhma ?? "oma")}">${t?.kuva
  ? `<img src="${esc(t.kuva)}" alt=""${t.kuvaLahde?.includes("commons.wikimedia") ? ' class="ruoka"' : ""} width="56" height="56" loading="lazy" decoding="async">`
  : `<svg viewBox="0 0 24 24" aria-hidden="true">${RYHMAKUVAT[t?.ryhma] ?? RYHMAKUVAT.oma}</svg>`}</div>`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const luku = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
const haarukka = (h, y) => `${h[0]}–${h[1]} ${y}`;

function pvmTeksti(pvm) {
  const [v, k, p] = pvm.split("-").map(Number);
  const vk = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"][new Date(Date.UTC(v, k - 1, p)).getUTCDay()];
  return `${vk} ${p}.${k}.`;
}
const isoPvm = (n) => `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
const tanaan = () => isoPvm(new Date());
const kelloNyt = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
function seuraavaLauantai() {
  const n = new Date();
  n.setDate(n.getDate() + ((6 - n.getDay() + 7) % 7));
  return isoPvm(n);
}
function kesto(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// Tila
const aktiivinen = () => tila.ohjelmat.find((o) => o.id === tila.aktiivinenOhjelma) ?? null;
const kaikkiTuotteet = () => [...tuotteet, ...tila.omatTuotteet];
const tuoteKartta = () => new Map(kaikkiTuotteet().map((t) => [t.id, t]));
function valinnatNyt() {
  const o = aktiivinen();
  return o ? (tila.valinnat[o.id] ??= {}) : {};
}
function syodyt() {
  const o = aktiivinen();
  tila.syoty ??= {};
  return new Set(o ? tila.syoty[o.id] ?? [] : []);
}
function talleta() {
  if (!tallenna(varasto, tila)) ui.viesti = "Tallennus ei onnistunut tällä laitteella. Muutokset katoavat, kun sivu suljetaan.";
}
function laskePaivat(ohjelma) {
  try { return ohjelmanPaivat(ohjelma); } catch { return null; }
}

function teema() {
  const t = tila.asetukset.teema;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = t;
}

// Reititys
function reitti() {
  const osat = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  return { nakyma: osat[0] || "ohje", a: osat[1], b: osat[2] };
}
function piirra(sailytaVieritys = false) {
  const y = window.scrollY;
  const r = reitti();
  const nakymat = { ohje: nakymaOhje, paiva: nakymaPaiva, ikkuna: nakymaIkkuna, ohjelma: nakymaOhjelma, ostos: nakymaOstos, asetukset: nakymaAsetukset };
  const viesti = ui.viesti ? `<p class="ilmoitus" role="status">${esc(ui.viesti)}</p>` : "";
  sisalto.innerHTML = viesti + (nakymat[r.nakyma] ?? nakymaOhje)(r);
  sisalto.dataset.nakyma = r.nakyma;
  if (r.nakyma === "ikkuna") suodata();
  const nyt = r.nakyma === "ikkuna" ? "paiva" : r.nakyma;
  const linkit = [["ohje", "Pelipäivä", "kalenteri"], ["paiva", "Määrät", "ruoka"], ["ohjelma", "Ohjelma", "lista"], ["ostos", "Ostokset", "kassi"], ["asetukset", "Asetukset", "asetus"]];
  valikko.innerHTML = linkit.map(([id, nimi, kuva]) => `<a href="#/${id}"${id === nyt ? ' aria-current="page"' : ""}>${ikoni(kuva)}${nimi}</a>`).join("");
  window.scrollTo(0, sailytaVieritys ? y : 0);
}

// Päivä
const tulevatValmiit = () => VALMIIT.filter((v) => v.pvm >= tanaan());

function valmiitKortit(tulevat) {
  return tulevat.map((v) => `<section class="kortti pino valmis">
    <div class="pieni">${v.pvm === tanaan() ? "Tänään" : "Seuraava turnaus"}</div>
    <h2>${esc(v.nimi)}</h2>
    <p class="pieni">${esc(v.kuvaus)}</p>
    <button class="nappi paa leve" data-toiminto="valmis-ohjelma" data-id="${v.id}">Ota tämä turnaus</button>
  </section>`).join("");
}

function tyhjaTila() {
  const tulevat = tulevatValmiit();
  return `${valmiitKortit(tulevat)}<section class="kortti pino">
    <h2>${tulevat.length ? "Tai kerro omat pelit" : "Milloin pelataan?"}</h2>
    <p class="pieni">Kerro pelien kellonajat, niin appi kertoo, mitä kannattaa syödä ja milloin.</p>
    ${turnausLomake()}
  </section>
  <a class="nappi leve" href="#/ohjelma">Muu ohjelma: harjoitus, leiri tai tuonti</a>`;
}

const peliAika = (n, arvo = "") => `<label class="kentta">Peli ${n}<input type="time" name="aika" value="${arvo}"${n === 1 ? " required" : ""}></label>`;

function turnausLomake() {
  const kestot = [20, 30, 40, 50].map((n) => `<label class="siru"><input type="radio" name="kesto" value="${n}"${n === 30 ? " checked" : ""}><span>${n} min</span></label>`).join("");
  return `<form data-lomake="turnaus" class="pino">
    <label class="kentta">Päivä<input type="date" name="pvm" required value="${seuraavaLauantai()}"></label>
    <fieldset class="valinnat"><legend>Pelin kesto</legend><div class="sirut">${kestot}</div></fieldset>
    <fieldset class="valinnat"><legend>Pelien alkuajat</legend><div class="ajat kaksi">${peliAika(1, "09:00")}${peliAika(2)}${peliAika(3)}</div></fieldset>
    <button class="nappi leve" type="button" data-toiminto="lisaa-peli">${ikoni("plus")}Lisää peli</button>
    <label class="kentta">Yhteinen ruokailu (jos on)<input type="time" name="ruokailu"></label>
    <button class="nappi paa leve" type="submit">Näytä pelipäivän ohje</button>
  </form>`;
}

function valintaRivi(w) {
  const valinnat = valinnatNyt()[w.id] ?? [];
  if (!valinnat.length) return "";
  const kartta = tuoteKartta();
  const nimet = valinnat.map((v) => `${kartta.get(v.tuoteId)?.nimi ?? v.tuoteId}${v.annoksia !== 1 ? ` × ${luku(v.annoksia)}` : ""}`).join(", ");
  const t = ikkunanTila(w, valinnat, kartta);
  const pohja = w.tavoite.hh ? t.hh : t.neste;
  const merkki = pohja.tavoite && !t.puuttuvat.length ? `<span class="merkki ${pohja.tila}">${TILAT[pohja.tila]}</span>` : "";
  return `<div class="pieni">${esc(nimet)}</div>${merkki ? `<div>${merkki}</div>` : ""}`;
}

function tavoiteTeksti(w) {
  const osat = [];
  if (w.tavoite.hh) osat.push(`hiilihydraatti ${haarukka(w.tavoite.hh, "g")}`);
  if (w.tavoite.prot) osat.push(`proteiini ${haarukka(w.tavoite.prot, "g")}`);
  if (w.tavoite.neste) osat.push(`juomaa ${haarukka(w.tavoite.neste, "dl")}`);
  const t = osat.join(", ");
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

function rooliTeksti(w) {
  if (w.tyyppi !== "kiintea" || !w.rooli || w.rooli === "normaali") return "";
  return `Toimii näin: ${IKKUNAT[w.rooli]?.otsikko ?? w.rooli}`;
}

const ikkunaOsoite = (pvm, w) => `#/ikkuna/${encodeURIComponent(pvm)}/${encodeURIComponent(w.id)}`;
const ikkunanNimi = (w) => (w.tyyppi === "peli" || w.tyyppi === "liikunta" ? (ohjelmanOsionNimi(w) ?? w.otsikko) : w.otsikko);
const kokoMerkki = (w) => (tankkausTaso(w) ? `<span class="koko ${tankkausTaso(w)}">${KOOT[tankkausTaso(w)]}</span>` : "");

function kuittausNappi(w, syoty) {
  return `<button class="kuittaus${syoty ? " tehty" : ""}" data-toiminto="syoty" data-ikkuna="${esc(w.id)}" aria-pressed="${syoty}" aria-label="${syoty ? "Syöty" : "Merkitse syödyksi"}: ${esc(w.otsikko)} klo ${kello(w.alku)}">${ikoni("kuittaus")}</button>`;
}

function janaRivi(pvm, w, korostus, syoty) {
  const kuva = !w.syominen ? (w.tyyppi === "peli" ? "pallo" : "juoksu") : "ruoka";
  const huom = w.huomautukset.map((h) => `<div class="huomio">${esc(h)}</div>`).join("");
  return `<li class="${korostus ? "korostus" : ""}${syoty ? " syoty" : ""}"><div class="klo">${kello(w.alku)}</div>
    <div class="kehys">
      <a class="tapahtuma ${w.syominen ? "" : "juoma"} t-${tankkausTaso(w) ?? "ei"}" href="${ikkunaOsoite(pvm, w)}">
        <div class="rivi">${ikoni(kuva)}<span class="otsikko kasvu">${esc(ikkunanNimi(w))}</span>${w.syominen ? "" : `<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">${POLUT.oikea}</svg>`}</div>
        <div class="rivi kaari">${kokoMerkki(w)}<span class="pieni">${esc(tavoiteTeksti(w))}</span></div>
        ${rooliTeksti(w) ? `<div class="pieni">${esc(rooliTeksti(w))}</div>` : ""}
        ${valintaRivi(w)}${huom}
      </a>
      ${w.syominen ? kuittausNappi(w, syoty) : ""}
    </div></li>`;
}

function ohjelmanOsionNimi(w) {
  const o = aktiivinen();
  for (const p of o?.paivat ?? []) {
    const osio = p.osiot.find((x) => x.id === w.osioId);
    if (osio) return osio.nimi;
  }
  return null;
}

function valittuPaiva(paivat, toivottu) {
  return paivat.find((p) => p.paiva.pvm === toivottu) ?? paivat.find((p) => p.paiva.pvm === tanaan()) ?? paivat[0];
}

// Pelipäivän ohje (A13): selkokielinen aikajana ilman grammoja ja tuotevalintaa.
function ohjeRivi(r, korostus) {
  const peli = r.laji !== "syo";
  return `<li class="${peli ? "o-peli" : "o-syo"}${korostus ? " korostus" : ""}"><div class="klo">${kello(r.alku)}</div>
    <div class="kortti">
      <div class="rivi">${ikoni(peli ? (r.laji === "peli" ? "pallo" : "juoksu") : "ruoka")}<h3 class="kasvu">${esc(r.otsikko)}</h3></div>
      <p>${esc(r.teksti)}</p>
      ${r.vaihdossa ? `<p class="vaihto">${ikoni("salama")}<span>${esc(r.vaihdossa)}</span></p>` : ""}
      ${r.esimerkit.length ? `<p class="pieni">Esimerkiksi ${esc(r.esimerkit.join(", "))}.</p>` : ""}
      ${r.juo ? `<p class="pieni">${ikoni("pisara")}${esc(r.juo)}</p>` : ""}
    </div></li>`;
}

function nakymaOhje(r) {
  const o = aktiivinen();
  if (!o) return tyhjaTila();
  const paivat = laskePaivat(o);
  if (!paivat?.length) return nakymaPaiva(r);
  const nyt = valittuPaiva(paivat, r.a);
  const ohje = pelipaivanOhje(nyt);
  const mennyt = paivat.every((p) => p.paiva.pvm < tanaan());
  const onTanaan = nyt.paiva.pvm === tanaan();
  const seuraava = onTanaan ? ohje.rivit.find((x) => x.loppu > kelloNyt()) : null;
  const pelit = ohje.pelit.map((p) => p.alku).join(", ");
  return `${mennyt ? valmiitKortit(tulevatValmiit()) : ""}
    ${paivat.length > 1 ? `<div class="pvmt">${paivat.map((p) => `<a href="#/ohje/${p.paiva.pvm}"${p === nyt ? ' aria-current="date"' : ""}>${pvmTeksti(p.paiva.pvm)}</a>`).join("")}</div>` : ""}
    <section class="kortti pino ohjekortti">
      <div class="pieni">${pvmTeksti(nyt.paiva.pvm)} · ${esc(o.nimi)}</div>
      <h2>${ohje.pelit.length ? `${ohje.pelit.length} ${ohje.pelit.length === 1 ? "peli" : "peliä"}` : TASOT[nyt.rasitus.taso]}</h2>
      ${pelit ? `<p>Pelit klo ${esc(pelit)}</p>` : ""}
      <a class="nappi leve" href="#/ohjelma">${ikoni("kyna")}Muuta pelejä tai ruokailua</a>
    </section>
    ${onTanaan ? "" : `<section class="kortti pino"><h3>Edellisenä iltana</h3><ul class="vinkit">${ohje.edellinenPaiva.map((v) => `<li>${ikoni("vinkki")}<span>${esc(v)}</span></li>`).join("")}</ul></section>`}
    ${ohje.vaihdossa ? `<p class="vaihto">${ikoni("salama")}<span>Pelaaja on usein osan pelistä vaihdossa. Silloin ehtii juoda ja ottaa pienen palan nopeaa energiaa.</span></p>` : ""}
    <ol class="ohje">${ohje.rivit.map((x) => ohjeRivi(x, x === seuraava)).join("")}</ol>
    <section class="kortti pino"><h3>Pakkaa mukaan</h3><ul class="vinkit">${ohje.mukaan.map((m) => `<li>${ikoni("kassi")}<span>${esc(m[0].toUpperCase() + m.slice(1))}</span></li>`).join("")}</ul></section>
    <a class="nappi leve" href="#/paiva/${esc(nyt.paiva.pvm)}">Tarkat määrät ja omat eväät</a>`;
}

function nakymaPaiva(r) {
  const o = aktiivinen();
  if (!o) return tyhjaTila();
  const paivat = laskePaivat(o);
  if (!paivat) return `<p class="ilmoitus">Ohjelmassa on virhe, eikä aikajanaa voi laskea. Tarkista kellonajat ohjelmasta.</p><a class="nappi leve" href="#/ohjelma">Avaa ohjelma</a>`;
  if (!paivat.length) return `<section class="kortti pino"><h2>${esc(o.nimi)}</h2><p>Ohjelmassa ei ole vielä päiviä.</p><a class="nappi paa leve" href="#/ohjelma">Lisää päivä</a></section>`;
  const nyt = valittuPaiva(paivat, r.a);
  const y = paivanYhteenveto(nyt.ikkunat, valinnatNyt(), tuoteKartta());
  const onTanaan = nyt.paiva.pvm === tanaan();
  const seuraava = onTanaan ? seuraavaIkkuna(nyt.ikkunat, kelloNyt()) : null;
  const syoty = syodyt();
  const vinkit = nyt.vinkit.map((v) => `<li>${ikoni("vinkki")}<span>${esc(SAANNOT.vinkit[v])}</span></li>`).join("");
  const varoitukset = nyt.varoitukset.map((v) => `<p class="ilmoitus">${esc(v)}</p>`).join("");
  // Mennyt ohjelma ei peitä tulevaa valmista turnausta.
  const mennyt = paivat.every((p) => p.paiva.pvm < tanaan());
  return `${mennyt ? valmiitKortit(tulevatValmiit()) : ""}
    <div class="pvmt">${paivat.map((p) => `<a href="#/paiva/${p.paiva.pvm}"${p === nyt ? ' aria-current="date"' : ""}>${pvmTeksti(p.paiva.pvm)}</a>`).join("")}</div>
    ${seuraava ? nytKortti(nyt.paiva.pvm, seuraava, syoty) : ""}
    <section class="kortti taso">
      <div class="pieni">${esc(o.nimi)}</div>
      <h2>${TASOT[nyt.rasitus.taso]}</h2>
      <p class="perustelu">${esc(nyt.rasitus.perustelu)}</p>
    </section>
    ${tarveKortti(nyt, y, syoty)}
    ${varoitukset}
    ${vinkit ? `<ul class="vinkit">${vinkit}</ul>` : ""}
    ${nyt.ikkunat.length
      ? `<ol class="jana">${nyt.ikkunat.map((w) => janaRivi(nyt.paiva.pvm, w, seuraava?.ikkuna === w, syoty.has(w.id))).join("")}</ol>`
      : `<p class="pieni">Tälle päivälle ei ole syömisikkunoita. Syö tavalliseen tapaan.</p>`}`;
}

// Pelipäivän tämänhetkinen tai seuraava ikkuna isona korttina (A10).
function nytKortti(pvm, { ikkuna: w, tila: vaihe, minuutteja }, syoty) {
  const valinnat = valinnatNyt()[w.id] ?? [];
  const kartta = tuoteKartta();
  const nimet = (lista) => lista.map((v) => `${kartta.get(v.tuoteId)?.nimi ?? v.tuoteId}${v.annoksia !== 1 ? ` × ${luku(v.annoksia)}` : ""}`).join(" + ");
  const ehd = !valinnat.length && tuotteet.length ? ehdotus(w, kaikkiTuotteet()) : [];
  const milloin = vaihe === "nyt" ? `Nyt, klo ${kello(w.alku)}–${kello(w.loppu)}` : `Klo ${kello(w.alku)}, ${kesto(minuutteja)} päästä`;
  const sisalto = valinnat.length
    ? `<p class="valitut">${esc(nimet(valinnat))}</p>`
    : ehd.length ? `<p class="pieni">Esimerkiksi: ${esc(nimet(ehd))}</p>` : "";
  return `<section class="kortti nyt t-${tankkausTaso(w) ?? "ei"}" aria-live="polite">
    <div class="pieni">${milloin}</div>
    <h2>${esc(ikkunanNimi(w))}</h2>
    <div class="rivi kaari">${kokoMerkki(w)}<span class="pieni">${esc(tavoiteTeksti(w))}</span></div>
    ${sisalto}
    <div class="napit">
      ${!valinnat.length && ehd.length ? `<button class="nappi paa" data-toiminto="ota-ehdotus" data-ikkuna="${esc(w.id)}" data-pvm="${esc(pvm)}">${ikoni("salama")}Ota ehdotus</button>` : ""}
      <a class="nappi${valinnat.length || !ehd.length ? " paa" : ""}" href="${ikkunaOsoite(pvm, w)}">${valinnat.length ? "Muuta" : "Valitse itse"}</a>
      ${w.syominen ? `<button class="nappi" data-toiminto="syoty" data-ikkuna="${esc(w.id)}" aria-pressed="${syoty.has(w.id)}">${ikoni("kuittaus")}${syoty.has(w.id) ? "Syöty" : "Merkitse syödyksi"}</button>` : ""}
    </div>
  </section>`;
}

// Päivän energiatarve näytetään hiilihydraattina, ei kaloreina (S2, S24). Tuotteet valitaan vasta tämän jälkeen.
function tarveKortti(nyt, y, syoty) {
  if (!y.hh.vahintaan) return "";
  const syonnit = nyt.ikkunat.filter((w) => w.syominen);
  const seuraava = syonnit.find((w) => !(valinnatNyt()[w.id] ?? []).length);
  const osoite = (w) => `#/ikkuna/${encodeURIComponent(nyt.paiva.pvm)}/${encodeURIComponent(w.id)}`;
  const osuus = Math.min(100, (y.hh.summa / y.hh.vahintaan) * 100);
  return `<section class="kortti pino tarve">
    <h3>Päivän energiatarve</h3>
    <p>Kerää tänään vähintään noin <b>${y.hh.vahintaan} g</b> hiilihydraattia ${syonnit.length} syömiskerrassa.</p>
    <div class="palkki ${y.hh.tila}" role="img" aria-label="Kerätty ${luku(y.hh.summa)} g, tarve vähintään ${y.hh.vahintaan} g"><i style="width:${osuus}%"></i></div>
    <p class="pieni">Kerätty ${luku(y.hh.summa)} g. Suuntaa-antava arvio, ja syödä saa nälän mukaan.</p>
    ${syonnit.some((w) => syoty.has(w.id)) ? `<p class="hyva">${ikoni("kuittaus")}Syöty ${syonnit.filter((w) => syoty.has(w.id)).length}/${syonnit.length} kertaa. Hyvä!</p>` : ""}
    ${seuraava
      ? `<a class="nappi paa leve" href="${osoite(seuraava)}">${y.hh.summa ? "Jatka tuotteiden valintaa" : "Valitse tuotteet"}</a>`
      : `<a class="nappi paa leve" href="#/ostos">Avaa ostoslista</a>`}
  </section>`;
}

// Ikkuna
// Tiivis mittari kiinnittyvään palkkiin: nimi, summa ja haarukka yhdellä rivillä.
function tankkiRivi(nimi, rivi, yksikko) {
  if (!rivi.tavoite) return "";
  const katto = Math.max(rivi.tavoite[1], rivi.summa) || 1;
  return `<div class="tankkirivi">
    <span class="nimi">${nimi}</span><span class="arvo"><b>${luku(rivi.summa)}</b> / ${haarukka(rivi.tavoite, yksikko)}</span>
    <div class="palkki ${rivi.tila}" role="img" aria-label="${nimi} ${luku(rivi.summa)} ${yksikko}, ${TILAT[rivi.tila]}">
      <i style="width:${Math.min(100, (rivi.summa / katto) * 100)}%"></i><u style="left:${(rivi.tavoite[0] / katto) * 100}%"></u>
    </div>
  </div>`;
}

function tuoteRivi(t, maara, ikkunaId) {
  const arvot = t.tarkistettu && t.hiilihydraatti_g != null
    ? `Hiilihydraatti ${luku(t.hiilihydraatti_g)} g${t.proteiini_g ? `, proteiini ${luku(t.proteiini_g)} g` : ""}`
    : "Arvot puuttuvat";
  const data = `data-tuote="${esc(t.id)}" data-ikkuna="${esc(ikkunaId)}"`;
  return `<div class="tuote ${maara ? "valittu" : ""}" data-nimi="${esc(`${t.nimi} ${t.merkki ?? ""}`.toLowerCase())}">
    ${tuoteKuva(t)}
    <div class="kasvu"><div class="nimi">${esc(t.nimi)}</div><div class="pieni">${esc(t.annos?.kuvaus ?? "")}. ${arvot}</div>${t.huomautus && t.lahde?.tyyppi !== "oma" ? `<div class="pieni">${esc(t.huomautus)}</div>` : ""}</div>
    <div class="askel">
      ${maara ? `<button data-toiminto="vahemman" ${data} aria-label="Vähemmän: ${esc(t.nimi)}">${ikoni("miinus")}</button><output>${luku(maara)}</output>` : ""}
      <button data-toiminto="enemman" ${data} aria-label="Lisää: ${esc(t.nimi)}">${ikoni("plus")}</button>
    </div>
  </div>`;
}

function nakymaIkkuna(r) {
  const o = aktiivinen();
  const paiva = o && laskePaivat(o)?.find((p) => p.paiva.pvm === r.a);
  const w = paiva?.ikkunat.find((x) => x.id === r.b);
  const takaisin = `<a class="takaisin" href="#/paiva/${esc(r.a ?? "")}">${ikoni("vasen")}Takaisin päivään</a>`;
  if (!w) return `${takaisin}<p class="ilmoitus">Tätä ikkunaa ei enää ole. Ohjelma on ehkä muuttunut.</p>`;

  const kartta = tuoteKartta();
  const valinnat = valinnatNyt()[w.id] ?? [];
  const t = ikkunanTila(w, valinnat, kartta);
  const maarat = new Map(valinnat.map((v) => [v.tuoteId, v.annoksia]));
  const ehdotetut = tuotteetIkkunaan(w, kaikkiTuotteet());
  const ehdotetutIdt = new Set(ehdotetut.map((x) => x.id));
  const naytettavat = (ui.kaikkiTuotteet ? kaikkiTuotteet().filter((x) => !x.kofeiini && !x.lisaravinne) : ehdotetut);
  const lista = [...naytettavat, ...kaikkiTuotteet().filter((x) => maarat.has(x.id) && !naytettavat.includes(x))];
  const lasna = Object.keys(RYHMAT).filter((id) => lista.some((x) => x.ryhma === id));
  const ryhmat = lasna.map((id) => {
    const rivit = lista.filter((x) => x.ryhma === id);
    return `<div class="ryhma" data-ryhma="${id}"><h3>${RYHMAT[id]}</h3>${rivit.map((x) => tuoteRivi(x, maarat.get(x.id), w.id)).join("")}</div>`;
  }).join("");
  const suodin = lasna.length > 1
    ? `<div class="sirurivi" role="group" aria-label="Ryhmä">${[["", "Kaikki"], ...lasna.map((id) => [id, RYHMAT[id]])].map(([id, n]) =>
      `<button class="siru-nappi" data-toiminto="ryhma" data-ryhma="${id}" aria-pressed="${(ui.ryhma ?? "") === id}">${esc(n)}</button>`).join("")}</div>`
    : "";
  const haku = `<label class="hakukentta">${ikoni("haku")}<input type="search" data-syote="haku" placeholder="Etsi tuotetta" aria-label="Etsi tuotetta" value="${esc(ui.haku)}" enterkeyhint="search"></label>`;
  const nimi = ikkunanNimi(w);
  const ehd = tuotteet.length ? ehdotus(w, kaikkiTuotteet(), ui.kierros[w.id] ?? 0) : [];
  const ehdNimet = ehd.map((v) => `${kartta.get(v.tuoteId)?.nimi}${v.annoksia !== 1 ? ` × ${luku(v.annoksia)}` : ""}`).join(" + ");
  const ehdTila = ehd.length ? ikkunanTila(w, ehd, kartta) : null;
  const pika = ehd.length ? `<section class="kortti pika">
      <div class="rivi">${ikoni("salama")}<h3 class="kasvu">Pikavalinta</h3></div>
      <p><b>${esc(ehdNimet)}</b></p>
      <p class="pieni">${ehdTila.hh.tavoite ? `Hiilihydraatti ${luku(ehdTila.hh.summa)} g` : `Juomaa ${luku(ehdTila.neste.summa)} dl`}${ehdTila.prot.tavoite ? `, proteiini ${luku(ehdTila.prot.summa)} g` : ""}</p>
      <div class="napit"><button class="nappi paa" data-toiminto="ota-ehdotus" data-ikkuna="${esc(w.id)}" data-pvm="${esc(r.a)}">${valinnat.length ? "Vaihda tähän" : "Ota tämä"}</button>
      <button class="nappi" data-toiminto="toinen-ehdotus" data-ikkuna="${esc(w.id)}">${ikoni("kierto")}Toinen vaihtoehto</button></div>
    </section>` : "";
  const syoty = syodyt().has(w.id);
  const puuttuu = t.puuttuvat.length
    ? `<p class="ilmoitus">Arvot puuttuvat tuotteilta: ${esc(t.puuttuvat.map((id) => kartta.get(id)?.nimi ?? id).join(", "))}. Ne ovat suunnitelmassa ja ostoslistalla, mutta eivät vielä näy tankkauksessa.</p>`
    : "";
  const syonnit = paiva.ikkunat.filter((x) => x.syominen);
  const seuraava = syonnit[syonnit.findIndex((x) => x.id === w.id) + 1];
  const jatka = w.syominen
    ? `<a class="nappi paa kasvu" href="${seuraava ? ikkunaOsoite(r.a, seuraava) : `#/paiva/${encodeURIComponent(r.a)}`}">${seuraava ? `Seuraava: ${esc(seuraava.otsikko)} ${kello(seuraava.alku)}` : "Valmis, takaisin päivään"}${ikoni("oikea")}</a>`
    : `<a class="nappi paa kasvu" href="#/paiva/${encodeURIComponent(r.a)}">Takaisin päivään</a>`;
  return `${takaisin}
    <section class="kortti pino otsikkokortti t-${tankkausTaso(w) ?? "ei"}">
      <div class="pieni">${pvmTeksti(w.pvm)} klo ${kello(w.alku)}–${kello(w.loppu)}</div>
      <h2>${esc(nimi)}</h2>
      <div class="rivi kaari">${kokoMerkki(w)}</div>
      ${rooliTeksti(w) ? `<p class="pieni">${esc(rooliTeksti(w))}</p>` : ""}
      ${w.huomautukset.map((h) => `<div class="huomio">${esc(h)}</div>`).join("")}
      <p class="pieni">Haarukat ovat suuntaa-antavia. Syö sen verran, että olo on hyvä. Sääntö ${esc(w.saanto)}.</p>
    </section>
    <section class="kortti tankki" aria-label="Tankkaus">
      ${tankkiRivi("Hiilihydraatti", t.hh, "g")}${tankkiRivi("Proteiini", t.prot, "g")}${tankkiRivi("Juoma", t.neste, "dl")}
      ${[t.hh, t.prot, t.neste].some((x) => x.tavoite) && [t.hh, t.prot, t.neste].every((x) => !x.tavoite || x.tila !== "lisaa") ? `<p class="hyva">${ikoni("kuittaus")}Tankki täynnä</p>` : ""}
    </section>
    ${puuttuu}
    ${t.huomautukset.map((h) => `<p class="ilmoitus">${esc(h)}</p>`).join("")}
    ${pika}
    <section class="pino tuotteet">
      <h2>Mikä maistuu?</h2>
      ${lista.length > 6 ? haku : ""}
      ${suodin}
      ${ryhmat || `<p class="pieni">Ei ehdotuksia tähän ikkunaan.</p>`}
      <p class="pieni ei-osumia" hidden>Ei osumia. Kokeile toista sanaa tai näytä muutkin tuotteet.</p>
      ${tuotteet.length && ehdotetutIdt.size < kaikkiTuotteet().length ? `<button class="nappi leve" data-toiminto="kaikki-tuotteet">${ui.kaikkiTuotteet ? "Näytä vain tähän sopivat" : "Näytä muutkin tuotteet"}</button>` : ""}
      ${tuoteVirhe ? `<p class="ilmoitus">Tuotelistaa ei saatu ladattua. Tarkista verkkoyhteys ja avaa sivu uudelleen.</p>` : ""}
    </section>
    <div class="alapalkki">
      ${w.syominen ? `<button class="nappi kuittaa${syoty ? " tehty" : ""}" data-toiminto="syoty" data-ikkuna="${esc(w.id)}" aria-pressed="${syoty}">${ikoni("kuittaus")}${syoty ? "Syöty" : "Syöty?"}</button>` : ""}
      ${jatka}
    </div>`;
}

function muutaAnnosta(ikkunaId, tuoteId, muutos) {
  const kaikki = valinnatNyt();
  const lista = kaikki[ikkunaId] ?? [];
  const rivi = lista.find((v) => v.tuoteId === tuoteId);
  const uusi = (rivi?.annoksia ?? 0) + muutos;
  if (uusi <= 0) kaikki[ikkunaId] = lista.filter((v) => v.tuoteId !== tuoteId);
  else if (rivi) rivi.annoksia = uusi;
  else kaikki[ikkunaId] = [...lista, { tuoteId, annoksia: uusi }];
  if (!kaikki[ikkunaId].length) delete kaikki[ikkunaId];
  talleta();
  piirra(true);
}

// Ohjelma
function osioRivi(o) {
  const laji = o.tyyppi === "ateria" ? ATERIAT[o.ateria] ?? "Ateria" : OSIOT[o.tyyppi];
  const lisa = [laji === o.nimi ? "" : laji, o.kesto ? `${o.kesto} min` : ""].filter(Boolean).join(", ");
  return `<div class="osio">
    <span class="klo">${esc(o.alku)}</span>
    <div class="kasvu"><div class="otsikko">${esc(o.nimi)}</div>${lisa ? `<div class="pieni">${esc(lisa)}</div>` : ""}</div>
    <button class="ikoninappi" data-toiminto="muokkaa-osio" data-osio="${esc(o.id)}" aria-label="Muokkaa: ${esc(o.nimi)}">${ikoni("kyna")}</button>
    <button class="ikoninappi" data-toiminto="poista-osio" data-osio="${esc(o.id)}" aria-label="Poista: ${esc(o.nimi)}">${ikoni("roska")}</button>
  </div>`;
}

function lahdeLista() {
  if (ui.lahteet === null) return "";
  if (!ui.lahteet.length) return `<p class="ilmoitus">Otteluohjelmia ei saatu haettua. Tarkista verkkoyhteys.</p>`;
  return ui.lahteet.map((l, i) => `<button class="nappi leve" data-toiminto="tuo-lahde" data-i="${i}">${esc(l.nimi)}</button>`).join("");
}

function nakymaOhjelma() {
  const o = aktiivinen();
  const valinta = tila.ohjelmat.length > 1
    ? `<label class="kentta">Aktiivinen ohjelma<select data-muutos="vaihda-ohjelma">${tila.ohjelmat.map((p) => `<option value="${esc(p.id)}"${p.id === o?.id ? " selected" : ""}>${esc(p.nimi)}</option>`).join("")}</select></label>`
    : "";
  const paivat = o ? o.paivat.map((p) => `<section class="kortti">
      <div class="rivi"><h3 class="kasvu">${pvmTeksti(p.pvm)}</h3>
        <button class="ikoninappi" data-toiminto="poista-paiva" data-pvm="${p.pvm}" aria-label="Poista päivä ${pvmTeksti(p.pvm)}">${ikoni("roska")}</button></div>
      <label class="kentta">Herätys (valinnainen)<input type="time" value="${p.herays ? esc(p.herays.replace(".", ":")) : ""}" data-muutos="herays" data-pvm="${p.pvm}"></label>
      <div>${p.osiot.map(osioRivi).join("") || `<p class="pieni">Ei vielä osioita.</p>`}</div>
      <button class="nappi leve" data-toiminto="uusi-osio" data-pvm="${p.pvm}">${ikoni("plus")}Lisää peli, harjoitus tai ateria</button>
    </section>`).join("") : "";
  return `<h2>${o ? esc(o.nimi) : "Ohjelma"}</h2>
    ${valinta}
    ${o ? `<div class="pino">${paivat}<button class="nappi leve" data-toiminto="uusi-paiva">${ikoni("plus")}Lisää päivä</button></div>` : ""}
    <section class="kortti pino">
      <h3>Uusi ohjelma</h3>
      <button class="nappi paa leve" data-toiminto="uusi-turnaus">Uusi turnaus</button>
      <button class="nappi leve" data-toiminto="uusi-ohjelma">Tee oma ohjelma</button>
      ${VALMIIT.map((v) => `<button class="nappi leve" data-toiminto="valmis-ohjelma" data-id="${v.id}">Ota ${esc(v.nimi)}</button>`).join("")}
      <button class="nappi leve" data-toiminto="hae-lahteet">Hae joukkueen otteluohjelmat</button>
      ${lahdeLista()}
      <label class="kentta">Tuo tiedostosta<input type="file" accept=".json,application/json" data-muutos="tuo-tiedosto"></label>
      <p class="pieni">Otteluohjelmasta tulevat vain pelit. Lisää ateriat ja testit tuonnin jälkeen.</p>
    </section>
    ${o ? `<button class="nappi leve" data-toiminto="poista-ohjelma">${ikoni("roska")}Poista tämä ohjelma</button>` : ""}`;
}

function etsiPaiva(pvm) { return aktiivinen()?.paivat.find((p) => p.pvm === pvm); }
function etsiOsio(id) {
  for (const p of aktiivinen()?.paivat ?? []) {
    const o = p.osiot.find((x) => x.id === id);
    if (o) return { paiva: p, osio: o };
  }
  return null;
}
function jarjestaOsiot(p) { p.osiot.sort((a, b) => minuutit(a.alku) - minuutit(b.alku)); }

async function otaOhjelma(uusi, varoitukset = []) {
  if (tila.ohjelmat.some((o) => o.id === uusi.id)) {
    const ok = await kysy(`Ohjelma "${uusi.nimi}" on jo laitteella. Korvataanko se? Tuotevalinnat säilyvät.`, "Korvaa");
    if (!ok) return;
    tila.ohjelmat = tila.ohjelmat.filter((o) => o.id !== uusi.id);
  }
  tila.ohjelmat.push(uusi);
  tila.aktiivinenOhjelma = uusi.id;
  ui.viesti = varoitukset.length ? varoitukset.join(". ") : null;
  ui.lahteet = null;
  talleta();
  if (location.hash === "#/ohje") piirra(); else location.hash = "#/ohje";
}

async function tuoJson(json, valinnat) {
  try {
    const { ohjelma, varoitukset } = tuoOhjelma(json, valinnat);
    await otaOhjelma(ohjelma, varoitukset);
  } catch {
    ui.viesti = "Ohjelmaa ei voitu lukea. Tarkista, että tiedosto on oikeaa muotoa.";
    piirra();
  }
}

async function haeLahteet() {
  const lista = [];
  for (const polku of ["../eerikkila/data.json", "../turnaukset/data.json"]) {
    try {
      const vastaus = await fetch(polku);
      if (!vastaus.ok) continue;
      const json = await vastaus.json();
      for (const e of json.events ?? []) {
        if (Array.isArray(e.matches)) lista.push({ nimi: e.title ?? e.name, json, valinnat: { eventId: e.id } });
        for (const j of e.teams ?? []) lista.push({ nimi: `${e.name}: ${j.label ?? j.name}`, json, valinnat: { eventId: e.id, teamName: j.name } });
      }
    } catch {
      // Verkko ei toimi, ja tyhjä lista kerrotaan käyttäjälle.
    }
  }
  ui.lahteet = lista;
  piirra(true);
}

// Ostokset
function nakymaOstos() {
  const o = aktiivinen();
  if (!o) return tyhjaTila();
  let rivit = [];
  try { rivit = ostoslista(o, valinnatNyt(), tuoteKartta()); } catch { rivit = []; }
  const ostetut = new Set(tila.ostettu[o.id] ?? []);
  const kartta = tuoteKartta();
  if (!rivit.length) return `<h2>Ostokset</h2><section class="kortti pino"><p>Lista täyttyy, kun valitset tuotteita päivän ikkunoihin.</p><a class="nappi leve" href="#/paiva">Avaa päivä</a></section>`;
  const ryhmat = Object.keys(RYHMAT).map((id) => {
    const r = rivit.filter((x) => x.ryhma === id);
    return r.length ? `<div class="ryhma"><h3>${RYHMAT[id]}</h3><div>${r.map((x) => `<label class="ostos ${ostetut.has(x.tuoteId) ? "ostettu" : ""}">
        <input type="checkbox" data-muutos="ostettu" data-tuote="${esc(x.tuoteId)}"${ostetut.has(x.tuoteId) ? " checked" : ""}>
        ${tuoteKuva(kartta.get(x.tuoteId))}
        <span class="kasvu"><span class="nimi">${esc(x.nimi)}</span><br><span class="pieni">${luku(x.annoksia)} × ${esc(x.kuvaus ?? "annos")}</span></span></label>`).join("")}</div></div>` : "";
  }).join("");
  return `<h2>Ostokset</h2><p class="pieni">${esc(o.nimi)}. ${esc(SAANNOT.vinkit.valmistaudu)}</p><section class="kortti">${ryhmat}</section>`;
}

// Asetukset
function nakymaAsetukset() {
  const teemat = [["auto", "Puhelimen mukaan"], ["vaalea", "Vaalea"], ["tumma", "Tumma"]];
  return `<h2>Asetukset</h2>
    <section class="kortti"><h3>Teema</h3>${teemat.map(([v, n]) => `<label class="valinta"><input type="radio" name="teema" value="${v}" data-muutos="teema"${tila.asetukset.teema === v ? " checked" : ""}>${n}</label>`).join("")}</section>
    <section class="kortti pino"><h3>Omat tuotteet</h3>
      ${tila.omatTuotteet.map((t) => `<div class="osio"><div class="kasvu"><div class="otsikko">${esc(t.nimi)}</div>
        <div class="pieni">${esc(t.annos.kuvaus)}. ${t.tarkistettu ? `Hiilihydraatti ${luku(t.hiilihydraatti_g)} g, proteiini ${luku(t.proteiini_g)} g` : "Arvot puuttuvat"}</div>
        ${t.huomautus ? `<div class="pieni">${esc(t.huomautus)}</div>` : ""}
        ${omaHuomio(t) ? `<div class="huomio">${esc(omaHuomio(t))}</div>` : ""}</div>
        <button class="ikoninappi" data-toiminto="poista-oma" data-tuote="${esc(t.id)}" aria-label="Poista: ${esc(t.nimi)}">${ikoni("roska")}</button></div>`).join("") || `<p class="pieni">Lisää tuote pakkauksen tiedoilla.</p>`}
      <button class="nappi leve" data-toiminto="uusi-oma">${ikoni("plus")}Lisää oma tuote</button>
      <label class="kentta">Tuo tuotteet tiedostosta<input type="file" accept=".json,application/json" data-muutos="tuo-omat"></label></section>
    <section class="kortti pino"><h3>Tiedot</h3>
      <p>Kaikki tiedot ovat vain tässä laitteessa. Appi ei lähetä mitään palvelimelle.</p>
      <button class="nappi leve" data-toiminto="tyhjenna">${ikoni("roska")}Poista kaikki tiedot</button></section>
    <section class="kortti pino"><h3>Tietolähteet</h3>
      <p class="pieni">Yleisten elintarvikkeiden ravintoarvot: Fineli, Terveyden ja hyvinvoinnin laitos, lisenssi CC BY 4.0. Arvot on laskettu annoksille. Appi ei ole THL:n tuottama tai suosittelema eikä osa Finelin verkkopalvelua. Osa merkkituotteista: <a href="https://world.openfoodfacts.org">Open Food Facts</a>, pakkausmerkinnöistä koottu avoin tietokanta, lisenssi ODbL. Puuttuvat arvot on merkitty tuotteisiin.</p>
      <p class="pieni">Kuvat: merkkituotteet Open Food Facts -yhteisöltä (CC BY-SA 3.0), muut ruoat Wikimedia Commonsista. Kuvat on pienennetty. Tuotemerkit kuuluvat omistajilleen. Kuvien tekijät ja lisenssit ovat alla.</p>
      ${kuvaLahteet()}
      <p class="pieni">Tankkausohjeet perustuvat suomalaisiin nuoren urheilijan suosituksiin ja UEFA:n jalkapalloravitsemuksen asiantuntijakannanottoon. Haarukat on sovitettu 10–12-vuotiaille, ja ne ovat suuntaa-antavia.</p></section>`;
}

function kuvaLahteet() {
  const kuvalliset = tuotteet.filter((t) => t.kuva && t.kuvaLahde);
  if (!kuvalliset.length) return "";
  return `<details class="pieni"><summary>Kuvien tekijät (${kuvalliset.length})</summary><ul class="tekijat">${kuvalliset.map((t) =>
    `<li><a href="${esc(t.kuvaLahde)}">${esc(t.nimi)}</a>: ${esc(t.kuvaTekija ?? "")}, ${esc(t.kuvaLisenssi ?? "")}</li>`).join("")}</ul></details>`;
}

// Dialogit
function kysy(teksti, nappi) {
  return new Promise((ratkaise) => {
    dialogi.innerHTML = `<form method="dialog" class="pino"><p>${esc(teksti)}</p><div class="napit">
      <button class="nappi paa" value="kylla">${esc(nappi)}</button><button class="nappi" value="ei">Peruuta</button></div></form>`;
    dialogi.returnValue = "ei";
    dialogi.addEventListener("close", () => ratkaise(dialogi.returnValue === "kylla"), { once: true });
    dialogi.showModal();
  });
}

function avaaOsioLomake(pvm, osio) {
  const o = osio ?? { tyyppi: "peli", alku: "", kesto: 45, nimi: "" };
  dialogi.innerHTML = `<form data-lomake="osio" data-pvm="${esc(pvm)}" data-id="${esc(osio?.id ?? "")}" data-tyyppi="${o.tyyppi}">
    <h3>${osio ? "Muokkaa" : "Lisää"}</h3>
    <label class="kentta">Laji<select name="tyyppi" data-muutos="lomake-tyyppi">${Object.entries(OSIOT).map(([k, n]) => `<option value="${k}"${o.tyyppi === k ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="kentta vain-ateria">Ateria<select name="ateria">${Object.entries(ATERIAT).map(([k, n]) => `<option value="${k}"${o.ateria === k ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="kentta">Alkaa<input type="time" name="alku" required value="${esc(o.alku.replace(".", ":").padStart(5, "0"))}"></label>
    <label class="kentta vain-liike">Kesto minuutteina<input type="number" name="kesto" min="1" max="300" inputmode="numeric" value="${o.kesto ?? ""}"></label>
    <label class="kentta">Nimi (valinnainen)<input name="nimi" maxlength="80" value="${esc(o.nimi)}"></label>
    <div class="napit"><button class="nappi paa" type="submit">Tallenna</button><button class="nappi" type="button" data-toiminto="sulje">Peruuta</button></div>
  </form>`;
  dialogi.showModal();
}

function tallennaOsio(lomake) {
  const d = new FormData(lomake);
  const p = etsiPaiva(lomake.dataset.pvm);
  if (!p) return;
  const tyyppi = d.get("tyyppi");
  const vanha = lomake.dataset.id ? p.osiot.find((x) => x.id === lomake.dataset.id) : null;
  const kesto = tyyppi === "ateria" ? null : (Number(d.get("kesto")) || (tyyppi === "peli" ? 45 : null));
  const ateria = d.get("ateria");
  const nimi = String(d.get("nimi")).trim() || (tyyppi === "ateria" ? ATERIAT[ateria] : OSIOT[tyyppi]);
  const uusi = { id: vanha?.id ?? uusiId(p.pvm, tyyppi), tyyppi, alku: kello(minuutit(d.get("alku"))), kesto, nimi };
  if (tyyppi === "ateria") uusi.ateria = ateria;
  if (vanha) p.osiot[p.osiot.indexOf(vanha)] = uusi; else p.osiot.push(uusi);
  jarjestaOsiot(p);
  talleta();
  dialogi.close();
  piirra(true);
}

function uusiId(pvm, tyyppi) {
  const kaikki = new Set(aktiivinen().paivat.flatMap((p) => p.osiot.map((o) => o.id)));
  let n = 1;
  while (kaikki.has(`${pvm}-${tyyppi}${n}`)) n++;
  return `${pvm}-${tyyppi}${n}`;
}

function avaaTurnausLomake() {
  dialogi.innerHTML = `<div class="pino"><div class="rivi"><h3 class="kasvu">Uusi turnaus</h3><button class="ikoninappi" data-toiminto="sulje" aria-label="Sulje">${ikoni("sulje")}</button></div>${turnausLomake()}</div>`;
  dialogi.showModal();
}

function avaaPaivaLomake() {
  dialogi.innerHTML = `<form data-lomake="paiva"><h3>Lisää päivä</h3>
    <label class="kentta">Päivä<input type="date" name="pvm" required></label>
    <div class="napit"><button class="nappi paa" type="submit">Lisää</button><button class="nappi" type="button" data-toiminto="sulje">Peruuta</button></div></form>`;
  dialogi.showModal();
}

function avaaOhjelmaLomake() {
  dialogi.innerHTML = `<form data-lomake="ohjelma"><h3>Uusi ohjelma</h3>
    <label class="kentta">Nimi<input name="nimi" required maxlength="80" placeholder="Esim. Lauantain turnaus"></label>
    <label class="kentta">Ensimmäinen päivä<input type="date" name="pvm" required></label>
    <p class="pieni">Älä kirjoita ohjelmaan lasten nimiä.</p>
    <div class="napit"><button class="nappi paa" type="submit">Luo</button><button class="nappi" type="button" data-toiminto="sulje">Peruuta</button></div></form>`;
  dialogi.showModal();
}

function avaaOmaLomake() {
  const sopii = [["ennen", "Ennen peliä"], ["peli", "Pelin aikana (juomat)"], ["valissa", "Pelien välissä"], ["palautus", "Palautukseen"]];
  dialogi.innerHTML = `<form data-lomake="oma"><h3>Lisää oma tuote</h3>
    <label class="kentta">Nimi<input name="nimi" required maxlength="80"></label>
    <label class="kentta">Annos<input name="kuvaus" maxlength="60" placeholder="Esim. 1 patukka, 30 g"></label>
    <label class="kentta">Hiilihydraatti annoksessa, g<input name="hiilihydraatti_g" inputmode="decimal"></label>
    <label class="kentta">Proteiini annoksessa, g<input name="proteiini_g" inputmode="decimal"></label>
    <label class="kentta">Juomaa annoksessa, dl (juomille)<input name="neste_dl" inputmode="decimal"></label>
    <label class="kentta">Sulaminen<select name="sulavuus"><option value="nopea">Nopea</option><option value="keskitaso" selected>Keskitaso</option><option value="hidas">Hidas</option></select></label>
    <fieldset class="valinnat"><legend>Sopii</legend>${sopii.map(([v, n]) => `<label class="valinta"><input type="checkbox" name="sopii" value="${v}">${n}</label>`).join("")}</fieldset>
    <p class="pieni">Ota arvot pakkauksesta ja laske ne yhdelle annokselle. Jos arvoja ei ole, tuote näkyy merkinnällä "arvot puuttuvat".</p>
    <div class="napit"><button class="nappi paa" type="submit">Tallenna</button><button class="nappi" type="button" data-toiminto="sulje">Peruuta</button></div></form>`;
  dialogi.showModal();
}

function varatutIdt() { return new Set(kaikkiTuotteet().map((t) => t.id)); }

// Tapahtumat
const toiminnot = {
  "uusi-oma": avaaOmaLomake,
  "poista-oma": async (d) => {
    const t = tila.omatTuotteet.find((x) => x.id === d.tuote);
    if (!t || !await kysy(`Poistetaanko "${t.nimi}" ja sen valinnat?`, "Poista")) return;
    tila.omatTuotteet = tila.omatTuotteet.filter((x) => x !== t);
    for (const valinnat of Object.values(tila.valinnat)) {
      for (const [id, lista] of Object.entries(valinnat)) {
        const jaljella = lista.filter((v) => v.tuoteId !== t.id);
        if (jaljella.length) valinnat[id] = jaljella; else delete valinnat[id];
      }
    }
    talleta(); piirra(true);
  },
  enemman: (d) => muutaAnnosta(d.ikkuna, d.tuote, 1),
  vahemman: (d) => muutaAnnosta(d.ikkuna, d.tuote, -1),
  "kaikki-tuotteet": () => { ui.kaikkiTuotteet = !ui.kaikkiTuotteet; piirra(true); },
  "uusi-turnaus": avaaTurnausLomake,
  "lisaa-peli": () => {
    const ajat = document.querySelector("form[data-lomake=turnaus] .ajat");
    if (ajat && ajat.children.length < 8) ajat.insertAdjacentHTML("beforeend", peliAika(ajat.children.length + 1));
  },
  syoty: (d) => {
    const o = aktiivinen();
    if (!o) return;
    const s = syodyt();
    if (s.has(d.ikkuna)) s.delete(d.ikkuna); else s.add(d.ikkuna);
    tila.syoty[o.id] = [...s];
    talleta(); piirra(true);
  },
  "ota-ehdotus": (d) => {
    const w = laskePaivat(aktiivinen())?.find((p) => p.paiva.pvm === d.pvm)?.ikkunat.find((x) => x.id === d.ikkuna);
    if (!w) return;
    const e = ehdotus(w, kaikkiTuotteet(), ui.kierros[w.id] ?? 0);
    if (!e.length) return;
    valinnatNyt()[w.id] = e;
    talleta(); piirra(true);
  },
  "toinen-ehdotus": (d) => { ui.kierros[d.ikkuna] = (ui.kierros[d.ikkuna] ?? 0) + 1; piirra(true); },
  ryhma: (d) => { ui.ryhma = d.ryhma || null; suodata(); },
  "valmis-ohjelma": async (d) => {
    try {
      const v = await fetch(VALMIIT.find((x) => x.id === d.id).tiedosto);
      await tuoJson(await v.json());
    } catch {
      ui.viesti = "Ohjelmaa ei saatu ladattua. Tarkista verkkoyhteys.";
      piirra();
    }
  },
  "hae-lahteet": haeLahteet,
  "tuo-lahde": (d) => { const l = ui.lahteet[Number(d.i)]; return tuoJson(l.json, l.valinnat); },
  "uusi-ohjelma": avaaOhjelmaLomake,
  "uusi-paiva": avaaPaivaLomake,
  "uusi-osio": (d) => avaaOsioLomake(d.pvm),
  "muokkaa-osio": (d) => { const l = etsiOsio(d.osio); if (l) avaaOsioLomake(l.paiva.pvm, l.osio); },
  "poista-osio": async (d) => {
    const l = etsiOsio(d.osio);
    if (!l || !await kysy(`Poistetaanko "${l.osio.nimi}"?`, "Poista")) return;
    l.paiva.osiot = l.paiva.osiot.filter((x) => x !== l.osio);
    talleta(); piirra(true);
  },
  "poista-paiva": async (d) => {
    if (!await kysy(`Poistetaanko ${pvmTeksti(d.pvm)} ohjelmasta?`, "Poista")) return;
    const o = aktiivinen();
    o.paivat = o.paivat.filter((p) => p.pvm !== d.pvm);
    talleta(); piirra(true);
  },
  "poista-ohjelma": async () => {
    const o = aktiivinen();
    if (!await kysy(`Poistetaanko ohjelma "${o.nimi}" ja sen tuotevalinnat?`, "Poista")) return;
    tila.ohjelmat = tila.ohjelmat.filter((x) => x !== o);
    delete tila.valinnat[o.id];
    delete tila.ostettu[o.id];
    delete tila.syoty[o.id];
    tila.aktiivinenOhjelma = tila.ohjelmat[0]?.id ?? null;
    talleta(); piirra();
  },
  tyhjenna: async () => {
    if (!await kysy("Poistetaanko kaikki ohjelmat ja valinnat tästä laitteesta?", "Poista kaikki")) return;
    tyhjenna(varasto);
    tila = lataa(varasto);
    teema(); piirra();
  },
  sulje: () => dialogi.close(),
};

const muutokset = {
  "tuo-omat": async (el) => {
    const tiedosto = el.files?.[0];
    if (!tiedosto) return;
    try {
      const { tuotteet: uudet, ohitetut } = tuoOmatTuotteet(JSON.parse(await tiedosto.text()), varatutIdt());
      const idt = new Set(uudet.map((t) => t.id));
      tila.omatTuotteet = [...tila.omatTuotteet.filter((t) => !idt.has(t.id)), ...uudet];
      ui.viesti = `Tuotu ${uudet.length} tuotetta.${ohitetut ? ` ${ohitetut} riviä ohitettiin.` : ""}`;
      talleta();
    } catch {
      ui.viesti = "Tuotteita ei voitu lukea. Tarkista tiedoston muoto.";
    }
    piirra();
  },
  "vaihda-ohjelma": (el) => { tila.aktiivinenOhjelma = el.value; talleta(); piirra(); },
  herays: (el) => {
    const p = etsiPaiva(el.dataset.pvm);
    if (!p) return;
    if (el.value) p.herays = kello(minuutit(el.value)); else delete p.herays;
    talleta();
  },
  ostettu: (el) => {
    const o = aktiivinen();
    const s = new Set(tila.ostettu[o.id] ?? []);
    if (el.checked) s.add(el.dataset.tuote); else s.delete(el.dataset.tuote);
    tila.ostettu[o.id] = [...s];
    talleta(); piirra(true);
  },
  teema: (el) => { tila.asetukset.teema = el.value; talleta(); teema(); },
  "lomake-tyyppi": (el) => {
    el.form.dataset.tyyppi = el.value;
    if (el.value === "peli" && !el.form.kesto.value) el.form.kesto.value = 45;
  },
  "tuo-tiedosto": async (el) => {
    const tiedosto = el.files?.[0];
    if (!tiedosto) return;
    try {
      await tuoJson(JSON.parse(await tiedosto.text()));
    } catch {
      ui.viesti = "Tiedostoa ei voitu lukea. Sen pitää olla JSON-muodossa.";
      piirra();
    }
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-toiminto]");
  if (el) { ui.viesti = ["enemman", "vahemman", "ryhma"].includes(el.dataset.toiminto) ? ui.viesti : null; toiminnot[el.dataset.toiminto]?.(el.dataset); }
});
document.addEventListener("input", (e) => {
  if (e.target.dataset?.syote === "haku") { ui.haku = e.target.value; suodata(); }
});

// Haku ja ryhmäsuodin piilottavat rivejä piirtämättä sivua uudelleen, jotta näppäimistö ja vieritys pysyvät.
function suodata() {
  const sana = ui.haku.trim().toLowerCase();
  let nakyvia = 0;
  for (const r of sisalto.querySelectorAll(".ryhma[data-ryhma]")) {
    let ryhmassa = 0;
    const ryhmaOk = !ui.ryhma || r.dataset.ryhma === ui.ryhma;
    for (const t of r.querySelectorAll(".tuote")) {
      const nakyy = ryhmaOk && (!sana || t.dataset.nimi.includes(sana));
      t.hidden = !nakyy;
      ryhmassa += nakyy;
    }
    r.hidden = !ryhmassa;
    nakyvia += ryhmassa;
  }
  for (const b of sisalto.querySelectorAll('[data-toiminto="ryhma"]')) b.setAttribute("aria-pressed", String((ui.ryhma ?? "") === b.dataset.ryhma));
  const ei = sisalto.querySelector(".ei-osumia");
  if (ei) ei.hidden = nakyvia > 0;
}
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-muutos]");
  if (el) muutokset[el.dataset.muutos]?.(el);
});
document.addEventListener("submit", (e) => {
  const lomake = e.target.closest("[data-lomake]");
  if (!lomake) return;
  e.preventDefault();
  const d = new FormData(lomake);
  if (lomake.dataset.lomake === "osio") tallennaOsio(lomake);
  if (lomake.dataset.lomake === "turnaus") {
    try {
      const pvm = d.get("pvm");
      const uusi = luoTurnaus({
        id: `turnaus-${pvm}`, pvm, ajat: d.getAll("aika").filter(Boolean), kesto: Number(d.get("kesto")),
        ruokailu: d.get("ruokailu") ? kello(minuutit(d.get("ruokailu"))) : null,
      });
      if (dialogi.open) dialogi.close();
      otaOhjelma(uusi);
    } catch {
      ui.viesti = "Pelien ajat menevät päällekkäin tai yli puolenyön. Tarkista kellonajat ja pelin kesto.";
      if (dialogi.open) dialogi.close();
      piirra();
    }
  }
  if (lomake.dataset.lomake === "oma") {
    const t = luoOmaTuote({ ...Object.fromEntries(d), sopii: d.getAll("sopii") }, varatutIdt());
    tila.omatTuotteet.push(t);
    ui.viesti = omaHuomio(t);
    talleta(); dialogi.close(); piirra(true);
  }
  if (lomake.dataset.lomake === "paiva") {
    const o = aktiivinen();
    if (!o.paivat.some((p) => p.pvm === d.get("pvm"))) {
      o.paivat.push({ pvm: d.get("pvm"), osiot: [] });
      o.paivat.sort((a, b) => a.pvm.localeCompare(b.pvm));
      talleta();
    }
    dialogi.close(); piirra(true);
  }
  if (lomake.dataset.lomake === "ohjelma") {
    const uusi = { versio: 1, id: `oma-${Date.now()}`, nimi: String(d.get("nimi")).trim(), lahde: { tyyppi: "kasin" }, paivat: [{ pvm: d.get("pvm"), osiot: [] }] };
    tila.ohjelmat.push(uusi);
    tila.aktiivinenOhjelma = uusi.id;
    talleta(); dialogi.close(); piirra();
  }
});
window.addEventListener("hashchange", () => { ui.viesti = null; ui.haku = ""; ui.ryhma = null; piirra(); sisalto.focus({ preventScroll: true }); });
// Seuraavaksi-kortti pysyy ajan tasalla, kun appi on auki pelipäivänä.
setInterval(() => {
  const kirjoittaa = document.activeElement?.matches?.("input, select, textarea");
  if (["ohje", "paiva"].includes(reitti().nakyma) && !dialogi.open && !kirjoittaa && !document.hidden) piirra(true);
}, 60000);

// Käynnistys
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {}); // Appi toimii verkossa ilmankin.
teema();
piirra();
try {
  const v = await fetch("data/tuotteet.json");
  tuotteet = (await v.json()).tuotteet;
} catch {
  tuoteVirhe = true;
}
piirra(true);

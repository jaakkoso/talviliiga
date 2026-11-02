// Testitapaukset T1–T13: docs/logiikka.md, osa 6.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { kello, kestoTeksti, minuutit, taydennaKestot } from "../js/aika.js";
import { rasitus } from "../js/rasitus.js";
import { aikajana, nesteKulauksista, ohjelmanPaivat } from "../js/aikajana.js";
import { ikkunanTila, ostoslista, paivanYhteenveto } from "../js/tavoitteet.js";
import { tuoOhjelma, validoiOhjelma } from "../js/tuonti.js";

const lue = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const ohjelma = lue("../data/ohjelma-eerikkila-2026-11.json");
const [su, ma, ti] = ohjelma.paivat;

const peli = (id, alku, kesto = 45) => ({ id, tyyppi: "peli", alku, kesto, nimi: id });
const ateria = (id, laji, alku) => ({ id, tyyppi: "ateria", ateria: laji, alku, kesto: null, nimi: id });
const paiva = (osiot, lisa = {}) => ({ pvm: "2026-11-07", osiot, ...lisa });

const NK = ["nopea", "keskitaso"];
const N = ["nopea"];
const MYOH = "Myöhäinen peli: syö kunnolla ennen nukkumaan menoa";
const SUOLA = "Ota mukaan jotain suolaista";
const HUOM = "Tankkaus jatkuu: huomenna on pelejä";
const EILEN = "Tankkaus jatkuu eiliseltä";

// [id, rooli, alku, loppu, hh, prot, neste, sulavuus, saanto, huomautukset]
function rivit(tulos) {
  return tulos.ikkunat.map((w) => [w.id, w.rooli, kello(w.alku), kello(w.loppu), w.tavoite.hh, w.tavoite.prot, w.tavoite.neste, w.sulavuus, w.saanto, w.huomautukset]);
}
const ajat = (tulos) => tulos.ikkunat.filter((w) => w.syominen).map((w) => `${w.id} ${kello(w.alku)}-${kello(w.loppu)}`);

test("aikafunktiot", () => {
  assert.equal(minuutit("15.30"), 930);
  assert.equal(minuutit("15:30"), 930);
  assert.equal(minuutit("9.45"), 585);
  assert.throws(() => minuutit("25.00"), RangeError);
  assert.equal(kello(930), "15.30");
  assert.throws(() => kello(1440), RangeError);
  assert.equal(kestoTeksti(195), "3 h 15 min");
  assert.equal(kestoTeksti(45), "45 min");
  assert.equal(kestoTeksti(120), "2 h");
  assert.equal(kestoTeksti(0), "0 min");
});

test("kestojen täydennys ei muuta syötettä (A6)", () => {
  const p = paiva([{ id: "h", tyyppi: "harjoitus", alku: "10.00", kesto: null, nimi: "h" }, peli("p", "10.40")]);
  const kopio = structuredClone(p);
  const [h] = taydennaKestot(p);
  assert.equal(h.kestoMin, 40);
  assert.equal(h.kestoArvioitu, true);
  assert.deepEqual(p, kopio);
});

test("nesteKulauksista", () => {
  assert.deepEqual(nesteKulauksista(45), [3, 5]);
  assert.deepEqual(nesteKulauksista(30), [2, 4]);
  assert.deepEqual(nesteKulauksista(60), [4, 8]);
  assert.deepEqual(nesteKulauksista(90), [5, 8]);
  assert.deepEqual(nesteKulauksista(22), [1, 2]);
});

test("T1 sunnuntai", () => {
  assert.deepEqual(rasitus(su), {
    taso: "kova", pelit: 2, peliminuutit: 90, lyhinVali: 180, muuRasitus: 90, muuRasitusArvioitu: true,
    perustelu: "2 peliä, 90 min, lyhin tauko 3 h, lisäksi harjoitusta 1 h 30 min (arvio)", varoitukset: [],
  });
  const t = aikajana(su, { taso: "kova", edellinenPaivaPeleja: false, seuraavaPaivaPeleja: true });
  assert.deepEqual(rivit(t), [
    ["aamiainen:su-peli1", null, "07.00", "07.45", [50, 100], null, [2, 3], null, "S1", []],
    ["aukko:su-peli1", null, "09.45", "10.45", [25, 50], null, [2, 3], null, "S1", []],
    ["kiintea:su-lounas", "paaateria", "11.30", "12.00", [50, 100], null, [2, 3], NK, "S6", []],
    ["liikunta:su-testit", null, "13.00", "13.30", null, null, [2, 4], null, "S13", []],
    ["liikunta:su-juoksu", null, "13.30", "14.30", null, null, [4, 8], null, "S13", ["Kesto arvioitu (60 min)"]],
    ["kevyt:su-peli1", null, "14.30", "15.00", [15, 30], null, [1, 2], N, "S8", []],
    ["peli:su-peli1", null, "15.30", "16.15", null, null, [3, 5], null, "S13", []],
    ["kiintea:su-paivallinen", "tankkaus", "17.00", "17.30", [40, 70], [10, 20], [3, 5], NK, "S17", [SUOLA]],
    ["kevyt:su-peli2", null, "18.15", "18.45", [15, 30], null, [1, 2], N, "S8", []],
    ["peli:su-peli2", null, "19.15", "20.00", null, null, [3, 5], null, "S13", []],
    ["kiintea:su-iltapala", "palautus", "20.30", "21.00", [40, 70], [10, 20], [3, 5], null, "S20", [MYOH, SUOLA, HUOM]],
  ]);
  assert.deepEqual(t.vinkit, ["eiUusiaRuokia", "vaaleaVirtsa", "uni"]);
});

test("T2 maanantai", () => {
  const r = rasitus(ma);
  assert.equal(r.taso, "turnaus");
  assert.equal(r.lyhinVali, 195);
  assert.equal(r.perustelu, "3 peliä, 135 min, lyhin tauko 3 h 15 min");
  const t = aikajana(ma, { taso: "turnaus", edellinenPaivaPeleja: true, seuraavaPaivaPeleja: true });
  assert.deepEqual(rivit(t), [
    ["kiintea:ma-aamiainen", "kevytAamiainen", "08.15", "08.45", [25, 50], null, [2, 3], NK, "S11", [EILEN]],
    ["kevyt:ma-peli1", null, "09.45", "10.15", [15, 30], null, [1, 2], N, "S8", []],
    ["peli:ma-peli1", null, "10.45", "11.30", null, null, [3, 5], null, "S13", []],
    ["kiintea:ma-lounas", "taydentavaAamiainen", "12.15", "12.45", [50, 100], [10, 20], [3, 5], NK, "S11", []],
    ["kevyt:ma-peli2", null, "13.45", "14.15", [15, 30], null, [1, 2], N, "S8", []],
    ["peli:ma-peli2", null, "14.45", "15.30", null, null, [3, 5], null, "S13", []],
    ["palautus:ma-peli2", null, "15.30", "16.30", [40, 70], [10, 20], [3, 5], null, "S20", [SUOLA]],
    ["kiintea:ma-paivallinen", "normaali", "16.45", "17.15", [50, 100], null, [2, 3], NK, "S1, S19", []],
    ["kevyt:ma-peli3", null, "18.30", "19.00", [15, 30], null, [1, 2], N, "S8", []],
    ["peli:ma-peli3", null, "19.30", "20.15", null, null, [3, 5], null, "S13", []],
    ["kiintea:ma-iltapala", "palautus", "20.45", "21.15", [40, 70], [10, 20], [3, 5], null, "S20", [MYOH, SUOLA, HUOM]],
  ]);
});

test("T3 tiistai", () => {
  const r = rasitus(ti);
  assert.equal(r.taso, "kova");
  assert.equal(r.perustelu, "2 peliä, 90 min, lyhin tauko 2 h 15 min");
  const t = aikajana(ti, { taso: "kova", edellinenPaivaPeleja: true, seuraavaPaivaPeleja: false });
  assert.deepEqual(rivit(t), [
    ["kiintea:ti-aamiainen", "kevytAamiainen", "07.45", "08.15", [25, 50], null, [2, 3], NK, "S11", [EILEN]],
    ["peli:ti-peli1", null, "09.45", "10.30", null, null, [3, 5], null, "S13", []],
    ["kiintea:ti-lounas", "tankkaus", "11.00", "11.30", [30, 50], [10, 20], [3, 5], NK, "S17, S19", ["Kevyt annos: pelin alkuun alle 2 h", SUOLA]],
    ["peli:ti-peli2", null, "12.45", "13.30", null, null, [3, 5], null, "S13", []],
    ["palautus:ti-peli2", null, "13.30", "14.30", [30, 50], [10, 20], [3, 5], null, "S20", [SUOLA]],
    ["lamminAteria:ti-peli2", null, "15.00", "16.00", [50, 100], [10, 20], null, null, "S21", []],
  ]);
  assert.deepEqual(t.vinkit, ["eiUusiaRuokia", "vaaleaVirtsa"]);
});

test("T4 tyhjä päivä", () => {
  const p = paiva([]);
  const r = rasitus(p);
  assert.equal(r.taso, "lepo");
  assert.equal(r.perustelu, "Ei pelejä eikä harjoituksia");
  assert.equal(r.lyhinVali, null);
  assert.deepEqual(aikajana(p, { taso: "lepo" }), { ikkunat: [], varoitukset: [], vinkit: [] });
});

test("T5 vain harjoitus", () => {
  const p = paiva([{ id: "h1", tyyppi: "harjoitus", alku: "18.00", kesto: null, nimi: "h" }]);
  const r = rasitus(p);
  assert.equal(r.taso, "kevyt");
  assert.equal(r.perustelu, "Ei pelejä, harjoitusta 1 h (arvio)");
  let t = aikajana(p, { taso: "kevyt" });
  assert.deepEqual(rivit(t), [
    ["liikunta:h1", null, "18.00", "19.00", null, null, [4, 8], null, "S13", ["Kesto arvioitu (60 min)"]],
    ["palautus:h1", null, "19.00", "20.00", [30, 50], [10, 20], [3, 5], null, "S20", []],
  ]);
  assert.deepEqual(t.vinkit, []);
  t = aikajana(p, { taso: "kevyt", seuraavaPaivaPeleja: true });
  assert.deepEqual(t.ikkunat.map((w) => w.id), ["liikunta:h1", "palautus:h1"]);
  assert.deepEqual(t.ikkunat[1].huomautukset, [HUOM]);
  assert.deepEqual(t.vinkit, ["uni", "valmistaudu"]);
});

test("T6 kolme peliä lyhyin välein", () => {
  const p = paiva([peli("p1", "10.00"), peli("p2", "11.15"), peli("p3", "12.30")]);
  const r = rasitus(p);
  assert.equal(r.taso, "turnaus");
  assert.equal(r.perustelu, "3 peliä, 135 min, lyhin tauko 30 min");
  const t = aikajana(p, { taso: "turnaus" });
  assert.deepEqual(rivit(t).map((x) => x.slice(0, 1).concat(x.slice(2, 8), x[8])), [
    ["aamiainen:p1", "07.00", "07.45", [50, 100], null, [2, 3], null, "S1"],
    ["kevyt:p1", "09.00", "09.30", [15, 30], null, [1, 2], N, "S8"],
    ["peli:p1", "10.00", "10.45", null, null, [3, 5], null, "S13"],
    ["pikatankkaus:p1", "10.45", "11.15", [15, 30], null, [2, 4], N, "S18"],
    ["peli:p2", "11.15", "12.00", null, null, [3, 5], null, "S13"],
    ["pikatankkaus:p2", "12.00", "12.30", [15, 30], null, [2, 4], N, "S18"],
    ["peli:p3", "12.30", "13.15", null, null, [3, 5], null, "S13"],
    ["palautus:p3", "13.15", "14.15", [40, 70], [10, 20], [3, 5], null, "S20"],
    ["lamminAteria:p3", "14.45", "15.45", [50, 100], [10, 20], null, null, "S21"],
  ]);
  assert.deepEqual(t.ikkunat[3].huomautukset, ["Kevyesti, vatsa edellä"]);
});

test("T7 päällekkäiset pelit", () => {
  const p = paiva([peli("p1", "15.30"), peli("p2", "15.30")]);
  const r = rasitus(p);
  assert.equal(r.lyhinVali, 0);
  assert.equal(r.taso, "turnaus");
  assert.deepEqual(r.varoitukset, ["Osiot p1 ja p2 ovat päällekkäin"]);
  const t = aikajana(p, { taso: "turnaus" });
  assert.deepEqual(t.varoitukset, r.varoitukset);
  assert.deepEqual(ajat(t), [
    "aamiainen:p1 07.00-07.45", "aukko:p1 09.45-10.45", "paaateria:p1 11.30-12.30", "valipala:p1 13.30-14.00",
    "kevyt:p1 14.30-15.00", "palautus:p2 16.15-17.15", "lamminAteria:p2 17.45-18.45",
  ]);
  assert.deepEqual(t.ikkunat.find((w) => w.id === "palautus:p2").tavoite.hh, [40, 70]);
});

test("T8 kiinteä ateria liian lähellä peliä", () => {
  const p = paiva([ateria("l", "lounas", "14.00"), peli("p1", "15.00")]);
  assert.equal(rasitus(p).taso, "peli");
  const t = aikajana(p, { taso: "peli" });
  assert.deepEqual(ajat(t), ["aamiainen:p1 07.00-07.45", "aukko:p1 09.45-10.45", "kiintea:l 14.00-14.30", "palautus:p1 15.45-16.45", "lamminAteria:p1 17.15-18.15"]);
  const l = t.ikkunat.find((w) => w.id === "kiintea:l");
  assert.equal(l.rooli, "kevyt");
  assert.deepEqual(l.tavoite.hh, [15, 30]);
  assert.deepEqual(l.sulavuus, N);
  assert.deepEqual(l.huomautukset, ["Kevyt annos: pelin alkuun alle 2 h"]);
});

test("T9 aamupeli ilman aamiaista", () => {
  const t = aikajana(paiva([peli("p1", "09.00")], { herays: "07.00" }), { taso: "peli" });
  assert.deepEqual(ajat(t), ["kevytAamiainen:p1 07.00-08.00", "taydentavaAamiainen:p1 09.45-10.45", "lamminAteria:p1 11.15-12.15"]);
  const k = t.ikkunat[0];
  assert.deepEqual([k.tavoite.hh, k.tavoite.neste, k.sulavuus, k.saanto], [[25, 50], [2, 3], NK, "S11"]);
  const d = t.ikkunat.find((w) => w.tyyppi === "taydentavaAamiainen");
  assert.deepEqual(d.tavoite, { hh: [50, 100], prot: [10, 20], neste: [3, 5] });
});

test("T10 pitkä peli", () => {
  const p = paiva([peli("p1", "14.00", 90)]);
  const r = rasitus(p);
  assert.equal(r.taso, "kova");
  assert.equal(r.perustelu, "1 peli, 90 min");
  const t = aikajana(p, { taso: "kova" });
  const pa = t.ikkunat.find((w) => w.id === "puoliaika:p1");
  assert.deepEqual([kello(pa.alku), kello(pa.loppu), pa.tavoite.hh, pa.sulavuus, pa.saanto], ["14.40", "14.50", [10, 20], N, "S14"]);
  assert.deepEqual(t.ikkunat.find((w) => w.id === "peli:p1").tavoite.neste, [5, 8]);
  const syo = ajat(t);
  for (const a of ["aamiainen:p1 07.00-07.45", "paaateria:p1 10.00-11.00", "valipala:p1 12.00-12.30", "kevyt:p1 13.00-13.30"]) assert.ok(syo.includes(a), a);
  assert.ok(!t.ikkunat.some((w) => w.tyyppi === "aukko"));
});

test("T11 pitkä aukko", () => {
  const t = aikajana(paiva([ateria("aamiainen", "aamiainen", "08.00"), peli("p1", "16.00")]), { taso: "peli" });
  assert.deepEqual(ajat(t), [
    "kiintea:aamiainen 08.00-08.30", "aukko:aamiainen 10.30-11.30", "paaateria:p1 12.00-13.00", "valipala:p1 14.00-14.30",
    "kevyt:p1 15.00-15.30", "palautus:p1 16.45-17.45", "lamminAteria:p1 18.15-19.15",
  ]);
  const a = t.ikkunat[0];
  assert.equal(a.rooli, "normaali");
  assert.equal(a.sulavuus, null);
});

const tuotteet = {
  banaani: { nimi: "Banaani", hiilihydraatti_g: 20, proteiini_g: 1, neste_dl: null, sulavuus: "nopea", tarkistettu: true },
  maito: { nimi: "Maito", hiilihydraatti_g: 10, proteiini_g: 7, neste_dl: 2, sulavuus: "keskitaso", tarkistettu: true },
  patukka: { nimi: "Patukka", hiilihydraatti_g: null, proteiini_g: null, neste_dl: null, tarkistettu: false },
  kofe: { nimi: "Tölkki", hiilihydraatti_g: null, proteiini_g: null, neste_dl: null, tarkistettu: false, kofeiini: true },
};
const palautus = { tyyppi: "palautus", tavoite: { hh: [30, 50], prot: [10, 20], neste: [3, 5] }, sulavuus: null };

test("T12 tavoitteet", () => {
  const tila = (v, w = palautus) => ikkunanTila(w, v, tuotteet);
  const b = (n) => ({ tuoteId: "banaani", annoksia: n });
  const m = (n) => ({ tuoteId: "maito", annoksia: n });
  const lyhyt = (x) => [x.hh.summa, x.hh.tila, x.prot.summa, x.prot.tila, x.neste.summa, x.neste.tila, x.puuttuvat];
  assert.deepEqual(lyhyt(tila([b(1), m(1)])), [30, "tankissa", 8, "lisaa", 2, "lisaa", []]);
  assert.deepEqual(lyhyt(tila([b(1), m(2)])), [40, "tankissa", 15, "tankissa", 4, "tankissa", []]);
  assert.deepEqual(lyhyt(tila([b(3)])), [60, "reilusti", 3, "lisaa", 0, "lisaa", []]);
  assert.deepEqual(lyhyt(tila([b(1), { tuoteId: "patukka", annoksia: 1 }])), [20, "lisaa", 1, "lisaa", 0, "lisaa", ["patukka"]]);
  const kevyt = { tyyppi: "kevyt", tavoite: { hh: [15, 30], prot: null, neste: [1, 2] }, sulavuus: N };
  const k = tila([m(1)], kevyt);
  assert.deepEqual([k.hh.tila, k.prot.tavoite, k.prot.tila, k.neste.tila], ["lisaa", null, null, "tankissa"]);
  assert.deepEqual(k.huomautukset, ["Maito sulaa hitaasti tähän ikkunaan"]);
  assert.deepEqual(tila([{ tuoteId: "kofe", annoksia: 1 }]).huomautukset, ["Tölkki: kofeiini ei kuulu lasten pelipäivään"]);
  assert.deepEqual(tila([{ tuoteId: "tuntematon", annoksia: 1 }]).puuttuvat, ["tuntematon"]);
});

test("T12 päivän yhteenveto: T2:n alarajat 250 g", () => {
  const { ikkunat } = aikajana(ma, { taso: "turnaus", edellinenPaivaPeleja: true, seuraavaPaivaPeleja: true });
  const y = paivanYhteenveto(ikkunat, {}, tuotteet);
  assert.equal(y.hh.vahintaan, 250);
  assert.equal(y.hh.tila, "lisaa");
});

test("ostoslista summaa ikkunat ja jättää poistuneet pois", () => {
  const valinnat = {
    "kevyt:ma-peli1": [{ tuoteId: "banaani", annoksia: 1 }],
    "kevyt:ma-peli2": [{ tuoteId: "banaani", annoksia: 2 }, { tuoteId: "maito", annoksia: 1 }],
    "palautus:ei-enaa": [{ tuoteId: "patukka", annoksia: 5 }],
  };
  const l = ostoslista(ohjelma, valinnat, { banaani: { ...tuotteet.banaani, ryhma: "b" }, maito: { ...tuotteet.maito, ryhma: "a" } });
  assert.deepEqual(l.map((r) => [r.tuoteId, r.annoksia]), [["maito", 1], ["banaani", 3]]);
});

test("ohjelmanPaivat päättelee viereiset pelipäivät", () => {
  const [a, b, c] = ohjelmanPaivat(ohjelma);
  assert.equal(a.rasitus.taso, "kova");
  assert.equal(b.rasitus.taso, "turnaus");
  assert.ok(a.ikkunat.at(-1).huomautukset.includes(HUOM));
  assert.ok(b.ikkunat[0].huomautukset.includes(EILEN));
  assert.ok(!c.ikkunat.at(-1).huomautukset.includes(HUOM));
});

test("T13 tuonti: eerikkila/data.json", () => {
  const { ohjelma: o, varoitukset } = tuoOhjelma(lue("../../eerikkila/data.json"), { eventId: "syksy-2026" });
  assert.equal(o.paivat.length, 3);
  const pelit = o.paivat.flatMap((p) => p.osiot);
  const odotetut = ohjelma.paivat.flatMap((p) => p.osiot).filter((x) => x.tyyppi === "peli");
  assert.deepEqual(pelit.map((x) => [x.alku, x.nimi]), odotetut.map((x) => [x.alku, x.nimi]));
  for (const x of pelit) {
    assert.equal(x.tyyppi, "peli");
    assert.equal(x.kesto, 45);
    assert.equal(x.pelimuoto, "7v7");
    assert.deepEqual(x.jaksot, { maara: 2, pituus: 20 });
  }
  assert.deepEqual(varoitukset, ["Pelin kesto oletettu 45 min"]);
});

test("T13 tuonti: turnaukset/data.json", () => {
  const { ohjelma: o } = tuoOhjelma(lue("../../turnaukset/data.json"), { eventId: "jjk-talviliiga-2026" });
  assert.deepEqual(o.paivat.map((p) => p.pvm), ["2026-11-07"]);
  for (const x of o.paivat[0].osiot) {
    assert.equal(x.kesto, 45);
    assert.equal(x.pelimuoto, undefined);
  }
});

test("T13 tuonti: oma muoto ja virheet", () => {
  const { ohjelma: o } = tuoOhjelma({ versio: 1, id: "x", nimi: "x", paivat: [{ pvm: "2026-11-07", osiot: [
    { tyyppi: "peli", alku: "9:45", kesto: 45, nimi: "p" }, { tyyppi: "ateria", ateria: "lounas", alku: "12.00", nimi: "l" },
  ] }] });
  assert.deepEqual(o.paivat[0].osiot.map((x) => [x.id, x.alku, x.kesto]), [["07-peli1", "09.45", 45], ["07-ateria1", "12.00", null]]);
  assert.throws(() => tuoOhjelma({}));
  const v = (osiot) => validoiOhjelma({ paivat: [{ osiot }] });
  assert.equal(v([{ id: "a", tyyppi: "peli", alku: "10.00", kesto: null }]).length, 1);
  assert.equal(v([{ id: "a", tyyppi: "ateria", alku: "10.00" }]).length, 1);
  assert.equal(v([{ id: "a", tyyppi: "testi", alku: "10.00" }, { id: "a", tyyppi: "testi", alku: "11.00" }]).length, 1);
});

test("ikkunoiden id:t ovat yksilöllisiä ja puhdas tuloste ei vuoda sisäisiä kenttiä", () => {
  for (const { ikkunat } of ohjelmanPaivat(ohjelma)) {
    assert.equal(new Set(ikkunat.map((w) => w.id)).size, ikkunat.length);
    for (const w of ikkunat) assert.ok(!("rajattu" in w));
  }
});

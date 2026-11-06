// Tavoitteiden täyttyminen ja ostoslista (docs/logiikka.md, osa 4). Mikään tila ei ole virhe (S24).
import { ohjelmanPaivat } from "./aikajana.js";

const hae = (tuotteet, id) => (tuotteet instanceof Map ? tuotteet.get(id) : tuotteet[id]);
const pyorista = (x) => Math.round(x * 10) / 10;

function tila(summa, tavoite) {
  if (!tavoite) return null;
  if (summa < tavoite[0]) return "lisaa";
  return summa > tavoite[1] ? "reilusti" : "tankissa";
}

export function ikkunanTila(ikkuna, valinnat, tuotteet) {
  let hh = 0, prot = 0, neste = 0;
  const puuttuvat = new Set();
  const huomautukset = [];

  for (const { tuoteId, annoksia } of valinnat) {
    const t = hae(tuotteet, tuoteId);
    if (!t) { puuttuvat.add(tuoteId); continue; }

    if (ikkuna.sulavuus && t.sulavuus && !ikkuna.sulavuus.includes(t.sulavuus)) huomautukset.push(`${t.nimi} sulaa hitaasti tähän ikkunaan`); // S9
    if (t.kofeiini === true) huomautukset.push(`${t.nimi}: kofeiini ei kuulu lasten pelipäivään`); // S25
    if (t.lisaravinne === true) huomautukset.push(`${t.nimi}: ravinto riittää ilman lisäravinteita`); // S26
    if (ikkuna.tyyppi === "peli" && !(t.sopii ?? []).includes("peli")) huomautukset.push(`${t.nimi}: pelin aikana vain juotavaa`); // S13

    const arvotOk = t.tarkistettu === true && t.hiilihydraatti_g != null && t.proteiini_g != null;
    if (!arvotOk) { puuttuvat.add(tuoteId); continue; }
    hh += t.hiilihydraatti_g * annoksia;
    prot += t.proteiini_g * annoksia;
    if (t.neste_dl != null) neste += t.neste_dl * annoksia;
  }

  const rivi = (summa, tavoite) => ({ summa: pyorista(summa), tavoite: tavoite ?? null, tila: tila(pyorista(summa), tavoite) });
  return {
    hh: rivi(hh, ikkuna.tavoite.hh),
    prot: rivi(prot, ikkuna.tavoite.prot),
    neste: rivi(neste, ikkuna.tavoite.neste),
    puuttuvat: [...puuttuvat],
    huomautukset,
  };
}

// Mihin tuotteen sopii-arvoihin kukin ikkunan tehtävä kuuluu.
const SOPIVUUS = {
  aamiainen: ["ennen"], kevytAamiainen: ["ennen"], paaateria: ["ennen"], valipala: ["ennen"], kevyt: ["ennen"],
  aukko: ["ennen", "valissa"], peli: ["peli"], liikunta: ["peli"], puoliaika: ["valissa"],
  tankkaus: ["valissa", "palautus"], pikatankkaus: ["valissa"],
  palautus: ["palautus"], taydentavaAamiainen: ["palautus", "ennen"], lamminAteria: ["palautus"], iltapala: ["palautus"],
};

// Makeiset, patukat ja keksit ovat välipalaikkunoiden nopeaa energiaa, eivät aterian ehdotuksia (A9).
const ATERIAT = new Set(["aamiainen", "kevytAamiainen", "paaateria", "taydentavaAamiainen", "lamminAteria"]);
const VALIPALARYHMAT = new Set(["patukka", "makeinen", "keksi"]);

// Ikkunaan ehdotettavat tuotteet: sopivuus ja sulavuus täsmäävät, kofeiinia tai lisäravinteita ei ehdoteta (S9, S13, S25, S26).
export function tuotteetIkkunaan(ikkuna, tuotteet) {
  const tehtava = ikkuna.tyyppi === "kiintea" ? ikkuna.rooli : ikkuna.tyyppi;
  const sallitut = SOPIVUUS[tehtava] ?? null; // normaali ateria: kaikki paitsi pelijuomiin rajatut
  return tuotteet.filter((t) => {
    if (t.kofeiini === true || t.lisaravinne === true) return false;
    if (ikkuna.sulavuus && t.sulavuus && !ikkuna.sulavuus.includes(t.sulavuus)) return false;
    if (ATERIAT.has(tehtava) && VALIPALARYHMAT.has(t.ryhma)) return false;
    if (t.lahde?.tyyppi === "oma" && !t.sopii?.length) return true;
    return sallitut ? (t.sopii ?? []).some((s) => sallitut.includes(s)) : true;
  });
}

// Syömiskerran koko värikoodina (A10): pieni, perus tai iso tankkaus hiilihydraattihaarukan alarajasta.
// Juomaikkunat ovat oma luokkansa. Värit kertovat koon, eivät hyvää tai huonoa (S24).
export function tankkausTaso(ikkuna) {
  const hh = ikkuna.tavoite?.hh;
  if (!hh) return ikkuna.tavoite?.neste ? "juoma" : null;
  if (hh[0] < 20) return "pieni";
  return hh[0] < 40 ? "perus" : "iso";
}

// Käynnissä oleva tai seuraava ikkuna kellonajasta (minuutteina). Päivän jälkeen null.
export function seuraavaIkkuna(ikkunat, nyt) {
  const kaynnissa = ikkunat.find((w) => w.alku <= nyt && nyt < w.loppu);
  if (kaynnissa) return { ikkuna: kaynnissa, tila: "nyt", minuutteja: 0 };
  const tuleva = ikkunat.find((w) => w.alku > nyt);
  return tuleva ? { ikkuna: tuleva, tila: "tulossa", minuutteja: tuleva.alku - nyt } : null;
}

// Yhden napautuksen ehdotus (A10): tuote, jonka hiilihydraatti on lähimpänä haarukan keskikohtaa,
// ja tarvittaessa toinen, joka nostaa summan haarukkaan tai tuo proteiinin palautukseen. Kierros vaihtaa päätuotetta.
// Ryhmät mieluisuusjärjestyksessä: aiempi ryhmä voittaa, kun hiilihydraatit ovat lähellä toisiaan.
const AAMU = ["vilja", "maito", "leipa", "hedelma", "juoma"];
const RUOKA = ["ateria", "valmisruoka", "leipa"];
const VALIPALA = ["hedelma", "maito", "leipa", "vilja", "juoma", "patukka", "keksi", "pahkina", "makeinen", "oma"];
const EHDOTUSRYHMAT = { aamiainen: AAMU, kevytAamiainen: AAMU, taydentavaAamiainen: AAMU, iltapala: AAMU, paaateria: RUOKA, lamminAteria: RUOKA };

function ehdotusRyhmat(ikkuna) {
  const tehtava = ikkuna.tyyppi === "kiintea" ? ikkuna.rooli : ikkuna.tyyppi;
  if (tehtava === "normaali" || !tehtava) return ikkuna.alku < 630 || ikkuna.alku >= 1200 ? AAMU : RUOKA; // klo 10.30 ja 20.00
  return EHDOTUSRYHMAT[tehtava] ?? VALIPALA;
}

export function ehdotus(ikkuna, tuotteet, kierros = 0) {
  const kaikki = tuotteetIkkunaan(ikkuna, tuotteet).filter((t) => t.tarkistettu === true && t.hiilihydraatti_g != null && t.proteiini_g != null);
  const ryhmat = ehdotusRyhmat(ikkuna);
  const rajatut = kaikki.filter((t) => ryhmat.includes(t.ryhma));
  const sopivat = rajatut.length ? rajatut : kaikki;
  const sakko = (t) => Math.max(0, ryhmat.indexOf(t.ryhma)) * 4;
  const { hh, prot, neste } = ikkuna.tavoite;
  if (!hh) {
    const juomat = sopivat.filter((t) => t.neste_dl).sort((a, b) => a.hiilihydraatti_g - b.hiilihydraatti_g);
    if (!neste || !juomat.length) return [];
    const j = juomat[kierros % juomat.length];
    return [{ tuoteId: j.id, annoksia: Math.max(1, Math.ceil(neste[0] / j.neste_dl)) }];
  }
  const keski = (hh[0] + hh[1]) / 2;
  const ero = (t, pohja = 0) => Math.abs(pohja + t.hiilihydraatti_g - keski) + sakko(t);
  const jarjestys = [...sopivat].sort((a, b) => ero(a) - ero(b) || a.nimi.localeCompare(b.nimi, "fi"));
  if (!jarjestys.length) return [];
  const paa = jarjestys[kierros % jarjestys.length];
  const tulos = [{ tuoteId: paa.id, annoksia: 1 }];
  const protPuuttuu = prot && paa.proteiini_g < prot[0];
  if (paa.hiilihydraatti_g >= hh[0] && !protPuuttuu) return tulos;
  // Toinen tuote on lisuke tai juoma, ei toinen ateria eikä pelijuoma.
  const ehdokkaat = kaikki
    .filter((t) => t !== paa && !["ateria", "valmisruoka"].includes(t.ryhma) && !(t.sopii ?? []).includes("peli") && paa.hiilihydraatti_g + t.hiilihydraatti_g <= hh[1])
    .filter((t) => !protPuuttuu || paa.proteiini_g + t.proteiini_g >= prot[0]);
  const juomaEnsin = neste && !paa.neste_dl;
  const vajaa = (t) => Number(paa.hiilihydraatti_g + t.hiilihydraatti_g < hh[0]);
  const toinen = [...ehdokkaat].sort((a, b) => vajaa(a) - vajaa(b)
    || (juomaEnsin ? Number(!a.neste_dl) - Number(!b.neste_dl) : 0) || ero(a, paa.hiilihydraatti_g) - ero(b, paa.hiilihydraatti_g))[0];
  if (toinen) tulos.push({ tuoteId: toinen.id, annoksia: 1 });
  return tulos;
}

// S2, S24: vain alaraja, ei ylärajaa.
export function paivanYhteenveto(ikkunat, valinnatIkkunoittain, tuotteet) {
  let summa = 0, vahintaan = 0;
  const puuttuvat = new Set();
  for (const w of ikkunat) {
    if (w.syominen && w.tavoite.hh) vahintaan += w.tavoite.hh[0];
    const t = ikkunanTila(w, valinnatIkkunoittain[w.id] ?? [], tuotteet);
    summa += t.hh.summa;
    t.puuttuvat.forEach((p) => puuttuvat.add(p));
  }
  return { hh: { summa: pyorista(summa), vahintaan, tila: summa >= vahintaan ? "tankissa" : "lisaa" }, puuttuvat: [...puuttuvat] };
}

// Vain nykyiseen ohjelmaan kuuluvien ikkunoiden valinnat lasketaan mukaan.
export function ostoslista(ohjelma, valinnat, tuotteet) {
  const summat = new Map();
  for (const { ikkunat } of ohjelmanPaivat(ohjelma)) {
    for (const w of ikkunat) {
      for (const { tuoteId, annoksia } of valinnat[w.id] ?? []) {
        summat.set(tuoteId, (summat.get(tuoteId) ?? 0) + annoksia);
      }
    }
  }
  return [...summat].map(([tuoteId, annoksia]) => {
    const t = hae(tuotteet, tuoteId);
    return { tuoteId, nimi: t?.nimi ?? tuoteId, ryhma: t?.ryhma ?? "oma", annoksia, kuvaus: t?.annos?.kuvaus ?? null };
  }).sort((a, b) => a.ryhma.localeCompare(b.ryhma, "fi") || a.nimi.localeCompare(b.nimi, "fi"));
}

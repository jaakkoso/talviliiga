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

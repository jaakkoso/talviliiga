// Rasitustaso ja sen perustelu (docs/logiikka.md, osa 2; oletus A3).
import { SAANNOT } from "./saannot.js";
import { kestoTeksti, paallekkaisyysVaroitukset, taydennaKestot } from "./aika.js";

export function rasitus(paiva) {
  const osiot = taydennaKestot(paiva);
  const pelit = osiot.filter((o) => o.tyyppi === "peli");
  const muut = osiot.filter((o) => o.tyyppi === "harjoitus" || o.tyyppi === "testi");

  const peliminuutit = pelit.reduce((s, p) => s + p.kestoMin, 0);
  const muuRasitus = muut.reduce((s, o) => s + o.kestoMin, 0);
  const muuRasitusArvioitu = muut.some((o) => o.kestoArvioitu);

  let lyhinVali = null;
  for (let i = 1; i < pelit.length; i++) {
    const vali = Math.max(0, pelit[i].alkuMin - pelit[i - 1].loppuMin);
    lyhinVali = lyhinVali === null ? vali : Math.min(lyhinVali, vali);
  }

  return {
    taso: paataTaso(pelit.length, peliminuutit, lyhinVali, muuRasitus),
    pelit: pelit.length,
    peliminuutit,
    lyhinVali,
    muuRasitus,
    muuRasitusArvioitu,
    perustelu: perustelu(pelit.length, peliminuutit, lyhinVali, muuRasitus, muuRasitusArvioitu),
    varoitukset: paallekkaisyysVaroitukset(osiot),
  };
}

function paataTaso(pelit, peliminuutit, lyhinVali, muuRasitus) {
  const r = SAANNOT.rasitus; // A3
  if (pelit >= r.turnausPelit) return "turnaus";
  if (pelit === 2 && lyhinVali < r.turnausLyhytVali) return "turnaus";
  if (pelit === 2 || peliminuutit > r.kovaPeliminuutit) return "kova";
  if (pelit === 1) return "peli";
  return muuRasitus > 0 ? "kevyt" : "lepo";
}

function perustelu(pelit, peliminuutit, lyhinVali, muuRasitus, arvioitu) {
  const arvio = arvioitu ? " (arvio)" : "";
  if (pelit === 0) {
    return muuRasitus > 0 ? `Ei pelejä, harjoitusta ${kestoTeksti(muuRasitus)}${arvio}` : "Ei pelejä eikä harjoituksia";
  }
  let teksti = pelit === 1 ? `1 peli, ${peliminuutit} min` : `${pelit} peliä, ${peliminuutit} min`;
  if (pelit >= 2) teksti += `, lyhin tauko ${kestoTeksti(lyhinVali)}`;
  if (muuRasitus > 0) teksti += `, lisäksi harjoitusta ${kestoTeksti(muuRasitus)}${arvio}`;
  return teksti;
}

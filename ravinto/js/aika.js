// Ajan apufunktiot ja kestojen täydennys (docs/logiikka.md, osa 1). Ei Date-olioita.
import { SAANNOT } from "./saannot.js";

export function minuutit(teksti) {
  const m = /^(\d{1,2})[.:](\d{2})$/.exec(String(teksti).trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new RangeError(`Virheellinen kellonaika: ${teksti}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function kello(min) {
  if (!Number.isInteger(min) || min < 0 || min >= 1440) throw new RangeError(`Virheellinen minuuttimäärä: ${min}`);
  return `${String(Math.floor(min / 60)).padStart(2, "0")}.${String(min % 60).padStart(2, "0")}`;
}

export function kestoTeksti(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// A6: tuntematon kesto täydennetään. Palauttaa uuden, alkuajan mukaan järjestetyn listan.
export function taydennaKestot(paiva) {
  const jarjestetty = paiva.osiot
    .map((o, i) => ({ ...o, alkuMin: minuutit(o.alku), jarjestys: i }))
    .sort((a, b) => a.alkuMin - b.alkuMin || a.jarjestys - b.jarjestys);

  return jarjestetty.map(({ jarjestys, ...o }, i) => {
    let kestoMin = o.kesto;
    const kestoArvioitu = kestoMin === null || kestoMin === undefined;
    if (kestoArvioitu) {
      const oletus = SAANNOT.kestoOletus[o.tyyppi] ?? 60;
      const seuraava = jarjestetty[i + 1];
      const tila = seuraava ? seuraava.alkuMin - o.alkuMin : Infinity;
      kestoMin = o.tyyppi === "ateria" || tila <= 0 ? oletus : Math.min(oletus, tila);
    }
    return { ...o, kestoMin, loppuMin: o.alkuMin + kestoMin, kestoArvioitu };
  });
}

// A5: päivän alku.
export function paivanAlku(paiva) {
  if (paiva.herays) return minuutit(paiva.herays);
  const aamiainen = paiva.osiot.find((o) => o.tyyppi === "ateria" && o.ateria === "aamiainen");
  return aamiainen ? minuutit(aamiainen.alku) : SAANNOT.paivanAlkuOletus;
}

export function paallekkaisyysVaroitukset(osiot) {
  const varoitukset = [];
  for (let i = 0; i < osiot.length; i++) {
    for (let j = i + 1; j < osiot.length && osiot[j].alkuMin < osiot[i].loppuMin; j++) {
      varoitukset.push(`Osiot ${osiot[i].id} ja ${osiot[j].id} ovat päällekkäin`);
    }
  }
  return varoitukset;
}

// Seuraava kalenteripäivä ISO-muodossa ilman Date-oliota.
export function seuraavaPvm(pvm) {
  const [v, k, p] = pvm.split("-").map(Number);
  const karkaus = (v % 4 === 0 && v % 100 !== 0) || v % 400 === 0;
  const pituudet = [31, karkaus ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let [uv, uk, up] = [v, k, p + 1];
  if (up > pituudet[k - 1]) { up = 1; uk += 1; }
  if (uk > 12) { uk = 1; uv += 1; }
  return `${uv}-${String(uk).padStart(2, "0")}-${String(up).padStart(2, "0")}`;
}

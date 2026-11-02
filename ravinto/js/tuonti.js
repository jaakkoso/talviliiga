// Ohjelman tuonti: oma muoto ja repon data.json-muodot (docs/logiikka.md, osa 5).
import { kello, minuutit } from "./aika.js";

const OLETUSKESTO = 45; // A7
const KESTOVAROITUS = "Pelin kesto oletettu 45 min";
const normaaliAika = (t) => kello(minuutit(t));

export function validoiOhjelma(ohjelma) {
  const virheet = [];
  const idt = new Set();
  for (const paiva of ohjelma.paivat ?? []) {
    for (const o of paiva.osiot ?? []) {
      if (idt.has(o.id)) virheet.push(`Sama id kahdesti: ${o.id}`);
      idt.add(o.id);
      try { minuutit(o.alku); } catch { virheet.push(`Virheellinen kellonaika: ${o.id}`); }
      if (o.tyyppi === "peli" && typeof o.kesto !== "number") virheet.push(`Pelin kesto puuttuu: ${o.id}`);
      if (o.tyyppi === "ateria" && !o.ateria) virheet.push(`Aterian laji puuttuu: ${o.id}`);
    }
  }
  return virheet;
}

function jarjesta(paivat) {
  return paivat
    .map((p) => ({ ...p, osiot: [...p.osiot].sort((a, b) => minuutit(a.alku) - minuutit(b.alku)) }))
    .sort((a, b) => a.pvm.localeCompare(b.pvm));
}

function omaMuoto(json) {
  const paivat = json.paivat.map((p) => {
    const laskurit = {};
    const paivanNro = p.pvm.slice(8, 10);
    const osiot = p.osiot.map((o) => {
      laskurit[o.tyyppi] = (laskurit[o.tyyppi] ?? 0) + 1;
      return { ...o, id: o.id ?? `${paivanNro}-${o.tyyppi}${laskurit[o.tyyppi]}`, alku: normaaliAika(o.alku), kesto: o.kesto ?? null };
    });
    return { ...p, ...(p.herays ? { herays: normaaliAika(p.herays) } : {}), osiot };
  });
  return { ohjelma: { ...json, paivat: jarjesta(paivat) }, varoitukset: [] };
}

function otteluista(matches, event, lisat) {
  const paivittain = new Map();
  for (const m of matches) {
    if (!paivittain.has(m.date)) paivittain.set(m.date, []);
    const osiot = paivittain.get(m.date);
    osiot.push({
      id: `${m.date.slice(8, 10)}-peli${osiot.length + 1}`,
      tyyppi: "peli",
      alku: normaaliAika(m.time),
      kesto: OLETUSKESTO,
      nimi: `${m.home} - ${m.away}`,
      ...lisat,
    });
  }
  const paivat = [...paivittain].map(([pvm, osiot]) => ({ pvm, osiot }));
  return {
    ohjelma: { versio: 1, id: event.id, nimi: event.name ?? event.title, lahde: { tyyppi: "json" }, paivat: jarjesta(paivat) },
    varoitukset: [KESTOVAROITUS],
  };
}

function formaatista(format) {
  const lisat = {};
  const muoto = /\d+v\d+/.exec(format ?? "");
  if (muoto) lisat.pelimuoto = muoto[0];
  const jaksot = /(\d+)\s*[×x]\s*(\d+)\s*min/.exec(format ?? "");
  if (jaksot) lisat.jaksot = { maara: Number(jaksot[1]), pituus: Number(jaksot[2]) };
  return lisat;
}

export function tuoOhjelma(json, valinnat = {}) {
  let tulos;
  if (json?.versio === 1 && Array.isArray(json.paivat)) {
    tulos = omaMuoto(json);
  } else if (Array.isArray(json?.events)) {
    const event = valinnat.eventId ? json.events.find((e) => e.id === valinnat.eventId) : json.events[0];
    if (event && Array.isArray(event.matches)) {
      tulos = otteluista(event.matches, event, formaatista(event.format));
    } else if (event && Array.isArray(event.teams)) {
      const joukkue = valinnat.teamName ? event.teams.find((t) => t.name === valinnat.teamName) : event.teams[0];
      if (joukkue) tulos = otteluista(joukkue.matches, event, {});
    }
  }
  if (!tulos) throw new Error("Ohjelman muotoa ei tunnistettu");
  return { ohjelma: tulos.ohjelma, varoitukset: [...tulos.varoitukset, ...validoiOhjelma(tulos.ohjelma)] };
}

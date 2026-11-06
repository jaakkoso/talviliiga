// Tavallisen turnauspäivän ohjelma muutamasta tiedosta: pelien alkuajat (tai tasaiset välit) ja yksi yhteinen ruokailu.
import { kello, minuutit } from "./aika.js";

function aterianLaji(alku) {
  if (alku < minuutit("10.30")) return "aamiainen";
  if (alku < minuutit("15.00")) return "lounas";
  return alku < minuutit("20.00") ? "paivallinen" : "iltapala";
}

export function luoTurnaus({ id, pvm, ajat, alku, peleja, kesto, tauko, ruokailu }) {
  const alut = ajat
    ? [...new Set(ajat.map(minuutit))].sort((x, y) => x - y)
    : Array.from({ length: peleja }, (_, i) => minuutit(alku) + i * (kesto + tauko));
  if (!alut.length) throw new Error("Pelejä ei ole");
  if (alut.at(-1) + kesto > 1440) throw new Error("Pelit eivät mahdu päivään");
  if (alut.some((a, i) => i && a < alut[i - 1] + kesto)) throw new Error("Pelit ovat päällekkäin");
  const osiot = alut.map((a, i) => ({ id: `peli${i + 1}`, tyyppi: "peli", alku: kello(a), kesto, nimi: `Peli ${i + 1}` }));
  if (ruokailu) {
    const r = minuutit(ruokailu);
    const ateria = aterianLaji(r);
    osiot.push({ id: "ruokailu", tyyppi: "ateria", ateria, alku: kello(r), kesto: null, nimi: "Yhteinen ruokailu" });
    osiot.sort((x, y) => minuutit(x.alku) - minuutit(y.alku));
  }
  const [, kk, pv] = pvm.split("-").map(Number);
  return { versio: 1, id, nimi: `Turnaus ${pv}.${kk}.`, lahde: { tyyppi: "kasin" }, paivat: [{ pvm, osiot }] };
}

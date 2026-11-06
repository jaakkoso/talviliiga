// Tavallisen turnauspäivän ohjelma muutamasta tiedosta: pelit tasaisin välein ja yksi yhteinen ruokailu.
import { kello, minuutit } from "./aika.js";

function aterianLaji(alku) {
  if (alku < minuutit("10.30")) return "aamiainen";
  if (alku < minuutit("15.00")) return "lounas";
  return alku < minuutit("20.00") ? "paivallinen" : "iltapala";
}

export function luoTurnaus({ id, pvm, alku, peleja, kesto, tauko, ruokailu }) {
  const a = minuutit(alku);
  const osiot = Array.from({ length: peleja }, (_, i) => ({
    id: `peli${i + 1}`, tyyppi: "peli", alku: kello(a + i * (kesto + tauko)), kesto, nimi: `Peli ${i + 1}`,
  }));
  if (a + peleja * kesto + (peleja - 1) * tauko > 1440) throw new Error("Pelit eivät mahdu päivään");
  if (ruokailu) {
    const r = minuutit(ruokailu);
    const ateria = aterianLaji(r);
    osiot.push({ id: "ruokailu", tyyppi: "ateria", ateria, alku: kello(r), kesto: null, nimi: "Yhteinen ruokailu" });
    osiot.sort((x, y) => minuutit(x.alku) - minuutit(y.alku));
  }
  const [, kk, pv] = pvm.split("-").map(Number);
  return { versio: 1, id, nimi: `Turnaus ${pv}.${kk}.`, lahde: { tyyppi: "kasin" }, paivat: [{ pvm, osiot }] };
}

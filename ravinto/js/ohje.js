// Selkokielinen pelipäivän ohje aikajanasta (A13): milloin syödään, mitä esimerkiksi ja paljonko juodaan. Ei grammoja.
import { OHJE } from "./saannot.js";

const dl = (n) => (n ? `Juo ${n[0]}–${n[1]} dl.` : "");
const LIIKE = new Set(["peli", "liikunta"]);

// Vaihtopenkin pieni energia (A12): kun päivässä on enemmän kuin tunti peliä (A3: kova pelipäivä tai turnaus).
export const vaihdossaSyodaan = (rasitus) => ["kova", "turnaus"].includes(rasitus?.taso);

export function pelipaivanOhje({ paiva, rasitus, ikkunat }) {
  const vaihdossa = vaihdossaSyodaan(rasitus);
  const nimet = new Map(paiva.osiot.map((o) => [o.id, o.nimi]));
  const pelit = paiva.osiot.filter((o) => o.tyyppi === "peli");
  const rivit = ikkunat.map((w) => {
    if (LIIKE.has(w.tyyppi)) {
      return {
        id: w.id, alku: w.alku, loppu: w.loppu, laji: w.tyyppi, otsikko: nimet.get(w.osioId) ?? "Peli",
        teksti: w.tyyppi === "peli" ? OHJE.peli : OHJE.liikunta, esimerkit: [],
        vaihdossa: w.tyyppi === "peli" && vaihdossa ? OHJE.vaihdossa : null, juo: "",
      };
    }
    const o = OHJE[w.tyyppi] ?? OHJE.aukko;
    const kevyt = w.tyyppi === "kiintea" && w.huomautukset.some((h) => h.startsWith("Kevyt annos"));
    return {
      id: w.id, alku: w.alku, loppu: w.loppu, laji: "syo",
      otsikko: w.tyyppi === "kiintea" ? (nimet.get(w.osioId) ?? w.otsikko) : o.otsikko,
      teksti: kevyt ? OHJE.kiinteaKevyt : o.teksti,
      esimerkit: o.esimerkit, pakkaa: o.pakkaa ?? [], vaihdossa: null, juo: dl(w.tavoite?.neste),
      suolaista: w.huomautukset.some((h) => h.includes("suolaista")), // S22
    };
  });

  // Mukaan pakataan eväät, jotka syödään ensimmäisen pelin alusta viimeisen jälkeiseen palautukseen asti.
  const eka = pelit.length ? Math.min(...rivit.filter((r) => r.laji === "peli").map((r) => r.alku)) : null;
  const mukaan = new Set(["vesipullo"]);
  if (eka !== null) {
    const viimeinen = Math.max(...rivit.filter((r) => r.laji === "peli").map((r) => r.loppu));
    for (const r of rivit) {
      if (r.laji !== "syo" || r.alku < eka - 60 || r.alku > viimeinen + 30 || r.id.startsWith("kiintea:")) continue;
      r.pakkaa.forEach((e) => mukaan.add(e));
      if (r.suolaista) mukaan.add("jotain suolaista");
    }
    if (vaihdossa) ["banaani", "rusinat", "laimea mehu"].forEach((e) => mukaan.add(e)); // A12
    mukaan.add("eväsrasia ja pieni kylmälaukku");
  }
  return { pelit, vaihdossa, edellinenPaiva: OHJE.edellinenPaiva, rivit, mukaan: [...mukaan] };
}

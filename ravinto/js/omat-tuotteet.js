// Käyttäjän omat tuotteet: lomake ja tiedostotuonti (docs/tietomalli.md). Arvoja ei arvata: tyhjä on null.
const SOPII = ["ennen", "peli", "valissa", "palautus"];
const SULAVUUS = ["nopea", "keskitaso", "hidas"];
const KOFEIINI = /kofeiin|energiajuoma|energy drink|red bull|battery|monster|\bcult\b|kahvi|guarana/i; // S25
const LISARAVINNE = /lisäravin|kreatiini|proteiinijauhe|heraproteiini|pre-?workout|\bbcaa\b|nuoruusjuoma/i; // S26

function arvo(x) {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(String(x).replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function uusiId(nimi, varatut) {
  const pohja = `oma-${nimi.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/å/g, "a").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tuote"}`;
  let id = pohja;
  for (let n = 2; varatut.has(id); n++) id = `${pohja}-${n}`;
  return id;
}

// Tuote on tarkistettu vasta, kun hiilihydraatti ja proteiini on annettu. Muuten "arvot puuttuvat".
export function luoOmaTuote(s, varatut = new Set()) {
  const nimi = String(s.nimi ?? "").trim().slice(0, 80);
  if (!nimi) throw new Error("Nimi puuttuu");
  const hh = arvo(s.hiilihydraatti_g);
  const prot = arvo(s.proteiini_g);
  const neste = arvo(s.neste_dl);
  const t = {
    id: s.id && /^oma-[a-z0-9-]+$/.test(s.id) ? s.id : uusiId(nimi, varatut),
    nimi,
    ryhma: "oma",
    annos: { kuvaus: String(s.kuvaus ?? s.annos?.kuvaus ?? "").trim().slice(0, 60) || "1 annos", maara: arvo(s.annos?.maara), yksikko: s.annos?.yksikko === "dl" ? "dl" : "g" },
    energia_kcal: arvo(s.energia_kcal),
    hiilihydraatti_g: hh,
    proteiini_g: prot,
    rasva_g: arvo(s.rasva_g),
    kuitu_g: arvo(s.kuitu_g),
    sulavuus: SULAVUUS.includes(s.sulavuus) ? s.sulavuus : "keskitaso",
    sopii: (Array.isArray(s.sopii) ? s.sopii : []).filter((x) => SOPII.includes(x)),
    lahde: { tyyppi: "oma" },
    tarkistettu: hh !== null && prot !== null,
  };
  if (neste > 0) t.neste_dl = neste;
  if (s.kofeiini === true || KOFEIINI.test(nimi)) t.kofeiini = true;
  if (s.lisaravinne === true || LISARAVINNE.test(nimi)) t.lisaravinne = true;
  if (typeof s.huomautus === "string" && s.huomautus.trim()) t.huomautus = s.huomautus.trim().slice(0, 200);
  return t;
}

// Hyväksyy muodot { tuotteet: [...] } ja [...]. Virheelliset rivit ohitetaan ja lasketaan.
export function tuoOmatTuotteet(json, varatut = new Set()) {
  const rivit = Array.isArray(json) ? json : json?.tuotteet;
  if (!Array.isArray(rivit)) throw new Error("Tiedostossa ei ole tuotelistaa");
  const idt = new Set(varatut);
  const tuotteet = [];
  let ohitetut = 0;
  for (const r of rivit) {
    try {
      const t = luoOmaTuote(r, idt);
      idt.add(t.id);
      tuotteet.push(t);
    } catch {
      ohitetut++;
    }
  }
  return { tuotteet, ohitetut };
}

// S25, S26: lyhyt huomautus, joka näytetään omien tuotteiden listalla.
export function omaHuomio(t) {
  if (t.kofeiini) return "Kofeiini ei kuulu lasten pelipäivään, joten tuotetta ei ehdoteta.";
  if (t.lisaravinne) return "Ravinto riittää ilman lisäravinteita, joten tuotetta ei ehdoteta.";
  return null;
}

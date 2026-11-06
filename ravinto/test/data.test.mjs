// Vaiheen 1 datan eheys: ohjelma vastaa repon otteluohjelmaa, ja tuotteissa ei ole keksittyjä arvoja väärin merkittynä.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lue = (polku) => JSON.parse(readFileSync(new URL(polku, import.meta.url), "utf8"));
const ohjelma = lue("../data/ohjelma-eerikkila-2026-11.json");
const { tuotteet } = lue("../data/tuotteet.json");
const osiot = ohjelma.paivat.flatMap((p) => p.osiot.map((o) => ({ ...o, pvm: p.pvm })));

test("pelit vastaavat tiedostoa eerikkila/data.json", () => {
  const data = lue("../../eerikkila/data.json").events.find((e) => e.id === "syksy-2026");
  const odotettu = data.matches.map((m) => `${m.date} ${m.time} ${m.home} - ${m.away}`);
  const pelit = osiot.filter((o) => o.tyyppi === "peli").map((o) => `${o.pvm} ${o.alku} ${o.nimi}`);
  assert.deepEqual(pelit, odotettu);
});

test("osiot ovat aikajärjestyksessä ja id:t yksilöllisiä", () => {
  for (const p of ohjelma.paivat) {
    const ajat = p.osiot.map((o) => o.alku);
    assert.deepEqual(ajat, [...ajat].sort());
  }
  assert.equal(new Set(osiot.map((o) => o.id)).size, osiot.length);
});

test("tuotteita on 40–80 ja id:t ovat yksilöllisiä", () => {
  assert.ok(tuotteet.length >= 40 && tuotteet.length <= 80, `${tuotteet.length} tuotetta`);
  assert.equal(new Set(tuotteet.map((t) => t.id)).size, tuotteet.length);
});

// Kuitu on pakkausmerkinnässä vapaaehtoinen, joten sen puuttuminen ei estä tarkistusta. Sitä ei arvata.
test("tuote, jolta puuttuu arvoja, ei ole tarkistettu", () => {
  const kentat = ["energia_kcal", "hiilihydraatti_g", "proteiini_g", "rasva_g"];
  for (const t of tuotteet) {
    if (kentat.some((k) => t[k] === null)) assert.equal(t.tarkistettu, false, t.id);
  }
});

test("hitaasti sulava tuote ei sovi ennen peliä tai pelien väliin (S9)", () => {
  for (const t of tuotteet.filter((t) => t.sulavuus === "hidas")) {
    assert.ok(!t.sopii.includes("ennen") && !t.sopii.includes("valissa"), t.id);
  }
});

test("pelin aikana vain juomia (S13, S14)", () => {
  for (const t of tuotteet.filter((t) => t.sopii.includes("peli"))) assert.equal(t.ryhma, "juoma", t.id);
});

test("listalla ei ole kofeiinia eikä lisäravinteita (S25, S26)", () => {
  for (const t of tuotteet) assert.ok(!t.kofeiini && !t.lisaravinne, t.id);
});

// Käyttöliittymän tukemat puhtaat osat: tallennus ja ikkunaan ehdotettavat tuotteet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AVAIN, lataa, oletusTila, tallenna, tyhjenna } from "../js/tallennus.js";
import { tuotteetIkkunaan } from "../js/tavoitteet.js";

const varasto = (alku = {}) => {
  const d = { ...alku };
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; }, removeItem: (k) => { delete d[k]; } };
};
const { tuotteet } = JSON.parse(readFileSync(new URL("../data/tuotteet.json", import.meta.url), "utf8"));

test("tallennus säilyttää tilan ja kestää rikkinäisen datan", () => {
  const v = varasto();
  const tila = { ...oletusTila(), aktiivinenOhjelma: "x" };
  assert.equal(tallenna(v, tila), true);
  assert.deepEqual(lataa(v), tila);
  tyhjenna(v);
  assert.deepEqual(lataa(v), oletusTila());
  assert.deepEqual(lataa(varasto({ [AVAIN]: "{rikki" })), oletusTila());
  assert.deepEqual(lataa(varasto({ [AVAIN]: '{"versio":99}' })), oletusTila());
  assert.equal(tallenna({ setItem() { throw new Error("täynnä"); } }, tila), false);
  assert.deepEqual(lataa({ getItem() { throw new Error("estetty"); } }), oletusTila());
});

test("peli-ikkunaan ehdotetaan vain juomia (S13)", () => {
  const l = tuotteetIkkunaan({ tyyppi: "peli", sulavuus: null }, tuotteet);
  assert.ok(l.length > 0);
  for (const t of l) assert.equal(t.ryhma, "juoma", t.id);
});

test("kevyeen ikkunaan ehdotetaan vain nopeita tuotteita (S8, S9)", () => {
  const l = tuotteetIkkunaan({ tyyppi: "kevyt", sulavuus: ["nopea"] }, tuotteet);
  assert.ok(l.length > 0);
  for (const t of l) assert.equal(t.sulavuus, "nopea", t.id);
});

test("kiinteä ateria käyttää roolinsa sopivuutta", () => {
  const rooli = tuotteetIkkunaan({ tyyppi: "kiintea", rooli: "palautus", sulavuus: null }, tuotteet);
  for (const t of rooli) assert.ok(t.sopii.includes("palautus"), t.id);
  assert.equal(tuotteetIkkunaan({ tyyppi: "kiintea", rooli: "normaali", sulavuus: null }, tuotteet).length, tuotteet.length);
});

test("kofeiinia ja lisäravinnetta ei ehdoteta (S25, S26)", () => {
  const oma = { id: "x", sopii: ["ennen", "peli", "valissa", "palautus"], lahde: { tyyppi: "oma" } };
  const ikkunat = [{ tyyppi: "palautus", sulavuus: null }, { tyyppi: "kiintea", rooli: "normaali", sulavuus: null }];
  for (const w of ikkunat) {
    assert.equal(tuotteetIkkunaan(w, [{ ...oma, kofeiini: true }]).length, 0);
    assert.equal(tuotteetIkkunaan(w, [{ ...oma, lisaravinne: true }]).length, 0);
    assert.equal(tuotteetIkkunaan(w, [oma]).length, 1);
  }
});

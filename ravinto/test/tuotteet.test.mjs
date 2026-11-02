// Vaiheen 4 tuotekanta ja omat tuotteet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { luoOmaTuote, omaHuomio, tuoOmatTuotteet } from "../js/omat-tuotteet.js";
import { tuotteetIkkunaan } from "../js/tavoitteet.js";

const lue = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const { tuotteet } = lue("../data/tuotteet.json");
const raaka = new Map(lue("../tyokalut/fineli-raaka.json").elintarvikkeet.map((e) => [e.id, e]));

test("Fineli-rivit ovat täynnä ja pakkausrivit tyhjiä", () => {
  for (const t of tuotteet) {
    const kentat = [t.energia_kcal, t.hiilihydraatti_g, t.proteiini_g, t.rasva_g, t.kuitu_g];
    if (t.lahde.tyyppi === "fineli") {
      assert.equal(t.tarkistettu, true, t.id);
      assert.ok(kentat.every((x) => typeof x === "number"), t.id);
      assert.ok(t.lahde.haettu, t.id);
    } else {
      assert.equal(t.tarkistettu, false, t.id);
      assert.ok(kentat.every((x) => x === null), t.id);
    }
  }
});

test("Finelistä puuttuvat tuotteet odottavat pakkauksen arvoja", () => {
  const odottavat = tuotteet.filter((t) => t.lahde.tyyppi === "pakkaus").map((t) => t.id).sort();
  assert.deepEqual(odottavat, ["hedelmapatukka", "kaurapatukka", "maitopatukka", "salaatti-pasta"]);
});

test("annosarvo vastaa Finelin arvoa 100 g kohti", () => {
  for (const t of tuotteet.filter((x) => x.lahde.tyyppi === "fineli")) {
    const osat = t.lahde.osat ?? [{ id: t.lahde.id, g: t.annos.yksikko === "dl" ? t.annos.maara * 100 : t.annos.maara }];
    const hh = osat.reduce((s, o) => s + (raaka.get(o.id).hh * o.g) / 100, 0);
    assert.ok(Math.abs(hh - t.hiilihydraatti_g) < 0.06, `${t.id}: ${hh} / ${t.hiilihydraatti_g}`);
  }
});

test("käsin laskettu tarkistus: banaani 125 g", () => {
  const b = tuotteet.find((t) => t.id === "banaani");
  assert.equal(b.hiilihydraatti_g, 22.9);
  assert.equal(b.proteiini_g, 1.5);
  assert.equal(b.annos.maara, 125);
});

test("makeiset näkyvät välipaloilla mutta eivät aterioilla (A9)", () => {
  const nimet = (i) => tuotteetIkkunaan(i, tuotteet).map((t) => t.id);
  assert.ok(nimet({ tyyppi: "kevyt", sulavuus: ["nopea"] }).includes("marmeladikarkit"));
  assert.ok(nimet({ tyyppi: "pikatankkaus", sulavuus: ["nopea"] }).includes("muropatukka"));
  assert.ok(nimet({ tyyppi: "tankkaus", sulavuus: ["nopea", "keskitaso"] }).includes("suklaapatukka"));
  assert.ok(!nimet({ tyyppi: "kevyt", sulavuus: ["nopea"] }).includes("suklaapatukka"));
  for (const tyyppi of ["aamiainen", "paaateria", "lamminAteria"]) {
    const ryhmat = tuotteetIkkunaan({ tyyppi, sulavuus: null }, tuotteet).map((t) => t.ryhma);
    assert.ok(!ryhmat.some((r) => ["makeinen", "patukka", "keksi"].includes(r)), tyyppi);
  }
});

test("oma tuote: tyhjä arvo on null eikä tuote ole tarkistettu", () => {
  const t = luoOmaTuote({ nimi: "Kotipatukka", kuvaus: "1 kpl", hiilihydraatti_g: "12,5", proteiini_g: "" });
  assert.equal(t.hiilihydraatti_g, 12.5);
  assert.equal(t.proteiini_g, null);
  assert.equal(t.tarkistettu, false);
  assert.equal(t.id, "oma-kotipatukka");
  assert.equal(t.ryhma, "oma");
  assert.equal(luoOmaTuote({ nimi: "Kotipatukka", hiilihydraatti_g: 12, proteiini_g: 2 }, new Set(["oma-kotipatukka"])).id, "oma-kotipatukka-2");
  assert.throws(() => luoOmaTuote({ nimi: " " }));
  assert.equal(luoOmaTuote({ nimi: "x", hiilihydraatti_g: -1 }).hiilihydraatti_g, null);
});

test("kofeiini ja lisäravinne tunnistetaan nimestä, ja niistä tulee huomautus (S25, S26)", () => {
  const e = luoOmaTuote({ nimi: "Red Bull 25 cl", hiilihydraatti_g: 27, proteiini_g: 0 });
  assert.equal(e.kofeiini, true);
  assert.match(omaHuomio(e), /Kofeiini/);
  assert.equal(tuotteetIkkunaan({ tyyppi: "palautus", sulavuus: null }, [e]).length, 0);
  const l = luoOmaTuote({ nimi: "Kreatiinijauhe", hiilihydraatti_g: 0, proteiini_g: 0 });
  assert.equal(l.lisaravinne, true);
  assert.match(omaHuomio(l), /lisäravinteita/);
  assert.equal(omaHuomio(luoOmaTuote({ nimi: "Banaani" })), null);
});

test("oma tuote noudattaa sopivuuttaan, ja tyhjä sopivuus näkyy kaikkialla", () => {
  const patukka = luoOmaTuote({ nimi: "Patukka", sulavuus: "keskitaso", sopii: ["valissa"] });
  assert.equal(tuotteetIkkunaan({ tyyppi: "peli", sulavuus: null }, [patukka]).length, 0);
  assert.equal(tuotteetIkkunaan({ tyyppi: "puoliaika", sulavuus: null }, [patukka]).length, 1);
  assert.equal(tuotteetIkkunaan({ tyyppi: "peli", sulavuus: null }, [luoOmaTuote({ nimi: "Muu" })]).length, 1);
});

test("tuonti ohittaa virheelliset rivit ja säilyttää oman id:n", () => {
  const { tuotteet: t, ohitetut } = tuoOmatTuotteet({ tuotteet: [
    { id: "oma-a", nimi: "A", annos: { kuvaus: "1 kpl", maara: 30, yksikko: "g" }, hiilihydraatti_g: 15, proteiini_g: 2, huomautus: "S-kaupat" },
    { nimi: "" }, null,
    { nimi: "B" },
  ] });
  assert.equal(ohitetut, 2);
  assert.equal(t.length, 2);
  assert.equal(t[0].id, "oma-a");
  assert.equal(t[0].annos.maara, 30);
  assert.equal(t[0].huomautus, "S-kaupat");
  assert.throws(() => tuoOmatTuotteet({ x: 1 }));
});

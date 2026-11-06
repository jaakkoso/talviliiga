// Puhelinnäkymän apufunktiot: värikoodi, seuraava ikkuna, yhden napautuksen ehdotus ja nopea turnausohjelma (A10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ohjelmanPaivat } from "../js/aikajana.js";
import { ehdotus, ikkunanTila, seuraavaIkkuna, tankkausTaso, tuotteetIkkunaan } from "../js/tavoitteet.js";
import { luoTurnaus } from "../js/turnaus.js";

const lue = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const { tuotteet } = lue("../data/tuotteet.json");
const kartta = new Map(tuotteet.map((t) => [t.id, t]));
const turnaus = luoTurnaus({ id: "t", pvm: "2026-11-14", alku: "09.00", peleja: 5, kesto: 30, tauko: 30, ruokailu: "12.30" });
const paivat = [...ohjelmanPaivat(lue("../data/ohjelma-eerikkila-2026-11.json")), ...ohjelmanPaivat(turnaus)];
const ikkunat = paivat.flatMap((p) => p.ikkunat);

test("värikoodi kertoo annoksen koon", () => {
  assert.equal(tankkausTaso({ tavoite: { hh: [15, 30] } }), "pieni");
  assert.equal(tankkausTaso({ tavoite: { hh: [25, 50] } }), "perus");
  assert.equal(tankkausTaso({ tavoite: { hh: [50, 100] } }), "iso");
  assert.equal(tankkausTaso({ tavoite: { neste: [1, 2] } }), "juoma");
  assert.equal(tankkausTaso({ tavoite: {} }), null);
});

test("seuraava ikkuna: käynnissä, tulossa tai päivä ohi", () => {
  const w = [{ id: "a", alku: 480, loppu: 510 }, { id: "b", alku: 600, loppu: 630 }];
  assert.deepEqual(seuraavaIkkuna(w, 490), { ikkuna: w[0], tila: "nyt", minuutteja: 0 });
  assert.deepEqual(seuraavaIkkuna(w, 520), { ikkuna: w[1], tila: "tulossa", minuutteja: 80 });
  assert.equal(seuraavaIkkuna(w, 700), null);
});

test("ehdotus käyttää vain ikkunaan sopivia tuotteita ja osuu syömiskerroissa haarukkaan", () => {
  for (const w of ikkunat) {
    const sopivat = new Set(tuotteetIkkunaan(w, tuotteet).map((t) => t.id));
    for (let k = 0; k < 3; k++) {
      const e = ehdotus(w, tuotteet, k);
      for (const v of e) assert.ok(sopivat.has(v.tuoteId), `${w.id}: ${v.tuoteId}`);
      const t = ikkunanTila(w, e, kartta);
      if (w.tavoite.hh) {
        assert.ok(e.length >= 1 && e.length <= 2, w.id);
        assert.ok(t.hh.summa >= w.tavoite.hh[0] && t.hh.summa <= w.tavoite.hh[1], `${w.id} ${k}: ${t.hh.summa}`);
      } else if (w.tavoite.neste) {
        assert.ok(t.neste.summa >= w.tavoite.neste[0], `${w.id}: ${t.neste.summa}`);
      }
      assert.equal(t.puuttuvat.length, 0);
    }
  }
});

test("palautuksen ehdotuksessa on proteiinia (S20)", () => {
  for (const w of ikkunat.filter((x) => x.tavoite.prot)) {
    const t = ikkunanTila(w, ehdotus(w, tuotteet), kartta);
    assert.ok(t.prot.summa >= w.tavoite.prot[0], `${w.id}: ${t.prot.summa}`);
  }
});

test("kierros vaihtaa ehdotuksen", () => {
  const w = ikkunat.find((x) => x.tavoite.hh);
  assert.notDeepEqual(ehdotus(w, tuotteet, 0), ehdotus(w, tuotteet, 1));
});

test("nopea turnaus: pelit tasaisin välein ja yhteinen ruokailu ajan mukaan", () => {
  const osiot = turnaus.paivat[0].osiot;
  assert.deepEqual(osiot.filter((o) => o.tyyppi === "peli").map((o) => o.alku), ["09.00", "10.00", "11.00", "12.00", "13.00"]);
  assert.deepEqual(osiot.find((o) => o.tyyppi === "ateria"), { id: "ruokailu", tyyppi: "ateria", ateria: "lounas", alku: "12.30", kesto: null, nimi: "Yhteinen ruokailu" });
  assert.equal(turnaus.nimi, "Turnaus 14.11.");
  assert.equal(paivat.at(-1).rasitus.taso, "turnaus");
  assert.throws(() => luoTurnaus({ id: "x", pvm: "2026-11-14", alku: "21.00", peleja: 6, kesto: 30, tauko: 30 }));
});

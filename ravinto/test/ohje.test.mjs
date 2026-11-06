import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ohjelmanPaivat } from "../js/aikajana.js";
import { pelipaivanOhje } from "../js/ohje.js";
import { luoTurnaus } from "../js/turnaus.js";

const jkl = JSON.parse(readFileSync(new URL("../data/ohjelma-jyvaskyla-2026-11-07.json", import.meta.url), "utf8"));

test("Jyväskylä: aamiainen, viisi peliä vaihtopenkin vinkillä ja kevyt ruokailu", () => {
  const o = pelipaivanOhje(ohjelmanPaivat(jkl)[0]);
  assert.equal(o.rivit[0].otsikko, "Kunnon aamiainen");
  assert.equal(o.rivit[0].alku, 7 * 60);
  const pelit = o.rivit.filter((r) => r.laji === "peli");
  assert.equal(pelit.length, 5);
  assert.equal(pelit[1].otsikko, "Peli 2: KuPS");
  assert.ok(pelit.every((r) => /banaania/.test(r.vaihdossa)));
  const ruokailu = o.rivit.find((r) => r.otsikko === "Ruokailu (järjestäjä)");
  assert.match(ruokailu.teksti, /kevyesti/);
  assert.ok(o.mukaan.includes("vesipullo") && o.mukaan.includes("banaani") && o.mukaan.includes("jotain suolaista"));
  assert.ok(!o.mukaan.includes("puuro ja marjat"), "aamiainen syödään kotona");
});

test("yksi lyhyt peli: vesi riittää, ei vaihtopenkin evästä (S13)", () => {
  const ohjelma = luoTurnaus({ id: "t", pvm: "2026-11-14", ajat: ["12.00"], kesto: 30 });
  const o = pelipaivanOhje(ohjelmanPaivat(ohjelma)[0]);
  assert.equal(o.vaihdossa, false);
  assert.equal(o.rivit.find((r) => r.laji === "peli").vaihdossa, null);
});

test("ohjeessa ei ole grammoja eikä kaloreita (S24)", () => {
  const o = pelipaivanOhje(ohjelmanPaivat(jkl)[0]);
  assert.doesNotMatch(JSON.stringify(o), /\d+\s*g\b|kcal|kalori/);
});

// Hakee merkkituotteiden pakkausarvot ja tuotekuvat Open Food Factsista (tietokanta ODbL, kuvat CC BY-SA 3.0).
// Ajetaan kehityskoneella: node tyokalut/openfoodfacts.mjs. Raaka-arvot tallentuvat tiedostoon tyokalut/off-raaka.json,
// annosarvot tiedostoon data/tuotteet.json ja 200 px kuvat kansioon kuvat/. Kuvien pienennys käyttää macOS:n sips-työkalua.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const polku = (p) => new URL(p, import.meta.url);
const UA = { "User-Agent": "p2015-ravinto/1.0 (SJK P2015 -joukkueen eväsappi)" };
const tanaan = new Date().toISOString().slice(0, 10);

// Uudet tuotteet: koodi (EAN), annos grammoina tai desilitroina, näytettävä annos ja luokittelu (L9, A9).
const TUOTTEET = {
  "oshee-isotonic": { koodi: "5908260254506", dl: 2.5, kuvaus: "1/3 pulloa, 2,5 dl", nimi: "Oshee Isotonic Drink Multifruit", merkki: "Oshee", ryhma: "juoma", sulavuus: "nopea", sopii: ["peli", "valissa"] },
  "oshee-zero": { koodi: "5908260251574", dl: 2.5, kuvaus: "1/3 pulloa, 2,5 dl", nimi: "Oshee Zero Vitamins + Electrolytes, sokeriton", merkki: "Oshee", ryhma: "juoma", sulavuus: "nopea", sopii: ["ennen", "peli", "valissa", "palautus"], huomautus: "Sokeriton, ei tuo energiaa. Juomana kuin vesi." },
  snickers: { koodi: "5000159461122", g: 50, kuvaus: "1 patukka", nimi: "Snickers", merkki: "Snickers", ryhma: "patukka", sulavuus: "keskitaso", sopii: ["valissa", "palautus"] },
  mars: { koodi: "5000159407236", g: 51, kuvaus: "1 patukka", nimi: "Mars", merkki: "Mars", ryhma: "patukka", sulavuus: "keskitaso", sopii: ["valissa", "palautus"] },
  "haribo-kultakarhut": { koodi: "3103220009802", g: 25, kuvaus: "1 pieni kourallinen", nimi: "Haribo Goldbären -nallekarkit", merkki: "Haribo", ryhma: "makeinen", sulavuus: "nopea", sopii: ["ennen", "valissa", "palautus"] },
  "corny-suklaa": { koodi: "4011800420215", g: 25, kuvaus: "1 patukka", nimi: "Corny Classic suklaa -myslipatukka", merkki: "Corny", ryhma: "patukka", sulavuus: "keskitaso", sopii: ["valissa", "palautus"] },
  "greendeli-kolmioleipa": { koodi: "6430025526133", g: 135, kuvaus: "puolikas pakkausta", nimi: "Green Deli broilerikolmioleipä", merkki: "Green Deli", ryhma: "valmisruoka", sulavuus: "keskitaso", sopii: ["valissa", "palautus"] },
  "valio-appelsiinimehu": { koodi: "6408430006151", dl: 2, kuvaus: "1 lasi, 2 dl", nimi: "Valio appelsiinitäysmehu", merkki: "Valio", ryhma: "juoma", sulavuus: "nopea", sopii: ["ennen", "valissa", "palautus"] },
  "froosh-smoothie": { koodi: "7350020720734", dl: 2.5, kuvaus: "1 pullo, 2,5 dl", nimi: "Froosh-smoothie", merkki: "Froosh", ryhma: "hedelma", sulavuus: "nopea", sopii: ["ennen", "valissa", "palautus"] },
  "sunmaid-rusinat": { koodi: "0041143025123", g: 28, kuvaus: "2 minirasiaa", nimi: "Sun-Maid-rusinat", merkki: "Sun-Maid", ryhma: "hedelma", sulavuus: "nopea", sopii: ["ennen", "valissa"] },
  "valio-juotava-jogurtti": { koodi: "6408430408665", dl: 2, kuvaus: "1 pullo, 2 dl", nimi: "Valio juotava jogurtti, mansikka", merkki: "Valio", ryhma: "maito", sulavuus: "nopea", sopii: ["ennen", "valissa", "palautus"] },
  "valio-rahkavaahto": { koodi: "6408430408092", g: 100, kuvaus: "1 purkki", nimi: "Valio Herkku mousse rahkavaahto, mansikka", merkki: "Valio", ryhma: "maito", sulavuus: "keskitaso", sopii: ["valissa", "palautus"] },
  "elovena-hedelmakeksi": { koodi: "6411200211143", g: 30, kuvaus: "1 keksi", nimi: "Elovena Hedelmä välipalakeksi", merkki: "Elovena", ryhma: "keksi", sulavuus: "keskitaso", sopii: ["valissa", "palautus"] },
  "mehukatti-trip": { koodi: "6415131402342", dl: 2, kuvaus: "1 pillimehu, 2 dl", nimi: "Mehukatti Trip vadelma -pillimehu", merkki: "Mehukatti", ryhma: "juoma", sulavuus: "nopea", sopii: ["ennen", "valissa", "palautus"] },
  "corny-big-suklaa": { koodi: "4011800563516", g: 50, kuvaus: "1 patukka", nimi: "Corny Big suklaa -myslipatukka", merkki: "Corny", ryhma: "patukka", sulavuus: "keskitaso", sopii: ["valissa", "palautus"] },
};

// Olemassa olevat merkkituotteet, joille haetaan vain kuva. Arvot pysyvät Finelin riveinä.
const KUVAT = {
  "fazer-dumle": "6411404035187", "fazer-marianne": "6410804131956", "fazer-suffeli": "6411401092282",
  "fazer-suffeli-puffi": "6416453047211", "fazer-carneval": "6411401083709", "lu-muumi": "6411401085260",
  "lu-jaffa": "6416453554641", twix: "5000159531146", suklaarakeet: "5000159471725",
};

async function hae(koodi) {
  const v = await fetch(`https://world.openfoodfacts.org/api/v2/product/${koodi}.json?fields=product_name,brands,nutriments,image_front_url,ingredients_text,nutrition_data_per`, { headers: UA });
  const j = await v.json();
  if (!j.product) throw new Error(`Tuotetta ${koodi} ei löydy`);
  await new Promise((r) => setTimeout(r, 1500)); // Open Food Factsin pyyntöraja
  return j.product;
}

async function lataaKuva(id, koodi, url) {
  mkdirSync(polku("../kuvat/"), { recursive: true });
  const kohde = polku(`../kuvat/${id}.jpg`).pathname;
  const raaka = `${kohde}.raaka`;
  writeFileSync(raaka, Buffer.from(await (await fetch(url, { headers: UA })).arrayBuffer()));
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "70", "-Z", "200", raaka, "--out", kohde], { stdio: "ignore" });
  execFileSync("rm", [raaka]);
  return { kuva: `kuvat/${id}.jpg`, kuvaLahde: `https://world.openfoodfacts.org/product/${koodi}`, kuvaTekija: "Open Food Facts -yhteisö", kuvaLisenssi: "CC BY-SA 3.0" };
}

const yksi = (x) => Math.round(x * 10) / 10;
const raakaPolku = polku("./off-raaka.json");
const raaka = existsSync(raakaPolku) ? JSON.parse(readFileSync(raakaPolku, "utf8")) : { lahde: "Open Food Facts, ODbL", tuotteet: {} };
const kanta = JSON.parse(readFileSync(polku("../data/tuotteet.json"), "utf8"));
const rivit = new Map(kanta.tuotteet.map((t) => [t.id, t]));

for (const [id, m] of Object.entries(TUOTTEET)) {
  const p = await hae(m.koodi);
  const n = p.nutriments;
  const kcal = n["energy-kcal_100g"] ?? (n.energy_100g != null ? n.energy_100g / 4.184 : undefined); // osa riveistä ilmoittaa vain kJ
  const sata = { kcal, hh: n.carbohydrates_100g, prot: n.proteins_100g, rasva: n.fat_100g, kuitu: n.fiber_100g ?? null };
  if ([sata.kcal, sata.hh, sata.prot, sata.rasva].some((x) => typeof x !== "number")) throw new Error(`${id}: arvoja puuttuu`);
  raaka.tuotteet[id] = { koodi: m.koodi, nimi: p.product_name, per: p.nutrition_data_per, ...sata, haettu: tanaan };
  const maara = m.dl ? m.dl * 100 : m.g; // juomissa 100 ml ≈ 100 g
  const arvo = (x) => (x == null ? null : yksi((x * maara) / 100));
  const kuva = p.image_front_url ? await lataaKuva(id, m.koodi, p.image_front_url) : {};
  rivit.set(id, {
    id, nimi: m.nimi, merkki: m.merkki, ryhma: m.ryhma,
    annos: m.dl ? { kuvaus: m.kuvaus, maara: m.dl, yksikko: "dl" } : { kuvaus: `${m.kuvaus}, ${m.g} g`, maara: m.g, yksikko: "g" },
    ...(m.dl ? { neste_dl: m.dl } : {}),
    energia_kcal: Math.round((sata.kcal * maara) / 100), hiilihydraatti_g: arvo(sata.hh), proteiini_g: arvo(sata.prot), rasva_g: arvo(sata.rasva), kuitu_g: arvo(sata.kuitu),
    sulavuus: m.sulavuus, sopii: m.sopii,
    lahde: { tyyppi: "openfoodfacts", koodi: m.koodi, haettu: tanaan },
    tarkistettu: true,
    ...(m.huomautus ? { huomautus: m.huomautus } : {}),
    ...kuva,
  });
  console.log(`${id}: hiilihydraatti ${arvo(sata.hh)} g annoksessa`);
}

for (const [id, koodi] of Object.entries(KUVAT)) {
  const t = rivit.get(id);
  if (!t) throw new Error(`Tuotetta ${id} ei ole`);
  const p = await hae(koodi);
  if (p.image_front_url) Object.assign(t, await lataaKuva(id, koodi, p.image_front_url));
  console.log(`${id}: kuva ${p.image_front_url ? "ladattu" : "puuttuu"}`);
}

writeFileSync(raakaPolku, `${JSON.stringify(raaka, null, 1)}\n`);
const lahdemaininta = "Ravintoarvot: Fineli, Terveyden ja hyvinvoinnin laitos, CC BY 4.0, ja Open Food Facts, ODbL. Tuotekuvat: Open Food Facts, CC BY-SA 3.0. Arvot on laskettu annoksille.";
writeFileSync(polku("../data/tuotteet.json"), `{\n "versio": 1,\n "lahdemaininta": ${JSON.stringify(lahdemaininta)},\n "tuotteet": [\n${[...rivit.values()].map((t) => `  ${JSON.stringify(t)}`).join(",\n")}\n ]\n}\n`);

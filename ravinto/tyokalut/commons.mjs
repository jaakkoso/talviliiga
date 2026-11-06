// Hakee yleisten elintarvikkeiden kuvat Wikimedia Commonsista (vain CC0, public domain, CC BY ja CC BY-SA).
// Ajetaan kehityskoneella: node tyokalut/commons.mjs. Kuvat valittiin käsin hakutuloksista; tekijä ja lisenssi tallentuvat tuotteelle.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const polku = (p) => new URL(p, import.meta.url);
const UA = { "User-Agent": "p2015-ravinto/1.0 (SJK P2015 -joukkueen eväsappi)" };
const SALLITUT = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0)/i;

const KUVAT = {
  banaani: "File:Banana Fruit.JPG",
  omena: "File:Red Apple.jpg",
  paaryna: "File:D'anjou pear.jpg",
  appelsiini: "File:Orange-Fruit-Pieces.jpg",
  mandariini: "File:2023 Mandarynki.jpg",
  viinirypaleet: "File:A bunch of grapes a.jpg",
  "kuivatut-aprikoosit": "File:Ab food 04.jpg",
  "vaalea-sampyla": "File:Telera 01.JPG",
  "sampyla-kinkku": "File:Ham and cheese roll Café Marina Lordship Lane Tottenham London England.jpg",
  "patonki-taytetty": "File:Deli Baguette Sandwich (Unsplash).jpg",
  ruisleipa: "File:Rye bread.png",
  paahtoleipa: "File:2 Slices of Toast in the kitchen.jpg",
  karjalanpiirakka: "File:Karjalanpiirakka.png",
  pulla: "File:Rollo de canela (Cinnamon roll).jpg",
  kaurapuuro: "File:Oatmeal porridge with müsli and cup of tea.jpg",
  mysli: "File:Fresh-muesli.jpg",
  muropala: "File:Liat Portal for Foodie Disorder - Cornflakes with milk.jpg",
  pasta: "File:Cooked-Fusilli-on-plate-1.jpg",
  riisi: "File:A bowl of rice.jpg",
  peruna: "File:Potatoes with dill.jpg",
  "kana-riisi": "File:Friday dinner - Curry chicken with bell peppers and rice - 01.jpg",
  "jauheliha-pasta": "File:Spaghetti Bolognese.jpg",
  "lohi-peruna": "File:Liat Portal for Foodie Disorder - Grilled salmon with sweet potatoes.jpg",
  kermakastike: "File:롤링파스타 월계이마트점 까르보나라 1.jpg",
  raejuusto: "File:Cottagecheese200px.jpg",
  maito: "File:Glass of Milk (33657535532).jpg",
  smoothie: "File:Kid friendly green smoothie in a personalized glass with spinach, Greek yogurt, frozen blueberries, blackberries and strawberries and berries, banana in a glass bowl on a wood table (16225943125).jpg",
  vesi: "File:Glass of water, detail.jpg",
  "laimea-mehu": "File:Orange juice 1 edit1.jpg",
  pahkinat: "File:Mixed Nuts (Alabama Extension).jpg",
  maapahkinavoi: "File:Peanut butter 14juni09 001.jpg",
  "salaatti-tonnikala": "File:Tuna Salad with sweet corn.jpg",
  wrap: "File:Smoked chicken and avocado wrap.jpg",
  makaronilaatikko: "File:Soijamakaronilaatikko.JPG",
  marjakeitto: "File:Blåbärssoppa.jpg",
  riisikakut: "File:Puffed Rice Cakes.jpg",
  mokkapala: "File:Karleksmums.jpg",
  "valio-play-kaakao": "File:Chocolate milk.JPG",
};

const teksti = (html) => String(html ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const kanta = JSON.parse(readFileSync(polku("../data/tuotteet.json"), "utf8"));
const rivit = new Map(kanta.tuotteet.map((t) => [t.id, t]));
mkdirSync(polku("../kuvat/"), { recursive: true });

const parit = Object.entries(KUVAT);
for (let i = 0; i < parit.length; i += 20) {
  const era = parit.slice(i, i + 20);
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&titles=${encodeURIComponent(era.map(([, t]) => t).join("|"))}`;
  const j = await (await fetch(u, { headers: UA })).json();
  const nimet = new Map((j.query.normalized ?? []).map((n) => [n.from, n.to]));
  const sivut = new Map(Object.values(j.query.pages).map((p) => [p.title, p]));
  for (const [id, otsikko] of era) {
    const t = rivit.get(id);
    if (!t) throw new Error(`Tuotetta ${id} ei ole`);
    const ii = sivut.get(nimet.get(otsikko) ?? otsikko)?.imageinfo?.[0];
    if (!ii) throw new Error(`${id}: kuvaa ${otsikko} ei löydy`);
    const lisenssi = teksti(ii.extmetadata.LicenseShortName?.value);
    if (!SALLITUT.test(lisenssi)) throw new Error(`${id}: lisenssi ${lisenssi} ei käy`);
    const kohde = polku(`../kuvat/${id}.jpg`).pathname;
    writeFileSync(`${kohde}.raaka`, Buffer.from(await (await fetch(ii.thumburl, { headers: UA })).arrayBuffer()));
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "70", "-Z", "200", `${kohde}.raaka`, "--out", kohde], { stdio: "ignore" });
    execFileSync("rm", [`${kohde}.raaka`]);
    Object.assign(t, { kuva: `kuvat/${id}.jpg`, kuvaLahde: ii.descriptionurl, kuvaTekija: teksti(ii.extmetadata.Artist?.value) || "tuntematon", kuvaLisenssi: lisenssi });
    console.log(`${id}: ${lisenssi}`);
  }
}

writeFileSync(polku("../data/tuotteet.json"), `{\n "versio": 1,\n "lahdemaininta": ${JSON.stringify(kanta.lahdemaininta)},\n "tuotteet": [\n${[...rivit.values()].map((t) => `  ${JSON.stringify(t)}`).join(",\n")}\n ]\n}\n`);

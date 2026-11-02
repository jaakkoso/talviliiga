// Laskee Fineli-rivien annosarvot tiedostoon data/tuotteet.json. Ajetaan kehityskoneella: node tyokalut/fineli.mjs
// Annoskoot ovat Finelin talousmittoja (KPL, PORT), paitsi KOOSTE-rivit, jotka on kirjattu reseptioletuksena.
import { readFileSync, writeFileSync } from "node:fs";

const polku = (p) => new URL(p, import.meta.url);
const raaka = JSON.parse(readFileSync(polku("./fineli-raaka.json"), "utf8"));
const tuotekanta = JSON.parse(readFileSync(polku("../data/tuotteet.json"), "utf8"));
const elintarvike = new Map(raaka.elintarvikkeet.map((e) => [e.id, e]));

// tuote: osat [Fineli-id, grammat], näytettävä annos
const KARTTA = {
  banaani: [[[11049, 125]], "1 keskikokoinen"],
  omena: [[[11061, 175]], "1 keskikokoinen"],
  paaryna: [[[11062, 195]], "1 keskikokoinen"],
  appelsiini: [[[11045, 215]], "1 keskikokoinen"],
  mandariini: [[[11046, 160]], "2 kpl"],
  viinirypaleet: [[[423, 70]], "1 kourallinen"],
  rusinat: [[[428, 40]], "1 pieni rasia"],
  "kuivatut-aprikoosit": [[[409, 40]], "1 kourallinen"],
  "vaalea-sampyla": [[[11733, 50]], "1 kpl"],
  "sampyla-kinkku": [[[11733, 50], [799, 24], [643, 16]], "1 kpl"], // KOOSTE: sämpylä, 2 siivua kinkkua, 2 siivua juustoa
  "patonki-taytetty": [[[34698, 170]], "1 pieni"],
  ruisleipa: [[[1331, 70]], "2 viipaletta"],
  paahtoleipa: [[[29795, 40]], "2 viipaletta"],
  karjalanpiirakka: [[[33605, 60]], "1 kpl"],
  pulla: [[[33346, 35]], "1 kpl"],
  kaurapuuro: [[[1513, 230]], "1 annos"],
  mysli: [[[29785, 25]], "1 annos"],
  muropala: [[[163, 30]], "1 annos"],
  pasta: [[[30356, 175]], "1 annos"],
  riisi: [[[1370, 110]], "1 annos"],
  peruna: [[[11511, 180]], "1 annos"],
  "kana-riisi": [[[31447, 150], [1370, 110]], "1 annos"], // KOOSTE
  "jauheliha-pasta": [[[32233, 100], [30356, 175]], "1 annos"], // KOOSTE
  "lohi-peruna": [[[33564, 100], [11511, 180]], "1 annos"], // KOOSTE
  kermakastike: [[[32023, 220]], "1 annos"],
  jogurtti: [[[11727, 150]], "1 purkki"],
  "juotava-jogurtti": [[[29089, 200]], "1 pullo, 2 dl"],
  rahka: [[[30673, 180]], "1 purkki"],
  raejuusto: [[[649, 100]], "1 annos"],
  maito: [[[606, 200]], "1 lasi, 2 dl"],
  kaakao: [[[6051, 200]], "1 tölkki, 2 dl"],
  smoothie: [[[33469, 200]], "1 lasi, 2 dl"],
  vesi: [[[922, 200]], "1 lasi, 2 dl"],
  mehu: [[[436, 200]], "1 lasi, 2 dl"],
  "laimea-mehu": [[[30392, 200]], "1 lasi, 2 dl"],
  pahkinat: [[[33569, 20]], "1 kourallinen"],
  maapahkinavoi: [[[34667, 15]], "1 rkl"],
  // Entiset pakkausrivit: Finelin keskiarvo tai yleinen tuote. Kolmas arvo on nimi, joka kertoo, mitä rivi oikeasti on.
  urheilujuoma: [[[33375, 500]], "1 pullo, 5 dl", "Urheilujuoma, hiilihydraattijuoma"],
  hedelmasose: [[[11469, 125]], "1 pussi", "Hedelmäsose, annospussi"],
  myslipatukka: [[[32450, 30]], "1 kpl", "Myslipatukka, täysjyvä"],
  "salaatti-kana": [[[33853, 250]], "1 rasia", "Broilerisalaatti, valmis"],
  "salaatti-tonnikala": [[[29041, 250]], "1 rasia", "Tonnikalasalaatti, ilman kastiketta"],
  kolmioleipa: [[[31464, 140]], "1 kpl", "Kolmioleipä, kinkku"],
  wrap: [[[1035, 150]], "1 kpl", "Wrap, broileri"],
  makaronilaatikko: [[[33622, 300]], "1 annos", "Makaronilaatikko, valmis"],
  // Makeiset, patukat, keksit ja juotavat eväät (A9)
  "marmeladikarkit": [[[9, 30]], "1 pieni kourallinen"],
  "karamellit": [[[5, 30]], "1 pieni kourallinen"],
  "lakritsi": [[[8, 30]], "1 pieni kourallinen"],
  "suklaarusinat": [[[31254, 20]], "1 pieni kourallinen"],
  "suklaarakeet": [[[32503, 30]], "1 pieni kourallinen"],
  "suklaapatukka": [[[44, 45]], "1 kpl"],
  "twix": [[[32509, 50]], "1 pakkaus"],
  "myslipatukka-hedelma": [[[32452, 30]], "1 kpl"],
  "myslipatukka-marja": [[[32451, 30]], "1 kpl"],
  "myslipatukka-jogurtti": [[[32449, 30]], "1 kpl"],
  "myslipatukka-suklaa": [[[32700, 30]], "1 kpl"],
  "muropatukka": [[[33159, 30]], "1 kpl"],
  "muropatukka-suklaa": [[[33158, 30]], "1 kpl"],
  "suolakeksit": [[[29769, 22.5]], "5 kpl"],
  "vohvelikeksit": [[[29761, 30]], "3 kpl"],
  "kauratayte": [[[33886, 24]], "2 kpl"],
  "grahamkorput": [[[29766, 20]], "2 kpl"],
  "riisikakut": [[[31252, 16]], "2 kpl"],
  "banaanikakku": [[[31559, 50]], "2 viipaletta"],
  "marjakeitto": [[[4410, 200]], "1 lasi, 2 dl"],
  "pillimehu": [[[33113, 200]], "1 pillimehu, 2 dl"],
};

const yksi = (x) => Math.round(x * 10) / 10;

function taytaRivi(t, [osat, kuvaus, nimi]) {
  const summa = (kentta) => yksi(osat.reduce((s, [id, g]) => s + (elintarvike.get(id)[kentta] * g) / 100, 0));
  const grammat = osat.reduce((s, [, g]) => s + g, 0);
  const juoma = t.annos.yksikko === "dl";
  return {
    ...t,
    nimi: nimi ?? t.nimi,
    annos: { kuvaus: juoma ? kuvaus : `${kuvaus}, ${grammat} g`, maara: juoma ? t.annos.maara : grammat, yksikko: t.annos.yksikko },
    energia_kcal: Math.round(summa("kcal")),
    hiilihydraatti_g: summa("hh"),
    proteiini_g: summa("prot"),
    rasva_g: summa("rasva"),
    kuitu_g: summa("kuitu"),
    lahde: { tyyppi: "fineli", id: osat.length === 1 ? osat[0][0] : null, ...(osat.length > 1 ? { osat: osat.map(([id, g]) => ({ id, g })) } : {}), haettu: raaka.haettu },
    tarkistettu: true,
  };
}

const puuttuvat = [];
const tuotteet = tuotekanta.tuotteet.map((t) => {
  if (KARTTA[t.id]) return taytaRivi(t, KARTTA[t.id]);
  if (t.lahde.tyyppi === "fineli") puuttuvat.push(t.id);
  return t;
});
if (puuttuvat.length) throw new Error(`Kartasta puuttuu: ${puuttuvat.join(", ")}`);

const rivit = tuotteet.map((t) => `  ${JSON.stringify(t)}`).join(",\n");
const lahdemaininta = "Ravintoarvot: Fineli, Terveyden ja hyvinvoinnin laitos, CC BY 4.0. Arvot on laskettu annoksille. Merkkituotteet: pakkausmerkinnät.";
writeFileSync(polku("../data/tuotteet.json"), `{\n "versio": 1,\n "lahdemaininta": ${JSON.stringify(lahdemaininta)},\n "tuotteet": [\n${rivit}\n ]\n}\n`);
console.log(`${Object.keys(KARTTA).length} Fineli-riviä täytetty`);

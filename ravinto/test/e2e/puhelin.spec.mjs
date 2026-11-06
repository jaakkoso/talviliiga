// Puhelintesti iPhone-koossa, myös offline. Ajo: npm run e2e. Palvelin jakaa repon juuren, jotta polku ja scope ovat samat kuin julkaistuna.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, webkit } from "playwright";

const JUURI = fileURLToPath(new URL("../../../", import.meta.url));
const TYYPIT = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };

let palvelin, selain, konteksti, sivu, URLI;
const virheet = [];
let verkkoPoissa = false; // Playwrightin WebKit ei lataa sivua setOffline-tilassa, joten siinä verkko katkaistaan palvelimelta.

before(async () => {
  palvelin = http.createServer(async (q, r) => {
    if (verkkoPoissa) return q.socket.destroy();
    try {
      const p = decodeURIComponent(q.url.split("?")[0]);
      const f = path.join(JUURI, p.endsWith("/") ? p + "index.html" : p);
      const d = await readFile(f);
      r.writeHead(200, { "content-type": TYYPIT[path.extname(f)] ?? "application/octet-stream" });
      r.end(d);
    } catch {
      r.writeHead(404);
      r.end();
    }
  });
  await new Promise((ok) => palvelin.listen(0, "127.0.0.1", ok)); // Vapaa portti, jotta koneen muut palvelut eivät häiriinny.
  URLI = `http://127.0.0.1:${palvelin.address().port}/ravinto/`;
  selain = await webkit.launch();
  konteksti = await selain.newContext({ ...devices["iPhone 13"], serviceWorkers: "allow" });
  await konteksti.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  sivu = await konteksti.newPage();
  sivu.on("pageerror", (e) => virheet.push(e.message));
});

after(async () => {
  await selain?.close();
  palvelin?.close();
});

const eiVaakavieritysta = () => sivu.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test("service worker ottaa sivun hallintaan ja pysyy omassa kansiossaan", async () => {
  await sivu.goto(URLI);
  await sivu.evaluate(() => navigator.serviceWorker.ready);
  await sivu.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const { scope, osoitteet } = await sivu.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    const osoitteet = [];
    for (const n of await caches.keys()) for (const k of await (await caches.open(n)).keys()) osoitteet.push(new URL(k.url).pathname);
    return { scope: new URL(r.scope).pathname, osoitteet };
  });
  assert.equal(scope, "/ravinto/");
  assert.ok(osoitteet.length > 10);
  for (const o of osoitteet) assert.ok(o.startsWith("/ravinto/"), o);
});

test("välimuistilista kattaa kaikki sivun tarvitsemat omat tiedostot", async () => {
  const lista = await readFile(path.join(JUURI, "ravinto/sw.js"), "utf8");
  for (const f of ["aika", "aikajana", "omat-tuotteet", "rasitus", "saannot", "tallennus", "tavoitteet", "tuonti"]) assert.ok(lista.includes(`js/${f}.js`), f);
  const manifesti = JSON.parse(await readFile(path.join(JUURI, "ravinto/manifest.webmanifest"), "utf8"));
  assert.equal(manifesti.start_url, "./");
  for (const k of manifesti.icons) assert.ok(lista.includes(k.src), k.src);
});

test("aloitus: turnaus, seuraavaksi-kortti, pikavalinta, kuittaus ja ostoslista", async () => {
  await sivu.clock.setFixedTime(new Date(2026, 10, 14, 7, 5)); // Turnauspäivän aamu, jotta seuraavaksi-kortti näkyy.
  await sivu.goto(URLI);
  await sivu.fill('input[name="pvm"]', "2026-11-14");
  assert.equal(await sivu.locator('input[name="peleja"]:checked').inputValue(), "5");
  await sivu.fill('input[name="ruokailu"]', "12:30");
  await sivu.click('button:has-text("Laske päivän tarve")');
  await sivu.waitForSelector(".jana");
  assert.match(await sivu.locator(".tarve").innerText(), /vähintään noin \d+ g/);
  assert.equal(await sivu.locator(".jana .koko").count(), await sivu.locator(".jana li").count());

  const nyt = sivu.locator(".nyt");
  assert.match(await nyt.innerText(), /kevyt aamiainen/i);
  await nyt.locator('button:has-text("Ota ehdotus")').click();
  assert.ok(await nyt.locator(".valitut").innerText());
  await nyt.locator('button:has-text("Merkitse syödyksi")').click();
  assert.match(await sivu.locator(".tarve").innerText(), /Syöty 1\/\d+ kertaa/);
  assert.equal(await sivu.locator(".jana .kuittaus.tehty").count(), 1);

  await sivu.click('.tarve a:has-text("Jatka tuotteiden valintaa")');
  await sivu.waitForSelector(".pika");
  const ensin = await sivu.locator(".pika b").innerText();
  await sivu.click('button:has-text("Toinen vaihtoehto")');
  assert.notEqual(await sivu.locator(".pika b").innerText(), ensin);
  assert.ok(await sivu.locator(".alapalkki a:has-text(\"Seuraava:\")").isVisible());

  await sivu.goto(URLI + "#/paiva");
  await sivu.click('.tapahtuma:has-text("Palautus") >> nth=0');
  await sivu.waitForSelector(".tuote");
  await sivu.fill('input[data-syote="haku"]', "dumle");
  assert.equal(await sivu.locator(".tuote:visible").count(), 1);
  await sivu.fill('input[data-syote="haku"]', "");
  await sivu.click('.siru-nappi:has-text("Hedelmät")');
  assert.ok((await sivu.locator(".tuote:visible .nimi").allInnerTexts()).includes("Banaani"));
  await sivu.click('.siru-nappi:has-text("Kaikki")');
  await sivu.click('button[aria-label="Lisää: Banaani"]');
  await sivu.click('button[aria-label="Lisää: Fazer Dumle"]');
  assert.match(await sivu.locator(".tankki .tankkirivi").first().innerText(), /42,8/);
  assert.ok(await eiVaakavieritysta());
  assert.doesNotMatch(await sivu.locator("body").innerText(), /kcal|kalori|paino/i);
  await sivu.goto(URLI + "#/ostos");
  await sivu.waitForSelector(".ostos");
  assert.ok((await sivu.locator(".ostos").count()) >= 3);
});

test("Eerikkilän ohjelma löytyy Ohjelma-välilehdeltä", async () => {
  await sivu.goto(URLI + "#/ohjelma");
  await sivu.click('button:has-text("Ota Eerikkilän")');
  await sivu.waitForSelector(".jana");
  assert.equal(await sivu.locator(".pvmt a").count(), 3);
  await sivu.goto(URLI + "#/ohjelma");
  await sivu.selectOption('select[data-muutos="vaihda-ohjelma"]', "turnaus-2026-11-14");
});

test("offline: sivu aukeaa uudelleen, suunnitelma säilyy ja tuotteet toimivat", async () => {
  verkkoPoissa = true;
  palvelin.closeAllConnections();
  try {
    await sivu.goto("about:blank");
    await sivu.goto(URLI + "#/paiva"); // Uusi lataus ilman verkkoa, kuten kun appi avataan kotivalikosta.
    await sivu.waitForSelector(".jana");
    await sivu.click('.tapahtuma:has-text("Palautus") >> nth=0');
    await sivu.waitForSelector(".tuote");
    assert.ok((await sivu.locator(".tuote").count()) > 20);
    assert.equal(await sivu.locator(".tuote.valittu").count(), 2);
    await sivu.click('.siru-nappi:has-text("Patukat")');
    const kuva = sivu.locator('.tuote:visible img[src="kuvat/snickers.jpg"]');
    await kuva.scrollIntoViewIfNeeded();
    assert.ok(await kuva.evaluate((i) => i.decode().then(() => i.naturalWidth > 0)), "tuotekuva näkyy ilman verkkoa");
  } finally {
    verkkoPoissa = false;
  }
});

test("offline myös Chromiumissa selaimen omalla verkkokatkaisulla", async () => {
  const c = await chromium.launch();
  try {
    const k = await c.newContext({ ...devices["Pixel 7"], serviceWorkers: "allow" });
    await k.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const s = await k.newPage();
    await s.goto(URLI);
    await s.evaluate(() => navigator.serviceWorker.ready);
    await s.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await s.goto(URLI + "#/ohjelma");
    await s.click('button:has-text("Ota Eerikkilän")');
    await s.waitForSelector(".jana");
    await k.setOffline(true);
    await s.reload();
    await s.waitForSelector(".jana");
    await s.click('.tapahtuma:has-text("Palautus") >> nth=0');
    await s.waitForSelector(".tuote");
    assert.ok((await s.locator(".tuote").count()) > 20);
  } finally {
    await c.close();
  }
});

test("oma tuote ja kofeiinihuomautus, tumma teema", async () => {
  await sivu.goto(URLI + "#/asetukset");
  await sivu.click('text="Lisää oma tuote"');
  await sivu.fill('input[name="nimi"]', "Red Bull");
  await sivu.click('dialog button[type="submit"]');
  assert.match(await sivu.locator(".ilmoitus").first().innerText(), /Kofeiini/);
  await sivu.check('input[name="teema"][value="tumma"]');
  assert.equal(await sivu.evaluate(() => document.documentElement.dataset.theme), "tumma");
  assert.ok(await eiVaakavieritysta());
});

test("sivulla ei ollut ajonaikaisia virheitä", () => assert.deepEqual(virheet, []));

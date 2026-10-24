#!/usr/bin/env node
/* Pelipäivä-työkalu: turnauskansioiden luonti, sivujen päivitys ja jäädytys.

   node pelipaiva/tyokalut/pelipaiva.mjs uusi <kansio> --nimi "SJK Cup P12" [--lyhytnimi "SJK Cup"] [--kuvaus "..."] [--vari "#211e1e"]
       Luo turnauskansion repon juureen: turnaus.js, sivut, oletuslogot. Sivut toimivat heti esikatselussa esimerkkidatalla.
   node pelipaiva/tyokalut/pelipaiva.mjs paivita
       Generoi kaikkien aktiivisten turnausten sivut uudelleen sivupohjista ja päivittää versioparametrit (?v=) tiedostojen
       sisällön mukaan sekä äänipalojen luettelot (aanet/aanet.json). Aja aina moottorin muutosten jälkeen ennen julkaisua.
   node pelipaiva/tyokalut/pelipaiva.mjs tarkista
       Kertoo, onko jokin sivu tai luettelo vanhentunut (sama kuin paivita, mutta ei kirjoita mitään). Palauttaa virhekoodin 1, jos on.
   node pelipaiva/tyokalut/pelipaiva.mjs jaadyta <kansio>
       Pelatun turnauksen jäädytys: moottorin koodi, yhteiset äänet ja logot kopioidaan turnauksen kansioon, ja sivut
       viittaavat jatkossa vain niihin. Moottorin myöhemmät muutokset eivät enää vaikuta turnaukseen.

   Turnauskansio = mikä tahansa kansio, jossa on turnaus.js. Talviliiga (talviliiga/) on vanhaa mallia eikä sillä ole
   turnaus.js-tiedostoa, joten työkalu ei koske siihen. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ENGINE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(ENGINE_DIR, '..');
const ENGINE_URL = '/' + path.basename(ENGINE_DIR) + '/';
const TEMPLATES = path.join(ENGINE_DIR, 'sivupohjat');
const ENGINE_FILES = ['common.js', 'app.js', 'ref.js', 'kuva.js', 'takaisin.js', 'kuulutus.js', 'style.css', 'kuulutus.css'];
const PREVIEW = path.join(ENGINE_DIR, 'esikatselu');

const [cmd, ...rest] = process.argv.slice(2);
const opts = {}, args = [];
for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) opts[rest[i].slice(2)] = rest[++i]; else args.push(rest[i]); }

const hash = file => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
const rel = p => path.relative(ROOT, p) || '.';
const exists = p => fs.existsSync(p);

/* turnaus.js luetaan ajamalla se eristetyssä ympäristössä (window.TURNAUS = {...}) */
function readTurnaus(dir) {
  const file = path.join(dir, 'turnaus.js');
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file, timeout: 1000 });
  const t = ctx.window.TURNAUS;
  if (!t || typeof t !== 'object') throw new Error(`${rel(file)}: window.TURNAUS puuttuu`);
  return t;
}
function tournaments() {
  const out = [];
  for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('.') || d.name === 'node_modules') continue;
    const dir = path.join(ROOT, d.name);
    if (exists(path.join(dir, 'turnaus.js'))) out.push(dir);
  }
  if (exists(path.join(PREVIEW, 'turnaus.js'))) out.push(PREVIEW);
  return out;
}

/* Äänipalojen luettelo: { "tuloksia": "tuloksia.mp3", ... }. Kuulutuspaneeli tietää tästä, mitkä palat on äänitetty. */
function audioManifest(dir) {
  const a = path.join(dir, 'aanet');
  if (!exists(a)) return null;
  const files = fs.readdirSync(a).filter(f => /\.(mp3|m4a|wav|ogg)$/i.test(f)).sort();
  const map = Object.fromEntries(files.map(f => [f.replace(/\.[^.]+$/, ''), f]));
  return JSON.stringify(map, null, 1) + '\n';
}

function render(tpl, t, dir, frozen) {
  const M = frozen ? '' : ENGINE_URL;
  const fileFor = name => name === 'turnaus.js' ? path.join(dir, name) : frozen ? path.join(dir, name) : path.join(ENGINE_DIR, name);
  const val = {
    M, NIMI: t.nimi || 'Turnaus', LYHYTNIMI: t.lyhytnimi || t.nimi || 'Tulokset', VARI: t.vari || '#211e1e',
    OTSIKKOLIITE: t.otsikkoliite || '', KUVAUS: t.kuvaus || `${t.nimi || 'Turnaus'}: otteluohjelma, live-tulokset ja sarjataulukot.`,
  };
  const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  // Esikatselu (ei vielä taulukkoa) ei kuulu hakukoneisiin
  const robots = t.SHEET_ID ? '' : '<meta name="robots" content="noindex">\n';
  return tpl.replace(/\{\{v:([\w.-]+)\}\}/g, (_, f) => hash(fileFor(f)))
    .replace('{{ROBOTS}}', robots)
    .replace(/\{\{(\w+)\}\}/g, (_, k) => k === 'M' ? val.M : escAttr(val[k] ?? ''))
    .replace(/<title data-suffix="">(.*?) <\/title>/, '<title data-suffix="">$1</title>');
}

/* Kirjoittaa turnauksen sivut ja äänipalojen luettelon. Palauttaa listan muuttuneista tiedostoista. */
function build(dir, dry) {
  const t = readTurnaus(dir), frozen = !!t.jaadytetty, changed = [];
  const write = (file, content) => {
    const old = exists(file) ? fs.readFileSync(file, 'utf8') : null;
    if (old === content) return;
    changed.push(rel(file)); if (!dry) fs.writeFileSync(file, content);
  };
  for (const f of fs.readdirSync(TEMPLATES)) {
    write(path.join(dir, f), render(fs.readFileSync(path.join(TEMPLATES, f), 'utf8'), t, dir, frozen));
  }
  const am = audioManifest(dir); if (am) write(path.join(dir, 'aanet', 'aanet.json'), am);
  return changed;
}

function cmdUusi() {
  const name = args[0];
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error('Anna kansion nimi pienillä kirjaimilla, esim. sjk-cup-2027');
  const dir = path.join(ROOT, name);
  if (exists(dir)) throw new Error(`Kansio ${name}/ on jo olemassa`);
  if (!opts.nimi) throw new Error('Anna turnauksen nimi: --nimi "SJK Cup P12"');
  fs.mkdirSync(path.join(dir, 'aanet'), { recursive: true });
  for (const f of fs.readdirSync(path.join(ENGINE_DIR, 'oletus'))) fs.copyFileSync(path.join(ENGINE_DIR, 'oletus', f), path.join(dir, f));
  writeTurnaus(dir, { id: name, nimi: opts.nimi, lyhytnimi: opts.lyhytnimi || '', kuvaus: opts.kuvaus || '', otsikkoliite: opts.otsikkoliite || '', vari: opts.vari || '#211e1e' });
  fs.writeFileSync(path.join(dir, 'aanet', 'LUEMINUT.md'), '# Turnauksen omat äänet\n\nTurnauksen omat kuulutukset ja äänipalat (mp3), esim. `tervetuloa.mp3`, `lopetus.mp3`, `joukkue-kpv.mp3`.\nTiedoston nimi = äänipalan tunnus. Kuulutuspaneelin kohta **Äänet** listaa puuttuvat palat ja niiden tekstit.\nYhteiset palat (luvut, tulokset, sijoitukset, tutut joukkueet) ovat moottorin kansiossa `pelipaiva/aanet/`.\nLisäämisen jälkeen aja `node pelipaiva/tyokalut/pelipaiva.mjs paivita`, joka päivittää luettelon `aanet.json`.\n');
  build(dir);
  console.log(`Luotu ${name}/. Esikatselu: /${name}/ (esimerkkidata, kunnes turnaus.js:ään lisätään SHEET_ID ja API_URL).`);
  console.log('Vaihda logot (logo-180.png, logo-512.png, icon-192.png, icon-512.png) tarvittaessa ja aja sitten paivita.');
}
function writeTurnaus(dir, t) {
  const line = (k, v, c) => `  ${k}: ${JSON.stringify(v)},${c ? ' // ' + c : ''}`;
  const body = [
    `/* ${t.nimi} – turnauksen asetukset (Pelipäivä). Sivut generoidaan näistä:`,
    `   node pelipaiva/tyokalut/pelipaiva.mjs paivita`,
    `   SHEET_ID ja API_URL tyhjänä = esikatselu esimerkkidatalla. PIN-koodit ovat vain Apps Scriptin ominaisuuksissa, eivät tässä. */`,
    'window.TURNAUS = {',
    line('id', t.id, 'kansion nimi; erottaa selaimen muistin muista turnauksista'),
    line('nimi', t.nimi, 'sivun otsikko ennen kuin taulukon tiedot latautuvat'),
    line('lyhytnimi', t.lyhytnimi || '', 'kotinäytön kuvakkeen nimi'),
    line('kuvaus', t.kuvaus || '', 'hakukoneille ja linkin esikatseluun'),
    line('otsikkoliite', t.otsikkoliite || '', 'esim. "· SJK P2015" selaimen välilehden otsikon perään'),
    line('vari', t.vari || '#211e1e', 'selaimen yläpalkin väri'),
    line('SHEET_ID', t.SHEET_ID || '', 'Google Sheetin tunnus'),
    line('API_URL', t.API_URL || '', 'Apps Script -verkkosovelluksen …/exec-osoite'),
    ...(t.jaadytetty ? [line('jaadytetty', t.jaadytetty, 'moottori kopioitu kansioon; ei päivity enää')] : []),
    '};', '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'turnaus.js'), body);
}

function cmdPaivita(dry) {
  const am = audioManifest(ENGINE_DIR), changed = [];
  if (am) { const f = path.join(ENGINE_DIR, 'aanet', 'aanet.json'); if (!exists(f) || fs.readFileSync(f, 'utf8') !== am) { changed.push(rel(f)); if (!dry) fs.writeFileSync(f, am); } }
  for (const dir of tournaments()) {
    const t = readTurnaus(dir);
    if (t.jaadytetty) { console.log(`${rel(dir)}/: jäädytetty ${t.jaadytetty}, ohitetaan`); continue; }
    changed.push(...build(dir, dry));
  }
  if (!changed.length) console.log('Kaikki ajan tasalla.');
  else console.log((dry ? 'Vanhentuneet:\n  ' : 'Päivitetty:\n  ') + changed.join('\n  '));
  if (dry && changed.length) process.exitCode = 1;
}

function cmdJaadyta() {
  const name = args[0], dir = name && path.join(ROOT, name);
  if (!dir || !exists(path.join(dir, 'turnaus.js'))) throw new Error('Anna turnauskansio, jossa on turnaus.js');
  const t = readTurnaus(dir);
  if (t.jaadytetty) throw new Error(`${name}/ on jo jäädytetty (${t.jaadytetty})`);
  for (const f of ENGINE_FILES) fs.copyFileSync(path.join(ENGINE_DIR, f), path.join(dir, f));
  // Yhteiset äänet ja logot: turnauksen omat tiedostot säilyvät, puuttuvat kopioidaan moottorista
  for (const sub of ['aanet', 'logot']) {
    const src = path.join(ENGINE_DIR, sub), dst = path.join(dir, sub);
    if (!exists(src)) continue; fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) if (f !== 'aanet.json' && !exists(path.join(dst, f))) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  }
  t.jaadytetty = new Date().toISOString().slice(0, 10);
  writeTurnaus(dir, t);
  build(dir);
  console.log(`${name}/ jäädytetty. Kansio on nyt itsenäinen: moottorin muutokset eivät enää vaikuta siihen.`);
}

try {
  if (cmd === 'uusi') cmdUusi();
  else if (cmd === 'paivita') cmdPaivita(false);
  else if (cmd === 'tarkista') cmdPaivita(true);
  else if (cmd === 'jaadyta') cmdJaadyta();
  else { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\* ?/, '')); process.exitCode = cmd ? 1 : 0; }
} catch (e) { console.error('Virhe: ' + e.message); process.exitCode = 1; }

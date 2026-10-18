/* Hakee tulokset ja sarjataulukot lähteistä (config/lahteet.json) ja päivittää datatiedostot.
   Ajetaan GitHub Actionsissa. Sivut avataan oikeassa selaimessa (Playwright), joten palvelujen omat suojaukset toimivat kuten tavallisella käyttäjällä.
   Jos jokin lähde epäonnistuu, sen vanha data säilyy ennallaan. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { palloliittoOttelut, taulukko, torneopalNimike, torneopalOttelu, turvallinen, ottelusivu } from './jasennys.mjs';

const JUURI = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const lue = p => JSON.parse(fs.readFileSync(path.join(JUURI, p), 'utf8'));
// Kirjoitetaan vain, jos sisältö oikeasti muuttui (päivityspäivämäärä ei yksin riitä muutokseksi)
const kirjoita = (p, d) => {
  const ilman = o => JSON.stringify({ ...o, updated: undefined });
  try { if (ilman(lue(p)) === ilman(d)) return; } catch { }
  fs.writeFileSync(path.join(JUURI, p), JSON.stringify(d, null, 1) + '\n');
  console.log('Päivitetty:', p);
};
const cfg = lue('config/lahteet.json');
// PAIVITA=palloliitto (kotikone), turnaukset (GitHub) tai kaikki
const MITA = process.env.PAIVITA || 'kaikki';
const tanaan = new Date().toISOString().slice(0, 10);
const varoitukset = [];
const tila = { piirisarjat: {}, huuhkajaliiga: {}, turnaukset: {} };
const varoita = msg => { varoitukset.push(msg); console.warn('VAROITUS:', msg); };

// Kotikoneella käytetään koneen omaa Chromea (SELAIN=chrome), jos se on asennettu
const selain = await chromium.launch(process.env.SELAIN ? { channel: process.env.SELAIN } : {});
// Englanninkielinen käyttöliittymä: ottelulistan tunniste on silloin "MATCH DETAILS" (sama kuin testatessa)
const sivu = await selain.newPage({ locale: 'en-US', viewport: { width: 1300, height: 1000 },
  ...(process.env.SELAIN ? {} : { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' }) });
sivu.setDefaultTimeout(30000);

/* ---------- Palloliiton tulospalvelu ---------- */
// Palloliiton sivun taustakutsut (JSON) talteen: luotettavampi lähde kuin sivun teksti
const restVastaukset = [];
sivu.on('response', async r => {
  const u = r.url();
  if (!/torneopal\.net\/taso\/rest\//.test(u)) return;
  try { const t = await r.text(); restVastaukset.push({ url: u.replace(/hash=[^&]+/, 'hash=…'), status: r.status(), koko: t.length, alku: t.slice(0, 300) }); } catch { }
});
async function palloliittoTeksti(url, odota) {
  restVastaukset.length = 0;
  await sivu.goto(url, { waitUntil: 'domcontentloaded' });
  try { await sivu.waitForFunction(t => (document.querySelector('main')?.innerText || '').includes(t), odota, { timeout: 20000 }); }
  catch { /* ei otteluita tai hidas sivu: palautetaan mitä on */ }
  await sivu.waitForTimeout(800);
  return (await sivu.evaluate(() => document.querySelector('main')?.innerText || '')).split('\n');
}
const diagnoosi = {};
async function palloliittoJoukkue(id) {
  const raaka = await palloliittoTeksti(`https://tulospalvelu.palloliitto.fi/team/${id}/results`, 'MATCH DETAILS');
  const tulokset = palloliittoOttelut(raaka, cfg.kausi);
  // Otteluiden tunnisteet (ottelutietoja varten): jokaisen ottelukortin linkki ja kortin teksti
  const kortit = await sivu.evaluate(() => [...document.querySelectorAll('main a[href*="/match/"]')].map(a => {
    let c = a; while (c.parentElement && !/\d+–\d+/.test(c.innerText)) c = c.parentElement;
    return { id: (a.getAttribute('href').match(/match\/(\d+)/) || [])[1], L: c.innerText.split('\n').map(s => s.trim()).filter(Boolean) };
  }));
  const kaytetty = new Set();
  for (const m of tulokset) {
    const k = kortit.find(k => k.id && !kaytetty.has(k.id) && k.L.includes(m.home) && k.L.includes(m.away));
    if (k) { m.pid = k.id; kaytetty.add(k.id); }
  }
  if (!tulokset.length) diagnoosi[id] = {
    url: sivu.url(), otsikko: await sivu.title(),
    main: await sivu.evaluate(() => !!document.querySelector('main')),
    teksti: (await sivu.evaluate(() => document.body ? document.body.innerText : '')).replace(/\s+/g, ' ').slice(0, 500),
    rest: restVastaukset.slice(0, 8)
  };
  const tulevat = palloliittoOttelut(await palloliittoTeksti(`https://tulospalvelu.palloliitto.fi/team/${id}/fixture`, 'MATCH DETAILS'), cfg.kausi).filter(m => !m.score);
  return [...tulokset, ...tulevat];
}
async function palloliittoTaulukko(url) {
  await sivu.goto(url, { waitUntil: 'domcontentloaded' });
  try { await sivu.waitForSelector('main table tr td', { timeout: 20000 }); } catch { return null; }
  await sivu.waitForTimeout(800);
  const { otsikot, rivit } = await sivu.evaluate(() => {
    const t = document.querySelector('main table');
    return { otsikot: [...t.querySelector('tr').children].map(c => c.innerText.trim()), rivit: [...t.querySelectorAll('tr')].slice(1).map(r => [...r.children].map(c => c.innerText.trim().replace(/\s+/g, ' '))) };
  });
  return taulukko(otsikot, rivit);
}

async function paivitaPiirisarjat() {
  const d = lue('piirisarja/data.json');
  for (const j of cfg.piirisarjat) {
    const t = d.teams.find(x => x.id === j.id) || (d.teams.push({ id: j.id, name: j.nimi, level: j.taso, taso: `https://tulospalvelu.palloliitto.fi/team/${j.id}/results`, matches: [], tables: [] }), d.teams.at(-1));
    t.name = j.nimi; t.level = j.taso;
    try {
      const kaikki = await palloliittoJoukkue(j.id);
      const sarja = kaikki.filter(m => !/HUUHKAJALIIGA/i.test(m.series));
      // Säilytetään ottelutietojen linkitys (pid) vanhoista otteluista
      for (const m of sarja) { const v = t.matches.find(x => x.date === m.date && x.home === m.home && x.away === m.away); if (v && v.pid) m.pid = v.pid; }
      if (turvallinen(t.matches, sarja)) t.matches = sarja; else varoita(`${j.nimi}: haku palautti vähemmän pelattuja otteluita kuin ennen, vanhat säilytetty`);
      t._hh = kaikki.filter(m => /HUUHKAJALIIGA/i.test(m.series));
      tila.piirisarjat[j.nimi] = { ottelut: kaikki.length, pelatut: kaikki.filter(m => m.score).length };
    } catch (e) { varoita(`${j.nimi}: ${e.message}`); }
    const uudet = [];
    for (const tb of j.taulukot || []) {
      try { const rows = await palloliittoTaulukko(tb.url); const vanha = (t.tables || []).find(x => x.url === tb.url); uudet.push(rows ? { name: tb.nimi, url: tb.url, rows } : vanha || { name: tb.nimi, url: tb.url, rows: [] }); }
      catch (e) { varoita(`${tb.nimi}: ${e.message}`); const vanha = (t.tables || []).find(x => x.url === tb.url); if (vanha) uudet.push(vanha); }
    }
    t.tables = uudet;
    if (tila.piirisarjat[j.nimi]) tila.piirisarjat[j.nimi].taulukot = uudet.filter(x => x.rows && x.rows.length).length;
  }
  const hh = Object.fromEntries(d.teams.map(t => [t.name, t._hh || []]));
  d.teams.forEach(t => delete t._hh);
  d.updated = tanaan;
  kirjoita('piirisarja/data.json', d);
  return hh;
}

/* Ottelutiedot (aika, kenttä, puoliaikatulos, maalit pelinumeroina) otteluille, joilta ne puuttuvat */
async function paivitaOttelutiedot() {
  const det = (() => { try { return lue('piirisarja/ottelut.json'); } catch { return {}; } })();
  const p = lue('piirisarja/data.json'), e = lue('eerikkila/data.json');
  const ottelut = [...p.teams.flatMap(t => t.matches), ...e.events.flatMap(ev => ev.matches)].filter(m => m.pid && m.score && !det[m.pid]);
  let haettu = 0;
  for (const m of ottelut.slice(0, 40)) {
    try {
      await sivu.goto(`https://tulospalvelu.palloliitto.fi/match/${m.pid}/shotmap`, { waitUntil: 'domcontentloaded' });
      await sivu.waitForFunction(() => /PÄÄTTYNYT|ENDED/i.test(document.querySelector('main')?.innerText || ''), null, { timeout: 20000 });
      await sivu.waitForTimeout(800);
      const o = ottelusivu(await sivu.evaluate(() => document.querySelector('main').innerText));
      const rec = { time: o.time, venue: o.venue };
      if (o.ht) rec.ht = o.ht;
      if (!o.tupla && o.goals.length) rec.goals = o.goals;
      det[m.pid] = rec; haettu++;
    } catch (err) { varoita(`Ottelutiedot ${m.pid}: ${err.message.split('\n')[0]}`); }
  }
  tila.ottelutiedot = { haettu, puuttui: ottelut.length };
  if (haettu) fs.writeFileSync(path.join(JUURI, 'piirisarja/ottelut.json'), JSON.stringify(det) + '\n');
}

async function paivitaHuuhkajaliiga(hh) {
  const d = lue('eerikkila/data.json');
  for (const h of cfg.huuhkajaliiga) {
    const ev = d.events.find(e => e.id === h.id); if (!ev) { varoita(`Huuhkajaliiga ${h.id}: tapahtumaa ei löydy eerikkila/data.json-tiedostosta`); continue; }
    const haetut = (hh[h.joukkue] || []).filter(m => m.date >= h.alku && m.date <= h.loppu);
    // Päivitetään tulokset ohjelmaan; uusia otteluita lisätään, jos ohjelmassa ei ole niitä
    for (const m of haetut) {
      // Nimet voivat olla ohjelmassa lyhyempiä (esim. "P-Iirot" vs "P-Iirot/kelt"), joten verrataan nimien alkuja
      const ydin = n => String(n).toLowerCase().replace(/[^a-zäöå]/g, '').slice(0, 4);
      const vanha = ev.matches.find(x => x.date === m.date && ydin(x.home) === ydin(m.home) && ydin(x.away) === ydin(m.away));
      if (vanha) { vanha.home = m.home; vanha.away = m.away; if (m.score) vanha.score = m.score; if (m.time && !vanha.time) vanha.time = m.time; if (m.pid && !vanha.pid) vanha.pid = m.pid; }
      else ev.matches.push({ ...m, series: 'P11 HUUHKAJALIIGA' });
    }
    tila.huuhkajaliiga[h.id] = { haetut: haetut.length, pelatut: haetut.filter(m => m.score).length };
    try { const rows = await palloliittoTaulukko(h.taulukko); tila.huuhkajaliiga[h.id].taulukko = rows ? rows.length : 0; if (rows) ev.table = { ...(ev.table || {}), url: h.taulukko, rows }; }
    catch (e) { varoita(`Huuhkajaliiga ${h.id} taulukko: ${e.message}`); }
  }
  d.updated = tanaan;
  kirjoita('eerikkila/data.json', d);
}

/* ---------- Turnaukset ---------- */
async function torneopal(url, suodatin) {
  // Avataan suoraan palvelimen tuottama seurasivu: turnauksen etusivu voi ohjata uudempaan turnaukseen
  await sivu.goto('about:blank');
  await sivu.goto(new URL('/taso/seurat.php', url).href, { waitUntil: 'domcontentloaded' });
  const raaka = await sivu.evaluate(async (suodatin) => {
    const re = new RegExp(suodatin, 'i');
    const base = location.origin + '/taso/seurat.php';
    const html = async u => new DOMParser().parseFromString(await (await fetch(u)).text(), 'text/html');
    const g = (li, c) => { const e = li.querySelector('.' + c); return e ? e.textContent.trim().replace(/\s+/g, ' ') : ''; };
    const d = await html(base), res = [];
    for (const s of [...d.querySelectorAll('a')].filter(x => /SJK/.test(x.innerText))) {
      const seura = new URL(s.getAttribute('href'), base).href, dd = await html(seura);
      for (const x of [...dd.querySelectorAll('a')].filter(x => /joukkue\.php/.test(x.getAttribute('href') || ''))) {
        const nimike = (x.closest('tr') || x).innerText.trim().replace(/\s+/g, ' ');
        if (!re.test(nimike)) continue;
        const d3 = await html(new URL(x.getAttribute('href'), seura).href);
        let pv = ''; const rivit = []; const w = d3.createTreeWalker(d3.body, 1); let n;
        while ((n = w.nextNode())) {
          if (n.matches('li.match')) { rivit.push([g(n, 'ml_pvm') || pv, g(n, 'ml_sarja'), g(n, 'ml_kotisiisti'), g(n, 'ml_tulosklo'), g(n, 'ml_vierassiisti')]); continue; }
          if (n.children.length === 0) { const m = (n.textContent || '').trim().match(/^(?:[A-Za-zäö]{2}\s)?(\d{1,2}\.\d{1,2}\.(\d{4})?)$/); if (m) pv = m[1]; }
        }
        const nimi = (d3.querySelector('h1,h2,h3')?.textContent || '').trim().replace(/\s+/g, ' ');
        // Sijoitus: joukkueen sarjan (yleisin sarjakoodi otteluissa) sivun "Sijoitukset"-listasta
        const koodit = rivit.map(r => r[1]).filter(Boolean);
        const koodi = koodit.sort((a, b) => koodit.filter(v => v === b).length - koodit.filter(v => v === a).length)[0];
        const sarjaUrl = [...d3.querySelectorAll('a')].map(a => new URL(a.getAttribute('href') || '', location.origin + '/taso/')).find(q => /sarja\.php/.test(q.pathname) && q.searchParams.get('sarja') === koodi);
        let sijat = [];
        if (sarjaUrl) { const ds = await html(sarjaUrl.href); const box = ds.querySelector('.sijoitukset'); if (box) sijat = box.innerHTML.split(/<br\s*\/?>/i).map(z => z.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()).filter(z => /^\d+\./.test(z)); }
        res.push({ nimike, nimi, rivit, sijat });
      }
    }
    return res;
  }, suodatin || 'P11|2015');
  return raaka.map(r => {
    const n = torneopalNimike(r.nimike);
    const matches = r.rivit.map(x => torneopalOttelu(x, cfg.kausi)).filter(Boolean);
    const omat = [...new Set(matches.flatMap(m => [m.home, m.away]).filter(t => /SJK/.test(t)))];
    const laske = {}; matches.forEach(m => [m.home, m.away].filter(t => /SJK/.test(t)).forEach(t => laske[t] = (laske[t] || 0) + 1));
    const name = Object.entries(laske).sort((a, b) => b[1] - a[1])[0]?.[0] || omat[0] || r.nimi || 'SJK-j';
    const osuma = r.sijat.find(z => z.replace(/^\d+\.\s*/, '') === name);
    const place = osuma ? { pos: parseInt(osuma, 10), of: r.sijat.length } : undefined;
    return { name, label: n.label, level: n.level, place, matches };
  });
}

async function gameResultsOnline(url, paiva) {
  await sivu.goto(url, { waitUntil: 'domcontentloaded' });
  return sivu.evaluate(async (paiva) => {
    const linkit = [...document.querySelectorAll('a')].filter(a => /\/games$/.test(new URL(a.href).pathname) && a.innerText.trim());
    const nahty = new Set(), res = [];
    for (const a of linkit) {
      if (nahty.has(a.href)) continue; nahty.add(a.href);
      const d = new DOMParser().parseFromString(await (await fetch(a.href)).text(), 'text/html');
      const ms = [];
      for (const r of d.querySelectorAll('.schedule-game-row')) {
        const rivi = r.querySelectorAll('.row')[1]; if (!rivi) continue;
        const solut = [...rivi.children].map(c => c.textContent.trim().replace(/\s+/g, ' '));
        if (!/SJK/.test(solut.join(' '))) continue;
        const sc = (r.querySelector('.schedule-game-result')?.textContent || '').replace(/Päättynyt|Ended|Final/g, '').trim().replace(/\s+/g, ' ');
        ms.push({ time: (r.querySelector('.col-2')?.textContent || '').trim().replace(':', '.'), home: solut[0], away: solut[solut.length - 1], sc });
      }
      let place;
      try {
        const g = new DOMParser().parseFromString(await (await fetch(a.href.replace(/\/games$/, '/groups'))).text(), 'text/html');
        for (const tb of g.querySelectorAll('table')) {
          const rivit = [...tb.querySelectorAll('tr')].slice(1).map(r => [...r.children].map(c => c.textContent.trim().replace(/\s+/g, ' ')));
          const i = rivit.findIndex(c => c.some(x => /^SJK/.test(x)));
          if (i >= 0) { place = { pos: parseInt(rivit[i][0], 10) || i + 1, of: rivit.length }; break; }
        }
      } catch { }
      // Sarjan nimi sivun otsikosta ("Otteluohjelma - Kilpa | …"), linkin teksti on usein vain "Otteluohjelma"
      const otsikko = (d.title || '').split('|')[0];
      const label = (otsikko.includes(' - ') ? otsikko.split(' - ').slice(1).join(' - ') : a.innerText).trim();
      if (ms.length) res.push({ label, ms, place });
    }
    return res;
  }, paiva).then(res => res.map(r => ({
    name: (r.ms.flatMap(m => [m.home, m.away]).find(t => /SJK/.test(t))) || 'SJK',
    label: r.label, level: r.label, place: r.place,
    matches: r.ms.map(m => { const t = /^(\d+)\s*[–-]\s*(\d+)$/.exec(m.sc); return { date: paiva, time: m.time || undefined, series: r.label, home: m.home, away: m.away, score: t ? [[+t[1], +t[2]]] : null }; })
  })));
}

async function paivitaTurnaukset() {
  const d = lue('turnaukset/data.json');
  for (const tc of cfg.turnaukset) {
    const ev = d.events.find(e => e.id === tc.id);
    if (!ev) { varoita(`Turnaus ${tc.id}: lisää nimi, päivät ja paikka turnaukset/data.json-tiedostoon (tai pyydä Claudea)`); continue; }
    if (tc.tyyppi === 'oma' || !tc.url || tc.valmis) continue;
    try {
      const teams = tc.tyyppi === 'torneopal' ? await torneopal(tc.url, tc.suodatin) : tc.tyyppi === 'gameresultsonline' ? await gameResultsOnline(tc.url, tc.paiva) : null;
      if (!teams) { varoita(`Turnaus ${tc.id}: tuntematon tyyppi ${tc.tyyppi}`); continue; }
      tila.turnaukset[tc.id] = { joukkueet: teams.length, ottelut: teams.reduce((n, t) => n + t.matches.length, 0) };
      if (!teams.length) { varoita(`Turnaus ${tc.id}: SJK:n joukkueita ei löytynyt`); continue; }
      const vanhat = ev.teams || [];
      const uudet = teams.map(t => { const v = vanhat.find(x => x.label.toLowerCase() === t.label.toLowerCase()); return { ...t, label: v?.label || t.label, level: v?.level || t.level, place: t.place || v?.place }; });
      if (turvallinen(vanhat.flatMap(t => t.matches), uudet.flatMap(t => t.matches))) { ev.teams = uudet; ev.link = ev.link || tc.url; }
      else varoita(`Turnaus ${tc.id}: haku palautti vähemmän pelattuja otteluita kuin ennen, vanhat säilytetty`);
    } catch (e) { varoita(`Turnaus ${tc.id}: ${e.message}`); }
  }
  d.updated = tanaan;
  kirjoita('turnaukset/data.json', d);
}

try {
  if (MITA !== 'turnaukset') {
    const hh = await paivitaPiirisarjat();
    await paivitaHuuhkajaliiga(hh);
    await paivitaOttelutiedot();
  }
  if (MITA !== 'palloliitto') await paivitaTurnaukset();
} finally { await selain.close(); }

// Ajon tila talteen (ei aikaleimaa, joten tiedosto muuttuu vain kun tilanne muuttuu)
fs.writeFileSync(path.join(JUURI, `scripts/paivitys/tila-${MITA}.json`), JSON.stringify({ ...tila, varoitukset, diagnoosi }, null, 1) + '\n');
if (varoitukset.length) {
  fs.writeFileSync(path.join(JUURI, 'scripts/paivitys/varoitukset.txt'), varoitukset.join('\n') + '\n');
  // Varoitukset eivät kaada ajoa, mutta GitHub näyttää ne ajon yhteenvedossa
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Varoitukset\n' + varoitukset.map(v => '- ' + v).join('\n') + '\n');
}
console.log(`Valmis. Varoituksia: ${varoitukset.length}`);

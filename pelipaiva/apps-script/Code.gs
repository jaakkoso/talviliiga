/**
 * Pelipäivä – tulospalvelun tallennuspalvelu (Google Apps Script, sidottu turnauksen Google Sheetiin).
 *
 * Käyttöönotto (tarkemmin pelipaiva/README.md):
 * 1. Turnauksen Google Sheet → Laajennukset → Apps Script, liitä tämä tiedosto, tallenna.
 * 2. Projektin asetukset → Skriptin ominaisuudet: ADMIN_PIN, PIN_TUOMARI ja PIN_KENTTA,
 *    kukin 6–8 numeroa ja kaikki eri koodit. Koodit eivät näy missään muualla. Vaihda koodit joka turnaukseen.
 * 3. Aja kerran funktio setup(): luo puuttuvat välilehdet otsikkoriveineen.
 * 4. Ota käyttöön → Uusi käyttöönotto → Verkkosovellus: Suorita käyttäjänä: Minä · Pääsy: Kaikki.
 *    Kopioi …/exec-osoite turnauskansion turnaus.js-tiedostoon (API_URL).
 * 5. Turnauksen jälkeen: Ota käyttöön → Hallinnoi käyttöönottoja → Arkistoi. Tulossivu toimii edelleen
 *    (lukee taulukkoa), mutta tuloksia ei voi enää muuttaa.
 *
 * Tietoturva:
 * - Taulukko on julkinen (Kuka tahansa linkin saanut: Katselija), koska tulossivu lukee sen. Siksi taulukkoon ei
 *   kirjoiteta mitään yksityistä: pelaajien numerolistat ja (asetuksella nayta_pelinumerot ≠ kyllä) maalintekijöiden
 *   numerot tallentuvat skriptin ominaisuuksiin, jotka näkee vain ylläpitäjä.
 * - PIN-koodilla kirjaudutaan kerran. Palvelin antaa laitteelle istuntotunnisteen (voimassa 4 vrk), jota käytetään
 *   PINin sijaan. Laitteelle ei jää PIN-koodia.
 * - Väärät PIN-yritykset hidastetaan, ja toistuvat yritykset lukitsevat uudet kirjautumiset määräajaksi (ylläpitäjä saa
 *   sähköpostin). Jo kirjautuneet toimitsijat voivat jatkaa lukituksen aikana, joten arvaaja ei voi pysäyttää turnausta.
 * - Jokainen toiminto tarkistetaan roolin mukaan palvelimella. Ylläpidon hyväksymää tulosta voi muuttaa vain ylläpito.
 * - Syötteet tarkistetaan, ja tekstit kirjoitetaan taulukkoon niin, ettei niitä tulkita kaavoiksi.
 * - Kaikki istunnot voi mitätöidä ajamalla funktion mitatoiIstunnot() (esim. jos puhelin katoaa).
 */

const SETTINGS_HEAD = ['avain', 'arvo', 'selitys'];
const TEAM_HEAD = ['nimi', 'tausta', 'teksti', 'reuna', 'reunatyyli', 'logo', 'lausunta', 'veo'];
const MATCH_HEAD = ['id', 'sarja', 'päivä', 'alku', 'kenttä', 'koti', 'vieras', 'koti_maalit', 'vieras_maalit', 'tila', 'veo', 'vahvistaja', 'muokattu'];
const GOAL_HEAD = ['id', 'ottelu', 'joukkue', 'pelinumero', 'minuutti', 'kirjattu'];
const ADJ_HEAD = ['id', 'sarja', 'joukkue', 'pisteet', 'tehdyt', 'päästetyt', 'sija', 'selite', 'muokattu'];
const CAFE_HEAD = ['ryhmä', 'tuote', 'hinta'];
const ANN_HEAD = ['tunnus', 'otsikko', 'teksti', 'milloin', 'päivä'];
const DEFAULT_SETTINGS = [
  ['nimi', 'Turnaus', 'Turnauksen nimi'], ['alaotsikko', '', 'Esim. P12 · Kilpa & Haaste'], ['paikka', '', 'Esim. Wallsport, Seinäjoki'],
  ['paiva', '', 'Ensimmäinen päivä, esim. 2027-04-10'], ['ottelun_kesto', '30', 'Minuuttia'], ['nayta_sarjataulukko', 'kyllä', ''],
  ['nayta_pelinumerot', 'ei', 'kyllä = maalintekijöiden numerot julkisiksi. ei = numerot vain toimitsijoille.'],
  ['tauko_teksti', '', ''], ['jarjestaja', '', ''], ['nayta_logot', 'kyllä', ''], ['viimeisin_testi', '', 'Yhteystesti ja kuulutusten kauko-ohjaus (sovellus täyttää)'],
];

const TZ = 'Europe/Helsinki';
const ROLES = ['admin', 'tuomari', 'kentta'];
/* Kuka saa tehdä mitä. Kaikki muu on kielletty. */
const ALLOWED = {
  check: ROLES, getRoster: ROLES, setRoster: ROLES, getGoalNumbers: ROLES, goal: ROLES, deleteGoal: ROLES,
  result: ['admin', 'tuomari'],
  setStatus: ['admin'], setTime: ['admin'], shift: ['admin'], setAdjust: ['admin'], ping: ['admin'], roles: ['admin'],
};
const STATUSES = ['', 'peruttu', 'hyväksytty', 'käynnissä'];
const SESSION_DAYS = 4;
const FAIL_WINDOW_S = 600;     // väärien yritysten laskenta-aika
const FAIL_LIMIT = 15;         // näin monta väärää yritystä 10 minuutissa → uudet kirjautumiset lukkoon
const LOCK_BASE_S = 900;       // lukitus 15 min, toistuessa kaksinkertaistuu (enintään 6 h)
const MAX_BODY = 20000;
const MAX_GOALS_PER_MATCH = 60;

/* ===================== verkkosovellus ===================== */

function doGet() { return json({ ok: true, service: 'Pelipäivä' }); }

function doPost(e) {
  let body;
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY) return json({ ok: false, error: 'bad_request' });
    body = JSON.parse(raw);
  } catch (err) { return json({ ok: false, error: 'bad_request' }); }
  if (!body || typeof body !== 'object' || typeof body.action !== 'string') return json({ ok: false, error: 'bad_request' });
  if (!Object.prototype.hasOwnProperty.call(ALLOWED, body.action)) return json({ ok: false, error: 'unknown_action' });

  const auth = authenticate(body.pin);
  if (auth.error) return json({ ok: false, error: auth.error, wait: auth.wait });
  const role = auth.role;
  if (ALLOWED[body.action].indexOf(role) < 0) return json({ ok: false, error: 'forbidden' });

  try {
    switch (body.action) {
      case 'check': return json({ ok: true, role: role, admin: role === 'admin', token: auth.token || makeToken(role) });
      case 'roles': return json(rolesStatus());
      case 'getRoster': return json({ ok: true, roster: getRoster() });
      case 'getGoalNumbers': return json({ ok: true, numbers: getPrivateNumbers() });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      switch (body.action) {
        case 'ping': return json(actPing(body));
        case 'goal': return json(actGoal(body, role));
        case 'deleteGoal': return json(actDeleteGoal(body, role));
        case 'result': return json(actResult(body, role));
        case 'setStatus': return json(actSetStatus(body));
        case 'setTime': return json(actSetTime(body));
        case 'shift': return json(actShift(body));
        case 'setAdjust': return json(actSetAdjust(body));
        case 'setRoster': return json(actSetRoster(body));
      }
    } finally { lock.releaseLock(); }
  } catch (err) {
    console.error(body.action + ': ' + (err && err.stack || err));
    return json({ ok: false, error: 'server' });
  }
  return json({ ok: false, error: 'unknown_action' });
}

/* ===================== tunnistautuminen ===================== */

function props() { return PropertiesService.getScriptProperties(); }
function validPin(p) { return typeof p === 'string' && /^\d{6,8}$/.test(p); }
function pins() {
  const p = props();
  return { admin: p.getProperty('ADMIN_PIN') || '', tuomari: p.getProperty('PIN_TUOMARI') || '', kentta: p.getProperty('PIN_KENTTA') || '' };
}
/* Vertailu, joka kestää yhtä kauan riippumatta siitä, missä kohtaa merkkijonot eroavat */
function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function authenticate(cred) {
  cred = typeof cred === 'string' ? cred : '';
  if (cred.indexOf('T1.') === 0) {
    const role = verifyToken(cred);
    return role ? { role: role, token: cred } : { error: 'pin' };   // vanhentunut tai väärä istunto → kirjaudu uudelleen
  }
  const cache = CacheService.getScriptCache();
  const lockedUntil = Number(cache.get('lock_until') || 0);
  if (lockedUntil > Date.now()) return { error: 'locked', wait: Math.ceil((lockedUntil - Date.now()) / 60000) };
  if (validPin(cred)) {
    const all = pins();
    for (let i = 0; i < ROLES.length; i++) { const r = ROLES[i]; if (validPin(all[r]) && safeEqual(cred, all[r])) return { role: r }; }
  }
  registerFail(cache);
  Utilities.sleep(1500);   // hidastaa arvaamista
  return { error: 'pin' };
}
function registerFail(cache) {
  const fails = Number(cache.get('fails') || 0) + 1;
  if (fails < FAIL_LIMIT) { cache.put('fails', String(fails), FAIL_WINDOW_S); return; }
  cache.remove('fails');
  const n = Number(cache.get('lock_count') || 0) + 1;
  cache.put('lock_count', String(n), 21600);
  const secs = Math.min(21600, LOCK_BASE_S * Math.pow(2, n - 1));
  cache.put('lock_until', String(Date.now() + secs * 1000), secs);
  notifyAdmin('Tulospalvelu: kirjautumiset lukittu ' + Math.round(secs / 60) + ' min',
    'Tulospalveluun yritettiin kirjautua väärällä PIN-koodilla ' + FAIL_LIMIT + ' kertaa 10 minuutissa. Uudet kirjautumiset on lukittu ' +
    Math.round(secs / 60) + ' minuutiksi. Jo kirjautuneet toimitsijat voivat jatkaa.\n\nJos tämä ei ollut oma testi, vaihda PIN-koodit ' +
    '(Apps Script → Projektin asetukset → Skriptin ominaisuudet) ja aja mitatoiIstunnot().');
}
function sessionSecret() {
  const p = props();
  let s = p.getProperty('ISTUNTO_AVAIN');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('ISTUNTO_AVAIN', s); }
  return s;
}
function sign(text) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, sessionSecret())).replace(/=+$/, ''); }
function makeToken(role) {
  const exp = (Date.now() + SESSION_DAYS * 864e5).toString(36);
  const payload = role + '.' + exp;
  return 'T1.' + payload + '.' + sign(payload);
}
function verifyToken(t) {
  const parts = String(t).split('.');
  if (parts.length !== 4 || ROLES.indexOf(parts[1]) < 0) return null;
  const payload = parts[1] + '.' + parts[2];
  if (!safeEqual(sign(payload), parts[3])) return null;
  if (parseInt(parts[2], 36) < Date.now()) return null;
  return parts[1];
}
/** Mitätöi kaikkien laitteiden kirjautumiset (aja käsin esim. PIN-koodien vaihdon tai kadonneen puhelimen jälkeen). */
function mitatoiIstunnot() { props().deleteProperty('ISTUNTO_AVAIN'); console.log('Kaikki istunnot mitätöity. Toimitsijat kirjautuvat uudelleen PIN-koodilla.'); }
function rolesStatus() {
  const all = pins();
  const ok = r => validPin(all[r]);
  const distinct = ok('tuomari') && ok('kentta') && all.tuomari !== all.kentta && all.tuomari !== all.admin && all.kentta !== all.admin;
  return { ok: true, admin: ok('admin'), tuomari: ok('tuomari'), kentta: ok('kentta'), eri: distinct };
}

/* ===================== taulukko ===================== */

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheetFor(name, head) {
  const s = ss();
  let sh = s.getSheetByName(name);
  if (!sh) { sh = s.insertSheet(name); sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
/* Taulukko olioina: { sh, head: {sarake: indeksi}, rows: [[…]] } – sarakkeiden järjestyksellä ei ole väliä */
function table(name, head) {
  const sh = sheetFor(name, head);
  const values = sh.getDataRange().getValues();
  const top = (values[0] || []).map(h => String(h).trim().toLowerCase());
  head.forEach(h => { if (top.indexOf(h) < 0) { top.push(h); sh.getRange(1, top.length).setValue(h).setFontWeight('bold'); } });
  const idx = {}; top.forEach((h, i) => { if (h) idx[h] = i; });
  return { sh: sh, idx: idx, width: top.length, rows: values.slice(1) };
}
function val(t, row, col) { const i = t.idx[col]; return i == null ? '' : row[i]; }
function setCell(t, rowIndex, col, value) { t.sh.getRange(rowIndex + 2, t.idx[col] + 1).setValue(value); }
/* Teksti taulukkoon: ohjausmerkit pois, pituusraja, eikä =, +, -, @ -alkuista tekstiä tulkita kaavaksi */
function cleanText(s, max) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
function intIn(v, lo, hi) { if (v === '' || v == null) return null; const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : undefined; }
function now() { return Utilities.formatDate(new Date(), TZ, 'd.M. HH.mm.ss'); }
function parseTime(t) {
  const s = String(t == null ? '' : t).trim().replace(':', '.'); const m = s.match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!m) return null; const h = +m[1], mi = m[2] ? +(m[2].length === 1 ? m[2] + '0' : m[2]) : 0;
  return h <= 23 && mi <= 59 ? h * 60 + mi : null;
}
function fmt(min) { return ('0' + Math.floor(min / 60)).slice(-2) + '.' + ('0' + (min % 60)).slice(-2); }
function setting(key) {
  const t = table('Asetukset', SETTINGS_HEAD);
  for (let i = 0; i < t.rows.length; i++) if (String(val(t, t.rows[i], 'avain')).trim().toLowerCase() === key) return String(val(t, t.rows[i], 'arvo'));
  return '';
}
function yes(v) { return /^(k|kyllä|kylla|true|1|x|on)$/i.test(String(v || '').trim()); }
function matchInfo(t, id) {
  if (!ID_RE.test(String(id))) return null;
  for (let i = 0; i < t.rows.length; i++) if (String(val(t, t.rows[i], 'id')) === String(id)) {
    const r = t.rows[i];
    return { i: i, home: String(val(t, r, 'koti')).trim(), away: String(val(t, r, 'vieras')).trim(), series: String(val(t, r, 'sarja')).trim(),
      tila: String(val(t, r, 'tila')).trim().toLowerCase(), final: val(t, r, 'koti_maalit') !== '' && val(t, r, 'vieras_maalit') !== '', alku: val(t, r, 'alku') };
  }
  return null;
}
/* Ylläpidon hyväksymää tulosta saa muuttaa vain ylläpito; kenttävastaava ei kirjaa maaleja vahvistetun tuloksen jälkeen */
function guard(m, role, isGoal) {
  if (role === 'admin') return null;
  if (m.tila === 'hyväksytty') return 'locked_result';
  if (m.tila === 'peruttu') return 'cancelled';
  if (isGoal && role === 'kentta' && m.final) return 'final';
  return null;
}

/* ===================== toiminnot ===================== */

function actPing(b) {
  const v = String(b.value == null ? '' : b.value);
  if (v.length > 200 || !/^[\w|:.\-]*$/.test(v)) return { ok: false, error: 'bad_request' };
  const t = table('Asetukset', SETTINGS_HEAD);
  for (let i = 0; i < t.rows.length; i++) if (String(val(t, t.rows[i], 'avain')).trim() === 'viimeisin_testi') { setCell(t, i, 'arvo', v); return { ok: true }; }
  t.sh.appendRow(['viimeisin_testi', v, 'Yhteystesti ja kuulutusten kauko-ohjaus (sovellus täyttää)']);
  return { ok: true };
}

function actGoal(b, role) {
  const g = b.goal || {};
  if (!ID_RE.test(String(g.id || ''))) return { ok: false, error: 'bad_request' };
  const mt = table('Ottelut', MATCH_HEAD), m = matchInfo(mt, g.match);
  if (!m) return { ok: false, error: 'no_match' };
  const err = guard(m, role, true); if (err) return { ok: false, error: err };
  const team = String(g.team || '').trim();
  if (team !== m.home && team !== m.away) return { ok: false, error: 'bad_request' };
  const no = String(g.no == null ? '' : g.no).trim();
  if (no && !/^\d{1,2}$/.test(no)) return { ok: false, error: 'bad_request' };
  const min = intIn(g.min, 0, 150); if (min === undefined) return { ok: false, error: 'bad_minute' };
  const pub = yes(setting('nayta_pelinumerot'));
  const t = table('Maalit', GOAL_HEAD);
  let at = -1, count = 0;
  for (let i = 0; i < t.rows.length; i++) {
    if (String(val(t, t.rows[i], 'ottelu')) === String(g.match)) count++;
    if (String(val(t, t.rows[i], 'id')) === String(g.id)) at = i;
  }
  if (at >= 0 && String(val(t, t.rows[at], 'ottelu')) !== String(g.match)) return { ok: false, error: 'bad_request' };
  if (at < 0 && count >= MAX_GOALS_PER_MATCH) return { ok: false, error: 'bad_request' };
  const row = new Array(t.width).fill('');
  row[t.idx.id] = String(g.id); row[t.idx['ottelu']] = String(g.match); row[t.idx['joukkue']] = team;
  row[t.idx['pelinumero']] = pub ? no : ''; row[t.idx['minuutti']] = min == null ? '' : min; row[t.idx['kirjattu']] = now() + ' ' + role;
  if (at >= 0) t.sh.getRange(at + 2, 1, 1, t.width).setValues([row]); else t.sh.appendRow(row);
  setPrivateNumber(g.id, pub ? '' : no);
  return { ok: true };
}

function actDeleteGoal(b, role) {
  if (!ID_RE.test(String(b.id || ''))) return { ok: false, error: 'bad_request' };
  const t = table('Maalit', GOAL_HEAD);
  for (let i = 0; i < t.rows.length; i++) if (String(val(t, t.rows[i], 'id')) === String(b.id)) {
    const m = matchInfo(table('Ottelut', MATCH_HEAD), val(t, t.rows[i], 'ottelu'));
    if (m) { const err = guard(m, role, true); if (err) return { ok: false, error: err }; }
    t.sh.deleteRow(i + 2); setPrivateNumber(b.id, ''); return { ok: true };
  }
  return { ok: true };   // jo poistettu
}

function actResult(b, role) {
  const t = table('Ottelut', MATCH_HEAD), m = matchInfo(t, b.match);
  if (!m) return { ok: false, error: 'no_match' };
  const err = guard(m, role, false); if (err) return { ok: false, error: err };
  const clear = (b.hg === '' || b.hg == null) && (b.ag === '' || b.ag == null);
  const hg = intIn(b.hg, 0, 99), ag = intIn(b.ag, 0, 99);
  if (!clear && (hg == null || ag == null || hg === undefined || ag === undefined)) return { ok: false, error: 'bad_score' };
  setCell(t, m.i, 'koti_maalit', clear ? '' : hg); setCell(t, m.i, 'vieras_maalit', clear ? '' : ag);
  setCell(t, m.i, 'vahvistaja', clear ? '' : role); setCell(t, m.i, 'muokattu', now() + ' ' + role);
  return { ok: true };
}

function actSetStatus(b) {
  const t = table('Ottelut', MATCH_HEAD), m = matchInfo(t, b.match);
  if (!m) return { ok: false, error: 'no_match' };
  const tila = String(b.tila == null ? '' : b.tila).trim().toLowerCase();
  if (STATUSES.indexOf(tila) < 0) return { ok: false, error: 'bad_request' };
  setCell(t, m.i, 'tila', tila); setCell(t, m.i, 'muokattu', now() + ' admin');
  return { ok: true };
}

function actSetTime(b) {
  const t = table('Ottelut', MATCH_HEAD), m = matchInfo(t, b.match);
  if (!m) return { ok: false, error: 'no_match' };
  const min = parseTime(b.alku); if (min == null) return { ok: false, error: 'bad_request' };
  t.sh.getRange(m.i + 2, t.idx['alku'] + 1).setNumberFormat('@').setValue(fmt(min));
  setCell(t, m.i, 'muokattu', now() + ' admin');
  return { ok: true };
}

function actShift(b) {
  const minutes = intIn(b.minutes, -180, 180), ids = Array.isArray(b.ids) ? b.ids : null;
  if (minutes == null || minutes === undefined || !ids || ids.length > 300 || !ids.every(x => ID_RE.test(String(x)))) return { ok: false, error: 'bad_request' };
  const t = table('Ottelut', MATCH_HEAD), want = {}; ids.forEach(x => want[String(x)] = 1);
  t.rows.forEach((r, i) => {
    if (!want[String(val(t, r, 'id'))]) return;
    const cur = parseTime(val(t, r, 'alku')); if (cur == null) return;
    const next = Math.max(0, Math.min(1439, cur + minutes));
    t.sh.getRange(i + 2, t.idx['alku'] + 1).setNumberFormat('@').setValue(fmt(next));
  });
  return { ok: true };
}

function actSetAdjust(b) {
  const a = b.adj || {};
  const series = String(a.series || '').trim(), team = String(a.team || '').trim();
  const mt = table('Ottelut', MATCH_HEAD);
  const known = mt.rows.some(r => String(val(mt, r, 'sarja')).trim() === series && (String(val(mt, r, 'koti')).trim() === team || String(val(mt, r, 'vieras')).trim() === team));
  if (!known) return { ok: false, error: 'bad_request' };
  const pts = intIn(a.pts || 0, -99, 99), gf = intIn(a.gf || 0, -99, 99), ga = intIn(a.ga || 0, -99, 99), pos = intIn(a.pos || 0, 0, 40);
  if ([pts, gf, ga, pos].some(x => x === undefined || x == null)) return { ok: false, error: 'bad_request' };
  const t = table('Korjaukset', ADJ_HEAD);
  let at = -1;
  for (let i = 0; i < t.rows.length; i++) if (String(val(t, t.rows[i], 'sarja')).trim() === series && String(val(t, t.rows[i], 'joukkue')).trim() === team) at = i;
  if (!pts && !gf && !ga && !pos) { if (at >= 0) t.sh.deleteRow(at + 2); return { ok: true }; }
  const row = new Array(t.width).fill('');
  row[t.idx.id] = at >= 0 ? val(t, t.rows[at], 'id') : Utilities.getUuid().slice(0, 8);
  row[t.idx['sarja']] = cleanText(series, 40); row[t.idx['joukkue']] = cleanText(team, 40);
  row[t.idx['pisteet']] = pts; row[t.idx['tehdyt']] = gf; row[t.idx['päästetyt']] = ga; row[t.idx['sija']] = pos || '';
  row[t.idx['selite']] = cleanText(a.note, 80); row[t.idx['muokattu']] = now() + ' admin';
  if (at >= 0) t.sh.getRange(at + 2, 1, 1, t.width).setValues([row]); else t.sh.appendRow(row);
  return { ok: true };
}

/* Pelinumerolistat ovat skriptin ominaisuuksissa, eivät julkisessa taulukossa. Avain: "<joukkue>-<sarja>". */
function rosterKeyOk(key) {
  const mt = table('Ottelut', MATCH_HEAD);
  return mt.rows.some(r => { const s = String(val(mt, r, 'sarja')).trim(); return [val(mt, r, 'koti'), val(mt, r, 'vieras')].some(t => String(t).trim() + '-' + s === key); });
}
function actSetRoster(b) {
  const key = String(b.key || ''), nums = Array.isArray(b.numbers) ? b.numbers.map(String) : null;
  if (!key || key.length > 90 || !nums || nums.length > 40 || !nums.every(n => /^\d{1,2}$/.test(n)) || !rosterKeyOk(key)) return { ok: false, error: 'bad_request' };
  props().setProperty('roster:' + key, nums.join(','));
  return { ok: true };
}
function getRoster() {
  const all = props().getProperties(), out = {};
  Object.keys(all).forEach(k => { if (k.indexOf('roster:') === 0) out[k.slice(7)] = all[k] ? all[k].split(',') : []; });
  return out;
}
function setPrivateNumber(goalId, no) { if (no) props().setProperty('nro:' + goalId, no); else props().deleteProperty('nro:' + goalId); }
function getPrivateNumbers() {
  const all = props().getProperties(), out = {};
  Object.keys(all).forEach(k => { if (k.indexOf('nro:') === 0) out[k.slice(4)] = all[k]; });
  return out;
}

/* ===================== ylläpidon funktiot (ajetaan Apps Script -editorista) ===================== */

/** Luo puuttuvat välilehdet ja otsikkorivit. Ei koske olemassa olevaan dataan. */
function setup() {
  const st = sheetFor('Asetukset', SETTINGS_HEAD);
  const have = st.getDataRange().getValues().map(r => String(r[0]).trim());
  DEFAULT_SETTINGS.forEach(r => { if (have.indexOf(r[0]) < 0) st.appendRow(r); });
  sheetFor('Joukkueet', TEAM_HEAD);
  const mt = table('Ottelut', MATCH_HEAD);
  ['päivä', 'alku'].forEach(c => mt.sh.getRange(2, mt.idx[c] + 1, Math.max(1, mt.sh.getMaxRows() - 1), 1).setNumberFormat('@'));
  table('Maalit', GOAL_HEAD); table('Korjaukset', ADJ_HEAD); sheetFor('Kahvio', CAFE_HEAD); sheetFor('Kuulutukset', ANN_HEAD);
  sessionSecret();
  const r = rolesStatus();
  console.log('Välilehdet kunnossa. PIN-koodit: ylläpito ' + (r.admin ? 'ok' : 'PUUTTUU tai ei 6–8 numeroa') + ', tuomari ' + (r.tuomari ? 'ok' : 'PUUTTUU') +
    ', kenttä ' + (r.kentta ? 'ok' : 'PUUTTUU') + (r.eri ? '' : ' – koodien pitää olla kaikki eri'));
}

/** Tyhjentää tulokset, maalit, korjaukset ja tilat. Otteluohjelma, joukkueet ja asetukset jäävät. */
function tyhjennaTulokset() {
  const t = table('Ottelut', MATCH_HEAD);
  if (t.rows.length) ['koti_maalit', 'vieras_maalit', 'tila', 'vahvistaja', 'muokattu'].forEach(c => t.sh.getRange(2, t.idx[c] + 1, t.rows.length, 1).clearContent());
  ['Maalit', 'Korjaukset'].forEach(n => { const sh = ss().getSheetByName(n); if (sh && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1); });
  const p = props(), all = p.getProperties();
  Object.keys(all).forEach(k => { if (k.indexOf('nro:') === 0) p.deleteProperty(k); });
  console.log('Tulokset tyhjennetty.');
}

/** Uusi turnaus samalla taulukolla: tekee arkistokopion ja tyhjentää tulokset ja pelinumerolistat. */
function uusiTurnaus() {
  const name = ss().getName() + ' – arkisto ' + Utilities.formatDate(new Date(), TZ, 'd.M.yyyy');
  ss().copy(name);
  tyhjennaTulokset();
  const p = props(), all = p.getProperties();
  Object.keys(all).forEach(k => { if (k.indexOf('roster:') === 0) p.deleteProperty(k); });
  mitatoiIstunnot();
  console.log('Arkistokopio "' + name + '" tehty. Vaihda PIN-koodit ja päivitä Asetukset, Joukkueet ja Ottelut.');
}

function notifyAdmin(subject, body) {
  const cache = CacheService.getScriptCache();
  if (cache.get('notified')) return;
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, body); cache.put('notified', '1', 3600); } catch (e) { console.error(e); }
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* Testejä varten (Node). Apps Scriptissä module on määrittelemätön. */
if (typeof module !== 'undefined') module.exports = { doPost, doGet, setup, tyhjennaTulokset, mitatoiIstunnot, cleanText, safeEqual };

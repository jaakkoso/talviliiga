/* Code.gs:n testit Nodessa: Googlen palvelut korvataan muistissa toimivilla jäljitelmillä.
   Ajo: node pelipaiva/apps-script/testi.mjs */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'Code.gs'), 'utf8');

function makeEnv() {
  const sheets = {}, propsStore = {}, cacheStore = {}, mails = [];
  let clock = Date.parse('2027-04-10T10:00:00+03:00');
  class Range {
    constructor(sh, r, c, nr = 1, nc = 1) { Object.assign(this, { sh, r, c, nr, nc }); }
    setValue(v) { const d = this.sh.data; while (d.length < this.r) d.push([]); d[this.r - 1][this.c - 1] = v; return this; }
    setValues(vs) { vs.forEach((row, i) => row.forEach((v, j) => new Range(this.sh, this.r + i, this.c + j).setValue(v))); return this; }
    setFontWeight() { return this; } setNumberFormat() { return this; }
    clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) { const row = this.sh.data[this.r - 1 + i]; if (row) row[this.c - 1 + j] = ''; } return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.data = []; }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
    getDataRange() { const w = Math.max(0, ...this.data.map(r => r.length)); return { getValues: () => this.data.map(r => Array.from({ length: w }, (_, i) => r[i] ?? '')) }; }
    appendRow(row) { this.data.push(row.slice()); }
    deleteRow(n) { this.data.splice(n - 1, 1); }
    deleteRows(n, k) { this.data.splice(n - 1, k); }
    getLastRow() { return this.data.length; } getMaxRows() { return Math.max(1000, this.data.length); }
    setFrozenRows() { }
  }
  const book = {
    getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)), getName: () => 'Testi', copy: () => { },
  };
  const ctx = {
    console: { log() { }, error() { } },
    SpreadsheetApp: { getActiveSpreadsheet: () => book },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => propsStore[k] ?? null, setProperty: (k, v) => { propsStore[k] = String(v); }, deleteProperty: k => { delete propsStore[k]; },
      getProperties: () => ({ ...propsStore }) }) },
    CacheService: { getScriptCache: () => ({
      get: k => { const e = cacheStore[k]; return e && e.until > clock ? e.v : null; },
      put: (k, v, s) => { cacheStore[k] = { v: String(v), until: clock + s * 1000 }; }, remove: k => { delete cacheStore[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) },
    Utilities: {
      sleep() { }, getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', k).update(v).digest()],
      base64EncodeWebSafe: b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      formatDate: () => '10.4. 10.00.00',
    },
    ContentService: { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    MailApp: { sendEmail: (...a) => mails.push(a) }, Session: { getEffectiveUser: () => ({ getEmail: () => 'admin@example.com' }) },
    Date: class extends Date { constructor(...a) { a.length ? super(...a) : super(clock); } static now() { return clock; } },
    module: { exports: {} },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const api = ctx.module.exports;
  const call = body => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  return { api, call, sheets, propsStore, mails, tick: ms => { clock += ms; } };
}

export { makeEnv };
const ok = (name, fn) => { try { fn(); console.log('✓ ' + name); } catch (e) { console.log('✗ ' + name + '\n   ' + e.message); process.exitCode = 1; } };

if (process.argv[1] && process.argv[1].endsWith('testi.mjs')) runTests();
function runTests() {
const E = makeEnv();
E.propsStore.ADMIN_PIN = '918273'; E.propsStore.PIN_TUOMARI = '564738'; E.propsStore.PIN_KENTTA = '102938';
E.api.setup();
const M = E.sheets.Ottelut;
M.appendRow(['K1', 'Kilpa', '1', '10.00', 'Kenttä 1', 'SJK', 'VPS', '', '', '', '', '', '']);
M.appendRow(['K2', 'Kilpa', '1', '10.35', 'Kenttä 1', 'WFA', 'Jaro', '', '', '', '', '', '']);
const col = (sh, name) => sh.data[0].indexOf(name);
const cell = (sh, id, name) => sh.data.find(r => r[0] === id)[col(sh, name)];

let admin, tuomari, kentta;
ok('PIN-kirjautuminen antaa istuntotunnisteen roolin mukaan', () => {
  const a = E.call({ action: 'check', pin: '918273' }); assert.equal(a.role, 'admin'); assert.match(a.token, /^T1\./); admin = a.token;
  tuomari = E.call({ action: 'check', pin: '564738' }).token; kentta = E.call({ action: 'check', pin: '102938' }).token;
  assert.equal(E.call({ action: 'check', pin: tuomari }).role, 'tuomari');
});
ok('Väärä PIN ja väärennetty tunniste hylätään', () => {
  assert.equal(E.call({ action: 'check', pin: '000000' }).error, 'pin');
  assert.equal(E.call({ action: 'check', pin: 'T1.admin.zzzzzzzz.AAAA' }).error, 'pin');
  const forged = tuomari.replace('.tuomari.', '.admin.');
  assert.equal(E.call({ action: 'setStatus', pin: forged, match: 'K1', tila: 'peruttu' }).error, 'pin');
});
ok('Roolit: tuomari ja kenttävastaava eivät voi tehdä ylläpidon toimintoja', () => {
  for (const t of [tuomari, kentta]) for (const action of ['setStatus', 'setTime', 'shift', 'setAdjust', 'ping', 'roles'])
    assert.equal(E.call({ action, pin: t, match: 'K1', tila: 'hyväksytty', alku: '9.00', ids: ['K1'], minutes: 5, value: 'x', adj: {} }).error, 'forbidden', action);
  assert.equal(E.call({ action: 'result', pin: kentta, match: 'K1', hg: 1, ag: 0 }).error, 'forbidden');
});
ok('Tuloksen vahvistus ja vahvistaja-sarake', () => {
  assert.equal(E.call({ action: 'result', pin: tuomari, match: 'K1', hg: 2, ag: 1 }).ok, true);
  assert.equal(cell(M, 'K1', 'koti_maalit'), 2); assert.equal(cell(M, 'K1', 'vahvistaja'), 'tuomari');
  assert.equal(E.call({ action: 'result', pin: tuomari, match: 'K1', hg: 'x', ag: 1 }).error, 'bad_score');
  assert.equal(E.call({ action: 'result', pin: tuomari, match: 'K1', hg: 100, ag: 1 }).error, 'bad_score');
  assert.equal(E.call({ action: 'result', pin: tuomari, match: 'EI', hg: 1, ag: 1 }).error, 'no_match');
});
ok('Kenttävastaava ei kirjaa maaleja vahvistettuun otteluun', () => {
  assert.equal(E.call({ action: 'goal', pin: kentta, goal: { id: 'g1', match: 'K1', team: 'SJK', no: '9', min: 5 } }).error, 'final');
  assert.equal(E.call({ action: 'goal', pin: kentta, goal: { id: 'g2', match: 'K2', team: 'WFA', no: '7', min: 3 } }).ok, true);
});
ok('Hyväksytty tulos on lukittu muilta kuin ylläpidolta', () => {
  assert.equal(E.call({ action: 'setStatus', pin: admin, match: 'K1', tila: 'hyväksytty' }).ok, true);
  assert.equal(E.call({ action: 'result', pin: tuomari, match: 'K1', hg: 5, ag: 5 }).error, 'locked_result');
  assert.equal(E.call({ action: 'goal', pin: tuomari, goal: { id: 'g3', match: 'K1', team: 'SJK' } }).error, 'locked_result');
  assert.equal(E.call({ action: 'result', pin: admin, match: 'K1', hg: 3, ag: 1 }).ok, true);
  assert.equal(E.call({ action: 'setStatus', pin: admin, match: 'K1', tila: 'sotku' }).error, 'bad_request');
});
ok('Maalin syötteet tarkistetaan', () => {
  const g = (o) => E.call({ action: 'goal', pin: tuomari, goal: { id: 'g9', match: 'K2', team: 'WFA', ...o } });
  assert.equal(g({ team: '<img src=x onerror=alert(1)>' }).error, 'bad_request');
  assert.equal(g({ no: '123' }).error, 'bad_request');
  assert.equal(g({ min: 999 }).error, 'bad_minute');
  assert.equal(g({ id: '../x' }).error, 'bad_request');
  assert.equal(g({ match: 'K1', id: 'g2' }).error, 'locked_result');
});
ok('Pelinumerot eivät päädy julkiseen taulukkoon (nayta_pelinumerot = ei)', () => {
  const G = E.sheets.Maalit; assert.equal(G.data.find(r => r[0] === 'g2')[col(G, 'pelinumero')], '');
  assert.deepEqual(E.call({ action: 'getGoalNumbers', pin: kentta }).numbers, { g2: '7' });
  E.call({ action: 'deleteGoal', pin: kentta, id: 'g2' });
  assert.deepEqual(E.call({ action: 'getGoalNumbers', pin: kentta }).numbers, {});
});
ok('Pelinumerolistat ovat yksityisiä ja avain tarkistetaan', () => {
  assert.equal(E.call({ action: 'setRoster', pin: kentta, key: 'SJK-Kilpa', numbers: ['3', '9'] }).ok, true);
  assert.equal(E.call({ action: 'setRoster', pin: kentta, key: 'Keksitty-Kilpa', numbers: ['3'] }).error, 'bad_request');
  assert.equal(E.call({ action: 'setRoster', pin: kentta, key: 'SJK-Kilpa', numbers: ['Eetu'] }).error, 'bad_request');
  assert.deepEqual(E.call({ action: 'getRoster', pin: tuomari }).roster, { 'SJK-Kilpa': ['3', '9'] });
  assert.ok(!Object.values(E.sheets).some(s => JSON.stringify(s.data).includes('"3,9"')));
});
ok('Kaavainjektio estetään tekstikentissä', () => {
  assert.equal(E.api.cleanText('=IMPORTDATA("http://x")', 80), '\'=IMPORTDATA("http://x")');
  assert.equal(E.call({ action: 'setAdjust', pin: admin, adj: { series: 'Kilpa', team: 'SJK', pts: -3, note: '=HYPERLINK("x")' } }).ok, true);
  const A = E.sheets.Korjaukset; assert.equal(A.data[1][col(A, 'selite')], '\'=HYPERLINK("x")');
  assert.equal(E.call({ action: 'setAdjust', pin: admin, adj: { series: 'Kilpa', team: 'Keksitty', pts: 1 } }).error, 'bad_request');
});
ok('Ping hyväksyy vain kauko-ohjauksen merkit', () => {
  assert.equal(E.call({ action: 'ping', pin: admin, value: 'K|ab12|fire|kutsu-0-0|1712736000000' }).ok, true);
  assert.equal(E.call({ action: 'ping', pin: admin, value: '=IMPORTXML("x")' }).error, 'bad_request');
});
ok('Aikataulun siirto ja ajan asetus tarkistetaan', () => {
  assert.equal(E.call({ action: 'shift', pin: admin, ids: ['K2'], minutes: 10 }).ok, true); assert.equal(cell(M, 'K2', 'alku'), '10.45');
  assert.equal(E.call({ action: 'shift', pin: admin, ids: ['K2'], minutes: 9999 }).error, 'bad_request');
  assert.equal(E.call({ action: 'setTime', pin: admin, match: 'K2', alku: '25.00' }).error, 'bad_request');
});
ok('Tuntematon toiminto ja liian iso pyyntö hylätään', () => {
  assert.equal(E.call({ action: 'deleteEverything', pin: admin }).error, 'unknown_action');
  assert.equal(JSON.parse(E.api.doPost({ postData: { contents: 'x'.repeat(30000) } }).text).error, 'bad_request');
  assert.equal(JSON.parse(E.api.doGet().text).service, 'Pelipäivä');
});
ok('Arvaaminen lukitsee uudet kirjautumiset, mutta kirjautuneet jatkavat', () => {
  for (let i = 0; i < 15; i++) E.call({ action: 'check', pin: String(100000 + i) });
  const r = E.call({ action: 'check', pin: '564738' }); assert.equal(r.error, 'locked'); assert.ok(r.wait >= 14);
  assert.equal(E.call({ action: 'check', pin: tuomari }).role, 'tuomari');
  assert.equal(E.mails.length, 1);
  E.tick(16 * 60000); assert.equal(E.call({ action: 'check', pin: '564738' }).role, 'tuomari');
});
ok('Istunto vanhenee 4 vuorokaudessa ja mitätöinti kirjaa kaikki ulos', () => {
  const t = E.call({ action: 'check', pin: '564738' }).token;
  E.api.mitatoiIstunnot(); assert.equal(E.call({ action: 'check', pin: t }).error, 'pin');
  const t2 = E.call({ action: 'check', pin: '564738' }).token; E.tick(5 * 864e5); assert.equal(E.call({ action: 'check', pin: t2 }).error, 'pin');
});
ok('Liian lyhyt PIN ei kelpaa edes oikeana', () => {
  E.propsStore.PIN_KENTTA = '1234'; assert.equal(E.call({ action: 'check', pin: '1234' }).error, 'pin');
  assert.equal(E.call({ action: 'roles', pin: E.call({ action: 'check', pin: '918273' }).token }).kentta, false);
});
}

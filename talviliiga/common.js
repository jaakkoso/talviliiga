/* Turnauksen tulospalvelu – yhteiset asetukset, data ja laskenta.
   Kaikki turnauskohtainen tieto (nimi, päivä, paikka, joukkueet, värit, sarjat, kentät, ottelut) tulee
   Google Sheetistä. Koodiin ei tarvitse koskea uutta turnausta varten. */

/* ===== ASETUKSET – täytä käyttöönotossa ===== */
const CONFIG = {
  SHEET_ID: '1clMT47Y5qaXw3C3qUfX-YllHxRXXs1JT_crahSrwZWY',      // Google Sheetin tunnus (osoitteen /d/ ja /edit välissä). Tyhjä = demotila.
  API_URL: 'https://script.google.com/macros/s/AKfycbwjoNUYYV5N5T2b-C_QWrWThrsePIe0OEesoTnvNzsCclJWRRhjU5QYPa-am6Ekw3Kh7w/exec',     // Apps Script -verkkosovelluksen osoite (…/exec)
  POLL_MS: 30000,    // Päivitysväli julkisella sivulla; kirjausnäkymät 15 s
  PRODUCT: { name: '', url: '' },  // Palvelun oma nimi alalaitaan ("Tulospalvelu: nimi"). Tyhjä = ei näytetä.
};
/* ============================================ */

/* Demotilan esimerkkiturnaus (sama rakenne kuin Google Sheetin välilehdet Asetukset, Joukkueet ja Ottelut). */
const DEMO_EVENT = {
  settings: {
    nimi: 'Talviliiga', alaotsikko: 'P12 · Kilpa & Haaste', paikka: 'Wallsport, Seinäjoki', paiva: '2026-10-24',
    ottelun_kesto: '30', nayta_sarjataulukko: 'kyllä', nayta_pelinumerot: 'ei', tauko_teksti: 'kahvio palvelee', jarjestaja: 'SJK',
    kahvio_teksti: 'Auki koko pelipäivän', kahvio_mobilepay: '87065', kahvio_saaja: 'SJK-juniorit ry, P2015-joukkue',
  },
  cafe: [
    { 'ryhmä': 'Juomat', tuote: 'Kahvi', hinta: '2' }, { 'ryhmä': 'Juomat', tuote: 'Pillimehu', hinta: '1' }, { 'ryhmä': 'Juomat', tuote: 'Kivennäisvesi', hinta: '2' }, { 'ryhmä': 'Juomat', tuote: 'Limsa', hinta: '3' },
    { 'ryhmä': 'Syötävää', tuote: 'Mokkapala', hinta: '2' }, { 'ryhmä': 'Syötävää', tuote: 'Ruisleipä / sämpylä', hinta: '2' }, { 'ryhmä': 'Syötävää', tuote: 'Sipsit', hinta: '3' }, { 'ryhmä': 'Syötävää', tuote: 'Suklaapatukka', hinta: '2' }, { 'ryhmä': 'Syötävää', tuote: 'Karkkipussi', hinta: '3' },
  ],
  teams: [
    { nimi: 'SJK', tausta: '#bdb03a', teksti: '#161414' },
    { nimi: 'VPS', tausta: '#161414', teksti: '#ffffff', reuna: '#ffffff', reunatyyli: 'raita' },
    { nimi: 'WFA', tausta: '#f08a24', teksti: '#10233f' },
    { nimi: 'Jaro', tausta: '#c8202a', teksti: '#ffffff' },
    { nimi: 'JJK', tausta: '#1f5fae', teksti: '#ffffff', reuna: '#d6332f', reunatyyli: 'ala' },
  ],
  schedule: [['10.00', 'SJK', 'VPS'], ['10.35', 'WFA', 'Jaro'], ['11.10', 'JJK', 'SJK'], ['11.45', 'VPS', 'WFA'], ['12.20', 'Jaro', 'JJK'],
    ['14.00', 'SJK', 'WFA'], ['14.35', 'VPS', 'Jaro'], ['15.10', 'JJK', 'WFA'], ['15.45', 'SJK', 'Jaro'], ['16.20', 'VPS', 'JJK']],
  series: [['K', 'Kilpa', 'Takakenttä'], ['H', 'Haaste', 'Etukenttä']],
};

/* ---------- apurit ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Selainmuisti kansiokohtaisesti: /talviliiga/ ja /jokin-turnaus/ eivät jaa välimuistia, PIN-istuntoa eivätkä lähettämättömiä kirjauksia. */
const LS_NS = (location.pathname.split('/').filter(Boolean).find(p => !p.includes('.')) || 'root') + ':';
const ls = {
  get(k, d) { try { const v = localStorage.getItem(LS_NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(LS_NS + k, JSON.stringify(v)); } catch (e) { } },
};
function parseTime(t) {
  const s = String(t ?? '').trim().replace(':', '.');
  if (!s) return null;
  let [h, m = '0'] = s.split('.');
  if (m.length === 1) m += '0';
  const hh = parseInt(h, 10), mm = parseInt(m, 10);
  if (isNaN(hh) || hh > 23 || isNaN(mm) || mm > 59) return null;
  return hh * 60 + mm;
}
const fmtTime = min => String(Math.floor(min / 60)).padStart(2, '0') + '.' + String(min % 60).padStart(2, '0');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const toInt = v => (v === '' || v == null || isNaN(parseInt(v, 10))) ? null : parseInt(v, 10);
const yes = v => /^(k|kyllä|kylla|true|1|x|on)$/i.test(String(v || '').trim());
const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
function parseDate(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return new Date(+m[1], m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (m) return new Date(+m[3], m[2] - 1, +m[1]);
  return null;
}
const fmtDate = d => d ? `${['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'][d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.` : '';

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  return rows.filter(r => r.some(x => x.trim() !== '')).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/* ---------- turnauksen tiedot ---------- */
let EVENT = buildEvent(DEMO_EVENT.settings, DEMO_EVENT.teams);
function buildEvent(settings, teamRows) {
  const s = settings || {};
  const teams = {};
  for (const r of teamRows || []) {
    const n = String(r.nimi || '').trim(); if (!n) continue;
    teams[n] = { bg: HEX.test(r.tausta || '') ? r.tausta : '#e2ddcc', ink: HEX.test(r.teksti || '') ? r.teksti : '#161414',
      edge: HEX.test(r.reuna || '') ? r.reuna : '', edgeType: /ala/i.test(r.reunatyyli || '') ? 'ala' : (r.reuna ? 'raita' : ''),
      logo: /^[\w\-./]+\.(png|svg|jpe?g|webp)$/i.test(String(r.logo || '').trim()) ? String(r.logo).trim() : '' };
  }
  const date = parseDate(s.paiva);
  return {
    name: s.nimi || 'Turnaus', sub: s.alaotsikko || '', venue: s.paikka || '', date, dateText: fmtDate(date),
    matchMin: toInt(s.ottelun_kesto) || 30, showTable: s.nayta_sarjataulukko == null ? true : yes(s.nayta_sarjataulukko),
    showNumbers: yes(s.nayta_pelinumerot), breakText: s.tauko_teksti || '', organizer: s.jarjestaja || '',
    mobilepay: s.kahvio_mobilepay || '', payee: s.kahvio_saaja || '', cafeText: s.kahvio_teksti || '', cafe: [], showLogos: yes(s.nayta_logot), logoStyle: /pelk|ilman|plain/i.test(s.logotyyli || '') ? 'plain' : 'color',
    teams, teamNames: Object.keys(teams), raw: s,
  };
}
/* Kahvion hinnasto (välilehti Kahvio: ryhmä, tuote, hinta). Tyhjät rivit ohitetaan. */
function cafeRows(rows) {
  return (rows || []).filter(r => (r.tuote || '').trim()).map(r => ({ group: (r['ryhmä'] || r.ryhma || '').trim(), name: r.tuote.trim(), price: String(r.hinta || '').trim().replace(/\s*€$/, '') }));
}
function teamStyle(t) {
  const c = EVENT.teams[t]; if (!c) return 'background:#e2ddcc;color:#161414';
  let sh = '';
  if (c.edgeType === 'raita' && c.edge) sh = `;box-shadow:inset 0 0 0 2px ${c.bg},inset 0 0 0 4px ${c.edge}`;
  if (c.edgeType === 'ala' && c.edge) sh = `;box-shadow:inset 0 -4px 0 ${c.edge}`;
  return `background:${c.bg};color:${c.ink}${sh}`;
}
/* Logo joukkueen nimen edessä (asetus nayta_logot). Oletuspolku logot/<nimi>.png; puuttuva kuva piilotetaan. */
function logoSrc(t) { const c = EVENT.teams[t]; return c ? (c.logo || `logot/${t.toLowerCase().replace(/[^a-z0-9åäö-]+/g, '-')}.png`) : ''; }
const chip = t => {
  const src = EVENT.showLogos && logoSrc(t);
  const plain = src && EVENT.logoStyle === 'plain';
  return `<span class="chip${src ? ' has-logo' : ''}${plain ? ' plain' : ''}"${plain ? '' : ` style="${teamStyle(t)}"`}>${src ? `<img class="lg" src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${esc(t)}</span>`;
};
function applyHeader() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('evName', EVENT.name); set('evSub', EVENT.sub);
  set('evVenue', [EVENT.venue, EVENT.dateText].filter(Boolean).join(' · '));
  set('evOrg', EVENT.organizer ? `Järjestäjä ${EVENT.organizer}` : '');
  const pr = document.getElementById('product');
  if (pr && CONFIG.PRODUCT && CONFIG.PRODUCT.name) pr.innerHTML = ` · Tulospalvelu: ${CONFIG.PRODUCT.url ? `<a href="${esc(CONFIG.PRODUCT.url)}" target="_blank" rel="noopener">${esc(CONFIG.PRODUCT.name)}</a>` : esc(CONFIG.PRODUCT.name)}`;
  set('evEyebrow', [EVENT.name, EVENT.venue.split(',')[0], EVENT.dateText].filter(Boolean).join(' · '));
  const root = document.documentElement.style, raw = EVENT.raw || {};
  if (HEX.test(raw.vari_pohja || '')) { root.setProperty('--head', raw.vari_pohja); root.setProperty('--ink', raw.vari_pohja); }
  if (HEX.test(raw.vari_korostus || '')) root.setProperty('--gold', raw.vari_korostus);
  const t = document.querySelector('title'); if (t && t.dataset.suffix != null) t.textContent = EVENT.name + (t.dataset.suffix ? ' ' + t.dataset.suffix : '');
}

/* ---------- ottelut, sarjat ja kentät ---------- */
function rowToMatch(r) {
  return { id: r.id, series: (r.sarja || '').trim() || 'Sarja', start: parseTime(r.alku), field: (r['kenttä'] || r.kentta || '').trim(),
    home: (r.koti || '').trim(), away: (r.vieras || '').trim(), hg: toInt(r.koti_maalit), ag: toInt(r.vieras_maalit), tila: (r.tila || '').toLowerCase(),
    veo: /^https:\/\/([a-z0-9-]+\.)*veo\.co\/\S+$/i.test((r.veo || '').trim()) ? r.veo.trim() : '' };
}
const rowToGoal = r => ({ id: r.id, match: r.ottelu, team: r.joukkue, no: r.pelinumero || '', min: toInt(r.minuutti) });
const uniq = a => [...new Set(a.filter(Boolean))];
const seriesList = ms => uniq(ms.map(m => m.series));
const fieldList = ms => uniq(ms.slice().sort((a, b) => (a.start ?? 0) - (b.start ?? 0)).map(m => m.field));
const teamsInSeries = (ms, s) => { const set = uniq(ms.filter(m => m.series === s).flatMap(m => [m.home, m.away])); return EVENT.teamNames.filter(t => set.includes(t)).concat(set.filter(t => !EVENT.teamNames.includes(t))); };
function mainField(ms, s) { const c = {}; ms.filter(m => m.series === s && m.field).forEach(m => c[m.field] = (c[m.field] || 0) + 1); return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ''; }
function slotsOf(matches) {
  const by = {};
  for (const m of matches) { if (m.start == null) continue; (by[m.start] = by[m.start] || { start: m.start, ms: [] }).ms.push(m); }
  const sl = Object.values(by).sort((a, b) => a.start - b.start);
  const order = seriesList(matches);
  for (const s of sl) { s.ms.sort((a, b) => order.indexOf(a.series) - order.indexOf(b.series)); const p = s.ms[0]; s.same = s.ms.every(m => m.home === p.home && m.away === p.away); }
  return sl;
}
const slotHas = (s, t) => s.ms.some(m => m.home === t || m.away === t);

/* ---------- kello ---------- */
const DEMO_START_MIN = 11 * 60 + 52;
function clock() {
  if (Store.demo) {
    const d = Store.demoData();
    return { day: 0, min: DEMO_START_MIN + Math.floor((Date.now() - d.t0) / 60000), demo: true };
  }
  const now = new Date();
  if (!EVENT.date) return { day: 0, min: now.getHours() * 60 + now.getMinutes() };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { day: Math.sign(today - EVENT.date), min: now.getHours() * 60 + now.getMinutes() };
}

/* ---------- tila ja tulos ---------- */
const isFinal = m => m.hg != null && m.ag != null;
function status(m, clk) {
  if (m.tila === 'peruttu') return { k: 'cancel', label: 'Peruttu' };
  if (isFinal(m)) return { k: 'done', label: 'Pelattu' };
  if (m.start == null) return { k: 'up', label: 'Tulossa' };
  const end = m.start + EVENT.matchMin;
  if (m.tila === 'käynnissä' || (clk.day === 0 && clk.min >= m.start && clk.min < end)) return { k: 'live', label: 'Käynnissä', left: Math.max(0, end - clk.min) };
  if (clk.day > 0 || (clk.day === 0 && clk.min >= end)) return { k: 'wait', label: 'Tulos tulossa' };
  return { k: 'up', label: 'Tulossa', inMin: clk.day === 0 ? m.start - clk.min : null };
}
function goalsOf(id, goals) { return goals.filter(g => g.match === id).sort((a, b) => (a.min ?? 99) - (b.min ?? 99)); }
function score(m, goals, st) {
  if (isFinal(m)) return [m.hg, m.ag];
  if (st.k === 'live' || st.k === 'wait') {
    const g = goalsOf(m.id, goals);
    return [g.filter(x => x.team === m.home).length, g.filter(x => x.team === m.away).length];
  }
  return null;
}
function standings(matches, series, adjust) {
  const t = Object.fromEntries(teamsInSeries(matches, series).map(n => [n, { team: n, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, lot: false }]));
  for (const m of matches) {
    if (m.series !== series || !isFinal(m) || m.tila === 'peruttu' || !t[m.home] || !t[m.away]) continue;
    const a = t[m.home], b = t[m.away];
    a.p++; b.p++; a.gf += m.hg; a.ga += m.ag; b.gf += m.ag; b.ga += m.hg;
    if (m.hg > m.ag) { a.w++; b.l++; a.pts += 3; } else if (m.hg < m.ag) { b.w++; a.l++; b.pts += 3; } else { a.d++; b.d++; a.pts++; b.pts++; }
  }
  // Ylläpitäjän käsin tekemät korjaukset: lisäykset pisteisiin ja maaleihin sekä valinnainen pakotettu sija
  const adjs = (adjust || []).filter(a => a.series === series && t[a.team]);
  for (const a of adjs) { const r = t[a.team]; r.pts += a.pts; r.gf += a.gf; r.ga += a.ga; r.adj = a; }
  // Tasapisteet: 1. keskinäisten otteluiden pisteet, 2. keskinäinen maaliero, 3. keskinäiset tehdyt maalit,
  // 4. koko sarjan maaliero, 5. koko sarjan tehdyt maalit, 6. arpa (merkitään, ylläpitäjä ratkaisee pakotetulla sijalla).
  const byPts = Object.values(t).sort((x, y) => y.pts - x.pts);
  const sorted = [];
  for (let i = 0; i < byPts.length;) {
    let j = i; while (j < byPts.length && byPts[j].pts === byPts[i].pts) j++;
    const grp = byPts.slice(i, j);
    if (grp.length > 1) {
      const names = new Set(grp.map(r => r.team)), h = Object.fromEntries(grp.map(r => [r.team, { pts: 0, gf: 0, ga: 0 }]));
      for (const m of matches) {
        if (m.series !== series || !isFinal(m) || m.tila === 'peruttu' || !names.has(m.home) || !names.has(m.away)) continue;
        const a = h[m.home], b = h[m.away]; a.gf += m.hg; a.ga += m.ag; b.gf += m.ag; b.ga += m.hg;
        if (m.hg > m.ag) a.pts += 3; else if (m.hg < m.ag) b.pts += 3; else { a.pts++; b.pts++; }
      }
      const key = r => [h[r.team].pts, h[r.team].gf - h[r.team].ga, h[r.team].gf, r.gf - r.ga, r.gf];
      grp.sort((x, y) => { const kx = key(x), ky = key(y); for (let k = 0; k < kx.length; k++) if (ky[k] !== kx[k]) return ky[k] - kx[k]; return x.team.localeCompare(y.team, 'fi'); });
      for (let k = 0; k < grp.length; k++) { const same = o => o && key(o).every((v, n) => v === key(grp[k])[n]); grp[k].lot = same(grp[k - 1]) || same(grp[k + 1]); }
    }
    sorted.push(...grp); i = j;
  }
  const forced = adjs.filter(a => a.pos >= 1 && a.pos <= sorted.length).sort((a, b) => a.pos - b.pos);
  if (!forced.length) return sorted;
  const out = new Array(sorted.length).fill(null), rest = sorted.filter(r => !forced.some(f => f.team === r.team));
  for (const f of forced) { let i = f.pos - 1; while (out[i]) i++; out[i] = t[f.team]; }
  for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = rest.shift();
  return out;
}
const isAdjusted = a => a && (a.pts || a.gf || a.ga || a.pos);
const rowToAdj = r => ({ series: (r.sarja || '').trim(), team: (r.joukkue || '').trim(), pts: toInt(r.pisteet) || 0, gf: toInt(r['tehdyt']) || 0, ga: toInt(r['päästetyt'] ?? r.paastetyt) || 0, pos: toInt(r.sija) || 0, note: r.selite || '' });

/* ---------- datan tarkistus (ylläpidon Testi-välilehti) ---------- */
function validateData(ev, matches) {
  const out = [], err = m => out.push({ lvl: 'virhe', msg: m }), warn = m => out.push({ lvl: 'huom', msg: m });
  if (!ev.raw.nimi) warn('Asetukset: turnauksen nimi (nimi) puuttuu.');
  if (!ev.date) err('Asetukset: päivä (paiva) puuttuu tai on väärässä muodossa. Käytä muotoa 2026-10-24 tai 24.10.2026.');
  if (!ev.teamNames.length) err('Joukkueet-välilehti on tyhjä.');
  if (!matches.length) err('Ottelut-välilehti on tyhjä.');
  const ids = {}, at = {};
  for (const m of matches) {
    const w = `Ottelu ${m.id || '(ei id:tä)'}`;
    if (!m.id) err('Ottelulta puuttuu id.'); else if (ids[m.id]) err(`${w}: sama id on kahdesti.`); ids[m.id] = 1;
    if (m.start == null) err(`${w}: alkuaika puuttuu tai on väärä (esim. 14.35).`);
    if (!m.field) warn(`${w}: kenttä puuttuu.`);
    if (!m.home || !m.away) err(`${w}: joukkue puuttuu.`);
    if (m.home && m.home === m.away) err(`${w}: joukkue pelaa itseään vastaan.`);
    for (const t of [m.home, m.away]) if (t && !ev.teams[t]) err(`${w}: joukkuetta "${t}" ei ole Joukkueet-välilehdellä (kirjoitusasu?).`);
    if (m.start != null && m.field) { const k = m.start + '|' + m.field; if (at[k]) err(`${w}: samalla kentällä (${m.field}) on jo ottelu klo ${fmtTime(m.start)} (${at[k]}).`); at[k] = m.id; }
  }
  for (const m of matches) for (const o of matches) if (m.id < o.id && m.start != null && m.start === o.start && m.series === o.series && [m.home, m.away].some(t => t && (t === o.home || t === o.away)))
    warn(`Joukkue pelaa samaan aikaan kahta ottelua samassa sarjassa: ${m.id} ja ${o.id}.`);
  for (const [n, c] of Object.entries(ev.teams)) if (!c.bg || c.bg === '#e2ddcc') warn(`Joukkueelta ${n} puuttuu taustaväri (esim. #bdb03a).`);
  return out;
}

/* ---------- tallennus: demo (selaimen muisti) tai Google Sheets + Apps Script ---------- */
const DEMO_KEY = 'tulospalvelu-demo-v2';
function demoMatches() {
  const out = [];
  for (const [k, name, field] of DEMO_EVENT.series) DEMO_EVENT.schedule.forEach((r, i) => out.push({ id: k + (i + 1), series: name, start: parseTime(r[0]), field, home: r[1], away: r[2], hg: null, ag: null, tila: '' }));
  return out;
}
function demoSeed() {
  const ms = demoMatches();
  const res = { K1: [2, 1], H1: [1, 1], K2: [0, 2], H2: [3, 1], K3: [1, 3], H3: [2, 2] };
  for (const m of ms) if (res[m.id]) [m.hg, m.ag] = res[m.id];
  const g = (match, team, min, no) => ({ id: uid() + min, match, team, no: String(no), min });
  const goals = [
    g('K1', 'SJK', 4, 9), g('K1', 'VPS', 11, 7), g('K1', 'SJK', 22, 10), g('H1', 'SJK', 9, 14), g('H1', 'VPS', 25, 5),
    g('K2', 'Jaro', 7, 11), g('K2', 'Jaro', 18, 8), g('H2', 'WFA', 3, 6), g('H2', 'Jaro', 14, 4), g('H2', 'WFA', 20, 12), g('H2', 'WFA', 28, 6),
    g('K3', 'SJK', 5, 9), g('K3', 'JJK', 12, 3), g('K3', 'SJK', 19, 17), g('K3', 'SJK', 27, 9), g('H3', 'JJK', 2, 10), g('H3', 'SJK', 10, 21), g('H3', 'SJK', 16, 14), g('H3', 'JJK', 29, 8),
    g('K4', 'VPS', 3, 7),
  ];
  const roster = {};
  DEMO_EVENT.teams.forEach((t, ti) => DEMO_EVENT.series.forEach(([, s], si) => {
    roster[t.nimi + '-' + s] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 17, 21].filter((_, i) => (i + ti + si) % 5 !== 0).map(String);
  }));
  return { t0: Date.now(), settings: { ...DEMO_EVENT.settings }, teams: DEMO_EVENT.teams.map(t => ({ ...t })), matches: ms, goals, roster, adjust: [] };
}

/* Pelinumerot tekstistä: "7, 10, 14", "7 Eetu\n10 Aaro", "#7 #10". Nimet ja muu teksti ohitetaan, vain numerot 0–99 tallennetaan. */
function parseNumbers(text) {
  const set = new Set();
  for (const m of String(text || '').matchAll(/(?:^|[^\d])(\d{1,2})(?![\d])/g)) set.add(String(parseInt(m[1], 10)));
  return [...set].sort((a, b) => a - b);
}
const Store = {
  // Harjoitustila: osoitteen perään #harjoitus → kaikki toimii esimerkkidatalla selaimessa, oikeaan dataan ei kosketa.
  demo: !CONFIG.SHEET_ID || (typeof location !== 'undefined' && location.hash === '#harjoitus'),
  _demo: null,
  _metaAt: 0,
  demoData() {
    if (!this._demo) { this._demo = ls.get(DEMO_KEY, null); if (!this._demo || !this._demo.matches) { this._demo = demoSeed(); ls.set(DEMO_KEY, this._demo); } }
    return this._demo;
  },
  demoReset() { this._demo = demoSeed(); ls.set(DEMO_KEY, this._demo); },
  async gviz(name) {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}&_=${Date.now()}`;
    const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status);
    return parseCSV(await r.text());
  },
  /* Asetukset ja joukkueet haetaan harvoin (10 min välein tai pyydettäessä), ottelut ja maalit joka päivityksellä. */
  async loadMeta(force) {
    if (this.demo) { const d = this.demoData(); EVENT = buildEvent(d.settings, d.teams); EVENT.cafe = cafeRows(DEMO_EVENT.cafe); applyHeader(); return; }
    if (!force && Date.now() - this._metaAt < 600000) return;
    const [sr, tr, kr] = await Promise.all([this.gviz('Asetukset'), this.gviz('Joukkueet'), this.gviz('Kahvio').catch(() => [])]);
    const settings = {}; for (const r of sr) if (r.avain) settings[r.avain.trim().toLowerCase()] = r.arvo;
    EVENT = buildEvent(settings, tr); EVENT.cafe = cafeRows(kr); applyHeader();
    ls.set('tulospalvelu-meta', { settings, teams: tr, cafe: kr }); this._metaAt = Date.now();
  },
  async load(forceMeta) {
    if (this.demo) { this._demo = null; const d = this.demoData(); EVENT = buildEvent(d.settings, d.teams); EVENT.cafe = cafeRows(DEMO_EVENT.cafe); applyHeader(); return { matches: d.matches.map(m => ({ ...m })), goals: d.goals.slice(), adjust: (d.adjust || []).map(a => ({ ...a })) }; }
    await this.loadMeta(forceMeta);
    const [mr, gr, kr] = await Promise.all([this.gviz('Ottelut'), this.gviz('Maalit').catch(() => []), this.gviz('Korjaukset').catch(() => [])]);
    return { matches: mr.filter(r => r.id).map(rowToMatch), goals: gr.filter(r => r.id && r.ottelu).map(rowToGoal), adjust: kr.filter(r => r.joukkue).map(rowToAdj) };
  },
  async send(op, pin) {
    if (this.demo) {
      const d = this.demoData();
      if (op.action === 'roles') return { ok: true, tuomari: true, kentta: true, eri: true };
      if (op.action === 'check') { // harjoitus/esikatselu: mikä tahansa PIN kelpaa sen sivun rooliin, jolta kirjaudutaan
        const role = pin ? (['admin', 'tuomari', 'kentta'].includes(op.want) ? op.want : 'tuomari') : '';
        if (!role) { const e = new Error('pin'); e.code = 'pin'; throw e; }
        return { ok: true, role, admin: role === 'admin' };
      }
      if (op.action === 'goal') { if (!d.matches.some(m => m.id === op.goal.match)) { const e = new Error('no_match'); e.code = 'no_match'; e.permanent = true; throw e; } const i = d.goals.findIndex(x => x.id === op.goal.id); if (i >= 0) d.goals[i] = op.goal; else d.goals.push(op.goal); }
      if (op.action === 'deleteGoal') d.goals = d.goals.filter(x => x.id !== op.id);
      if (op.action === 'result') { const m = d.matches.find(x => x.id === op.match); if (m) { m.hg = toInt(op.hg); m.ag = toInt(op.ag); } }
      if (op.action === 'getRoster') return { ok: true, roster: d.roster || {} };
      if (op.action === 'shift') for (const id of op.ids || []) { const m = d.matches.find(x => x.id === id); if (m && m.start != null) m.start += op.minutes; }
      if (op.action === 'setTime') { const m = d.matches.find(x => x.id === op.match); if (m) m.start = parseTime(op.alku); }
      if (op.action === 'setStatus') { const m = d.matches.find(x => x.id === op.match); if (m) m.tila = op.tila || ''; }
      if (op.action === 'setAdjust') { d.adjust = (d.adjust || []).filter(a => !(a.series === op.adj.series && a.team === op.adj.team)); if (isAdjusted(op.adj)) d.adjust.push(op.adj); }
      if (op.action === 'setRoster') { d.roster = d.roster || {}; d.roster[op.key] = op.numbers; }
      if (op.action === 'ping') { d.settings.viimeisin_testi = op.value; }
      ls.set(DEMO_KEY, d); return { ok: true };
    }
    if (!CONFIG.API_URL) throw new Error('API_URL puuttuu asetuksista');
    const r = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...op, pin }) });
    const j = await r.json();
    if (!j.ok) { const e = new Error(j.error || 'virhe'); e.code = j.error; e.permanent = ['no_match', 'bad_minute', 'bad_score', 'bad_request', 'unknown_action'].includes(j.error); throw e; }
    return j;
  },
};
// Viimeksi haetut asetukset heti käyttöön (nopea ensimmäinen näkymä myös ilman verkkoa)
(() => { if (!Store.demo) { const m = ls.get('tulospalvelu-meta', null); if (m) EVENT = buildEvent(m.settings, m.teams); } })();

/* ---------- jaettava tuloskuva ---------- */
let _logoImg = null;
function logoImg() {
  if (_logoImg) return _logoImg;
  _logoImg = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'logo-512.png'; });
  return _logoImg;
}
async function shareImage(m, sc, goals) {
  try { await Promise.all([document.fonts.load('800 100px "Saira Condensed"'), document.fonts.load('600 40px "Figtree"')]); } catch (e) { }
  const W = 1080, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const fit = (txt, max, size, weight, fam) => { let s = size; do { x.font = `${weight} ${s}px ${fam}`; s -= 4; } while (x.measureText(txt).width > max && s > 20); };
  x.fillStyle = '#211e1e'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#bdb03a'; x.fillRect(0, 0, W, 16);
  const logo = await logoImg(); if (logo) x.drawImage(logo, W - 80 - 170, 70, 170, 170);
  const head = [EVENT.name, EVENT.sub.split('·')[0].trim(), EVENT.venue.split(',')[0], EVENT.dateText.replace(/^\S+\s/, '')].filter(Boolean).join(' · ').toUpperCase();
  x.fillStyle = '#bdb03a'; fit(head, 680, 34, 600, '"Saira Condensed", sans-serif'); x.fillText(head, 80, 112);
  x.fillStyle = '#ffffff'; fit(m.series.toUpperCase(), 680, 120, 800, '"Saira Condensed", sans-serif'); x.fillText(m.series.toUpperCase(), 80, 230);
  x.font = '600 34px "Figtree", sans-serif'; x.fillStyle = 'rgba(255,255,255,.75)';
  x.fillText(`${m.field ? m.field + ' · ' : ''}klo ${fmtTime(m.start)}`, 80, 282);
  const team = (t, y) => {
    const tc = EVENT.teams[t] || { bg: '#e2ddcc', ink: '#161414' };
    x.fillStyle = tc.bg; roundRect(x, 80, y, 480, 150, 18); x.fill();
    if (tc.edgeType === 'raita' && tc.edge) { x.strokeStyle = tc.edge; x.lineWidth = 6; roundRect(x, 88, y + 8, 464, 134, 12); x.stroke(); }
    if (tc.edgeType === 'ala' && tc.edge) { x.fillStyle = tc.edge; x.fillRect(98, y + 136, 444, 10); }
    x.fillStyle = tc.ink; fit(t, 430, 110, 800, '"Saira Condensed", sans-serif'); x.textAlign = 'center'; x.fillText(t, 320, y + 113); x.textAlign = 'left';
  };
  team(m.home, 380); team(m.away, 590);
  x.fillStyle = '#bdb03a'; x.font = '800 190px "Saira Condensed", sans-serif'; x.textAlign = 'center';
  x.fillText(String(sc[0]), 800, 515); x.fillText(String(sc[1]), 800, 725); x.textAlign = 'left';
  const g = goalsOf(m.id, goals);
  if (g.length) {
    x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '600 30px "Figtree", sans-serif';
    const line = g.map(z => `${z.min ?? '?'}' ${z.team}`).join('   ');
    x.fillText(line.length > 60 ? line.slice(0, 58) + '…' : line, 80, 830);
  }
  x.fillStyle = '#bdb03a'; x.fillRect(80, 900, 120, 6);
  x.fillStyle = '#ffffff'; x.font = '600 32px "Figtree", sans-serif'; x.fillText(`${EVENT.organizer ? 'Järjestäjä ' + EVENT.organizer + ' · ' : ''}Hienoa peliä molemmille!`, 80, 960);
  return new Promise(res => c.toBlob(res, 'image/png'));
}
function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }

/* Ajastettu päivitys: satunnaistettu väli (ettei kaikki puhelimet kysy samalla sekunnilla), tauko kun sivu on piilossa,
   ja virheiden jälkeen pidennetty väli (enintään 2 min), jotta kuormitushuipussa ei pahenneta tilannetta. */
function schedulePoll(fn, baseMs) {
  let fails = 0, timer = null;
  const next = () => { clearTimeout(timer); const wait = Math.min(120000, baseMs * Math.pow(2, fails)) * (0.85 + Math.random() * 0.3); timer = setTimeout(run, wait); };
  const run = async () => { if (document.hidden) { next(); return; } try { const ok = await fn(); fails = ok === false ? fails + 1 : 0; } catch (e) { fails++; } next(); };
  next();
  return () => { fails = 0; run(); };
}

if (typeof module !== 'undefined') module.exports = { parseCSV, parseTime, fmtTime, parseDate, buildEvent, standings, status, score, rowToMatch, demoMatches, demoSeed, parseNumbers, isAdjusted, validateData, slotsOf, seriesList, fieldList, teamsInSeries, setEvent: e => { EVENT = e; }, CONFIG };

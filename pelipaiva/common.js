/* Pelipäivä – turnauksen tulospalvelun yhteinen moottori: asetukset, data ja laskenta.
   Moottori on kansiossa pelipaiva/. Jokaisella turnauksella on oma kansionsa (esim. sjk-cup-2027/), jossa ovat kevyet
   sivut, turnaus.js (taulukon ja Apps Scriptin osoitteet), logo ja turnauksen omat äänet. Kaikki muu turnauskohtainen
   tieto (nimi, päivät, paikka, joukkueet, värit, sarjat, kentät, ottelut) tulee Google Sheetistä. */

/* ===== ASETUKSET – turnauskohtaiset arvot tulevat turnauskansion turnaus.js-tiedostosta (window.TURNAUS) ===== */
const TURNAUS = (typeof window !== 'undefined' && window.TURNAUS) || {};
const CONFIG = {
  SHEET_ID: TURNAUS.SHEET_ID || '',   // Google Sheetin tunnus (osoitteen /d/ ja /edit välissä). Tyhjä = esikatselu esimerkkidatalla.
  API_URL: TURNAUS.API_URL || '',     // Apps Script -verkkosovelluksen osoite (…/exec)
  POLL_MS: TURNAUS.POLL_MS || 30000,  // Päivitysväli julkisella sivulla; kirjausnäkymät 15 s
  PRODUCT: TURNAUS.PRODUCT || { name: '', url: '' },  // Palvelun nimi alalaitaan ("Tulospalvelu: nimi"). Tyhjä = ei näytetä.
};
/* Moottorin osoite (esim. /pelipaiva/). Yhteiset logot ja äänipalat haetaan täältä.
   Jäädytetyssä turnauksessa moottori on kopioitu turnauksen omaan kansioon, ja osoite osoittaa sinne. */
const ENGINE = (() => { try { return new URL('.', document.currentScript.src).href; } catch (e) { return './'; } })();
/* ============================================ */

/* Esikatselun ja harjoitustilan esimerkkiturnaus: kaksi päivää, kaksi sarjaa kahdella kentällä, kaksinkertainen sarja.
   Sama rakenne kuin Google Sheetin välilehdet Asetukset, Joukkueet, Ottelut ja Kuulutukset. */
const DEMO_EVENT = {
  settings: {
    nimi: 'Esimerkkiturnaus', alaotsikko: 'P12 · Kilpa & Haaste', paikka: 'Esimerkkihalli, Seinäjoki', paiva: '2027-04-10',
    ottelun_kesto: '30', nayta_sarjataulukko: 'kyllä', nayta_pelinumerot: 'ei', tauko_teksti: 'kahvio palvelee', jarjestaja: 'SJK', nayta_logot: 'kyllä',
    kahvio_teksti: 'Auki koko pelipäivän', kahvio_mobilepay: '', kahvio_saaja: '',
  },
  cafe: [
    { 'ryhmä': 'Juomat', tuote: 'Kahvi', hinta: '2' }, { 'ryhmä': 'Juomat', tuote: 'Pillimehu', hinta: '1' }, { 'ryhmä': 'Juomat', tuote: 'Kivennäisvesi', hinta: '2' },
    { 'ryhmä': 'Syötävää', tuote: 'Mokkapala', hinta: '2' }, { 'ryhmä': 'Syötävää', tuote: 'Sämpylä', hinta: '2' }, { 'ryhmä': 'Syötävää', tuote: 'Sipsit', hinta: '3' },
  ],
  teams: [
    { nimi: 'SJK', tausta: '#bdb03a', teksti: '#161414', lausunta: 'äs jii koo' },
    { nimi: 'VPS', tausta: '#161414', teksti: '#ffffff', reuna: '#ffffff', reunatyyli: 'raita', lausunta: 'vee pee äs' },
    { nimi: 'WFA', tausta: '#f08a24', teksti: '#10233f', lausunta: 'vee äf aa' },
    { nimi: 'Jaro', tausta: '#c8202a', teksti: '#ffffff' },
    { nimi: 'JJK', tausta: '#1f5fae', teksti: '#ffffff', reuna: '#d6332f', reunatyyli: 'ala', lausunta: 'jii jii koo' },
    { nimi: 'SJK 2', tausta: '#161414', teksti: '#bdb03a', lausunta: 'äs jii koo kaksi' },
    { nimi: 'VPS 2', tausta: '#ffffff', teksti: '#161414', reuna: '#161414', reunatyyli: 'raita', lausunta: 'vee pee äs kaksi' },
    { nimi: 'KPV', tausta: '#1f5fae', teksti: '#ffffff', lausunta: 'koo pee vee' },
  ],
  /* [tunnuskirjain, sarja, kenttä, joukkueet]: kaikki kaikkia vastaan, toisena päivänä kotijoukkue vaihtuu */
  series: [['K', 'Kilpa', 'Kenttä 1', ['SJK', 'VPS', 'WFA', 'Jaro']], ['H', 'Haaste', 'Kenttä 2', ['JJK', 'SJK 2', 'VPS 2', 'KPV']]],
  days: [['2027-04-10', ['10.00', '10.35', '11.10', '13.00', '13.35', '14.10']], ['2027-04-11', ['09.30', '10.05', '10.40', '11.15', '11.50', '12.25']]],
  /* Kuulutukset-välilehti: tunnus, otsikko, teksti, milloin (tyhjä = vain napista, "klo 12.30", "avaus", "tauko", "tauko loppuu", "päivä päättyy", "lopetus"), päivä (tyhjä = joka päivä) */
  announcements: [
    { tunnus: 'tervetuloa', otsikko: 'Tervetuloa', milloin: 'avaus', 'päivä': '1', teksti: 'Hyvää huomenta ja tervetuloa Esimerkkiturnaukseen! Kilpasarja pelaa kentällä yksi ja haastesarja kentällä kaksi. Ohjelman ja tulokset löydät puhelimeesi otteluohjelmajulisteen QR-koodista. Hyvää pelipäivää kaikille!' },
    { tunnus: 'tervetuloa-2', otsikko: 'Tervetuloa toiseen päivään', milloin: 'avaus', 'päivä': '2', teksti: 'Hyvää huomenta ja tervetuloa Esimerkkiturnauksen toiseen pelipäivään! Tänään ratkeavat sarjojen sijoitukset. Hyvää pelipäivää!' },
    { tunnus: 'lopetus', otsikko: 'Kiitos ja näkemiin', milloin: 'lopetus', teksti: 'Esimerkkiturnaus on pelattu! Iso kiitos kaikille joukkueille, valmentajille, tuomareille ja vanhemmille – ja kiitos kaikille talkoolaisille. Turvallista kotimatkaa!' },
    { tunnus: 'kahvio', otsikko: 'Kahvio', milloin: 'klo 11.45', teksti: 'Muistathan kahvion! Sieltä saat kahvia, mehua, mokkapaloja ja sämpylöitä. Kaikki tuotto menee junioreiden hyväksi.' },
    { tunnus: 'pukukopit', otsikko: 'Pukukopit', milloin: '', teksti: 'Muistutus joukkueille: älkää jättäkö arvotavaroita pukukoppeihin. Kiitos!' },
    { tunnus: 'kannustus', otsikko: 'Reilu kannustus', milloin: '', teksti: 'Muistetaan kannustaa kaikkia pelaajia – ja annetaan tuomareille työrauha!' },
  ],
};

/* ---------- apurit ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Tunniste tiedostonimiin ja äänipaloihin: "SJK 2" → "sjk-2", "Kenttä 1" → "kentta-1" */
const slug = s => String(s || '').toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/* Selainmuisti turnauskohtaisesti: turnaukset eivät jaa välimuistia, PIN-istuntoa eivätkä lähettämättömiä kirjauksia. */
const LS_NS = (TURNAUS.id || (typeof location !== 'undefined' && location.pathname.split('/').filter(Boolean).find(p => !p.includes('.'))) || 'root') + ':';
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
function parseDate(s, year) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return new Date(+m[1], m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (m) return new Date(+m[3], m[2] - 1, +m[1]);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.?$/); if (m && year) return new Date(year, m[2] - 1, +m[1]);
  return null;
}
const WD = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'], WDL = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'];
const fmtDate = d => d ? `${WD[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.` : '';

/* Viivakuvakkeet tekstin sekaan (sivuston tyyli, ei emojeja) */
const LICO = {
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  wait: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  mega: '<path d="M3 10v4h3l7 4V6L6 10z"/><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5"/>',
  video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2"/><path d="M15.5 10.5l5-3v9l-5-3z"/>',
};
const licon = k => `<svg class="li" viewBox="0 0 24 24" aria-hidden="true">${LICO[k]}</svg>`;

/* ---------- päivät: ottelun aika = päivä (0 = ensimmäinen) × 1440 + kellonaika minuutteina ---------- */
const DAY = 1440;
const dayDate = i => EVENT.date ? new Date(EVENT.date.getFullYear(), EVENT.date.getMonth(), EVENT.date.getDate() + (i || 0)) : null;
const dayShort = i => fmtDate(dayDate(i));                                                   // "la 10.4."
const dayLong = i => { const d = dayDate(i); return d ? `${WDL[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.` : `Päivä ${(i || 0) + 1}`; }; // "Lauantai 10.4."
/* Ottelut-välilehden päivä-sarake: tyhjä = turnauksen ensimmäinen päivä, 1/2/3 = järjestysnumero, tai päivämäärä (2027-04-11, 11.4.2027, 11.4.) */
function dayOf(v) {
  const s = String(v ?? '').trim(); if (!s) return 0;
  if (/^\d{1,2}$/.test(s)) return Math.max(0, parseInt(s, 10) - 1);
  const d = parseDate(s, EVENT.date && EVENT.date.getFullYear());
  return d && EVENT.date ? Math.round((d - EVENT.date) / 864e5) : 0;
}
/* Absoluuttinen aika laskentaan ja järjestykseen. Kutsutaan aina, kun alkuaika tai päivä muuttuu. */
function place(m) { m.day = m.day || 0; m.at = m.start == null ? null : m.day * DAY + m.start; return m; }
const byTime = (a, b) => (a.at ?? 1e9) - (b.at ?? 1e9);
/* Kellonaika näytettäväksi: monipäiväisessä turnauksessa mukana viikonpäivä, jos se on eri kuin "tänään"-näkymän päivä */
const timeTxt = (m, withDay) => (withDay && EVENT.multiDay ? WD[(dayDate(m.day) || new Date()).getDay()] + ' ' : '') + fmtTime(m.start);
/* Turnauksen päivät otteluista: EVENT.days, EVENT.multiDay ja otsikon päiväteksti */
function setDays(matches) {
  const days = [...new Set((matches || []).map(m => m.day || 0))].sort((a, b) => a - b);
  EVENT.days = days.length ? days : [0]; EVENT.multiDay = EVENT.days.length > 1;
  const a = dayDate(EVENT.days[0]), b = dayDate(EVENT.days[EVENT.days.length - 1]);
  EVENT.dateText = !a ? '' : EVENT.multiDay ? `${fmtDate(a)}–${fmtDate(b)}` : fmtDate(a);
}

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
      logo: /^[\w\-./]+\.(png|svg|jpe?g|webp)$/i.test(String(r.logo || '').trim()) ? String(r.logo).trim() : '',
      say: String(r.lausunta || '').trim() };
  }
  const date = parseDate(s.paiva);
  return {
    name: s.nimi || 'Turnaus', sub: s.alaotsikko || '', venue: s.paikka || '', date, dateText: fmtDate(date),
    matchMin: toInt(s.ottelun_kesto) || 30, showTable: s.nayta_sarjataulukko == null ? true : yes(s.nayta_sarjataulukko),
    showNumbers: yes(s.nayta_pelinumerot), breakText: s.tauko_teksti || '', organizer: s.jarjestaja || '',
    mobilepay: s.kahvio_mobilepay || '', payee: s.kahvio_saaja || '', cafeText: s.kahvio_teksti || '', cafe: [], showLogos: yes(s.nayta_logot), logoStyle: /pelk|ilman|plain/i.test(s.logotyyli || '') ? 'plain' : 'color',
    teams, teamNames: Object.keys(teams), raw: s, days: [0], multiDay: false,
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
/* Logo joukkueen nimen edessä (asetus nayta_logot). Joukkueet-välilehden logo-sarake (polku turnauskansiossa) tai yhteinen
   logokirjasto pelipaiva/logot/<nimi>.png. Puuttuva kuva piilotetaan. */
function logoSrc(t) { const c = EVENT.teams[t]; return c ? (c.logo || `${ENGINE}logot/${slug(t)}.png`) : ''; }
/* Puuttuvat logot muistetaan, ettei niitä haeta uudelleen jokaisella päivityksellä */
const LOGO_MISS = new Set();
function logoMiss(img) { LOGO_MISS.add(img.getAttribute('src')); const c = img.closest('.chip'); if (c) c.classList.remove('has-logo'); img.remove(); }
const chip = t => {
  const src0 = EVENT.showLogos && logoSrc(t), src = src0 && !LOGO_MISS.has(src0) ? src0 : '';
  const plain = src && EVENT.logoStyle === 'plain';
  return `<span class="chip${src ? ' has-logo' : ''}${plain ? ' plain' : ''}"${plain ? '' : ` style="${teamStyle(t)}"`}>${src ? `<img class="lg" src="${esc(src)}" alt="" loading="lazy" onerror="logoMiss(this)">` : ''}${esc(t)}</span>`;
};
function applyHeader() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('evName', EVENT.name); set('evSub', EVENT.sub);
  set('evVenue', [EVENT.venue, EVENT.dateText].filter(Boolean).join(' · '));
  set('evOrg', EVENT.organizer ? `Järjestäjä ${EVENT.organizer}` : '');
  const pr = document.getElementById('product');
  if (pr && CONFIG.PRODUCT && CONFIG.PRODUCT.name) pr.innerHTML = ` · Tulospalvelu: ${CONFIG.PRODUCT.url ? `<a href="${esc(CONFIG.PRODUCT.url)}" target="_blank" rel="noopener">${esc(CONFIG.PRODUCT.name)}</a>` : esc(CONFIG.PRODUCT.name)}`;
  set('evEyebrow', [EVENT.name, EVENT.multiDay ? '' : EVENT.venue.split(',')[0], EVENT.dateText].filter(Boolean).join(' · '));
  fitTitle();
  const root = document.documentElement.style, raw = EVENT.raw || {};
  if (HEX.test(raw.vari_pohja || '')) { root.setProperty('--head', raw.vari_pohja); root.setProperty('--ink', raw.vari_pohja); }
  if (HEX.test(raw.vari_korostus || '')) root.setProperty('--gold', raw.vari_korostus);
  const t = document.querySelector('title'); if (t && t.dataset.suffix != null) t.textContent = EVENT.name + (t.dataset.suffix ? ' ' + t.dataset.suffix : '');
}

/* Pitkä turnauksen nimi (esim. ESIMERKKITURNAUS) pienennetään mahtumaan yläpalkkiin, ettei se mene päivitysajan päälle */
function fitTitle() {
  const h = document.getElementById('evName'); if (!h) return;
  h.style.fontSize = '';
  requestAnimationFrame(() => { let f = parseFloat(getComputedStyle(h).fontSize), n = 0; while (h.scrollWidth > h.clientWidth + 1 && f > 16 && n++ < 30) { f -= 1; h.style.fontSize = f + 'px'; } });
}

/* ---------- ottelut, sarjat ja kentät ---------- */
function rowToMatch(r) {
  return place({ id: r.id, series: (r.sarja || '').trim() || 'Sarja', day: dayOf(r['päivä'] ?? r.paiva), start: parseTime(r.alku), field: (r['kenttä'] || r.kentta || '').trim(),
    home: (r.koti || '').trim(), away: (r.vieras || '').trim(), hg: toInt(r.koti_maalit), ag: toInt(r.vieras_maalit), tila: (r.tila || '').toLowerCase(),
    veo: /^https:\/\/([a-z0-9-]+\.)*veo\.co\/\S+$/i.test((r.veo || '').trim()) ? r.veo.trim() : '' });
}
const rowToGoal = r => ({ id: r.id, match: r.ottelu, team: r.joukkue, no: r.pelinumero || '', min: toInt(r.minuutti) });
const uniq = a => [...new Set(a.filter(Boolean))];
const seriesList = ms => uniq(ms.map(m => m.series));
const fieldList = ms => uniq(ms.slice().sort(byTime).map(m => m.field));
const teamsInSeries = (ms, s) => { const set = uniq(ms.filter(m => m.series === s).flatMap(m => [m.home, m.away])); return EVENT.teamNames.filter(t => set.includes(t)).concat(set.filter(t => !EVENT.teamNames.includes(t))); };
function mainField(ms, s) { const c = {}; ms.filter(m => m.series === s && m.field).forEach(m => c[m.field] = (c[m.field] || 0) + 1); return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ''; }
/* Ottelupaikka (slot): samaan aikaan alkavat ottelut. at = absoluuttinen aika, start = kellonaika, day = päivä. */
function slotsOf(matches) {
  const by = {};
  for (const m of matches) { if (m.at == null) continue; (by[m.at] = by[m.at] || { at: m.at, start: m.start, day: m.day || 0, ms: [] }).ms.push(m); }
  const sl = Object.values(by).sort((a, b) => a.at - b.at);
  const order = seriesList(matches);
  for (const s of sl) { s.ms.sort((a, b) => order.indexOf(a.series) - order.indexOf(b.series)); const p = s.ms[0]; s.same = s.ms.every(m => m.home === p.home && m.away === p.away); }
  return sl;
}
const slotHas = (s, t) => s.ms.some(m => m.home === t || m.away === t);

/* ---------- kello ----------
   clk.at = minuutit turnauksen ensimmäisen päivän keskiyöstä, clk.day = monesko turnauspäivä tänään on (voi olla negatiivinen),
   clk.min = kellonaika minuutteina. Harjoitustilan kello alkaa ensimmäisen päivän klo 11.52 ja kulkee oikeaa tahtia. */
const DEMO_START_AT = 11 * 60 + 52;
const mkClock = (at, demo) => ({ at, day: Math.floor(at / DAY), min: ((at % DAY) + DAY) % DAY, demo });
function clock() {
  if (Store.demo) { const d = Store.demoData(); return mkClock((d.at0 ?? DEMO_START_AT) + Math.floor((Date.now() - d.t0) / 60000), true); }
  const now = new Date(), min = now.getHours() * 60 + now.getMinutes();
  if (!EVENT.date) return mkClock(min, false);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return mkClock(Math.round((today - EVENT.date) / 864e5) * DAY + min, false);
}
/* Onko tänään turnauspäivä (jonakin päivänä pelataan) */
const isEventDay = clk => (EVENT.days || [0]).includes(clk.day);
/* Minkä päivän ohjelma on nyt ajankohtainen: tänään, jos tänään pelataan; ennen turnausta ensimmäinen; sen jälkeen viimeinen;
   välipäivänä seuraava pelipäivä. */
function currentDay(clk) { const ds = EVENT.days || [0]; return ds.includes(clk.day) ? clk.day : ds.find(d => d > clk.day) ?? ds[ds.length - 1]; }

/* ---------- tila ja tulos ---------- */
const isFinal = m => m.hg != null && m.ag != null;
function status(m, clk) {
  if (m.tila === 'peruttu') return { k: 'cancel', label: 'Peruttu' };
  if (isFinal(m)) return { k: 'done', label: 'Pelattu' };
  if (m.at == null) return { k: 'up', label: 'Tulossa' };
  const end = m.at + EVENT.matchMin;
  if (m.tila === 'käynnissä' || (clk.at >= m.at && clk.at < end)) return { k: 'live', label: 'Käynnissä', left: Math.max(0, end - clk.at) };
  if (clk.at >= end) return { k: 'wait', label: 'Tulos tulossa' };
  return { k: 'up', label: 'Tulossa', inMin: clk.day === m.day ? m.at - clk.at : null };
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
  if (!ev.date) err('Asetukset: päivä (paiva) puuttuu tai on väärässä muodossa. Käytä muotoa 2027-04-10 tai 10.4.2027 (monipäiväisessä turnauksessa ensimmäinen päivä).');
  if (!ev.teamNames.length) err('Joukkueet-välilehti on tyhjä.');
  if (!matches.length) err('Ottelut-välilehti on tyhjä.');
  const ids = {}, at = {}, when = m => `${EVENT.multiDay ? dayShort(m.day) + ' ' : ''}klo ${fmtTime(m.start)}`;
  for (const m of matches) {
    const w = `Ottelu ${m.id || '(ei id:tä)'}`;
    if (!m.id) err('Ottelulta puuttuu id.'); else if (ids[m.id]) err(`${w}: sama id on kahdesti.`); ids[m.id] = 1;
    if (m.start == null) err(`${w}: alkuaika puuttuu tai on väärä (esim. 14.35).`);
    if (m.day < 0) err(`${w}: päivä on ennen turnauksen ensimmäistä päivää (Asetukset: paiva).`);
    if (m.day > 6) warn(`${w}: päivä on yli viikon turnauksen alusta. Onko päivä-sarake oikein?`);
    if (!m.field) warn(`${w}: kenttä puuttuu.`);
    if (!m.home || !m.away) err(`${w}: joukkue puuttuu.`);
    if (m.home && m.home === m.away) err(`${w}: joukkue pelaa itseään vastaan.`);
    for (const t of [m.home, m.away]) if (t && !ev.teams[t]) err(`${w}: joukkuetta "${t}" ei ole Joukkueet-välilehdellä (kirjoitusasu?).`);
    if (m.at != null && m.field) { const k = m.at + '|' + m.field; if (at[k]) err(`${w}: samalla kentällä (${m.field}) on jo ottelu ${when(m)} (${at[k]}).`); at[k] = m.id; }
  }
  for (const m of matches) for (const o of matches) if (m.id < o.id && m.at != null && o.at != null && Math.abs(m.at - o.at) < ev.matchMin && [m.home, m.away].some(t => t && (t === o.home || t === o.away)))
    (m.series === o.series ? err : warn)(`Joukkue pelaa päällekkäin kahta ottelua: ${m.id} ja ${o.id} (${when(m)}).`);
  for (const [n, c] of Object.entries(ev.teams)) if (!c.bg || c.bg === '#e2ddcc') warn(`Joukkueelta ${n} puuttuu taustaväri (esim. #bdb03a).`);
  return out;
}

/* ---------- tallennus: demo (selaimen muisti) tai Google Sheets + Apps Script ---------- */
const DEMO_KEY = 'pelipaiva-demo-v1';
/* Kaksinkertainen sarja: ensimmäisenä päivänä kierrokset 1–3 ja 4–6 (kotijoukkue ensin), toisena päivänä sama käännettynä */
function demoMatches() {
  const out = [], rr = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  for (const [k, name, field, teams] of DEMO_EVENT.series) {
    let n = 0;
    DEMO_EVENT.days.forEach(([date, times], di) => times.forEach((t, ti) => {
      const [a, b] = rr[ti], [h, w] = di ? [teams[b], teams[a]] : [teams[a], teams[b]];
      out.push(place({ id: k + (++n), series: name, day: di, paiva: date, start: parseTime(t), field, home: h, away: w, hg: null, ag: null, tila: '' }));
    }));
  }
  return out;
}
function demoSeed() {
  const ms = demoMatches();
  const res = { K1: [2, 1], H1: [1, 1], K2: [0, 2], H2: [3, 1], K3: [1, 3], H3: [2, 2] };
  const goals = [];
  for (const m of ms) if (res[m.id]) {
    [m.hg, m.ag] = res[m.id];
    // Maalikirjaukset tulosten mukaisesti: tasaisin välein, numerot joukkueen kokoonpanosta
    const list = [...Array(m.hg).fill(m.home), ...Array(m.ag).fill(m.away)];
    list.forEach((team, i) => goals.push({ id: m.id + '-g' + i, match: m.id, team, no: String([7, 9, 10, 11, 14][i % 5]), min: 3 + Math.floor((i + 1) * 26 / (list.length + 1)) }));
  }
  goals.push({ id: 'K4-g0', match: 'K4', team: ms.find(m => m.id === 'K4').home, no: '7', min: 3 });
  const roster = {};
  DEMO_EVENT.teams.forEach((t, ti) => DEMO_EVENT.series.forEach(([, s], si) => {
    roster[t.nimi + '-' + s] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 17, 21].filter((_, i) => (i + ti + si) % 5 !== 0).map(String);
  }));
  return { t0: Date.now(), at0: DEMO_START_AT, settings: { ...DEMO_EVENT.settings }, teams: DEMO_EVENT.teams.map(t => ({ ...t })), matches: ms, goals, roster, adjust: [], announcements: DEMO_EVENT.announcements.map(a => ({ ...a })) };
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
    if (this.demo) {
      this._demo = null; const d = this.demoData(); EVENT = buildEvent(d.settings, d.teams); EVENT.cafe = cafeRows(DEMO_EVENT.cafe);
      const matches = d.matches.map(m => place({ ...m })); setDays(matches); applyHeader();
      return { matches, goals: d.goals.slice(), adjust: (d.adjust || []).map(a => ({ ...a })) };
    }
    await this.loadMeta(forceMeta);
    const [mr, gr, kr] = await Promise.all([this.gviz('Ottelut'), this.gviz('Maalit').catch(() => []), this.gviz('Korjaukset').catch(() => [])]);
    const matches = mr.filter(r => r.id).map(rowToMatch); setDays(matches); applyHeader();
    return { matches, goals: gr.filter(r => r.id && r.ottelu).map(rowToGoal), adjust: kr.filter(r => r.joukkue).map(rowToAdj) };
  },
  /* Kuulutukset-välilehti (valinnainen): turnauksen omat kuulutukset. Haetaan vain ylläpidossa. */
  async announcements() {
    if (this.demo) return (this.demoData().announcements || []).map(a => ({ ...a }));
    return (await this.gviz('Kuulutukset').catch(() => [])).filter(r => (r.tunnus || '').trim());
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
      if (op.action === 'shift') for (const id of op.ids || []) { const m = d.matches.find(x => x.id === id); if (m && m.start != null) { m.start += op.minutes; place(m); } }
      if (op.action === 'setTime') { const m = d.matches.find(x => x.id === op.match); if (m) { m.start = parseTime(op.alku); place(m); } }
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
  const css = k => (getComputedStyle(document.documentElement).getPropertyValue(k) || '').trim();
  const dark = css('--head') || '#211e1e', gold = css('--gold') || '#bdb03a';
  x.fillStyle = dark; x.fillRect(0, 0, W, H);
  x.fillStyle = gold; x.fillRect(0, 0, W, 16);
  const logo = await logoImg(); if (logo) x.drawImage(logo, W - 80 - 170, 70, 170, 170);
  const head = [EVENT.name, EVENT.sub.split('·')[0].trim(), EVENT.venue.split(',')[0], dayShort(m.day).replace(/^\S+\s/, '')].filter(Boolean).join(' · ').toUpperCase();
  x.fillStyle = gold; fit(head, 680, 34, 600, '"Saira Condensed", sans-serif'); x.fillText(head, 80, 112);
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
  x.fillStyle = gold; x.font = '800 190px "Saira Condensed", sans-serif'; x.textAlign = 'center';
  x.fillText(String(sc[0]), 800, 515); x.fillText(String(sc[1]), 800, 725); x.textAlign = 'left';
  const g = goalsOf(m.id, goals);
  if (g.length) {
    x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '600 30px "Figtree", sans-serif';
    const line = g.map(z => `${z.min ?? '?'}' ${z.team}`).join('   ');
    x.fillText(line.length > 60 ? line.slice(0, 58) + '…' : line, 80, 830);
  }
  x.fillStyle = gold; x.fillRect(80, 900, 120, 6);
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

if (typeof module !== 'undefined') module.exports = { parseCSV, parseTime, fmtTime, parseDate, buildEvent, standings, status, score, rowToMatch, demoMatches, demoSeed, parseNumbers, isAdjusted, validateData, slotsOf, seriesList, fieldList, teamsInSeries, setEvent: e => { EVENT = e; }, getEvent: () => EVENT, CONFIG, DAY, place, setDays, dayOf, slug, mkClock, currentDay, isEventDay, timeTxt, dayLong, dayShort };

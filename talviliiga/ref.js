/* Tulospalvelu – kirjausnäkymät.
   tuomari.html (data-mode="tuomari"): lopputuloksen vahvistus ottelun jälkeen, maalit valinnaisesti jälkikäteen.
   kentta.html  (data-mode="kentta"):  kenttävastaava kirjaa maalit reaaliajassa yhdellä napautuksella.
   yllapito.html (data-mode="admin"):  ylläpitäjä (ADMIN_PIN): tilanne, korjaukset, aikataulu, peruminen, taulukko. */
const MODE = document.body.dataset.mode || 'tuomari';
const PIN_KEY = 'tulospalvelu-pin-' + MODE; // jokainen näkymä muistaa oman kirjautumisensa
const R = {
  pin: ls.get(PIN_KEY, ''),
  filter: ls.get('tulospalvelu-ref-filter', ''),
  field: ls.get('tulospalvelu-field', ''),   // kenttävastaavan kenttä (Ottelut-välilehden kenttä-sarakkeesta)
  view: 'list',                               // list | match | roster
  match: null, pinned: null,                  // kenttänäkymässä käsin valittu ottelu
  data: null,
  queue: ls.get('tulospalvelu-queue', []),
  roster: ls.get('tulospalvelu-roster', {}),
  draft: {},
  sheet: null,                                // { team, id?, no, min }
  sending: false, offline: false,
  rSeries: '', rTeam: '', rText: null,
  confirmDel: null,
  aSeries: '', aTeam: '', aDraft: null, adminPin: '',
};
const app = document.getElementById('app');
const syncEl = document.getElementById('sync');
const pickSeries = cur => { const l = seriesList(R.data.matches); return l.includes(cur) ? cur : l[0] || ''; };
const pickTeam = (series, cur) => { const l = teamsInSeries(R.data.matches, series); return l.includes(cur) ? cur : l[0] || ''; };
const goalBtn = (t, attr, extra = '') => `<button style="${teamStyle(t)}${extra}" ${attr}="${esc(t)}">+ Maali ${esc(t)}</button>`;
const goalCount = (m, gl) => [gl.filter(g => g.team === m.home).length, gl.filter(g => g.team === m.away).length];

function toast(msg) { document.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2400); }

/* ---- data, jono ja synkronointi ---- */
function applyLocal(d, op) {
  if (!d) return;
  if (op.action === 'goal') { const i = d.goals.findIndex(x => x.id === op.goal.id); if (i >= 0) d.goals[i] = op.goal; else d.goals.push(op.goal); }
  if (op.action === 'deleteGoal') d.goals = d.goals.filter(x => x.id !== op.id);
  if (op.action === 'result') { const m = d.matches.find(x => x.id === op.match); if (m) { m.hg = toInt(op.hg); m.ag = toInt(op.ag); } }
  if (op.action === 'shift') for (const id of op.ids || []) { const m = d.matches.find(x => x.id === id); if (m && m.start != null) m.start += op.minutes; }
  if (op.action === 'setTime') { const m = d.matches.find(x => x.id === op.match); if (m) m.start = parseTime(op.alku); }
  if (op.action === 'setStatus') { const m = d.matches.find(x => x.id === op.match); if (m) m.tila = op.tila || ''; }
  if (op.action === 'setAdjust') { d.adjust = (d.adjust || []).filter(a => !(a.series === op.adj.series && a.team === op.adj.team)); if (isAdjusted(op.adj)) d.adjust.push(op.adj); }
}
async function load() {
  try { const d = await Store.load(); R.queue.forEach(op => applyLocal(d, op)); R.data = d; R.offline = false; }
  catch (e) { R.offline = true; }
  render();
}
function enqueue(op) { op.qid = uid(); R.queue.push(op); ls.set('tulospalvelu-queue', R.queue); applyLocal(R.data, op); render(); flush(); }
async function flush() {
  if (R.sending || !R.queue.length) { renderSync(); return; }
  R.sending = true; renderSync();
  while (R.queue.length) {
    const { qid, ...body } = R.queue[0];
    try { await Store.send(body, R.pin); R.queue.shift(); ls.set('tulospalvelu-queue', R.queue); R.offline = false; }
    catch (e) {
      if (e.code === 'pin') { R.pin = ''; ls.set(PIN_KEY, ''); R.sending = false; toast('PIN-koodi ei kelpaa. Kirjaudu uudelleen.'); render(); return; }
      if (e.permanent) { R.queue.shift(); ls.set('tulospalvelu-queue', R.queue); toast('Yksi kirjaus hylättiin virheellisenä. Tarkista tilanne.'); continue; }
      R.offline = true; break;
    }
  }
  R.sending = false; renderSync();
}
function renderSync() {
  const n = R.queue.length;
  syncEl.innerHTML = !R.pin ? '' : n ? `<span class="sync bad">${R.sending && !R.offline ? 'Tallennetaan…' : `Odottaa yhteyttä<br>${n} tallennusta`}</span>` : `<span class="sync ok">Kaikki<br>tallennettu ✓</span>`;
}
async function loadRoster() { try { const r = await Store.send({ action: 'getRoster' }, R.pin); R.roster = r.roster || {}; ls.set('tulospalvelu-roster', R.roster); } catch (e) { } }

/* ---- yhteiset palat ---- */
const pillFor = st => `<span class="pill ${{ live: 'live', done: 'done', wait: 'wait' }[st.k] || ''}">${st.k === 'live' ? `Käynnissä · ${st.left} min` : st.k === 'up' && st.inMin != null && st.inMin <= 90 ? `Alkaa ${st.inMin} min` : st.label}</span>`;
function tabsBar(active) {
  const tabs = MODE === 'admin' ? [['list', 'Tilanne'], ['schedule', 'Aikataulu'], ['admin', 'Taulukko'], ['roster', 'Numerot'], ['test', 'Testi']]
    : [['list', MODE === 'kentta' ? 'Kenttä' : 'Ottelut'], ['roster', 'Pelinumerot']];
  return `<div class="tabs" role="tablist">${tabs.map(([v, l]) => `<button role="tab" data-view="${v}" aria-selected="${active === v}">${l}</button>`).join('')}</div>`;
}

/* ---- YLLÄPITO: sarjataulukon käsikorjaus ---- */
function adminView() {
  if (!R.data) return `${tabsBar('admin')}<div class="card">Ladataan…</div>`;
  R.aSeries = pickSeries(R.aSeries); R.aTeam = pickTeam(R.aSeries, R.aTeam);
  const teamsS = teamsInSeries(R.data.matches, R.aSeries);
  const cur = (R.data.adjust || []).find(a => a.series === R.aSeries && a.team === R.aTeam);
  if (!R.aDraft) R.aDraft = cur ? { ...cur } : { series: R.aSeries, team: R.aTeam, pts: 0, gf: 0, ga: 0, pos: 0, note: '' };
  const d = R.aDraft;
  const others = (R.data.adjust || []).filter(a => !(a.series === R.aSeries && a.team === R.aTeam));
  const preview = standings(R.data.matches, R.aSeries, isAdjusted(d) ? [...others, d] : others);
  const rows = preview.map((r, i) => `<tr class="${r.team === R.aTeam ? 'mine' : ''}"><td>${i + 1}</td><td>${chip(r.team)}${isAdjusted(r.adj) ? '<sup class="adjm">*</sup>' : ''}</td><td>${r.p}</td><td>${r.gf}–${r.ga}</td><td>${r.pts}</td></tr>`).join('');
  const step = (k, l) => `<div style="display:grid;gap:4px;justify-items:center"><span class="note" style="margin:0">${l}</span><div class="v" style="font-size:1.8rem">${d[k] > 0 ? '+' : ''}${d[k]}</div><div class="step" style="width:100%"><button data-aadj="${k},-1" aria-label="${l} miinus">−</button><button data-aadj="${k},1" aria-label="${l} plus">+</button></div></div>`;
  const posOpts = [0, ...teamsS.map((_, i) => i + 1)].map(n => `<option value="${n}" ${d.pos === n ? 'selected' : ''}>${n ? n + '. sija' : 'Automaattinen'}</option>`).join('');
  return `${tabsBar('admin')}
  <section class="card" style="display:grid;gap:14px">
    <p class="note" style="margin:0">Käsikorjaus vain pakottavaan tarpeeseen, esim. luovutettu ottelu tai sääntörike. Ottelutulokset pysyvät ennallaan. Korjaus näkyy julkisessa taulukossa tähdellä ja selitteellä.</p>
    <div class="seg" role="group" aria-label="Sarja">${seriesList(R.data.matches).map(x => `<button data-aseries="${esc(x)}" aria-pressed="${R.aSeries === x}">${esc(x)}</button>`).join('')}</div>
    <div class="picker">${teamsS.map(t => `<button class="pick" data-ateam="${esc(t)}" aria-pressed="${R.aTeam === t}">${chip(t)}</button>`).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${step('pts', 'Pisteet')}${step('gf', 'Tehdyt maalit')}${step('ga', 'Päästetyt maalit')}</div>
    <label for="aPos" style="display:grid;gap:4px;font-weight:700;font-size:.85rem">Pakota sijoitus<select id="aPos" style="font:inherit;padding:10px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface)">${posOpts}</select></label>
    <label for="aNote" style="display:grid;gap:4px;font-weight:700;font-size:.85rem">Selite (näkyy julkisesti)<input id="aNote" maxlength="80" value="${esc(d.note)}" placeholder="Esim. ottelu luovutettu, 3–0 voitto" style="font:inherit;padding:10px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface)"></label>
    <div class="tbl-wrap"><table class="st"><thead><tr><th>#</th><th>Joukkue</th><th>O</th><th>M</th><th>P</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note" style="margin:0">Esikatselu: taulukko korjauksen kanssa.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn gold" data-saveadj style="flex:1">Tallenna korjaus</button>${cur ? '<button class="btn ghost" data-deladj>Poista korjaus</button>' : ''}</div>
  </section>`;
}
async function saveAdjust(adj) {
  try { await Store.send({ action: 'setAdjust', adj, adminPin: Store.demo ? 'demo' : R.pin }, R.pin); applyLocal(R.data, { action: 'setAdjust', adj }); R.aDraft = null; render(); toast(isAdjusted(adj) ? 'Korjaus tallennettu' : 'Korjaus poistettu'); }
  catch (e) { toast(e.code === 'admin' ? 'Ylläpitäjän PIN ei kelpaa' : e.code === 'pin' ? 'Kirjaudu uudelleen' : 'Ei yhteyttä, yritä uudelleen'); }
}
function demoBanner(clk) { return clk.demo ? `<div class="banner"><span><b>${CONFIG.SHEET_ID ? 'Harjoitustila' : 'Esikatselu'}</b> · esimerkkidata, kello simuloitu klo ${fmtTime(clk.min)}. Tallennukset jäävät tähän puhelimeen eivätkä näy oikeassa tulospalvelussa. <a href="./${CONFIG.SHEET_ID ? '#harjoitus' : ''}" style="color:inherit;font-weight:700">Avaa harjoitus­tulospalvelu</a></span></div>` : ''; }

/* Muokkausoikeus (marssijärjestys): kenttävastaava < tuomari < ylläpitäjä.
   Kenttävastaava kirjaa maalit, kunnes lopputulos on vahvistettu. Tuomari voi korjata vahvistettua tulosta,
   kunnes ylläpitäjä hyväksyy ja lukitsee sen (Ottelut-välilehden tila = hyväksytty). Ylläpitäjä voi aina muokata. */
const isLocked = m => !!m && m.tila === 'hyväksytty';
const canEdit = m => MODE === 'admin' || (MODE === 'tuomari' && !isLocked(m)) || (MODE === 'kentta' && !isFinal(m) && !isLocked(m));
function lockNote(m) {
  return isLocked(m) ? `<div class="banner"><b>🔒 Ylläpitäjä on hyväksynyt tuloksen ${m.hg}–${m.ag} ja lukinnut sen.</b><span>Korjaukset vain ylläpidon kautta.</span></div>`
    : `<div class="banner" style="background:var(--live-bg);color:var(--live)"><b>Lopputulos ${m.hg}–${m.ag} on vahvistettu ✓</b><span>Tuomari tai ylläpitäjä voi tarvittaessa korjata sen.</span></div>`;
}
function goalItems(m, goals, withNumberBtn) {
  if (!canEdit(m)) return goals.length ? `<div class="glist">${goals.slice().reverse().map(g => `<div class="gi"><span class="m">${g.min != null ? g.min + "'" : '–'}</span>${chip(g.team)}${g.no ? `<span class="note" style="margin:0">#${esc(g.no)}</span>` : ''}</div>`).join('')}</div>` : '';
  if (!goals.length) return '';
  return `<div class="glist">${goals.slice().reverse().map(g => `<div class="gi"><span class="m">${g.min != null ? g.min + "'" : '–'}</span>${chip(g.team)}
    <button class="btn ghost" data-editgoal="${g.id}" style="padding:4px 10px">${g.no ? '#' + esc(g.no) : withNumberBtn ? '+ numero' : 'Ei numeroa'}</button>
    <button class="x" data-delgoal="${g.id}">${R.confirmDel === g.id ? 'Vahvista poisto' : 'Poista'}</button></div>`).join('')}</div>`;
}

function resultBlock(m, goals, opts = {}) {
  const final = isFinal(m);
  if (!canEdit(m)) return lockNote(m);
  const d = R.draft[m.id] || (R.draft[m.id] = final ? [m.hg, m.ag] : goalCount(m, goals));
  const changed = !final || d[0] !== m.hg || d[1] !== m.ag;
  const side = (i, t) => `<div style="display:grid;gap:8px;justify-items:center">${chip(t)}<div class="v">${d[i]}</div><div class="step" style="width:100%"><button data-adj="${i},-1" aria-label="${esc(t)} miinus">−</button><button data-adj="${i},1" aria-label="${esc(t)} plus">+</button></div></div>`;
  return `<div class="adj">${side(0, m.home)}<span aria-hidden="true"></span>${side(1, m.away)}</div>
    ${final && !changed ? `<div class="banner" style="background:var(--live-bg);color:var(--live)"><b>Lopputulos vahvistettu ${m.hg}–${m.ag} ✓</b><span>Muuta lukemia ja tallenna, jos tulos pitää korjata.</span></div>`
      : `<button class="btn gold" data-confirm style="font-size:1.15rem;padding:14px">${final ? 'Tallenna korjattu tulos' : 'Vahvista lopputulos'} ${d[0]}–${d[1]}</button>`}
    ${final ? `<button class="btn ghost" data-clear style="justify-self:start">Poista vahvistettu tulos</button>` : ''}
    ${MODE === 'admin' && final && !changed ? (isLocked(m)
      ? `<div class="banner" style="background:var(--live-bg);color:var(--live)"><b>🔒 Hyväksytty ja lukittu.</b><span>Tuomari ja kenttävastaava eivät voi enää muuttaa tulosta.</span></div><button class="btn ghost" data-unlock style="justify-self:start">Avaa lukitus</button>`
      : `<div class="banner"><b>Tulos ${m.hg}–${m.ag} on vahvistettu (tuomari tai kenttävastaava).</b><span>Tarkista ja hyväksy, niin tulos lukittuu.</span></div><button class="btn gold" data-approve style="font-size:1.1rem;padding:14px">✓ Hyväksy ja lukitse tulos ${m.hg}–${m.ag}</button>`) : ''}`;
}

function goalSheet(m, clk) {
  const S = R.sheet, team = S.team, nums = R.roster[team + '-' + m.series] || [];
  const grid = nums.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:6px">${nums.map(n => `<button type="button" class="btn ${S.no === n ? 'gold' : 'ghost'}" data-pickno="${esc(n)}" style="padding:10px 0"><span class="d num" style="font-size:1.4rem">${esc(n)}</span></button>`).join('')}</div>`
    : `<p class="note" style="margin:0">Joukkueen ${esc(team)} (${esc(m.series)}) numeroita ei ole lisätty. Syötä numero käsin, tai lisää numerot Pelinumerot-välilehdellä.</p>`;
  return `<div class="overlay" data-sheetbg style="place-items:end center;padding:0"><form class="sheet" id="goalForm" style="position:static;width:100%">
    <h3>${S.id ? 'Muokkaa maalia' : 'Maali'} ${chip(team)}</h3>${grid}
    <div class="frm">
      <label for="gNo">Pelinumero (valinnainen)<input id="gNo" inputmode="numeric" maxlength="2" value="${esc(S.no || '')}" placeholder="–"></label>
      <label for="gMin">Minuutti (valinnainen)<input id="gMin" inputmode="numeric" maxlength="2" value="${S.min ?? ''}" placeholder="–"><span class="step"><button type="button" data-min="-1" aria-label="Minuutti miinus">−</button><button type="button" data-min="1" aria-label="Minuutti plus">+</button></span></label>
    </div>
    <div style="display:flex;gap:8px"><button class="btn gold" type="submit" style="flex:1;font-size:1.1rem;padding:14px">Tallenna</button><button class="btn ghost" type="button" data-closesheet>Peru</button></div>
  </form></div>`;
}

/* ---- kirjautuminen ---- */
function loginView() {
  return `<section class="card pin"><h2 class="d" style="margin:0;font-size:1.6rem;text-transform:uppercase">Kirjaudu</h2>
    <p style="margin:0;color:var(--muted)">${MODE === 'admin' ? 'Syötä ylläpitäjän PIN-koodi.' : 'Syötä turnauksen PIN-koodi.'}</p>
    <form id="pinForm" style="display:grid;gap:12px"><label for="pinIn" class="note" style="margin:0">PIN-koodi</label>
    <input id="pinIn" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required>
    <button class="btn gold" type="submit">Kirjaudu</button></form>
    ${Store.demo ? `<p class="note">${CONFIG.SHEET_ID ? 'Harjoitustila' : 'Esikatselu'}: mikä tahansa PIN-koodi käy. Tallennukset jäävät tähän selaimeen.</p>` : ''}</section>`;
}

/* ---- TUOMARI: lista ja ottelu ---- */
function filterBar() {
  const fields = R.data ? fieldList(R.data.matches) : [];
  if (R.filter && !fields.includes(R.filter)) R.filter = '';
  if (fields.length < 2) return '';
  const opts = [['', 'Kaikki kentät'], ...fields.map(f => [f, f])];
  return `<div class="seg" role="group" aria-label="Kenttä">${opts.map(([v, l]) => `<button data-filter="${esc(v)}" aria-pressed="${R.filter === v}">${esc(l)}</button>`).join('')}</div>`;
}
function refList() {
  if (!R.data) return `<div class="card">${R.offline ? 'Otteluita ei saatu ladattua. Tarkista nettiyhteys.' : 'Ladataan otteluita…'}</div>`;
  const clk = clock();
  const ms = R.data.matches.filter(m => !R.filter || m.field === R.filter).sort((a, b) => a.start - b.start || a.series.localeCompare(b.series));
  const item = m => { const st = status(m, clk), sc = score(m, R.data.goals, st);
    return `<button class="rm ${st.k === 'wait' ? 'now' : ''}" data-match="${m.id}"><span class="tm num">${fmtTime(m.start)}</span>
      <span><span class="who">${chip(m.home)}<span style="color:var(--muted)">vs</span>${chip(m.away)}</span><span class="sub2">${esc([m.series, m.field].filter(Boolean).join(' · '))}</span></span>
      <span style="display:grid;justify-items:end;gap:4px">${pillFor(st)}<span class="score ${sc ? '' : 'pending'}" style="font-size:1.3rem">${sc ? sc.join('–') : ''}</span></span></button>`; };
  const group = (title, list, note) => list.length ? `<div class="sec-h" style="margin:8px 0 0"><h2>${title}</h2><small>${note || ''}</small></div><div style="display:grid;gap:8px">${list.map(item).join('')}</div>` : '';
  const wait = ms.filter(m => ['wait', 'live'].includes(status(m, clk).k));
  const up = ms.filter(m => status(m, clk).k === 'up');
  const done = ms.filter(m => status(m, clk).k === 'done');
  const cancel = ms.filter(m => status(m, clk).k === 'cancel');
  const summary = MODE === 'admin' ? `<section class="card" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:center">
      <div><div class="d num" style="font-size:2rem">${wait.filter(m => status(m, clk).k === 'wait').length}</div><div class="note" style="margin:0">odottaa tulosta</div></div>
      <div><div class="d num" style="font-size:2rem">${done.length}/${ms.length}</div><div class="note" style="margin:0">vahvistettu</div></div>
      <div><div class="d num" style="font-size:2rem;color:${R.queue.length ? 'var(--warn)' : 'inherit'}">${R.queue.length}</div><div class="note" style="margin:0">jonossa tällä laitteella</div></div>
    </section>` : '';
  if (MODE === 'admin') {
    /* Ylläpito: yksi lista aikajärjestyksessä, tila näkyy värinä (vahvistettu vihreä, kuulutettu sininen). */
    const ann = m => (window.KUULUTUS && KUULUTUS.annOf) ? KUULUTUS.annOf(m) : null;
    const row = m => { const st = status(m, clk).k, a = st === 'done' ? ann(m) : null;
      const lk = isLocked(m);
      const cls = st === 'cancel' ? 'st-cancel' : st !== 'done' ? '' : !lk ? 'st-pending' : a === 'ann' ? 'st-ann' : a === 'changed' ? 'st-changed' : 'st-done';
      const tags = st !== 'done' ? [] : [lk ? '🔒 Hyväksytty' : '⏳ Vahvistettu · odottaa hyväksyntääsi', a === 'ann' ? '📣 Kuulutettu' : a === 'changed' ? 'Tulos muuttunut kuuluttamisen jälkeen' : ''].filter(Boolean);
      const tag = tags.map(x => `<span class="st-tag">${x}</span>`).join(' · ');
      return item(m).replace('class="rm ', `class="rm ${cls} `).replace('</span></button>', `</span>${tag ? `<span class="st-row">${tag}</span>` : ''}</button>`); };
    const pend = ms.filter(m => status(m, clk).k === 'done' && !isLocked(m)).length;
    const legend = `<div class="st-legend"><span><span class="st-dot st-pending"></span>Odottaa hyväksyntää${pend ? ` (${pend})` : ''}</span><span><span class="st-dot st-done"></span>Hyväksytty</span><span><span class="st-dot st-ann"></span>Tulokset kuulutettu</span><span><span class="st-dot st-wait"></span>Ottelu käynnissä / odottaa tulosta</span></div>`;
    return `${demoBanner(clk)}${tabsBar('list')}${summary}${filterBar()}${legend}
    <div style="display:grid;gap:8px">${ms.map(row).join('')}</div>
    <button class="btn ghost" data-logout>Kirjaudu ulos</button>`;
  }
  return `${demoBanner(clk)}${tabsBar('list')}${summary}${filterBar()}
    ${group('Odottaa tulosta', wait, 'Vahvista heti ottelun jälkeen')}${group('Tulevat', up)}${group('Vahvistetut', done)}${group('Perutut', cancel)}
    <button class="btn ghost" data-logout>Kirjaudu ulos</button>`;
}
function refMatch() {
  const m = R.data && R.data.matches.find(x => x.id === R.match); if (!m) { R.view = 'list'; return refList(); }
  const clk = clock(), st = status(m, clk), goals = goalsOf(m.id, R.data.goals);
  return `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn ghost" data-back>← Ottelut</button>${pillFor(st)}</div>
  <section class="card" style="display:grid;gap:16px">
    <div class="sec-h" style="margin:0"><h2>${esc(m.series)}</h2><small>${esc([m.field, 'klo ' + fmtTime(m.start)].filter(Boolean).join(' · '))}</small></div>
    ${st.k === 'cancel' ? '<div class="banner"><b>Ottelu on peruttu.</b></div>' : resultBlock(m, goals)}
  </section>
  ${MODE === 'admin' ? `<section class="card" style="display:grid;gap:12px"><div class="sec-h" style="margin:0"><h2>Ylläpito</h2></div>
    <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap"><label for="mTime" style="display:grid;gap:4px;font-weight:700;font-size:.85rem">Alkuaika<input id="mTime" inputmode="decimal" maxlength="5" value="${fmtTime(m.start)}" style="font:inherit;font-family:var(--display);font-weight:800;font-size:1.4rem;width:6em;padding:6px 10px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface)"></label><button class="btn ghost" data-settime>Tallenna aika</button></div>
    ${st.k === 'cancel' ? '<button class="btn ghost" data-status="">Palauta ottelu</button>' : `<button class="btn ghost" data-status="peruttu" style="color:var(--danger)">${R.confirmDel === 'cancel' ? 'Vahvista: peru ottelu' : 'Peru ottelu'}</button>`}
  </section>` : ''}
  <details class="card" ${goals.length ? 'open' : ''}><summary style="font-weight:700;cursor:pointer">Maalit (valinnainen) · ${goals.length} kirjattu</summary>
    <div style="display:grid;gap:12px;margin-top:12px">
      <p class="note" style="margin:0">Kirjaa tarvittaessa maalien minuutit ja pelinumerot. Lopputulos vahvistetaan yllä.</p>
      ${canEdit(m) ? `<div class="addg">${goalBtn(m.home, 'data-addgoal')}${goalBtn(m.away, 'data-addgoal')}</div>` : ''}
      ${goalItems(m, goals, true)}
    </div></details>
  ${R.sheet ? goalSheet(m, clk) : ''}`;
}

/* ---- YLLÄPITO: testaus ennen turnausta ---- */
const MANUAL_TESTS = [
  'Kenttänäkymä: + Maali → näkyy julkisella sivulla alle minuutissa',
  'Kenttänäkymä: Kumoa viimeisin maali toimii',
  'Tuomarinäkymä: lopputuloksen vahvistus → sarjataulukko päivittyy',
  'Lentotila päälle, kirjaa maali, lentotila pois → kirjaus lähtee (yläkulma: Kaikki tallennettu)',
  'Ylläpito: aikataulun siirto +5 min ja takaisin −5 min',
  'Ylläpito: ottelun peruminen ja palautus',
  'Julkinen sivu iPhonella (Safari) ja Androidilla (Chrome)',
  'Julkinen sivu lisättynä kotinäytölle: aukeaa ja päivittyy',
  'Wallsportissa paikan päällä: sivu latautuu hallin verkossa / 4G:llä',
  'Kaikki testitulokset tyhjennetty taulukosta ennen turnausta',
];
/* Testitulosten nollaus ennen turnausta: tyhjentää vahvistetut tulokset, maalit, sarjataulukon korjaukset ja perumiset.
   Otteluohjelma, ajat, joukkueet ja asetukset jäävät. Harjoitustilassa palauttaa esimerkkidatan. */
function resetCounts() { const d = R.data; return { res: d.matches.filter(isFinal).length, goals: d.goals.length, adj: (d.adjust || []).length, canc: d.matches.filter(m => m.tila).length }; }
function resetCard() {
  const c = resetCounts(), total = c.res + c.goals + c.adj + c.canc, sure = R.confirmDel === 'resetall';
  return `<section class="card" style="display:grid;gap:10px">
    <div class="sec-h" style="margin:0"><h2>4. Nollaa testitulokset</h2><small>${Store.demo ? 'Harjoitustila' : 'Oikea tulospalvelu'}</small></div>
    <p class="note" style="margin:0">${Store.demo ? 'Palauttaa harjoitustilan esimerkkidatan alkutilaan.' : `Tyhjentää kaikki vahvistetut tulokset (${c.res}), maalit (${c.goals}), sarjataulukon käsikorjaukset (${c.adj}) ja perumiset (${c.canc}) oikeasta tulospalvelusta. Otteluohjelma, alkuajat, joukkueet ja asetukset jäävät ennalleen. Tee tämä ennen turnausaamua, älä turnauksen aikana.`}</p>
    ${!Store.demo && EVENT.date && clock().day >= 0 ? `<div class="banner"><b>Nollaus on lukittu turnauspäivästä alkaen</b>, jotta oikeat tulokset eivät katoa vahingossa.</div>` : !Store.demo && !total ? '<div class="banner" style="background:var(--live-bg);color:var(--live)"><b>✓ Tuloksia ei ole. Tulospalvelu on valmis turnaukseen.</b></div>' : `<button class="btn ghost" data-resetall style="color:var(--danger)">${sure ? 'Vahvista: nollaa kaikki tulokset' : Store.demo ? 'Palauta harjoitusdata alkuun' : 'Nollaa kaikki testitulokset'}</button>`}
  </section>`;
}
function resetAll() {
  if (Store.demo) { Store.demoReset(); load(); toast('Harjoitusdata palautettu'); return; }
  const d = R.data;
  d.goals.slice().forEach(g => enqueue({ action: 'deleteGoal', id: g.id }));
  d.matches.filter(isFinal).forEach(m => enqueue({ action: 'result', match: m.id, hg: '', ag: '' }));
  d.matches.filter(m => m.tila).forEach(m => enqueue({ action: 'setStatus', match: m.id, tila: '' }));
  (d.adjust || []).slice().forEach(a => enqueue({ action: 'setAdjust', adj: { series: a.series, team: a.team, pts: 0, gf: 0, ga: 0, pos: 0, note: '' } }));
  R.draft = {}; toast('Nollataan… Odota, kunnes yläkulmassa lukee Kaikki tallennettu.');
}
function testView() {
  if (!R.data) return `${tabsBar('test')}<div class="card">Ladataan…</div>`;
  const issues = validateData(EVENT, R.data.matches), errs = issues.filter(i => i.lvl === 'virhe');
  const done = ls.get('tulospalvelu-manual-tests', {});
  const res = (R.testRes || []).map(r => `<div class="gi"><span style="font-weight:800;color:${r.ok === true ? 'var(--live)' : r.ok === false ? 'var(--danger)' : 'var(--muted)'}">${r.ok === true ? '✓' : r.ok === false ? '✗' : '…'}</span><span><b>${esc(r.name)}</b> <span class="note" style="margin:0">${esc(r.info || '')}</span></span></div>`).join('');
  const s = uniq(R.data.matches.map(m => m.series)), f = fieldList(R.data.matches);
  return `${demoBanner(clock())}${tabsBar('test')}
  <section class="card" style="display:grid;gap:10px">
    <div class="sec-h" style="margin:0"><h2>1. Turnauksen tiedot</h2><small>Google Sheet</small></div>
    <p class="note" style="margin:0"><b>${esc(EVENT.name)}</b> · ${esc(EVENT.venue)} · ${esc(EVENT.dateText) || 'päivä puuttuu'} · ottelut ${EVENT.matchMin} min · ${R.data.matches.length} ottelua · ${EVENT.teamNames.length} joukkuetta · sarjat: ${esc(s.join(', ') || '–')} · kentät: ${esc(f.join(', ') || '–')}</p>
    ${issues.length ? `<div class="glist">${issues.map(i => `<div class="gi"><span style="font-weight:800;color:${i.lvl === 'virhe' ? 'var(--danger)' : 'var(--warn)'}">${i.lvl === 'virhe' ? '✗' : '!'}</span><span>${esc(i.msg)}</span></div>`).join('')}</div>` : '<div class="banner" style="background:var(--live-bg);color:var(--live)"><b>✓ Ei virheitä otteluohjelmassa ja joukkueissa.</b></div>'}
    <button class="btn ghost" data-reloadmeta style="justify-self:start">Hae tiedot taulukosta uudelleen</button>
  </section>
  <section class="card" style="display:grid;gap:10px">
    <div class="sec-h" style="margin:0"><h2>2. Yhteystesti</h2><small>Lukeminen, tallennus ja viive</small></div>
    <p class="note" style="margin:0">Tekee yhden testitallennuksen (Asetukset-välilehden rivi <i>viimeisin_testi</i>) ja mittaa, kuinka nopeasti se näkyy. Ei vaikuta otteluihin.</p>
    <button class="btn gold" data-runtest ${R.testing ? 'disabled' : ''}>${R.testing ? 'Testataan…' : 'Aja yhteystesti'}</button>
    ${res ? `<div class="glist">${res}</div>` : ''}
  </section>
  <section class="card" style="display:grid;gap:8px">
    <div class="sec-h" style="margin:0"><h2>3. Koeajo</h2><small>${Object.values(done).filter(Boolean).length}/${MANUAL_TESTS.length} tehty</small></div>
    <p class="note" style="margin:0">Tee viikkoa ennen turnausta. Rasti säilyy tällä laitteella.</p>
    ${MANUAL_TESTS.map((t, i) => `<label class="toggle" style="display:flex;gap:10px;align-items:flex-start;font-size:.92rem"><input type="checkbox" data-mt="${i}" ${done[i] ? 'checked' : ''} style="width:20px;height:20px;flex:none;accent-color:var(--gold)"> ${esc(t)}</label>`).join('')}
  </section>
  ${resetCard()}`;
}
async function runTest() {
  R.testing = true; R.testRes = []; render();
  const step = async (name, fn) => { const r = { name, ok: null, info: '' }; R.testRes.push(r); render(); const t0 = performance.now();
    try { const info = await fn(); r.ok = true; r.info = (info ? info + ' · ' : '') + Math.round(performance.now() - t0) + ' ms'; } catch (e) { r.ok = false; r.info = e.message || String(e); } render(); return r.ok; };
  await step('Tietojen luku taulukosta', async () => { const d = await Store.load(true); R.data = d; return `${d.matches.length} ottelua`; });
  await step('Toimitsijoiden PIN-koodit asetettu', async () => { const r = await Store.send({ action: 'roles' }, R.pin); const miss = [!r.tuomari && 'PIN_TUOMARI', !r.kentta && 'PIN_KENTTA'].filter(Boolean); if (miss.length) throw new Error('puuttuu tai alle 6 numeroa: ' + miss.join(', ')); if (!r.eri) throw new Error('tuomarin ja kenttävastaavan koodi on sama'); return 'ok'; });
  await step('Väärä PIN hylätään', async () => { try { await Store.send({ action: 'check' }, '0000'); } catch (e) { if (e.code === 'pin') return 'hylätty'; throw e; } if (Store.demo) return 'esikatselussa ei tarkisteta'; throw new Error('väärä PIN hyväksyttiin!'); });
  const value = 'testi-' + uid();
  const okW = await step('Tallennus palvelimelle', async () => { await Store.send({ action: 'ping', value }, R.pin); return 'ok'; });
  if (okW) await step('Tallennus näkyy julkisesti', async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      const v = Store.demo ? Store.demoData().settings.viimeisin_testi : ((await Store.gviz('Asetukset')).find(r => (r.avain || '').trim() === 'viimeisin_testi') || {}).arvo;
      if (v === value) return `viive ${Math.round((Date.now() - t0) / 1000)} s`;
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error('ei näkynyt 90 sekunnissa. Tarkista taulukon jakoasetus (Kuka tahansa linkin saanut: Katselija).');
  });
  await step('Tämän laitteen jono tyhjä', async () => { if (R.queue.length) throw new Error(R.queue.length + ' tallennusta odottaa'); return 'ok'; });
  R.testing = false; render();
}

/* ---- YLLÄPITO: aikataulun siirto ---- */
function scheduleView() {
  if (!R.data) return `${tabsBar('schedule')}<div class="card">Ladataan…</div>`;
  const clk = clock(), n = R.shiftMin || 10;
  const up = R.data.matches.filter(m => status(m, clk).k === 'up').sort((a, b) => a.start - b.start || a.series.localeCompare(b.series));
  const first = up[0];
  const rows = up.map(m => `<div class="gi"><span class="m">${fmtTime(m.start)}</span><span>→</span><b class="d num" style="font-size:1.2rem">${fmtTime(m.start + n)}</b>${chip(m.home)}${chip(m.away)}<span class="note" style="margin:0">${esc([m.series, m.field].filter(Boolean).join(" · "))}</span></div>`).join('');
  return `${demoBanner(clk)}${tabsBar('schedule')}
  <section class="card" style="display:grid;gap:12px">
    <div class="sec-h" style="margin:0"><h2>Aikataulu myöhässä?</h2></div>
    <p class="note" style="margin:0">Siirtää kaikkia vielä alkamattomia otteluita kerralla. Kaikkien puhelimet ja kuulutusajat päivittyvät.</p>
    <div class="seg" role="group" aria-label="Siirto">${[-10, -5, 5, 10, 15, 20].map(v => `<button data-shiftmin="${v}" aria-pressed="${n === v}">${v > 0 ? '+' : ''}${v} min</button>`).join('')}</div>
    ${up.length ? `<button class="btn gold" data-doshift style="font-size:1.1rem;padding:14px">${R.confirmDel === 'shift' ? `Vahvista: siirrä ${up.length} ottelua ${n > 0 ? '+' : ''}${n} min` : `Siirrä ${up.length} ottelua ${n > 0 ? '+' : ''}${n} min`}</button>
      <p class="note" style="margin:0">Seuraava ottelu alkaisi klo ${fmtTime(first.start + n)} (nyt ${fmtTime(first.start)}).</p>
      <div class="glist">${rows}</div>` : '<p class="note" style="margin:0">Ei alkamattomia otteluita.</p>'}
    <p class="note" style="margin:0">Yksittäisen ottelun ajan voi muuttaa Tilanne-välilehdeltä ottelun kohdalta.</p>
  </section>`;
}

/* ---- KENTTÄVASTAAVA: reaaliaikainen kirjaus ---- */
function fieldPick() {
  return `<section class="card" style="display:grid;gap:12px"><h2 class="d" style="margin:0;font-size:1.5rem;text-transform:uppercase">Millä kentällä olet?</h2>
    ${fieldList(R.data ? R.data.matches : []).map((f, i) => { const ss = uniq(R.data.matches.filter(m => m.field === f).map(m => m.series)); return `<button class="btn ${i ? 'ghost' : ''}" data-setfield="${esc(f)}" style="padding:18px;font-size:1.2rem">${esc(f)}${ss.length ? ' · ' + esc(ss.join(', ')) : ''}</button>`; }).join('') || '<p class="note">Kenttiä ei löytynyt otteluista.</p>'}</section>`;
}
function currentOnField(clk) {
  const ms = R.data.matches.filter(m => m.field === R.field).sort((a, b) => a.start - b.start);
  if (R.pinned) { const p = ms.find(m => m.id === R.pinned); if (p) return { m: p, ms }; }
  const live = ms.find(m => status(m, clk).k === 'live');
  const wait = ms.filter(m => status(m, clk).k === 'wait').find(m => clk.min - (m.start + EVENT.matchMin) < 15);
  const up = ms.find(m => status(m, clk).k === 'up');
  return { m: live || wait || up || ms[ms.length - 1], ms };
}
function fieldView() {
  if (!R.data) return `<div class="card">${R.offline ? 'Otteluita ei saatu ladattua. Tarkista nettiyhteys.' : 'Ladataan…'}</div>`;
  if (!R.field || !fieldList(R.data.matches).includes(R.field)) return `${tabsBar('list')}${fieldPick()}`;
  const clk = clock(), { m, ms } = currentOnField(clk);
  if (!m) return `${tabsBar('list')}<div class="card">Ei otteluita tällä kentällä.</div>`;
  const st = status(m, clk), goals = goalsOf(m.id, R.data.goals), sc = isFinal(m) ? [m.hg, m.ag] : goalCount(m, goals);
  const i = ms.indexOf(m), prev = ms[i - 1], next = ms[i + 1];
  const canGoal = !isFinal(m);
  return `${demoBanner(clk)}${tabsBar('list')}
  <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">
    <button class="btn ghost" data-setfield="">${esc(R.field)} ⇄</button>
    ${R.pinned ? '<button class="btn ghost" data-unpin>Palaa nykyiseen otteluun</button>' : ''}
  </div>
  <section class="card" style="display:grid;gap:16px">
    <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
      <button class="btn ghost" data-pin="${prev ? prev.id : ''}" ${prev ? '' : 'disabled'} aria-label="Edellinen ottelu">‹</button>
      <div style="text-align:center"><div class="d num" style="font-size:1.4rem">klo ${fmtTime(m.start)}–${fmtTime(m.start + EVENT.matchMin)}</div>${pillFor(st)}</div>
      <button class="btn ghost" data-pin="${next ? next.id : ''}" ${next ? '' : 'disabled'} aria-label="Seuraava ottelu">›</button>
    </div>
    <div class="board">${chip(m.home)}<div class="sc">${sc[0]}–${sc[1]}</div>${chip(m.away)}</div>
    ${canGoal ? `<div class="addg">${goalBtn(m.home, 'data-quickgoal', ';padding:28px 8px;font-size:1.8rem')}${goalBtn(m.away, 'data-quickgoal', ';padding:28px 8px;font-size:1.8rem')}</div>
      <p class="note" style="margin:0;text-align:center">Yksi napautus = maali kirjattu ja näkyy heti tulospalvelussa. Numeron voi lisätä alta.</p>` : ''}
    ${goals.length && canGoal ? `<button class="btn ghost" data-undo style="justify-self:center">↶ Kumoa viimeisin maali</button>` : ''}
    ${goalItems(m, goals, true)}
    ${isFinal(m) ? `<div class="confirm"><b>Lopputulos</b>${lockNote(m)}</div>` : ['live', 'wait'].includes(st.k) ? `<div class="confirm"><b>Ottelu päättyi?</b><div class="banner"><b>Tuomari vahvistaa lopputuloksen.</b><span>Tarkista, että kaikki maalit on kirjattu. Lopputulos näkyy yleisölle heti kirjausten perusteella.</span></div></div>` : ''}
  </section>
  ${R.sheet ? goalSheet(m, clk) : ''}`;
}

/* ---- pelinumerot ---- */
function rosterView() {
  if (!R.data) return `${tabsBar('roster')}<div class="card">Ladataan…</div>`;
  R.rSeries = pickSeries(R.rSeries); R.rTeam = pickTeam(R.rSeries, R.rTeam);
  const key = R.rTeam + '-' + R.rSeries, cur = R.roster[key] || [];
  if (R.rText == null) R.rText = cur.join(', ');
  const nums = parseNumbers(R.rText);
  return `${tabsBar('roster')}
  <section class="card" style="display:grid;gap:12px">
    <div class="seg" role="group" aria-label="Sarja">${seriesList(R.data.matches).map(s => `<button data-rseries="${esc(s)}" aria-pressed="${R.rSeries === s}">${esc(s)}</button>`).join('')}</div>
    <div class="picker">${teamsInSeries(R.data.matches, R.rSeries).map(t => `<button class="pick" data-rteam="${esc(t)}" aria-pressed="${R.rTeam === t}">${chip(t)}</button>`).join('')}</div>
    <label for="rText" style="display:grid;gap:6px;font-weight:700">${esc(R.rTeam)} · ${esc(R.rSeries)}: pelinumerot
      <textarea id="rText" rows="5" style="font:inherit;padding:10px;border-radius:12px;border:2px solid var(--line);background:var(--bg);color:var(--ink)" placeholder="3, 5, 7, 10, 14">${esc(R.rText)}</textarea></label>
    <p class="note" style="margin:0">Kirjoita tai liitä numerot. Voit liittää myös kokoonpanolistan tai kuvasta kopioidun tekstin: vain numerot tallennetaan, nimet jätetään pois.</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px" id="rPrev">${nums.map(n => `<span class="goal d num" style="font-size:1.1rem">${esc(n)}</span>`).join('') || '<span class="note" style="margin:0">Ei numeroita.</span>'}</div>
    <button class="btn gold" data-saveroster>Tallenna (${nums.length} numeroa)</button>
  </section>`;
}

function render() {
  applyHeader();
  renderSync();
  if (!R.pin) { app.innerHTML = loginView(); return; }
  const y = window.scrollY;
  app.innerHTML = R.view === 'test' ? testView() : R.view === 'schedule' ? scheduleView() : R.view === 'admin' ? adminView() : R.view === 'roster' ? rosterView() : MODE === 'kentta' ? fieldView() : R.view === 'match' ? refMatch() : refList();
  window.scrollTo(0, y);
}

/* ---- tapahtumat ---- */
function curMatch() { if (MODE === 'kentta') return R.data && currentOnField(clock()).m; return R.data && R.data.matches.find(x => x.id === R.match); }
function syncDraft(m) { R.draft[m.id] = goalCount(m, goalsOf(m.id, R.data.goals)); }

document.addEventListener('submit', async e => {
  e.preventDefault();
  if (e.target.id === 'pinForm') {
    const pin = document.getElementById('pinIn').value.trim(); if (!pin) return;
    try {
      const r = await Store.send({ action: 'check', want: MODE }, pin), role = r.role || (r.admin ? 'admin' : 'tuomari');
      if (role !== 'admin' && role !== MODE) { toast(role === 'tuomari' ? 'Tämä on tuomarien PIN. Avaa tuomarinäkymä.' : role === 'kentta' ? 'Tämä on kenttävastaavien PIN. Avaa kenttänäkymä.' : 'Tämä PIN ei käy tähän näkymään'); return; }
      R.pin = pin; ls.set(PIN_KEY, pin); await loadRoster(); load(); flush(); }
    catch (err) { toast(err.code === 'pin' ? 'Väärä PIN-koodi' : err.code === 'locked' ? 'Liian monta väärää yritystä. Odota 5 minuuttia.' : 'Ei yhteyttä. Yritä uudelleen.'); }
  }
  if (e.target.id === 'goalForm') {
    const m = curMatch(); if (!m) return;
    const no = document.getElementById('gNo').value.replace(/\D/g, '').slice(0, 2), min = toInt(document.getElementById('gMin').value);
    const old = R.sheet.id && R.data.goals.find(g => g.id === R.sheet.id);
    enqueue({ action: 'goal', goal: { id: R.sheet.id || uid(), match: m.id, team: R.sheet.team, no, min } });
    if (!old && !isFinal(m)) syncDraft(m);
    R.sheet = null; render(); toast(old ? 'Maali päivitetty' : 'Maali tallennettu');
  }
});
document.addEventListener('click', e => {
  const q = s => e.target.closest(s);
  let t;
  if ((t = q('[data-filter]'))) { R.filter = t.dataset.filter; ls.set('tulospalvelu-ref-filter', R.filter); render(); return; }
  if ((t = q('[data-match]'))) { R.match = t.dataset.match; R.view = 'match'; delete R.draft[R.match]; R.confirmDel = null; render(); window.scrollTo(0, 0); return; }
  if (q('[data-back]')) { R.view = 'list'; R.sheet = null; render(); return; }
  if ((t = q('[data-view]'))) { R.view = t.dataset.view; R.rText = null; if (R.view === 'roster') loadRoster().then(() => { if (R.view === 'roster') { R.rText = null; render(); } }); render(); return; }
  if ((t = q('[data-setfield]'))) { R.field = t.dataset.setfield; R.pinned = null; ls.set('tulospalvelu-field', R.field); render(); return; }
  if ((t = q('[data-pin]'))) { if (t.dataset.pin) { R.pinned = t.dataset.pin; R.draft = {}; render(); } return; }
  if (q('[data-unpin]')) { R.pinned = null; render(); return; }
  if (q('[data-logout]')) { R.pin = ''; ls.set(PIN_KEY, ''); render(); return; }
  if (MODE === 'kentta' && q('[data-adj],[data-confirm],[data-clear]')) { toast('Tuomari vahvistaa lopputuloksen.'); render(); return; }
  if (MODE !== 'admin' && q('[data-adj],[data-confirm],[data-clear],[data-addgoal],[data-editgoal],[data-delgoal],[data-quickgoal],[data-undo]')) { const m = curMatch(); if (m && !canEdit(m)) { toast(isLocked(m) ? 'Tulos on lukittu. Korjaukset vain ylläpidon kautta.' : 'Tulos on jo vahvistettu. Korjaukset tuomarin tai ylläpidon kautta.'); render(); return; } }
  if (q('[data-approve]')) { const m = curMatch(); if (m) { enqueue({ action: 'setStatus', match: m.id, tila: 'hyväksytty' }); toast('Tulos hyväksytty ja lukittu'); } return; }
  if (q('[data-unlock]')) { const m = curMatch(); if (m) { enqueue({ action: 'setStatus', match: m.id, tila: '' }); toast('Lukitus avattu'); } return; }
  if ((t = q('[data-adj]'))) { const m = curMatch(); const [i, dv] = t.dataset.adj.split(',').map(Number); const d = R.draft[m.id]; d[i] = Math.max(0, d[i] + dv); render(); return; }
  if (q('[data-confirm]')) { const m = curMatch(), d = R.draft[m.id]; enqueue({ action: 'result', match: m.id, hg: d[0], ag: d[1] }); toast(`Tulos ${d[0]}–${d[1]} vahvistettu`); return; }
  if (q('[data-clear]')) { const m = curMatch(); enqueue({ action: 'result', match: m.id, hg: '', ag: '' }); delete R.draft[m.id]; render(); toast('Vahvistus poistettu'); return; }
  if ((t = q('[data-quickgoal]'))) {
    const m = curMatch(), clk = clock();
    const min = clk.day === 0 && clk.min >= m.start ? Math.max(1, clk.min - m.start + 1) : null;
    enqueue({ action: 'goal', goal: { id: uid(), match: m.id, team: t.dataset.quickgoal, no: '', min } }); syncDraft(m); render();
    if (navigator.vibrate) try { navigator.vibrate(60); } catch (err) { }
    toast(`Maali ${t.dataset.quickgoal}${min ? ' ' + min + "'" : ''}`); return;
  }
  if (q('[data-undo]')) {
    const m = curMatch(), gl = goalsOf(m.id, R.data.goals); if (!gl.length) return;
    const last = R.data.goals.filter(g => g.match === m.id).slice(-1)[0];
    enqueue({ action: 'deleteGoal', id: last.id }); syncDraft(m); render(); toast('Viimeisin maali kumottu'); return;
  }
  if ((t = q('[data-addgoal]'))) { R.sheet = { team: t.dataset.addgoal, no: '', min: null }; render(); return; }
  if ((t = q('[data-editgoal]'))) { const g = R.data.goals.find(x => x.id === t.dataset.editgoal); if (g) { R.sheet = { team: g.team, id: g.id, no: g.no || '', min: g.min }; render(); } return; }
  if ((t = q('[data-pickno]'))) { R.sheet.no = t.dataset.pickno; R.sheet.min = toInt(document.getElementById('gMin').value); render(); return; }
  if ((t = q('[data-min]'))) { const el = document.getElementById('gMin'); const v = Math.max(1, Math.min(EVENT.matchMin + 5, (toInt(el.value) || 0) + Number(t.dataset.min))); el.value = v; R.sheet.min = v; R.sheet.no = document.getElementById('gNo').value; return; }
  if (q('[data-closesheet]') || (e.target.matches && e.target.matches('[data-sheetbg]'))) { R.sheet = null; render(); return; }
  if ((t = q('[data-delgoal]'))) {
    const id = t.dataset.delgoal;
    if (R.confirmDel !== id) { R.confirmDel = id; render(); return; }
    R.confirmDel = null; const m = curMatch(); enqueue({ action: 'deleteGoal', id }); if (!isFinal(m)) syncDraft(m); render(); toast('Maali poistettu'); return;
  }
  if (q('[data-resetall]')) { if (R.confirmDel !== 'resetall') { R.confirmDel = 'resetall'; render(); setTimeout(() => { if (R.confirmDel === 'resetall') { R.confirmDel = null; render(); } }, 5000); return; } R.confirmDel = null; resetAll(); render(); return; }
  if (q('[data-runtest]')) { runTest(); return; }
  if (q('[data-reloadmeta]')) { Store.load(true).then(d => { R.data = d; render(); toast('Tiedot haettu'); }).catch(() => toast('Ei yhteyttä')); return; }
  if ((t = q('[data-shiftmin]'))) { R.shiftMin = Number(t.dataset.shiftmin); R.confirmDel = null; render(); return; }
  if (q('[data-doshift]')) {
    if (R.confirmDel !== 'shift') { R.confirmDel = 'shift'; render(); return; }
    R.confirmDel = null; const clk = clock(), n = R.shiftMin || 10;
    const ids = R.data.matches.filter(m => status(m, clk).k === 'up').map(m => m.id);
    enqueue({ action: 'shift', ids, minutes: n }); toast(`${ids.length} ottelua siirretty ${n > 0 ? '+' : ''}${n} min`); return;
  }
  if (q('[data-settime]')) { const v = document.getElementById('mTime').value.trim(); if (parseTime(v) == null) { toast('Anna aika muodossa 14.35'); return; } enqueue({ action: 'setTime', match: R.match, alku: fmtTime(parseTime(v)) }); toast('Alkuaika tallennettu'); return; }
  if ((t = q('[data-status]'))) {
    const tila = t.dataset.status;
    if (tila === 'peruttu' && R.confirmDel !== 'cancel') { R.confirmDel = 'cancel'; render(); return; }
    R.confirmDel = null; enqueue({ action: 'setStatus', match: R.match, tila }); toast(tila ? 'Ottelu peruttu' : 'Ottelu palautettu'); return;
  }
  if ((t = q('[data-aseries]'))) { R.aSeries = t.dataset.aseries; R.aDraft = null; render(); return; }
  if ((t = q('[data-ateam]'))) { R.aTeam = t.dataset.ateam; R.aDraft = null; render(); return; }
  if ((t = q('[data-aadj]'))) { const [k, dv] = t.dataset.aadj.split(','); R.aDraft[k] += Number(dv); R.aDraft.note = document.getElementById('aNote').value; render(); return; }
  if (q('[data-saveadj]')) { const d = { ...R.aDraft, note: document.getElementById('aNote').value.trim(), pos: toInt(document.getElementById('aPos').value) || 0 }; if (isAdjusted(d) && !d.note) { toast('Kirjoita selite korjaukselle'); return; } saveAdjust(d); return; }
  if (q('[data-deladj]')) { saveAdjust({ series: R.aSeries, team: R.aTeam, pts: 0, gf: 0, ga: 0, pos: 0, note: '' }); return; }
  if ((t = q('[data-rseries]'))) { R.rSeries = t.dataset.rseries; R.rText = null; render(); return; }
  if ((t = q('[data-rteam]'))) { R.rTeam = t.dataset.rteam; R.rText = null; render(); return; }
  if (q('[data-saveroster]')) {
    const numbers = parseNumbers(R.rText), key = R.rTeam + '-' + R.rSeries;
    R.roster[key] = numbers; ls.set('tulospalvelu-roster', R.roster);
    enqueue({ action: 'setRoster', key, numbers }); R.rText = null; toast(`${R.rTeam} (${R.rSeries}): ${numbers.length} numeroa tallennettu`); render();
  }
});
document.addEventListener('input', e => {
  if (e.target.id !== 'rText') return;
  R.rText = e.target.value; const nums = parseNumbers(R.rText);
  const btn = app.querySelector('[data-saveroster]'); if (btn) btn.textContent = `Tallenna (${nums.length} numeroa)`;
  const pv = document.getElementById('rPrev'); if (pv) pv.innerHTML = nums.map(n => `<span class="goal d num" style="font-size:1.1rem">${esc(n)}</span>`).join('') || '<span class="note" style="margin:0">Ei numeroita.</span>';
});
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.mt != null) { const d = ls.get('tulospalvelu-manual-tests', {}); d[e.target.dataset.mt] = e.target.checked; ls.set('tulospalvelu-manual-tests', d); render(); return; } if (e.target.id === 'aPos' && R.aDraft) { R.aDraft.pos = toInt(e.target.value) || 0; R.aDraft.note = document.getElementById('aNote').value; render(); } });
window.addEventListener('online', flush);
document.addEventListener('visibilitychange', () => { if (!document.hidden && R.pin) { load(); flush(); } });

render();
if (R.pin) { load(); flush(); loadRoster(); }
schedulePoll(async () => { if (R.pin && !R.sheet && R.view !== 'roster' && !(document.activeElement && document.activeElement.matches('input,textarea'))) await load(); flush(); return !R.offline; }, 15000);

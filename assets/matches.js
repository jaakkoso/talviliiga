/* Yhteiset apurit otteluluetteloille (piirisarja, eerikkila). Data tulee kansion data.json-tiedostosta. */
const P15 = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu', 'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'];
  const WD = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
  const LETTER = { W: 'V', D: 'T', L: 'H' };
  const isOwn = name => /^SJK(-j)?(\/|$)/.test(name);
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

  // Tulos oman joukkueen näkökulmasta. own = oman joukkueen nimi; tyhjä = kumpi tahansa SJK-j.
  function results(m, own) {
    if (!m.score) return [];
    const home = own ? m.home === own : isOwn(m.home);
    return m.score.map(([h, a]) => { const f = home ? h : a, g = home ? a : h; return { f, g, r: f > g ? 'W' : f < g ? 'L' : 'D' }; });
  }
  function summary(matches, own) {
    const rs = matches.filter(m => m.score).sort((a, b) => b.date.localeCompare(a.date)).flatMap(m => results(m, own));
    const c = r => rs.filter(x => x.r === r).length;
    return { p: rs.length, w: c('W'), d: c('D'), l: c('L'), gf: rs.reduce((s, x) => s + x.f, 0), ga: rs.reduce((s, x) => s + x.g, 0), form: rs.slice(0, 5) };
  }
  function summaryHTML(s) {
    return `<div class="stats">
      <div class="stat"><b>${s.p}</b><small>Ottelut</small></div>
      <div class="stat w"><b>${s.w}</b><small>Voitot</small></div>
      <div class="stat d"><b>${s.d}</b><small>Tasapelit</small></div>
      <div class="stat l"><b>${s.l}</b><small>Tappiot</small></div>
      <div class="stat"><b>${s.gf}–${s.ga}</b><small>Maalit</small></div>
    </div>
    ${s.form.length ? `<div class="form"><span class="lbl">Viimeisimmät</span>${s.form.map(x => `<span class="pip ${x.r}" title="${x.f}–${x.g}">${LETTER[x.r]}</span>`).join('')}</div>` : ''}`;
  }
  function matchHTML(m, opt = {}) {
    const d = parseDate(m.date);
    const rs = results(m, opt.own);
    const right = m.score
      ? `<div class="sc">${m.score.map(([h, a]) => `<span>${h}–${a}</span>`).join('')}${m.note ? `<small class="rp">${esc(m.note)}</small>` : ''}</div><div class="pips">${rs.map(x => `<span class="pip ${x.r}">${LETTER[x.r]}</span>`).join('')}</div>`
      : `<span class="tbd">${m.time ? 'klo ' + esc(m.time) : 'tulossa'}</span>`;
    const sub = [opt.showSeries !== false ? m.series : '', opt.showTeam ? (opt.teamLabel || '') : ''].filter(Boolean).join(' · ');
    const mi = REG.push({ m, opt }) - 1;
    return `<button type="button" class="match" data-mi="${mi}" aria-label="Ottelun tiedot: ${esc(m.home)} – ${esc(m.away)}">
      <span class="date">${WD[d.getDay()]}<b>${d.getDate()}.${d.getMonth() + 1}.</b></span>
      <span class="tm">${sub ? `<span class="ser">${esc(sub)}</span>` : ''}
        <span class="${isOwn(m.home) ? 'me' : ''}">${esc(m.home)}</span>
        <span class="${isOwn(m.away) ? 'me' : ''}">${esc(m.away)}</span></span>
      <span class="res">${right}</span></button>`;
  }

  /* ---------- Ottelun tiedot -ikkuna ---------- */
  const REG = [];
  const BASE = (document.currentScript && document.currentScript.src) || location.href;
  let DETAILS = null;
  const loadDetails = () => DETAILS || (DETAILS = fetch(new URL('../piirisarja/ottelut.json', BASE), { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})));
  function dialogEl() {
    let dlg = document.getElementById('otteluDlg');
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.id = 'otteluDlg'; dlg.className = 'mdlg';
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    document.body.appendChild(dlg); return dlg;
  }
  async function openMatch(mi) {
    const { m, opt } = REG[mi]; const dlg = dialogEl();
    const d = parseDate(m.date), det = m.pid ? (await loadDetails())[m.pid] : null;
    const rs = results(m, opt.own);
    const verdict = rs.length ? rs.map(x => ({ W: 'Voitto', D: 'Tasapeli', L: 'Tappio' })[x.r]).join(' · ') : '';
    const score = m.score ? m.score.map(([h, a]) => `${h}–${a}`).join(' · ') : 'vs';
    const meta = [`${WD[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`, (det && det.time) || m.time ? 'klo ' + esc((det && det.time) || m.time) : '', det && det.venue ? esc(det.venue) : ''].filter(Boolean).join(' · ');
    let goals = '';
    if (det && det.goals && det.goals.length) {
      let h = 0, a = 0;
      goals = `<h3>Maalit</h3><ol class="gl-list">${det.goals.map(g => {
        if (g.side === 'h') h++; else a++;
        const team = g.side === 'h' ? m.home : m.away;
        const who = g.og ? 'oma maali' : g.no != null ? '#' + g.no : '–';
        return `<li class="${isOwn(team) ? 'me' : ''}"><span class="mn">${g.min}'</span><span class="tm">${isOwn(team) ? 'SJK' : esc(team)}</span><span class="no">${who}</span><span class="st">${h}–${a}</span></li>`;
      }).join('')}</ol><p class="tl-note">Maalintekijät pelinumeroina. Nimiä ei näytetä.</p>`;
    } else if (m.score) goals = `<p class="note">Maalien tarkempia tietoja ei ole saatavilla tästä ottelusta.</p>`;
    const link = m.pid ? `https://tulospalvelu.palloliitto.fi/match/${m.pid}/shotmap` : opt.link;
    dlg.innerHTML = `<div class="mdlg-in">
      <button type="button" class="mdlg-x" data-close aria-label="Sulje">×</button>
      <div class="mdlg-ser">${esc(m.series || '')}</div>
      <div class="mdlg-meta">${meta}</div>
      <div class="mdlg-score">
        <span class="t h ${isOwn(m.home) ? 'me' : ''}">${esc(m.home)}</span>
        <span class="s">${score}</span>
        <span class="t a ${isOwn(m.away) ? 'me' : ''}">${esc(m.away)}</span>
      </div>
      <div class="mdlg-sub">${[det && det.ht ? 'Puoliaika ' + esc(det.ht) : '', m.note ? esc(m.note) : '', verdict].filter(Boolean).join(' · ')}</div>
      ${goals}
      ${link ? `<a class="btn" href="${link}" target="_blank" rel="noopener">Lähde ↗</a>` : ''}
    </div>`;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.addEventListener('click', e => { const b = e.target.closest('.match[data-mi]'); if (b) openMatch(+b.dataset.mi); });
  // items: [{m, opt}] ; ryhmitellään kuukausittain, uusin ensin (tai vanhin ensin, jos asc)
  function listHTML(items, asc) {
    items = [...items].sort((a, b) => asc ? a.m.date.localeCompare(b.m.date) || (a.m.time || '').localeCompare(b.m.time || '') : b.m.date.localeCompare(a.m.date));
    const groups = [];
    for (const it of items) {
      const d = parseDate(it.m.date), k = d.getFullYear() + '-' + d.getMonth();
      let g = groups[groups.length - 1];
      if (!g || g.k !== k) { g = { k, label: MONTHS[d.getMonth()] + ' ' + d.getFullYear(), items: [] }; groups.push(g); }
      g.items.push(it);
    }
    return groups.map(g => `<div class="month"><h3>${g.label}</h3>${g.items.map(it => matchHTML(it.m, it.opt)).join('')}</div>`).join('');
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('p2015:' + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('p2015:' + k, v); } catch (e) { } },
  };
  // Sarjataulukko; oma joukkue korostetaan
  function tableHTML(t, opt = {}) {
    if (!t || !t.rows || !t.rows.length) return '';
    const empty = t.rows.every(r => r.o === 0);
    return `<div class="tbl">
      <div class="tbl-head"><b>${esc(t.name)}</b>${t.url ? `<a href="${t.url}" target="_blank" rel="noopener">Palloliitto ↗</a>` : ''}</div>
      <div class="tbl-scroll"><table>
        <thead><tr><th class="pos">#</th><th class="tn">Joukkue</th><th>O</th><th>V</th><th>T</th><th>H</th><th>Maalit</th><th>ME</th><th>P</th></tr></thead>
        <tbody>${t.rows.map(r => `<tr class="${isOwn(r.team) ? 'own' : ''}"><td class="pos">${r.pos}</td><td class="tn">${esc(r.team)}</td><td>${r.o}</td><td>${r.v}</td><td>${r.t}</td><td>${r.h}</td><td>${r.gf}–${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="pts">${r.p}</td></tr>`).join('')}</tbody>
      </table></div>
      ${empty ? '<p class="note">Sarja ei ole vielä alkanut.</p>' : ''}
    </div>`;
  }
  async function load(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return r.json(); }
  return { esc, results, summary, summaryHTML, matchHTML, listHTML, tableHTML, store, load, isOwn, parseDate };
})();

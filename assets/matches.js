/* Yhteiset apurit otteluluetteloille (piirisarja, eerikkila). Data tulee kansion data.json-tiedostosta. */
const P15 = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu', 'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'];
  const WD = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
  const LETTER = { W: 'V', D: 'T', L: 'H' };
  const isOwn = name => /^SJK-j(\/|$)/.test(name);
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
      ? `<div class="sc">${m.score.map(([h, a]) => `<span>${h}–${a}</span>`).join('')}</div><div class="pips">${rs.map(x => `<span class="pip ${x.r}">${LETTER[x.r]}</span>`).join('')}</div>`
      : `<span class="tbd">${m.time ? 'klo ' + esc(m.time) : 'tulossa'}</span>`;
    const sub = [opt.showSeries !== false ? m.series : '', opt.showTeam ? (opt.teamLabel || '') : ''].filter(Boolean).join(' · ');
    return `<div class="match">
      <div class="date">${WD[d.getDay()]}<b>${d.getDate()}.${d.getMonth() + 1}.</b></div>
      <div class="tm">${sub ? `<span class="ser">${esc(sub)}</span>` : ''}
        <span class="${isOwn(m.home) ? 'me' : ''}">${esc(m.home)}</span>
        <span class="${isOwn(m.away) ? 'me' : ''}">${esc(m.away)}</span></div>
      <div class="res">${right}</div></div>`;
  }
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
  async function load(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return r.json(); }
  return { esc, summary, summaryHTML, matchHTML, listHTML, store, load, isOwn };
})();

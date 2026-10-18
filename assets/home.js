/* Etusivun kausikooste: luetaan kansioiden data.json-tiedostot ja koostetaan ohjelma, tulokset ja tilastot.
   Joukkueiden kokoonpanot vaihtelevat, joten tilastot kootaan sarjatasoittain eikä joukkueittain. */
(async () => {
  const $ = id => document.getElementById(id);
  let piiri, eer, turn;
  try { [piiri, eer, turn] = await Promise.all(['piirisarja/data.json', 'eerikkila/data.json', 'turnaukset/data.json'].map(P15.load)); }
  catch (e) { $('season').innerHTML = '<p class="note">Kauden tietoja ei saatu ladattua. Tarkista verkkoyhteys ja päivitä sivu.</p>'; return; }

  const title = s => String(s).toLowerCase().replace(/(^|\s)(\S)/g, (a, b, c) => b + c.toUpperCase()).replace(/\bP(\d+)/g, 'P$1');
  // Kaikki ottelut muodossa { m, own, level, kind }
  const league = piiri.teams.flatMap(t => t.matches.map(m => ({ m, own: t.name, level: title(m.series), kind: 'sarja' })));
  const hh = eer.events.flatMap(ev => ev.matches.map(m => ({ m: { ...m, series: `Huuhkajaliiga · ${ev.name}` }, own: ev.team, level: `Huuhkajaliiga ${ev.name.toLowerCase()}`, kind: 'hh' })));
  const tour = turn.events.flatMap(ev => ev.teams.flatMap(t => t.matches.map(m => ({ m: { ...m, series: `${ev.name} · ${t.level}` }, own: t.name, level: 'Turnaukset', kind: 'turnaus' }))));
  const all = [...league, ...hh, ...tour];
  const played = all.filter(x => x.m.score);

  const sumItems = items => {
    const rs = items.flatMap(x => P15.results(x.m, x.own)), c = r => rs.filter(x => x.r === r).length;
    return { p: rs.length, w: c('W'), d: c('D'), l: c('L'), gf: rs.reduce((s, x) => s + x.f, 0), ga: rs.reduce((s, x) => s + x.g, 0) };
  };
  const sgn = n => (n > 0 ? '+' : '') + n;

  /* --- Kausi lukuina: sarjat, Huuhkajaliiga ja turnaukset --- */
  const tot = sumItems(played), gd = tot.gf - tot.ga;
  const nTour = turn.events.filter(ev => ev.teams.some(t => t.matches.some(m => m.score))).length;
  $('kpis').innerHTML = `
    <div class="kpi"><small>Ottelut</small><b>${tot.p}</b><span>sarjat, Huuhkajaliiga ja ${nTour} turnausta</span></div>
    <div class="kpi"><small>Voitot</small><b>${tot.w}</b><span>${Math.round(100 * tot.w / (tot.p || 1))} % otteluista</span></div>
    <div class="kpi"><small>Maalit</small><b>${tot.gf}–${tot.ga}</b><span>tehdyt–päästetyt</span></div>
    <div class="kpi"><small>Maaliero</small><b>${sgn(gd)}</b><span>${tot.d} tasapeliä, ${tot.l} tappiota</span></div>`;

  /* --- Sarjatasoittain: voitot, tasapelit ja tappiot osuuksina, aikajärjestyksessä --- */
  const groups = new Map();
  for (const x of played) { const g = groups.get(x.level) || { level: x.level, kind: x.kind, items: [], first: x.m.date }; g.items.push(x); if (x.m.date < g.first) g.first = x.m.date; groups.set(x.level, g); }
  const rows = [...groups.values()].sort((a, b) => (a.kind === 'turnaus') - (b.kind === 'turnaus') || a.first.localeCompare(b.first));
  $('chart').innerHTML = `<div class="levels" role="table" aria-label="Tulokset sarjatasoittain">
    <div class="lv-legend" aria-hidden="true"><span><i class="W"></i>Voitto</span><span><i class="D"></i>Tasapeli</span><span><i class="L"></i>Tappio</span></div>
    ${rows.map(g => {
      const s = sumItems(g.items), pc = n => (100 * n / (s.p || 1)).toFixed(1);
      const tip = `${s.w} voittoa, ${s.d} tasapeliä, ${s.l} tappiota`;
      return `<div class="lv" role="row">
        <div class="lv-name" role="cell"><b>${P15.esc(g.level)}</b><small>${s.p} ottelua · maalit ${s.gf}–${s.ga} (${sgn(s.gf - s.ga)})</small></div>
        <div class="lv-bar" role="cell" title="${tip}" aria-label="${tip}">
          ${s.w ? `<span class="W" style="width:${pc(s.w)}%">${s.w}</span>` : ''}${s.d ? `<span class="D" style="width:${pc(s.d)}%">${s.d}</span>` : ''}${s.l ? `<span class="L" style="width:${pc(s.l)}%">${s.l}</span>` : ''}
        </div>
        <div class="lv-pct" role="cell">${Math.round(100 * s.w / (s.p || 1))} %<small>voitoista</small></div>
      </div>`;
    }).join('')}
  </div>`;

  /* --- Viimeisimmät tulokset ja tulevat pelit --- */
  const latest = [...played].sort((a, b) => b.m.date.localeCompare(a.m.date) || (b.m.time || '').localeCompare(a.m.time || '')).slice(0, 6);
  $('latest').innerHTML = latest.map(x => P15.matchHTML(x.m, { own: x.own })).join('') + `<div class="btns"><a class="btn" href="piirisarja/">Sarjatulokset →</a><a class="btn" href="turnaukset/">Turnaukset →</a></div>`;
  const upcoming = all.filter(x => !x.m.score).sort((a, b) => a.m.date.localeCompare(b.m.date) || (a.m.time || '').localeCompare(b.m.time || '')).slice(0, 6);
  $('upcoming').innerHTML = upcoming.length ? upcoming.map(x => P15.matchHTML(x.m, { own: x.own })).join('') : '<p class="note">Ei tulevia pelejä tiedossa.</p>';

  $('updated').textContent = `Tulokset Palloliiton ja turnausten tulospalveluista, päivitetty ${piiri.updated.split('-').reverse().map(Number).join('.')}.`;
})();

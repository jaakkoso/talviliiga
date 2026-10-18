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
  const tour = turn.events.flatMap(ev => ev.teams.flatMap(t => t.matches.map(m => ({ m: { ...m, series: `${ev.name} · ${t.level}` }, own: t.name, level: 'Turnaukset', kind: 'turnaus', link: ev.link }))));
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

  /* --- Vuosi 2026 lyhyesti: joukkuetason faktoja, ei nimiä --- */
  try {
    const det = await fetch('piirisarja/ottelut.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    const F = [];
    const res1 = x => P15.results(x.m, x.own).map(r => ({ ...r, x }));
    const games = played.flatMap(res1);
    const big = [...games].sort((a, b) => (b.f - b.g) - (a.f - a.g) || b.f - a.f)[0];
    if (big) F.push({ k: 'Suurin voitto', v: `${big.f}–${big.g}`, d: big.x.m.series.split(' · ')[0] });
    const most = [...games].sort((a, b) => (b.f + b.g) - (a.f + a.g))[0];
    if (most) F.push({ k: 'Maalirikkain ottelu', v: `${most.f + most.g} maalia`, d: `${most.f}–${most.g} · ${most.x.m.series.split(' · ')[0]}` });
    F.push({ k: 'Nollapelit', v: games.filter(g => g.g === 0).length, d: `otteluissa ei päästetty yhtään maalia` });
    const pl = turn.events.flatMap(ev => ev.teams.map(t => t.place)).filter(Boolean);
    const med = [1, 2, 3].map(n => pl.filter(p => p.pos === n).length);
    if (pl.length) F.push({ k: 'Turnausmitalit', v: med.reduce((a, b) => a + b, 0), d: `${med[0]} × kulta · ${med[1]} × hopea · ${med[2]} × pronssi` });
    const places = new Set([...turn.events.filter(ev => ev.teams.some(t => t.matches.some(m => m.score))).map(ev => ev.venue.split(',').pop().trim()), ...(eer.events.some(ev => ev.matches.some(m => m.score)) ? ['Tammela'] : [])]);
    F.push({ k: 'Turnausmatkat', v: places.size, d: [...places].join(', ') });
    // Ottelutiedoista (Palloliitto): käännetyt pelit, maalien ajoitus ja maalintekijöiden määrä
    const withDet = played.filter(x => x.m.pid && det[x.m.pid] && x.m.score && x.m.score.length === 1);
    const withGoals = withDet.filter(x => (det[x.m.pid].goals || []).length);
    let comeback = 0, behind = 0, htKnown = 0; const bins = [0, 0, 0, 0, 0, 0, 0], scorers = new Set(); let own = 0;
    for (const x of withDet) {
      const dt = det[x.m.pid], side = x.own === x.m.home ? 'h' : 'a';
      if (dt.ht && x.m.score && x.m.score.length === 1) {
        const [hh, ha] = dt.ht.split('–').map(Number), [fh, fa] = x.m.score[0];
        const htF = side === 'h' ? hh : ha, htA = side === 'h' ? ha : hh, f = side === 'h' ? fh : fa, a = side === 'h' ? fa : fh;
        htKnown++; if (htF < htA) { behind++; if (f > a) comeback++; }
      }
      for (const g of dt.goals || []) if (g.side === side) { own++; bins[Math.min(6, Math.floor((Math.max(1, g.min) - 1) / 10))]++; if (g.no != null) scorers.add(`${x.own}#${g.no}`); }
    }
    if (withDet.length) {
      const basis = n => `Vain ${n} ottelusta, lähinnä P12-sarjoista. Muista peleistä tieto puuttuu.`;
      if (htKnown) F.push({ k: 'Käännetyt pelit', v: `${comeback} / ${behind}`, d: `puoliajalla tappiolla ${behind} kertaa, näistä ${comeback} voitoksi`, n: basis(htKnown) });
      const lab = ['1–10', '11–20', '21–30', '31–40', '41–50', '51–60', '61–70'], mx = Math.max(...bins);
      F.push({ k: 'Maalit minuuteittain', v: `${lab[bins.indexOf(mx)]}'`, d: `eniten omia maaleja · 10 min jaksot`, n: basis(withGoals.length), spark: bins.map((b, i) => `<span style="height:${mx ? Math.max(6, Math.round(100 * b / mx)) : 6}%" title="${lab[i]}': ${b}"></span>`).join('') });
      F.push({ k: 'Eri maalintekijöitä', v: scorers.size, d: `pelinumeroa teki maalin, yhteensä ${own} maalia`, n: basis(withGoals.length) });
    }
    $('facts').innerHTML = F.map(f => `<div class="fact"><small>${P15.esc(f.k)}</small><b>${P15.esc(String(f.v))}</b>${f.spark ? `<div class="spark" aria-hidden="true">${f.spark}</div>` : ''}<span>${P15.esc(f.d)}</span>${f.n ? `<em class="basis">${P15.esc(f.n)}</em>` : ''}</div>`).join('');
  } catch (e) { $('facts').innerHTML = ''; }

  /* --- Viimeisimmät tulokset ja tulevat pelit --- */
  const latest = [...played].sort((a, b) => b.m.date.localeCompare(a.m.date) || (b.m.time || '').localeCompare(a.m.time || '')).slice(0, 6);
  $('latest').innerHTML = latest.map(x => P15.matchHTML(x.m, { own: x.own, link: x.link })).join('') + `<div class="btns"><a class="btn" href="piirisarja/">Sarjatulokset →</a><a class="btn" href="turnaukset/">Turnaukset →</a></div>`;
  const upcoming = all.filter(x => !x.m.score).sort((a, b) => a.m.date.localeCompare(b.m.date) || (a.m.time || '').localeCompare(b.m.time || '')).slice(0, 6);
  $('upcoming').innerHTML = upcoming.length ? upcoming.map(x => P15.matchHTML(x.m, { own: x.own, link: x.link })).join('') : '<p class="note">Ei tulevia pelejä tiedossa.</p>';

  $('updated').textContent = `Tulokset Palloliiton ja turnausten tulospalveluista, päivitetty ${piiri.updated.split('-').reverse().map(Number).join('.')}.`;
})();

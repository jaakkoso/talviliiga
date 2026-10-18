/* Etusivun kausikooste: luetaan kansioiden data.json-tiedostot ja koostetaan tulokset, ohjelma, tilastot ja taulukot. */
(async () => {
  const $ = id => document.getElementById(id);
  let piiri, eer, turn;
  try { [piiri, eer, turn] = await Promise.all(['piirisarja/data.json', 'eerikkila/data.json', 'turnaukset/data.json'].map(P15.load)); }
  catch (e) { $('season').innerHTML = '<p class="note">Kauden tietoja ei saatu ladattua. Tarkista verkkoyhteys ja päivitä sivu.</p>'; return; }

  const short = n => n.replace('SJK-j/', '');
  // Joukkueet: piirisarjajoukkueet, joihin liitetään saman joukkueen Huuhkajaliiga-ottelut
  const TEAM_COLORS = { 'SJK-j/musta -15': '#211e1e', 'SJK-j/kulta': '#8f7d0c', 'SJK-j/valkoinen': '#2f6db0', 'SJK-j/oranssi': '#cf5a14' };
  const teams = piiri.teams.map(t => {
    const hh = eer.events.filter(ev => ev.team === t.name).flatMap(ev => ev.matches.map(m => ({ ...m, series: 'P11 HUUHKAJALIIGA' })));
    const all = [...t.matches, ...hh].filter(m => m.score);
    return { ...t, all, color: TEAM_COLORS[t.name] || '#5b5650' };
  });
  const played = teams.flatMap(t => t.all.map(m => ({ m, t })));

  /* --- Kausi lukuina --- */
  const tot = P15.summary(played.map(x => x.m), '');
  const gd = tot.gf - tot.ga;
  $('kpis').innerHTML = `
    <div class="kpi"><small>Ottelut</small><b>${tot.p}</b><span>${teams.length} joukkuetta</span></div>
    <div class="kpi"><small>Voitot</small><b>${tot.w}</b><span>${Math.round(100 * tot.w / tot.p)} % otteluista</span></div>
    <div class="kpi"><small>Maalit</small><b>${tot.gf}–${tot.ga}</b><span>tehdyt–päästetyt</span></div>
    <div class="kpi"><small>Maaliero</small><b>${gd > 0 ? '+' : ''}${gd}</b><span>${tot.d} tasapeliä, ${tot.l} tappiota</span></div>`;

  $('teamtbl').innerHTML = `<div class="tbl teamtbl"><div class="tbl-scroll"><table>
    <thead><tr><th class="tn">Joukkue</th><th>O</th><th>V</th><th>T</th><th>H</th><th>Maalit</th><th>ME</th></tr></thead>
    <tbody>${teams.map(t => { const s = P15.summary(t.all, t.name), d = s.gf - s.ga; return `<tr>
      <td class="tn"><a href="piirisarja/"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${t.color};margin-right:8px"></i>${P15.esc(short(t.name))}</a><small>${P15.esc(t.level)}</small></td>
      <td>${s.p}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${s.gf}–${s.ga}</td><td>${d > 0 ? '+' : ''}${d}</td></tr>`; }).join('')}</tbody>
  </table></div></div>`;

  /* --- Kauden kehitys: kumulatiivinen maaliero ottelu kerrallaan --- */
  const series = teams.map(t => {
    const ms = [...t.all].sort((a, b) => a.date.localeCompare(b.date));
    let c = 0; const pts = [];
    for (const m of ms) {
      for (const r of P15.results(m, t.name)) c += r.f - r.g;
      const last = pts[pts.length - 1];
      if (last && last.key === m.date) last.v = c; else pts.push({ key: m.date, d: P15.parseDate(m.date), v: c }); // yksi piste päivää kohden
    }
    return { t, pts };
  }).filter(s => s.pts.length);
  drawChart(series);
  let rw = 0; addEventListener('resize', () => { const w = $('chart').clientWidth; if (Math.abs(w - rw) > 40) { rw = w; drawChart(series); } });

  /* --- Viimeisimmät tulokset ja tulevat ottelut --- */
  const latest = [...played].sort((a, b) => b.m.date.localeCompare(a.m.date)).slice(0, 6);
  $('latest').innerHTML = latest.map(x => P15.matchHTML(x.m, { own: x.t.name, showTeam: true, teamLabel: short(x.t.name) })).join('') + `<a class="btn" href="piirisarja/">Kaikki tulokset →</a>`;
  const upcoming = [...turn.events.flatMap(ev => ev.matches.filter(m => !m.score).map(m => ({ m: { ...m, series: ev.name }, own: ev.team, link: 'turnaukset/' }))),
    ...eer.events.flatMap(ev => ev.matches.filter(m => !m.score).map(m => ({ m: { ...m, series: 'Huuhkajaliiga' }, own: ev.team, link: 'eerikkila/' })))]
    .sort((a, b) => a.m.date.localeCompare(b.m.date) || (a.m.time || '').localeCompare(b.m.time || '')).slice(0, 6);
  $('upcoming').innerHTML = upcoming.length ? upcoming.map(x => P15.matchHTML(x.m, { own: x.own })).join('') : '<p class="note">Ei tulevia otteluita tiedossa.</p>';

  $('updated').textContent = `Tulokset Palloliiton tulospalvelusta, päivitetty ${piiri.updated.split('-').reverse().map(Number).join('.')}.`;

  function drawChart(series) {
    const el = $('chart'); el.innerHTML = el.innerHTML || ' ';
    const W = Math.max(300, Math.min(900, el.clientWidth - 28)), narrow = W < 520, H = narrow ? 240 : 300, L = 36, R = narrow ? 84 : 96, T = 14, B = 30;
    const all = series.flatMap(s => s.pts);
    const x0 = Math.min(...all.map(p => +p.d)), x1 = Math.max(...all.map(p => +p.d));
    let y0 = Math.min(0, ...all.map(p => p.v)), y1 = Math.max(0, ...all.map(p => p.v));
    const step = (y1 - y0) > 60 ? 20 : 10; y0 = Math.floor(y0 / step) * step; y1 = Math.ceil(y1 / step) * step;
    const X = d => L + (W - L - R) * ((+d - x0) / (x1 - x0 || 1)), Y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0 || 1));
    const M = ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu'];
    let g = '';
    for (let v = y0; v <= y1; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? '#9a948a' : '#ece8dc'}" stroke-width="${v === 0 ? 1.5 : 1}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#5b5650">${v > 0 ? '+' : ''}${v}</text>`;
    const s0 = new Date(x0), mt = new Date(s0.getFullYear(), s0.getMonth() + 1, 1);
    let mi = 0;
    for (let d = mt; +d <= x1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1), mi++) if (!narrow || mi % 2 === 0) g += `<line x1="${X(d)}" x2="${X(d)}" y1="${H - B}" y2="${H - B + 4}" stroke="#9a948a"/><text x="${X(d)}" y="${H - B + 17}" text-anchor="middle" font-size="11" fill="#5b5650">${M[d.getMonth()]}${d.getMonth() === 0 && !narrow ? ' ' + d.getFullYear() : ''}</text>`;
    // Porrasviivat ja päätepisteet
    const lines = series.map(s => {
      let d = `M${X(s.pts[0].d)} ${Y(0)}`;
      for (const p of s.pts) d += `H${X(p.d)}V${Y(p.v)}`;
      const last = s.pts[s.pts.length - 1];
      return `<path d="${d}" fill="none" stroke="${s.t.color}" stroke-width="2" stroke-linejoin="round"/><circle cx="${X(last.d)}" cy="${Y(last.v)}" r="4.5" fill="${s.t.color}" stroke="#fff" stroke-width="2"/>`;
    }).join('');
    // Suorat nimilaput viivojen päihin, päällekkäisyys estetään
    const labs = series.map(s => { const l = s.pts[s.pts.length - 1]; return { s, x: X(l.d), y: Y(l.v), v: l.v }; }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 15) labs[i].y = labs[i - 1].y + 15;
    const lt = labs.map(l => `<text x="${W - R + 10}" y="${l.y + 4}" font-size="12" font-weight="600" fill="#211e1e">${P15.esc(short(l.s.t.name))} <tspan fill="#5b5650" font-weight="400">${l.v > 0 ? '+' : ''}${l.v}</tspan></text><line x1="${l.x + 5}" x2="${W - R + 7}" y1="${Y(l.v)}" y2="${l.y}" stroke="#d6d1c3"/>`).join('');
    el.innerHTML = `<div class="legend">${series.map(s => `<span><i style="background:${s.t.color}"></i>${P15.esc(short(s.t.name))}</span>`).join('')}</div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kumulatiivinen maaliero joukkueittain kauden aikana">${g}${lines}${lt}<line id="xh" y1="${T}" y2="${H - B}" stroke="#211e1e" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/><rect id="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg>
      <div class="tip" id="tip" hidden></div>`;
    // Hover: lähin ottelupäivä, jokaisen joukkueen tilanne siihen mennessä
    const svg = el.querySelector('svg'), xh = el.querySelector('#xh'), tip = el.querySelector('#tip');
    const dates = [...new Set(all.map(p => +p.d))].sort((a, b) => a - b);
    const move = ev => {
      const r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) * W / r.width;
      let best = dates[0]; for (const d of dates) if (Math.abs(X(d) - sx) < Math.abs(X(best) - sx)) best = d;
      xh.setAttribute('x1', X(best)); xh.setAttribute('x2', X(best)); xh.setAttribute('visibility', 'visible');
      const dd = new Date(best);
      tip.innerHTML = `<b>${dd.getDate()}.${dd.getMonth() + 1}.${dd.getFullYear()}</b>` + series.map(s => {
        const p = [...s.pts].reverse().find(p => +p.d <= best); if (!p) return '';
        const here = s.pts.find(q => +q.d === best);
        return `<div class="r"><span><i style="background:${s.t.color}"></i>${P15.esc(short(s.t.name))}${here ? ' ●' : ''}</span><span>${p.v > 0 ? '+' : ''}${p.v}</span></div>`;
      }).join('');
      tip.hidden = false;
      const er = el.getBoundingClientRect(), px = r.left - er.left + X(best) * r.width / W, w = tip.offsetWidth;
      tip.style.left = (px + 12 + w < er.width - 8 ? px + 12 : Math.max(8, px - 12 - w)) + 'px'; tip.style.top = (r.top - er.top + 4) + 'px';
    };
    const hide = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); };
    const hit = el.querySelector('#hit');
    hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move); hit.addEventListener('pointerleave', hide);
  }
})();

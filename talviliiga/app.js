/* Julkinen tulospalvelu */
const S = {
  data: ls.get('tulospalvelu-cache', null),
  mine: ls.get('tulospalvelu-team', ''),
  tab: ls.get('tulospalvelu-tab', 'ohjelma'),
  open: new Set(),
  updated: null,
  offline: false,
};
const app = document.getElementById('app');

async function refresh() {
  try {
    S.data = await Store.load();
    S.updated = new Date(); S.offline = false;
    if (!Store.demo) ls.set('tulospalvelu-cache', S.data);
  } catch (e) { S.offline = true; }
  render();
  const cb = document.getElementById('cafeBtn'); if (cb) cb.hidden = !(EVENT.cafe && EVENT.cafe.length);
  return !S.offline;
}

/* Kahvion hinnasto: ryhmittäin, hinnat euroina, MobilePay-numero jos asetettu */
function cafeDialog() {
  const groups = [];
  for (const it of EVENT.cafe || []) { let g = groups.find(x => x.name === it.group); if (!g) groups.push(g = { name: it.group, items: [] }); g.items.push(it); }
  const price = p => /^\d+([.,]\d+)?$/.test(p) ? p.replace('.', ',') + ' €' : esc(p);
  const list = groups.map(g => `${g.name ? `<div class="cafe-g">${esc(g.name)}</div>` : ''}<ul class="cafe-l">${g.items.map(i => `<li><span>${esc(i.name)}</span><b>${price(i.price)}</b></li>`).join('')}</ul>`).join('');
  const pay = EVENT.mobilepay ? `<div class="cafe-pay">MobilePay <b>#${esc(EVENT.mobilepay.replace(/^#/, ''))}</b>${EVENT.payee ? `<span>${esc(EVENT.payee)}</span>` : ''}</div>` : '';
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="box cafe" role="dialog" aria-label="Kahvio"><div class="cafe-h">Kahvio${EVENT.cafeText ? `<span>${esc(EVENT.cafeText)}</span>` : ''}</div>${list}${pay}<button class="btn ghost" data-close>Sulje</button></div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) ov.remove(); });
  document.body.append(ov);
}
document.getElementById('cafeBtn')?.addEventListener('click', cafeDialog);

const slotState = (s, clk) => { const ks = s.ms.map(m => status(m, clk).k); return ks.includes('live') ? 'live' : ks.every(k => k === 'done' || k === 'cancel') ? 'done' : ks.includes('wait') ? 'wait' : 'up'; };
const scoreTxt = (m, clk, goals) => { const st = status(m, clk); if (st.k === 'cancel') return 'peruttu'; const sc = score(m, goals, st); return sc ? sc.join('–') : '–'; };
const pairHtml = m => `${chip(m.home)}<span class="vs">vs</span>${chip(m.away)}`;
/* Sarjan väritunniste: kilpa tumma, haaste sininen */
const sxc = k => /kilpa/i.test(k) ? 'sx-k' : /haaste/i.test(k) ? 'sx-h' : '';
const sxp = k => `<span class="sxp ${sxc(k)}">${esc(k)}</span>`;
const multiSeries = () => seriesList(S.data.matches).length > 1;

/* Yksi tiivis "nyt"-kortti: käynnissä tai tulossa + mitä seuraavaksi */
function nowCard(slots, clk, goals) {
  const live = slots.find(s => slotState(s, clk) === 'live');
  const up = slots.find(s => slotState(s, clk) === 'up');
  const s = live || up;
  let lab, when = '';
  if (live) { const left = Math.max(0, ...live.ms.map(m => status(m, clk).left || 0)); lab = 'Käynnissä nyt'; when = `${left} min jäljellä`; }
  else if (up) {
    const prev = slots.filter(x => x.start < up.start).pop();
    const isBreak = clk.day === 0 && prev && up.start - (prev.start + EVENT.matchMin) >= 20 && clk.min >= prev.start + EVENT.matchMin;
    lab = isBreak ? 'Tauko · tulossa' : 'Tulossa';
    const inMin = up.start - clk.min;
    when = clk.day < 0 ? `${EVENT.dateText} klo ${fmtTime(up.start)}` : inMin <= 90 ? `klo ${fmtTime(up.start)} · ${Math.max(0, inMin)} min` : `klo ${fmtTime(up.start)}`;
  }
  if (!s) return `<section class="now"><div class="now-main"><div class="now-lab">Pelipäivä</div><div class="now-when">Kaikki ottelut pelattu. Kiitos!</div></div></section>`;
  const after = slots[slots.indexOf(s) + 1];
  let afterTxt;
  if (!after) afterTxt = `<div class="now-after"><span class="al">Seuraavaksi</span><span class="at">Päivän viimeinen ottelu</span></div>`;
  else {
    const gap = after.start - (s.start + EVENT.matchMin);
    const who = after.same ? `${esc(after.ms[0].home)}–${esc(after.ms[0].away)}` : `${after.ms.length} ottelua`;
    afterTxt = `<div class="now-after"><span class="al">Seuraavaksi${gap >= 20 ? ' tauon jälkeen' : ''}</span><span class="d num at-t">${fmtTime(after.start)}</span><span class="at">${who}</span></div>`;
  }
  let body;
  if (s.same) {
    const fields = live ? s.ms.map(m => `<span>${esc(multiSeries() ? m.series : m.field)} <b class="d num">${scoreTxt(m, clk, goals)}</b></span>`).join('')
      : s.ms.map(m => `<span>${sxp(m.series)}${m.field ? ' · ' + esc(m.field) : ''}</span>`).join('');
    body = `<div class="now-pair">${pairHtml(s.ms[0])}</div><div class="now-when">${when}</div><div class="now-fields">${fields}</div>`;
  } else {
    body = `<div class="now-when">${when}</div><div class="now-list">${s.ms.map(m => `<div class="now-row"><span class="now-pair">${pairHtml(m)}</span><span class="now-meta">${esc([m.series, m.field].filter(Boolean).join(' · '))}${live ? ` <b class="d num">${scoreTxt(m, clk, goals)}</b>` : ''}</span></div>`).join('')}</div>`;
  }
  return `<section class="now" aria-live="polite"><div class="now-main"><div class="now-lab">${lab}${live ? '<i class="dot" aria-hidden="true"></i>' : ''}</div>${body}</div>${afterTxt}</section>`;
}

function controls(slots, clk) {
  const teams = uniq(S.data.matches.flatMap(m => [m.home, m.away])); const ordered = EVENT.teamNames.filter(t => teams.includes(t)).concat(teams.filter(t => !EVENT.teamNames.includes(t)));
  if (S.mine && !ordered.includes(S.mine)) S.mine = '';
  const opts = ['', ...ordered].map(t => `<option value="${esc(t)}" ${S.mine === t ? 'selected' : ''}>${t ? esc(t) : 'Kaikki ottelut'}</option>`).join('');
  let nextLine = '';
  if (S.mine) {
    const nxt = slots.find(s => slotHas(s, S.mine) && ['up', 'live'].includes(slotState(s, clk)));
    if (nxt) { const m = nxt.ms.find(x => x.home === S.mine || x.away === S.mine), opp = m.home === S.mine ? m.away : m.home;
      nextLine = `<p class="mine-next">${slotState(nxt, clk) === 'live' ? `<b>${esc(S.mine)} pelaa nyt</b> vs ${esc(opp)}` : `<b>${esc(S.mine)}: seuraava ottelu</b> klo ${fmtTime(nxt.start)} vs ${esc(opp)}`}</p>`; }
    else nextLine = `<p class="mine-next"><b>${esc(S.mine)}</b> on pelannut kaikki ottelunsa.</p>`;
  }
  const tabs = EVENT.showTable ? `<div class="tabs" role="tablist"><button role="tab" data-tab="ohjelma" aria-selected="${S.tab !== 'sarjat'}">Ohjelma</button><button role="tab" data-tab="sarjat" aria-selected="${S.tab === 'sarjat'}">Sarjataulukot</button></div>` : '';
  return `<div class="ctrl"><label class="sel"><span>Näytä</span><select id="mine">${opts}</select></label>${tabs}</div>${nextLine}`;
}

function program(allSlots, clk, goals) {
  // Varsinaiset tauot lasketaan koko ohjelmasta, jotta suodatettu lista ei näytä joukkueen omia välejä taukoina
  const breaks = [];
  for (let i = 1; i < allSlots.length; i++) { const end = allSlots[i - 1].start + EVENT.matchMin; if (allSlots[i].start - end >= 20) breaks.push([end, allSlots[i].start]); }
  const slots = S.mine ? allSlots.filter(s => slotHas(s, S.mine)) : allSlots;
  let out = '', prevStart = null;
  for (const s of slots) {
    for (const [a, b] of breaks) if (prevStart != null && a > prevStart && b <= s.start) out += `<li class="brk">Tauko ${fmtTime(a)}–${fmtTime(b)}${EVENT.breakText ? ' · ' + esc(EVENT.breakText) : ''}</li>`;
    const st = slotState(s, clk), open = S.open.has(s.start);
    const state = st === 'live' ? '<span class="state live"><i class="dot" aria-hidden="true"></i>Käynnissä</span>' : st === 'wait' ? '<span class="state">Tulos tulossa</span>' : '';
    const ms = S.mine && !s.same ? s.ms.filter(m => m.home === S.mine || m.away === S.mine) : s.ms;
    let mid, res;
    if (s.same) {
      mid = `${pairHtml(s.ms[0])}${state}`;
      res = s.ms.map(m => `<span class="r">${ms.length > 1 || multiSeries() ? `<span class="rl">${sxp(m.series)}</span>` : ''}<b class="d num">${scoreTxt(m, clk, goals)}</b></span>`).join('');
    } else {
      mid = `<span class="g-multi">${ms.map(m => `<span class="g-line">${pairHtml(m)}<span class="rl">${sxp(m.series)}${m.field ? ' · ' + esc(m.field) : ''}</span></span>`).join('')}${state}</span>`;
      res = ms.map(m => `<span class="r"><b class="d num">${scoreTxt(m, clk, goals)}</b></span>`).join('');
    }
    out += `<li class="g ${st}"><button class="g-row" data-open="${s.start}" aria-expanded="${open}">
      <span class="g-t d num">${fmtTime(s.start)}</span><span class="g-p">${mid}</span><span class="g-r">${res}</span></button>`;
    if (open) out += `<div class="g-d">${ms.map(m => detail(m, clk, goals)).join('')}</div>`;
    out += `</li>`;
    prevStart = s.start;
  }
  return `<ul class="prog">${out}</ul>`;
}
function detail(m, clk, goals) {
  const st = status(m, clk), g = goalsOf(m.id, goals);
  const gl = g.length ? g.map(z => `${z.min != null ? z.min + "'" : ''} ${esc(z.team)}${EVENT.showNumbers && z.no ? ' #' + esc(z.no) : ''}`).join(' · ') : 'Maaleja ei kirjattu erikseen';
  return `<div class="dl ${sxc(m.series)}"><div>${sxp(m.series)}${m.field ? ' · ' + esc(m.field) : ''}<div class="muted">${gl}</div></div><span style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">${m.veo ? `<a class="lnk" href="${esc(m.veo)}" target="_blank" rel="noopener">🎥 Katso Veo</a>` : ''}${st.k === 'done' ? `<button class="lnk" data-share="${esc(m.id)}">Jaa tulos</button>` : ''}</span></div>`;
}

function tables(matches) {
  const t = k => {
    const rows = standings(matches, k, S.data.adjust).map((r, i) => `<tr class="${r.team === S.mine ? 'mine' : ''}"><td>${i + 1}</td><td>${chip(r.team)}${isAdjusted(r.adj) ? '<sup class="adjm" title="Korjattu käsin">*</sup>' : ''}${r.lot && !(r.adj && r.adj.pos) && r.p ? '<sup class="adjm" title="Täysin tasan, ratkaistaan arvalla">A</sup>' : ''}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}–${r.ga}</td><td>${r.pts}</td></tr>`).join('');
    const f = mainField(matches, k);
    return `<section class="${sxc(k)}"><h2 class="h2">${sxp(k)} ${f ? `<small>${esc(f)}</small>` : ''}</h2>
      <div class="tbl-wrap"><table class="st"><thead><tr><th>#</th><th>Joukkue</th><th title="Ottelut">O</th><th title="Voitot">V</th><th title="Tasapelit">T</th><th title="Häviöt">H</th><th title="Maalit">M</th><th title="Pisteet">P</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  };
  const adjNotes = (S.data.adjust || []).filter(isAdjusted).map(a => `<li><b>${esc(a.series)}, ${esc(a.team)}:</b> ${esc(a.note || 'järjestäjän korjaus')}</li>`).join('');
  return `<div class="tables">${seriesList(matches).map(t).join('')}</div><p class="note">Voitto 3, tasapeli 1. Tasapisteissä ratkaisevat 1. keskinäisten otteluiden pisteet, 2. keskinäinen maaliero, 3. keskinäiset tehdyt maalit, 4. koko sarjan maaliero, 5. koko sarjan tehdyt maalit, 6. arpa.</p>${adjNotes ? `<div class="note"><b>* Järjestäjän korjaus</b><ul class="adjl">${adjNotes}</ul></div>` : ''}`;
}

function render() {
  applyHeader();
  if (!S.data) { app.innerHTML = `<p class="note">${S.offline ? 'Tuloksia ei saatu ladattua. Tarkista nettiyhteys.' : 'Ladataan…'}</p>`; return; }
  const clk = clock(), { matches, goals } = S.data, slots = slotsOf(matches);
  document.getElementById('upd').innerHTML = S.offline ? 'Ei yhteyttä' : S.updated ? `Päivitetty ${fmtTime(S.updated.getHours() * 60 + S.updated.getMinutes())}` : '';
  let h = '';
  if (clk.demo) { const hs = CONFIG.SHEET_ID ? '#harjoitus' : ''; h += `<p class="demo">${CONFIG.SHEET_ID ? 'Harjoitustila (esimerkkidata, ei vaikuta oikeisiin tuloksiin)' : 'Esikatselu'}, kello ${fmtTime(clk.min)} · <button class="lnk" data-reset>Aloita alusta</button> · <a href="kentta.html${hs}">Kenttävastaava</a> · <a href="tuomari.html${hs}">Tuomari</a>${CONFIG.SHEET_ID ? '' : ` · <a href="yllapito.html">Ylläpito</a>`}</p>`; }
  const sum = daySummary(matches, goals);
  h += sum || nowCard(slots, clk, goals);
  h += controls(slots, clk);
  h += (EVENT.showTable && S.tab === 'sarjat') ? tables(matches) : program(slots, clk, goals);
  app.innerHTML = h;
}

/* Päivän koonti: näytetään, kun kaikki ottelut on pelattu ja tulokset vahvistettu */
function daySummary(matches, goals) {
  const played = matches.filter(m => m.tila !== 'peruttu');
  if (!played.length || !played.every(isFinal)) return '';
  const medals = ['🥇', '🥈', '🥉'];
  const podium = seriesList(matches).map(k => {
    const st = standings(matches, k, S.data.adjust).slice(0, 3);
    return `<div class="sum-pod ${sxc(k)}"><div class="sum-pt">${sxp(k)}</div>${st.map((r, i) => `<div class="sum-row"><span class="sum-m">${medals[i]}</span>${chip(r.team)}<span class="sum-p">${r.pts} p</span></div>`).join('')}</div>`;
  }).join('');
  const tot = played.reduce((a, m) => a + m.hg + m.ag, 0);
  const desc = (m, txt) => `${esc(m.home)}–${esc(m.away)} ${m.hg}–${m.ag} <small>${esc(m.series)} klo ${fmtTime(m.start)}</small>${txt ? ` <small>${txt}</small>` : ''}`;
  const facts = [];
  facts.push(['⚽', 'Maaleja yhteensä', `${tot} <small>${played.length} ottelussa, ${(tot / played.length).toFixed(1).replace('.', ',')} per ottelu</small>`]);
  const big = played.slice().sort((a, b) => Math.abs(b.hg - b.ag) - Math.abs(a.hg - a.ag) || (b.hg + b.ag) - (a.hg + a.ag))[0];
  if (big && big.hg !== big.ag) facts.push(['💪', 'Päivän isoin voitto', desc(big)]);
  const most = played.slice().sort((a, b) => (b.hg + b.ag) - (a.hg + a.ag))[0];
  if (most && most !== big) facts.push(['🎯', 'Maalirikkain ottelu', desc(most)]);
  const gl = goals.filter(g => g.min != null && played.some(m => m.id === g.match));
  const fast = gl.slice().sort((a, b) => a.min - b.min)[0];
  if (fast) { const m = matches.find(x => x.id === fast.match); facts.push(['⚡', 'Päivän nopein maali', `${esc(fast.team)} ${fast.min}. minuutilla <small>${m ? esc(m.series) + ' ' + esc(m.home) + '–' + esc(m.away) : ''}</small>`]); }
  const late = gl.filter(g => g.min >= (EVENT.matchMin || 30) - 2).length;
  if (late) facts.push(['⏱️', 'Viime hetken maalit', `${late} <small>maalia ottelun kahdella viimeisellä minuutilla</small>`]);
  const byTeam = {}; played.forEach(m => { byTeam[m.home] = (byTeam[m.home] || 0) + m.hg; byTeam[m.away] = (byTeam[m.away] || 0) + m.ag; });
  const topT = Object.entries(byTeam).sort((a, b) => b[1] - a[1])[0];
  if (topT) facts.push(['🔥', 'Tehokkain joukkue', `${chip(topT[0])} <small>${topT[1]} maalia molemmissa sarjoissa yhteensä</small>`]);
  const cs = {}; played.forEach(m => { if (m.ag === 0) cs[m.home] = (cs[m.home] || 0) + 1; if (m.hg === 0) cs[m.away] = (cs[m.away] || 0) + 1; });
  const csN = Object.values(cs).reduce((a, b) => a + b, 0);
  if (csN) facts.push(['🧤', 'Nollapelit', `${csN} <small>${Object.entries(cs).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${esc(t)} ${n}`).join(' · ')}</small>`]);
  const draws = played.filter(m => m.hg === m.ag).length;
  if (draws) facts.push(['🤝', 'Tasapelit', `${draws} <small>ottelua päättyi tasan</small>`]);
  return `<section class="sum"><div class="sum-h"><div class="now-lab">Pelipäivä on pelattu</div><div class="sum-title">Kiitos kaikille joukkueille, valmentajille, tuomareille ja kannustajille!</div></div>
    <div class="sum-pods">${podium}</div>
    <div class="sum-facts">${facts.map(([i, l, v]) => `<div class="sum-f"><span class="sum-i">${i}</span><div><div class="sum-l">${l}</div><div class="sum-v">${v}</div></div></div>`).join('')}</div>
    <p class="sum-note">Kaikki ottelut ja maalit löytyvät alta. Napauta joukkuetta nähdäksesi sen päivän.</p></section>`;
}

/* Joukkueen oma näkymä: klikkaa joukkueen nimeä tai logoa. Jaettava osoite: …/talviliiga/?joukkue=SJK */
function teamDialog(team) {
  if (!S.data || !EVENT.teamNames.includes(team)) return;
  document.querySelectorAll('.overlay.team').forEach(x => x.remove());
  const clk = clock(), { matches, goals } = S.data;
  const ms = matches.filter(m => m.home === team || m.away === team).sort((a, b) => (a.start ?? 0) - (b.start ?? 0) || a.series.localeCompare(b.series));
  const pos = seriesList(matches).filter(k => ms.some(m => m.series === k)).map(k => {
    const st = standings(matches, k, S.data.adjust), i = st.findIndex(r => r.team === team), row = st[i];
    return row ? `<div class="tm-pos ${sxc(k)}"><span>${sxp(k)}</span><b>${i + 1}. / ${st.length}</b><small>${row.p} ott. · ${row.pts} p · ${row.gf}–${row.ga}</small></div>` : '';
  }).join('');
  const next = ms.find(m => ['up', 'live', 'wait'].includes(status(m, clk).k));
  const rows = ms.map(m => {
    const st = status(m, clk), sc = st.k === 'cancel' ? null : score(m, goals, st), home = m.home === team, opp = home ? m.away : m.home;
    const own = sc ? (home ? sc[0] : sc[1]) : null, their = sc ? (home ? sc[1] : sc[0]) : null;
    const res = st.k === 'cancel' ? 'peruttu' : sc ? `${own}–${their}` : '–';
    const wl = st.k === 'done' && sc ? (own > their ? '<em class="tm-w">V</em>' : own < their ? '<em class="tm-x">H</em>' : '<em class="tm-d">T</em>') : st.k === 'live' ? '<em class="tm-live">Käynnissä</em>' : '';
    return `<li class="${m === next ? 'tm-next' : ''} ${sxc(m.series)}"><span class="t num">${fmtTime(m.start)}</span><span class="o"><small>${sxp(m.series)}${m.field ? ' · ' + esc(m.field) : ''}</small><span class="tm-vs">vs ${chip(opp)}</span></span><span class="r num"><b>${res}</b>${wl}${m.veo ? ` <a href="${esc(m.veo)}" target="_blank" rel="noopener" title="Veo">🎥</a>` : ''}</span></li>`;
  }).join('');
  const ov = document.createElement('div'); ov.className = 'overlay team';
  ov.innerHTML = `<div class="box tm" role="dialog" aria-label="${esc(team)}"><div class="tm-h">${chip(team)}<button class="btn ghost" data-close aria-label="Sulje">✕</button></div>
    ${pos ? `<div class="tm-poss">${pos}</div>` : ''}
    ${next ? `<div class="note" style="margin:0"><b>Seuraava ottelu:</b> klo ${fmtTime(next.start)} ${esc(next.series)} vs ${esc(next.home === team ? next.away : next.home)}</div>` : ''}
    <ul class="tm-l">${rows}</ul></div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) ov.remove(); });
  document.body.append(ov);
}

async function share(id) {
  const m = S.data.matches.find(x => x.id === id); if (!m) return;
  const st = status(m, clock()), sc = score(m, S.data.goals, st); if (!sc) return;
  const blob = await shareImage(m, sc, S.data.goals); if (!blob) return;
  const name = `tulos-${m.home}-${m.away}-${m.series}.png`.toLowerCase().replace(/[^a-z0-9.\-äöå]+/g, '-');
  const file = new File([blob], name, { type: 'image/png' });
  const text = `${m.series}: ${m.home}–${m.away} ${sc.join('–')} · ${EVENT.name}`;
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="box"><img src="${url}" alt="${esc(text)}"><div class="note" style="margin:0">Pidä sormea kuvan päällä tallentaaksesi tai jakaaksesi sen.</div>
    <div style="display:flex;gap:8px"><a class="btn gold" href="${url}" download="${esc(name)}" style="text-decoration:none">Lataa kuva</a><button class="btn ghost" data-close>Sulje</button></div></div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) { ov.remove(); URL.revokeObjectURL(url); } });
  document.body.append(ov);
}

document.addEventListener('change', e => { if (e.target.id === 'mine') { S.mine = e.target.value; ls.set('tulospalvelu-team', S.mine); render(); } });
document.addEventListener('click', e => {
  const tc = e.target.closest('#app .chip, .overlay.team .tm-vs .chip'); if (tc) { const t = tc.textContent.trim(); if (EVENT.teamNames.includes(t)) { e.preventDefault(); teamDialog(t); return; } }
  const tb = e.target.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; ls.set('tulospalvelu-tab', S.tab); render(); return; }
  const o = e.target.closest('[data-open]'); if (o) { const k = Number(o.dataset.open); S.open.has(k) ? S.open.delete(k) : S.open.add(k); render(); return; }
  const sh = e.target.closest('[data-share]'); if (sh) { share(sh.dataset.share); return; }
  if (e.target.closest('[data-reset]')) { Store.demoReset(); refresh(); }
});
render(); refresh().then(() => { try { const t = new URLSearchParams(location.search).get('joukkue'); if (t) teamDialog(EVENT.teamNames.find(n => n.toLowerCase() === t.toLowerCase()) || t); } catch (e) { } });
const pollNow = schedulePoll(refresh, CONFIG.POLL_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) pollNow(); });
setInterval(render, 15000);

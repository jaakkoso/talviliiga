/* Puhtaat jäsennysfunktiot: tekstistä ja taulukkoriveistä datatiedostojen muotoon. Ei verkkoa, testattavissa. */

export const pad = n => String(n).padStart(2, '0');

// "MA 28.9." / "20.12.2025" / "5.9." / "3.4.2026" → "2026-09-28"; kausi = oletusvuosi
export function pvm(txt, kausi) {
  const m = String(txt || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/);
  if (!m) return null;
  return `${m[3] || kausi}-${pad(m[2])}-${pad(m[1])}`;
}

// "9–0", "1 - 2", "rp 1–3 (2–2)" → { score: [[h,a]], note }
export function tulos(txt) {
  const s = String(txt || '').replace(/\s*-\s*/g, '–').trim();
  const rp = s.match(/rp\s*(\d+)–(\d+)\s*\((\d+)–(\d+)\)/);
  if (rp) return { score: [[+rp[3], +rp[4]]], note: `rp ${rp[1]}–${rp[2]}` };
  const m = s.match(/^(\d+)–(\d+)$/);
  return m ? { score: [[+m[1], +m[2]]] } : null;
}
const onTulos = t => /^\d+\s*[–-]\s*\d+$/.test(String(t).trim());
const onKello = t => /^\d{1,2}[.:]\d{2}$/.test(String(t).trim());

/* Palloliiton joukkuesivun (tulokset tai tulevat) teksti riveinä → ottelut.
   Rakenne: päivä, "MATCH DETAILS", sarja, koti, tulos (tuplapelissä kaksi tulosta), vieras. Tulevissa tuloksen paikalla kellonaika. */
export function palloliittoOttelut(rivit, kausi) {
  const L = rivit.map(s => String(s).trim()).filter(Boolean), out = [];
  for (let i = 0; i < L.length; i++) {
    if (L[i] !== 'MATCH DETAILS') continue;
    const date = pvm(L[i - 1], kausi), series = L[i + 1], home = L[i + 2];
    if (!date || !home) continue;
    let j = i + 3; const sc = [], m = { date, series, home, away: '', score: null };
    while (onTulos(L[j])) { sc.push(tulos(L[j]).score[0]); j++; }
    if (sc.length) m.score = sc; else if (onKello(L[j])) { m.time = L[j].replace(':', '.'); j++; }
    m.away = L[j] || '';
    if (m.away && m.away !== 'MATCH DETAILS') out.push(m);
  }
  return out;
}

/* Sarjataulukon rivit: otsikot + solut → [{pos,team,o,v,t,h,gf,ga,p}] */
export function taulukko(otsikot, rivit) {
  const ix = k => otsikot.indexOf(k);
  if (ix('P') < 0 || ix('Joukkue') < 0) return null;
  return rivit.map(c => {
    const [gf, ga] = String(c[ix('M')] || '0–0').split(/[–-]/).map(Number);
    return { pos: +c[ix('#')], team: c[ix('Joukkue')], o: +c[ix('O')], v: +c[ix('V')], t: +c[ix('T')], h: +c[ix('H')], gf, ga, p: +c[ix('P')] };
  }).filter(r => r.team && Number.isFinite(r.pos));
}

/* Torneopal: joukkueen nimike "P11 /Kulta emoji_events" → { label, level, trophy } */
export function torneopalNimike(nimike) {
  const trophy = /emoji_events/.test(nimike);
  const t = nimike.replace('emoji_events', '').trim();
  const k = t.indexOf('/');
  const label = k >= 0 ? t.slice(k + 1).trim() : (t.match(/SJK[^\s]*/) || ['SJK-j'])[0];
  const level = (k >= 0 ? t.slice(0, k) : t.replace(/SJK[^\s]*/, '')).trim();
  return { label: label.charAt(0).toUpperCase() + label.slice(1), level, trophy };
}

/* Torneopal-ottelurivi [pvm, sarja, koti, tulos, vieras] → ottelu (pelaamattomat ilman tulosta) */
export function torneopalOttelu(r, kausi) {
  const [d, sarja, home, sc, away] = r;
  const date = pvm(d, kausi); if (!date || !home || !away) return null;
  const t = tulos(sc), m = { date, series: sarja, home, away, score: t ? t.score : null };
  if (t && t.note) m.note = t.note;
  if (!t && onKello(sc)) m.time = sc.replace(':', '.');
  return m;
}

/* Turvatarkistus: uusi joukko ei saa kadottaa jo tiedossa olevia pelattuja otteluita */
export function turvallinen(vanhat, uudet) {
  const pelatut = a => (a || []).filter(m => m.score).length;
  return pelatut(uudet) >= pelatut(vanhat);
}

/* Palloliiton ottelusivun teksti → ottelutiedot ilman nimiä.
   Maalintekijät muunnetaan pelinumeroiksi saman sivun kokoonpanon perusteella; nimiä ei palauteta. */
export function ottelusivu(txt) {
  const L = String(txt).split('\n').map(s => s.replace(/ /g, ' ').trim()).filter(Boolean);
  const out = { time: null, venue: null, ht: null, goals: [], tupla: false };
  const hdr = L.findIndex(l => /^\d{1,2}:\d{2} \|/.test(l));
  if (hdr >= 0) { const m = L[hdr].match(/^(\d{1,2}):(\d{2})/); out.time = `${m[1]}.${m[2]}`; out.venue = (L[hdr + 1] || '').split(',')[0].trim() || null; }
  const i = L.findIndex(l => /^(PÄÄTTYNYT|ENDED|FINISHED|FULL TIME)$/i.test(l));
  if (i < 0) return out;
  let j = i + 2; const hg = [];
  while (j < L.length && !/^\d+ – \d+$/.test(L[j])) hg.push(L[j++]);
  j++;
  if (/^\d+ – \d+$/.test(L[j] || '')) { out.tupla = true; return out; } // tuplapeli: maaleja ei voi kohdistaa peliin
  if (/^\(\d+–\d+\)$/.test(L[j] || '')) { out.ht = L[j].replace(/[()]/g, ''); j++; }
  j++;
  const ag = [];
  while (j < L.length && !/^(KOKOONPANOT|LINEUPS)/i.test(L[j])) ag.push(L[j++]);
  const sec = L.indexOf('1 PUOLIAIKA'), so = L.lastIndexOf('SHOTOFFTARGET');
  const kokoonpano = (a, b) => L.slice(a, b).filter(l => /^#\d+ /.test(l)).map(l => { const m = l.match(/^#(\d+) (.+)$/); return { no: +m[1], name: m[2] }; });
  const hl = kokoonpano(j, sec > 0 ? sec : j + 40), al = so > 0 ? kokoonpano(so + 1, so + 40) : [];
  const lisaa = (rivit, kp, side) => {
    for (const g of rivit) {
      const mins = [...g.matchAll(/(\d+)(?:\+\d+)?'/g)].map(x => +x[1]); if (!mins.length) continue;
      const name = g.replace(/\s*\d+(?:\+\d+)?'.*$/, '').trim(), og = /\(om\)|oma maali/i.test(g);
      const c = kp.filter(p => p.name.split(' ')[0] === name || (name.includes(' ') && p.name.startsWith(name)));
      for (const min of mins) { const e = { min, side }; if (og) e.og = true; else if (c.length === 1) e.no = c[0].no; out.goals.push(e); }
    }
  };
  lisaa(hg, hl, 'h'); lisaa(ag, al, 'a');
  out.goals.sort((a, b) => a.min - b.min);
  return out;
}

/* ---------- Oma turnaus (Talviliiga-tyyppinen tulospalvelu Google Sheetissä) ---------- */

// Google Sheetsin gviz-CSV → [{sarake: arvo}]
export function csv(text) {
  const rows = []; let row = [], cell = '', q = false;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [h, ...rest] = rows.filter(r => r.some(x => String(x).trim() !== ''));
  if (!h) return [];
  const keys = h.map(k => k.trim().toLowerCase());
  return rest.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const luku = v => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const kello = v => { const m = String(v || '').match(/(\d{1,2})[.:](\d{2})/); return m ? `${pad(m[1])}.${m[2]}` : undefined; };
export function asetusPaiva(v) {
  const s = String(v || '').trim(), iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/), fi = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : fi ? `${fi[3]}-${pad(fi[2])}-${pad(fi[1])}` : null;
}

/* Sarjataulukko samoilla säännöillä kuin tulospalvelussa (talviliiga/common.js standings):
   3/1/0, tasapisteissä keskinäiset pisteet, keskinäinen maaliero, keskinäiset tehdyt, maaliero, tehdyt.
   Ylläpidon korjaukset lisätään ja pakotettu sija ohittaa järjestyksen. */
export function omaSarjataulukko(ms, sarja, korjaukset = []) {
  const valmis = m => m.hg != null && m.ag != null && m.tila !== 'peruttu';
  const nimet = [...new Set(ms.filter(m => m.series === sarja).flatMap(m => [m.home, m.away]).filter(Boolean))];
  const t = Object.fromEntries(nimet.map(n => [n, { team: n, p: 0, gf: 0, ga: 0, pts: 0 }]));
  const pelaa = (taulu, m) => { const a = taulu[m.home], b = taulu[m.away]; a.gf += m.hg; a.ga += m.ag; b.gf += m.ag; b.ga += m.hg; if (m.hg > m.ag) a.pts += 3; else if (m.hg < m.ag) b.pts += 3; else { a.pts++; b.pts++; } };
  for (const m of ms) if (m.series === sarja && valmis(m) && t[m.home] && t[m.away]) { t[m.home].p++; t[m.away].p++; pelaa(t, m); }
  const adj = korjaukset.filter(a => a.series === sarja && t[a.team]);
  for (const a of adj) { t[a.team].pts += a.pts; t[a.team].gf += a.gf; t[a.team].ga += a.ga; }
  const byPts = Object.values(t).sort((x, y) => y.pts - x.pts), sorted = [];
  for (let i = 0; i < byPts.length;) {
    let j = i; while (j < byPts.length && byPts[j].pts === byPts[i].pts) j++;
    const grp = byPts.slice(i, j);
    if (grp.length > 1) {
      const set = new Set(grp.map(r => r.team)), h = Object.fromEntries(grp.map(r => [r.team, { pts: 0, gf: 0, ga: 0 }]));
      for (const m of ms) if (m.series === sarja && valmis(m) && set.has(m.home) && set.has(m.away)) pelaa(h, m);
      const key = r => [h[r.team].pts, h[r.team].gf - h[r.team].ga, h[r.team].gf, r.gf - r.ga, r.gf];
      grp.sort((x, y) => { const kx = key(x), ky = key(y); for (let k = 0; k < kx.length; k++) if (ky[k] !== kx[k]) return ky[k] - kx[k]; return x.team.localeCompare(y.team, 'fi'); });
    }
    sorted.push(...grp); i = j;
  }
  const forced = adj.filter(a => a.pos >= 1 && a.pos <= sorted.length).sort((a, b) => a.pos - b.pos);
  if (!forced.length) return sorted;
  const out = new Array(sorted.length).fill(null), rest = sorted.filter(r => !forced.some(f => f.team === r.team));
  for (const f of forced) { let i = f.pos - 1; while (out[i]) i++; out[i] = t[f.team]; }
  for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = rest.shift();
  return out;
}

/* Oman turnauksen välilehdet → joukkueen sarjat sivuston muodossa.
   Tulos näkyy vasta, kun molemmat maalimäärät on kirjattu (kuten tulospalvelussa). Sijoitus näkyy, kun sarjan kaikki ottelut on pelattu.
   Maalit minuutteineen ottelun tietoihin; pelinumerot vain, jos tulospalvelussakin näytetään ne (nayta_pelinumerot = kyllä). */
export function omaTurnaus({ ottelut = [], maalit = [], korjaukset = [], asetukset = [] }, { joukkue = 'SJK', taso = '' } = {}) {
  const as = Object.fromEntries(asetukset.filter(r => r.avain).map(r => [r.avain.toLowerCase(), r.arvo]));
  const paiva = asetusPaiva(as.paiva), numerot = /^k/i.test(as.nayta_pelinumerot || '');
  const ms = ottelut.filter(r => r.id && r.koti && r.vieras).map(r => ({
    id: r.id, series: (r.sarja || 'Sarja').trim(), time: kello(r.alku), field: (r['kenttä'] || r.kentta || '').trim(),
    home: r.koti.trim(), away: r.vieras.trim(), hg: luku(r.koti_maalit), ag: luku(r.vieras_maalit), tila: (r.tila || '').toLowerCase()
  }));
  const adj = korjaukset.filter(r => r.joukkue).map(r => ({ series: (r.sarja || '').trim(), team: r.joukkue.trim(), pts: luku(r.pisteet) || 0, gf: luku(r.tehdyt) || 0, ga: luku(r['päästetyt'] ?? r.paastetyt) || 0, pos: luku(r.sija) || 0 }));
  const valmis = m => m.hg != null && m.ag != null && m.tila !== 'peruttu';
  const sarjat = [...new Set(ms.map(m => m.series))].filter(s => ms.some(m => m.series === s && (m.home === joukkue || m.away === joukkue)));
  return sarjat.map(s => {
    const sm = ms.filter(m => m.series === s), omat = sm.filter(m => m.home === joukkue || m.away === joukkue);
    const taulu = omaSarjataulukko(ms, s, adj), sija = taulu.findIndex(r => r.team === joukkue) + 1;
    const kaikki = sm.filter(m => m.tila !== 'peruttu').every(valmis);
    return {
      name: joukkue, label: s, level: [taso, s].filter(Boolean).join(' '),
      place: kaikki && sija ? { pos: sija, of: taulu.length } : undefined,
      matches: omat.filter(m => m.tila !== 'peruttu').sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(m => {
        const out = { date: paiva, time: m.time, series: s, home: m.home, away: m.away, score: valmis(m) ? [[m.hg, m.ag]] : null };
        const g = maalit.filter(x => x.ottelu === m.id && luku(x.minuutti) != null)
          .sort((a, b) => luku(a.minuutti) - luku(b.minuutti) || String(a.kirjattu).localeCompare(String(b.kirjattu)))
          .map(x => { const e = { min: luku(x.minuutti), side: x.joukkue === m.home ? 'h' : 'a' }; if (numerot && luku(x.pelinumero) != null) e.no = luku(x.pelinumero); return e; });
        // Maalit näytetään vain, jos ne täsmäävät lopputulokseen
        const tasmaa = out.score && g.filter(x => x.side === 'h').length === m.hg && g.filter(x => x.side === 'a').length === m.ag;
        out.d = { venue: m.field || undefined };
        if (tasmaa && g.length) out.d.goals = g;
        return out;
      })
    };
  });
}

/* ---------- fudisturnaus.com (julkinen JSON: /api/v1/public/tournaments/<slug>) ---------- */
const hkiKello = iso => { if (!iso) return undefined; const p = new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)); return `${p.find(x => x.type === 'hour').value}.${p.find(x => x.type === 'minute').value}`; };

/* Seuran joukkueet (oletuksena SJK-j / SJK) sivuston muotoon. Sarjataso = ikäryhmän nimi (esim. Kilpa, Haaste).
   Sijoitus otetaan lohkotaulukosta, kun lohkon kaikki ottelut on pelattu ja jatkopelejä ei ole, tai jatkopelien jälkeen
   ei arvata: silloin sija jätetään tyhjäksi ja sen voi lisätä käsin. */
export function fudisTurnaus(t, { seura = /^SJK/ } = {}) {
  const omaSeura = new Set((t.clubs || []).filter(c => seura.test(c.name)).map(c => c.id));
  const oma = team => team && omaSeura.has(team.clubId);
  const kaikki = [...(t.groupStageMatches || []), ...(t.playoffMatches || [])];
  const joukkueet = new Map();
  for (const m of kaikki) for (const team of [m.homeTeam, m.awayTeam]) if (oma(team)) {
    const key = team.id;
    if (!joukkueet.has(key)) joukkueet.set(key, { id: team.id, name: team.name, ag: m.ageGroup?.name || '', matches: [] });
    joukkueet.get(key).matches.push(m);
  }
  const jatko = (t.playoffMatches || []).length > 0;
  return [...joukkueet.values()].map(j => {
    const g = (t.groups || []).find(x => (x.results || []).some(r => r.teamId === j.id));
    const lohkoValmis = g && kaikki.filter(m => m.groupId === g.id && m.type !== 'PlayoffMatch').every(m => m.homeGoals != null && m.awayGoals != null);
    const rivi = g && g.results.find(r => r.teamId === j.id);
    const place = !jatko && lohkoValmis && rivi && rivi.ranking ? { pos: rivi.ranking, of: g.results.length } : undefined;
    return {
      name: j.name, label: j.ag || j.name, level: j.ag || j.name, place,
      matches: j.matches.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))).map(m => ({
        date: m.date, time: hkiKello(m.startTime), series: m.group?.name || m.ageGroup?.name || '',
        home: m.homeTeam?.name || m.homeTeamOriginDescription || '?', away: m.awayTeam?.name || m.awayTeamOriginDescription || '?',
        score: m.homeGoals != null && m.awayGoals != null ? [[m.homeGoals, m.awayGoals]] : null,
        d: m.field?.name ? { venue: m.field.name } : undefined
      }))
    };
  });
}

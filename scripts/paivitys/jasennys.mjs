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

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

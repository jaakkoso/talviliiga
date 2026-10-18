/* Jäsennyksen testit: ajetaan ennen jokaista hakua (npm test). */
import assert from 'node:assert/strict';
import { pvm, tulos, palloliittoOttelut, taulukko, torneopalNimike, torneopalOttelu, turvallinen } from './jasennys.mjs';

assert.equal(pvm('MA 28.9.', 2026), '2026-09-28');
assert.equal(pvm('20.12.2025', 2026), '2025-12-20');
assert.deepEqual(tulos('1 - 2'), { score: [[1, 2]] });
assert.deepEqual(tulos('rp 1–3 (2–2)'), { score: [[2, 2]], note: 'rp 1–3' });
assert.equal(tulos('klo 10.00'), null);

const sivu = ['SJK-j/kulta', 'P11 TASO 1', 'SU 20.9.', 'MATCH DETAILS', 'P11 TASO 1', 'SJK-j/kulta', '1–2', 'KPV/Vihreä',
  'PE 10.4.', 'MATCH DETAILS', 'P11 HUUHKAJALIIGA', 'SJK-j/musta -15', '0–0', '0–2', 'GrIFK',
  'SU 1.11.', 'MATCH DETAILS', 'P11 HUUHKAJALIIGA', 'P-Iirot', '15:30', 'SJK-j/musta -15'];
const o = palloliittoOttelut(sivu, 2026);
assert.equal(o.length, 3);
assert.deepEqual(o[0], { date: '2026-09-20', series: 'P11 TASO 1', home: 'SJK-j/kulta', away: 'KPV/Vihreä', score: [[1, 2]] });
assert.deepEqual(o[1].score, [[0, 0], [0, 2]]); assert.equal(o[1].away, 'GrIFK');
assert.equal(o[2].score, null); assert.equal(o[2].time, '15.30'); assert.equal(o[2].away, 'SJK-j/musta -15');

const t = taulukko(['', '#', 'Joukkue', 'O', 'V', 'T', 'H', 'M', 'P', '5 viim', 'Seuraava'], [['', '8', 'SJK-j/musta -15', '11', '6', '0', '5', '62–50', '18', 'V', '']]);
assert.deepEqual(t[0], { pos: 8, team: 'SJK-j/musta -15', o: 11, v: 6, t: 0, h: 5, gf: 62, ga: 50, p: 18 });
assert.equal(taulukko(['', 'Joukkue', 'Seuraava'], []), null);

assert.deepEqual(torneopalNimike('P11 /Kulta emoji_events'), { label: 'Kulta', level: 'P11', trophy: true });
assert.deepEqual(torneopalNimike('Pojat E11 Haaste 8v8 (2015) SJK-j'), { label: 'SJK-j', level: 'Pojat E11 Haaste 8v8 (2015)', trophy: false });
assert.deepEqual(torneopalOttelu(['24.5.', 'P11K', 'TuNL/yj', 'rp 1–3 (2–2)', 'SJK-j/ Musta'], 2026),
  { date: '2026-05-24', series: 'P11K', home: 'TuNL/yj', away: 'SJK-j/ Musta', score: [[2, 2]], note: 'rp 1–3' });

assert.equal(turvallinen([{ score: [[1, 0]] }], []), false);
assert.equal(turvallinen([{ score: [[1, 0]] }], [{ score: [[1, 0]] }, { score: null }]), true);
console.log('Kaikki jäsennystestit OK');

import { ottelusivu } from './jasennys.mjs';
const os = ottelusivu(['SJK-j/musta -15', '11 – 1', 'APV', '18:30 | ma 28.9.', 'Kyrkösjärvi TN A, Seinäjoki', 'P12 KOLMONEN', 'PÄÄTTYNYT', 'SJK-j/musta -15',
  'Sorvisto   2\'', 'Hattula   7\' 9\'', 'Mäki   59\'', '11 – 1', '(4–1)', 'APV', 'Onnela E   1\'', 'KOKOONPANOTTILASTOT',
  '#11 Hattula Aatos', '#16 Sorvisto Pekka', '#32 Mäki Nuutti', '#36 Mäkinen Jaakko', '1 PUOLIAIKA', 'SHOTOFFTARGET', '#14 Onnela Eetu', '#15 Onnela Aaro'].join('\n'));
assert.equal(os.time, '18.30'); assert.equal(os.venue, 'Kyrkösjärvi TN A'); assert.equal(os.ht, '4–1');
assert.deepEqual(os.goals.map(g => `${g.min}${g.side}${g.no ?? ''}`), ['1a14', '2h16', '7h11', '9h11', '59h32']);
assert.ok(!JSON.stringify(os).includes('Hattula'), 'nimiä ei saa palauttaa');
console.log('Ottelusivutesti OK');

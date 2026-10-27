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

import { csv, omaTurnaus, asetusPaiva } from './jasennys.mjs';
assert.deepEqual(csv('"a","b"\n"1","x, ""y"""\n'), [{ a: '1', b: 'x, "y"' }]);
assert.equal(asetusPaiva('24.10.2026'), '2026-10-24');
const O = csv(`"id","sarja","alku","kenttä","koti","vieras","koti_maalit","vieras_maalit","tila"
"K1","Kilpa","10.00","Takakenttä","SJK","VPS","2","0","hyväksytty"
"K2","Kilpa","10:35","Takakenttä","WFA","VPS","1","1",""
"K3","Kilpa","11.10","Takakenttä","WFA","SJK","",""," "
"H1","Haaste","10.00","Etukenttä","SJK","VPS","1","1","hyväksytty"`);
const M = csv(`"id","ottelu","joukkue","pelinumero","minuutti","kirjattu"
"a","K1","SJK","7","23","2"
"b","K1","SJK","","15","1"
"c","H1","VPS","","5","1"`);
const ot = omaTurnaus({ ottelut: O, maalit: M, asetukset: [{ avain: 'paiva', arvo: '2026-10-24' }] }, { joukkue: 'SJK', taso: 'P12' });
assert.equal(ot.length, 2); assert.equal(ot[0].level, 'P12 Kilpa');
assert.equal(ot[0].place, undefined, 'sijaa ei ennen kuin kaikki pelattu');
assert.deepEqual(ot[0].matches[0].score, [[2, 0]]); assert.equal(ot[0].matches[1].score, null);
assert.deepEqual(ot[0].matches[0].d.goals, [{ min: 15, side: 'h' }, { min: 23, side: 'h' }], 'numerot piiloon oletuksena');
assert.equal(ot[1].matches[0].d.goals, undefined, 'maalit eivät täsmää tulokseen');
assert.deepEqual(ot[1].place, { pos: 1, of: 2 });
console.log('Oma turnaus -testi OK');

import { fudisTurnaus } from './jasennys.mjs';
const FT = { clubs: [{ id: 192, name: 'SJK-j' }, { id: 447, name: 'FC Lahti' }], playoffMatches: [],
  groupStageMatches: [
    { id: 1, groupId: 9, type: 'GroupStageMatch', startTime: '2026-11-07T08:35:00.000Z', date: '2026-11-07', homeGoals: 1, awayGoals: 3, ageGroup: { name: 'Haaste' }, group: { name: 'Haaste' }, field: { name: 'Kenttä B' }, homeTeam: { id: 5, name: 'FC Lahti', clubId: 447 }, awayTeam: { id: 6, name: 'SJK', clubId: 192 } },
    { id: 2, groupId: 9, type: 'GroupStageMatch', startTime: '2026-11-07T10:20:00.000Z', date: '2026-11-07', homeGoals: null, awayGoals: null, ageGroup: { name: 'Haaste' }, group: { name: 'Haaste' }, field: { name: 'Kenttä B' }, homeTeam: { id: 6, name: 'SJK', clubId: 192 }, awayTeam: { id: 5, name: 'FC Lahti', clubId: 447 } }],
  groups: [{ id: 9, name: 'Haaste', results: [{ teamId: 6, ranking: 1 }, { teamId: 5, ranking: 2 }] }] };
const ft = fudisTurnaus(FT);
assert.equal(ft.length, 1); assert.equal(ft[0].level, 'Haaste'); assert.equal(ft[0].matches[0].time, '10.35');
assert.deepEqual(ft[0].matches[0].score, [[1, 3]]); assert.equal(ft[0].matches[1].score, null); assert.equal(ft[0].place, undefined);
FT.groupStageMatches[1].homeGoals = 2; FT.groupStageMatches[1].awayGoals = 0;
assert.deepEqual(fudisTurnaus(FT)[0].place, { pos: 1, of: 2 });
console.log('Fudisturnaus-testi OK');

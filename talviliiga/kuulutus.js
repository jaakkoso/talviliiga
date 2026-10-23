/* Kuulutukset ylläpitonäkymässä (yllapito.html).
   Kuulutusten ajat lasketaan tulospalvelun otteluaikataulusta: kun ylläpito siirtää aikataulua, kuulutukset siirtyvät mukana.
   Tulokset luetaan tulospalvelusta, joten niitä ei kirjata kahteen kertaan.
   Äänitiedostot ovat kansiossa aanet/. Omat kuulutukset tallentuvat tämän selaimen muistiin. */
(() => {
  const AUDIO_DIR = 'aanet/';
  const SPOKEN = { SJK: 'äs jii koo', VPS: 'vee pee äs', WFA: 'vee äf aa', Jaro: 'Jaro', JJK: 'jii jii koo' };
  const BASE = [['10.00', 'SJK', 'VPS'], ['10.35', 'WFA', 'Jaro'], ['11.10', 'JJK', 'SJK'], ['11.45', 'VPS', 'WFA'], ['12.20', 'Jaro', 'JJK'],
    ['14.00', 'SJK', 'WFA'], ['14.35', 'VPS', 'Jaro'], ['15.10', 'JJK', 'WFA'], ['15.45', 'SJK', 'Jaro'], ['16.20', 'VPS', 'JJK']];
  const MAXN = 15;
  /* Kuulutusten tekstit sellaisina kuin ne on äänitetty */
  const TEXTS = {"tervetuloa": "Hyvää huomenta, Wallsport – ja tervetuloa Talviliigaan! Tänään kentillä nähdään viisi kovaa joukkuetta: VPS, WFA, Jaro, JJK… ja tietysti kotijoukkue, SJK! Kilpasarja pelaa takakentällä, haastesarja etukentällä. Ohjelman ja tulokset löydät puhelimeesi otteluohjelmajulisteen QR-koodista. Hyvää pelipäivää kaikille!", "ottelu1": "Hyvät pelaajat ja yleisö, päivän ensimmäiset ottelut alkavat viiden minuutin kuluttua! Kello kymmenen vastakkain ovat SJK ja VPS. Kilpasarja pelaa takakentällä ja haastesarja etukentällä. Joukkueet, valmiiksi kentän laidalle!", "ottelu2": "Seuraavaksi kello kymmenen kolmekymmentäviisi: WFA vastaan Jaro! Ottelut alkavat hetken kuluttua.", "ottelu3": "Kohta kentälle astuu kotijoukkue! Kello yksitoista kymmenen vastakkain JJK ja SJK. Kova kannustus molemmille!", "ottelu4": "Seuraavat ottelut kello yksitoista neljäkymmentäviisi: VPS vastaan WFA. Joukkueet, valmistautukaa!", "ottelu5": "Aamupäivän viimeiset ottelut! Kello kaksitoista kaksikymmentä vastakkain Jaro ja JJK. Antakaa kaikkenne ennen taukoa!", "tauko": "Aamupäivän ottelut on pelattu – hienoa työtä, kaikki joukkueet! Pidämme nyt tauon, ja iltapäivän ottelut alkavat kello neljätoista. Lounaan ennakkoon tilanneet joukkueet ruokailevat OmaSP-stadionilla, Carlsberg-tilassa toisessa kerroksessa. Kahvio palvelee – tervetuloa!", "tauko-loppuu": "Tauko alkaa olla ohi! Iltapäivän ensimmäiset ottelut alkavat viidentoista minuutin kuluttua, kello neljätoista. Joukkueet, aloitetaan lämmittely.", "ottelu6": "Iltapäivän ottelut alkavat viiden minuutin kuluttua! Kello neljätoista kentälle astuvat SJK ja WFA. Kilpasarja takakentällä, haastesarja etukentällä. Kova kannustus molemmille joukkueille!", "ottelu7": "Seuraavaksi kello neljätoista kolmekymmentäviisi: VPS vastaan Jaro. Joukkueet, kentän laidalle!", "ottelu8": "Kello viisitoista kymmenen vastakkain JJK ja WFA! Joukkueet, valmiiksi kentän laidalle.", "ottelu9": "Kotijoukkue kentälle vielä kerran! Kello viisitoista neljäkymmentäviisi vastakkain SJK ja Jaro. Ottelut alkavat hetken kuluttua.", "ottelu10": "Päivän viimeiset ottelut! Kello kuusitoista kaksikymmentä vastakkain VPS ja JJK. Annetaan kunnon kannustus loppuun asti!", "lopetus": "Talviliigan pelipäivä Seinäjoella on pelattu! Iso kiitos kaikille joukkueille, valmentajille, tuomareille ja vanhemmille – ja kiitos myös kaikille talkoolaisille. Tulokset löytyvät tulospalvelusta. Turvallista kotimatkaa, ja nähdään taas!", "kahvio": "Muistathan kahvion! Sieltä saat kahvia, mehua, mokkapaloja, sämpylöitä ja herkkuja. Maksaa voi käteisellä tai MobilePaylla, ja kaikki tuotto menee junioreiden hyväksi. Kiitos, että tuet!", "qr": "Otteluohjelma ja tulokset kulkevat mukanasi! Skannaa QR-koodi otteluohjelmajulisteesta, niin näet puhelimestasi, missä ja milloin oma joukkue pelaa.", "kannustus": "Muistetaan kannustaa kaikkia pelaajia – ja annetaan tuomareille työrauha. Hyvä fiilis kentän laidalla tekee pelistä paremman kaikille!", "pukukopit": "Muistutus joukkueille: älkää jättäkö arvotavaroita pukukoppeihin. Halli ei vastaa koppeihin jätetyistä tavaroista. Kiitos!", "lounas": "Tiedoksi lounaan ennakkoon tilanneille joukkueille: lounas on tarjolla OmaSP-stadionilla, Carlsberg-tilassa toisessa kerroksessa, kello kymmenen kolmekymmentä ja kello neljätoista välillä. Sinne kuljetaan pääsisäänkäynnin vierestä vasemmalta. Hyvää ruokahalua!", "saannot": "Muistutus säännöistä: peliaika on kolmekymmentä minuuttia, ja pelataan seitsemän vastaan seitsemän. Käytössä on boksipaitsio. Sivurajalta pallon saa syöttää, heittää tai kuljettaa, ja myös kulma- ja vapaapotkut saa kuljettaa. Maalipotkut otetaan normaalisti. Reilua peliä kaikille!", "kentat": "Muistattehan: kilpasarja pelaa takakentällä ja haastesarja etukentällä. Kiitos!"};

  /* ---- kuulutukset: aika = ottelupaikan (slot) alkamisaika + siirto minuutteina ---- */
  const P = [
    { id: 'tervetuloa', file: '01-tervetuloa', label: 'Tervetuloa', sub: 'Avauskuulutus', rel: [0, -15] },
    { id: 'saannot-aamu', audio: 'saannot', label: 'Säännöt', sub: 'Sääntömuistutus', rel: [0, -10] },
    { id: 'tauko', file: '07-tauko', label: 'Tauko alkaa', sub: 'Aamupäivä pelattu', rel: [4, 32] },
    { id: 'tauko-loppuu', file: '08-tauko-loppuu', label: 'Tauko loppuu', sub: '15 min iltapäivään', rel: [5, -15] },
    { id: 'saannot-ip', audio: 'saannot', label: 'Säännöt', sub: 'Sääntömuistutus', rel: [5, -10] },
    { id: 'lopetus', file: '14-lopetus', label: 'Kiitos ja näkemiin', sub: 'Päivän päätös · käsin loppusijoitusten jälkeen', rel: [9, 32], manual: true },
  ];
  /* Lisäkuulutukset otteluiden väliin: minuutti ottelun päättymisen jälkeen (ottelu 30 min, kutsu seuraavaan 2 min ennen alkua). */
  [['lounas', 'Lounas', 0, 31], ['kahvio', 'Kahvio', 1, 31], ['pukukopit', 'Pukukopit', 2, 31], ['qr', 'Tulokset puhelimeen', 3, 31],
   ['kahvio', 'Kahvio', 4, 55], ['kannustus', 'Reilu kannustus', 5, 31], ['kahvio', 'Kahvio', 6, 31], ['qr', 'Tulokset puhelimeen', 7, 31], ['pukukopit', 'Pukukopit', 8, 31]]
    .forEach(([audio, label, slot, off], n) => P.push({ id: 'lisa' + (n + 1), audio, label, sub: 'Lisäkuulutus otteluiden välissä', rel: [slot, off], extra: true }));
  const callFiles = ['02-ottelu1', '03-ottelu2', '04-ottelu3', '05-ottelu4', '06-ottelu5', '09-ottelu6', '10-ottelu7', '11-ottelu8', '12-ottelu9', '13-ottelu10'];
  BASE.forEach(([, a, b], i) => P.push({ id: 'ottelu' + (i + 1), file: callFiles[i], slot: i, a, b, label: `${a} – ${b}`, sub: 'Ottelukutsu', rel: [i, (i === 0 || i === 5) ? -5 : -2] }));
  const EXTRAS = [
    { id: 'kahvio', file: '15-kahvio', label: 'Kahvio' }, { id: 'qr', file: '16-qr', label: 'Tulokset puhelimeen (QR)' },
    { id: 'kannustus', file: '17-kannustus', label: 'Reilu kannustus' }, { id: 'pukukopit', file: '18-pukukopit', label: 'Pukukopit' },
    { id: 'lounas', file: '19-lounas', label: 'Lounas' }, { id: 'saannot', file: '20-saannot', label: 'Säännöt' },
    { id: 'kentat', file: '21-kentat', label: 'Kentät: kilpa taka, haaste etu' },
  ];
  const NUMS = ['nolla', 'yksi', 'kaksi', 'kolme', 'neljä', 'viisi', 'kuusi', 'seitsemän', 'kahdeksan', 'yhdeksän', 'kymmenen', 'yksitoista', 'kaksitoista', 'kolmetoista', 'neljätoista', 'viisitoista'];
  const PIECES = [{ id: 'p-tuloksia' }, { id: 'p-kilpa' }, { id: 'p-haaste' }, { id: 'p-kiitos' }, ...Object.keys(SPOKEN).map(k => ({ id: 'p-' + k.toLowerCase() })),
    ...Array.from({ length: 13 }, (_, n) => ({ id: `p-${n}-kesken` })), ...Array.from({ length: 13 }, (_, n) => ({ id: `p-${n}-loppu` })),
    ...[13, 14, 15].map(n => ({ id: `p-${n}-kesken` })), ...[13, 14, 15].map(n => ({ id: `p-${n}-loppu` }))];
  PIECES.forEach((p, i) => { p.file = 'T' + String(i + 1).padStart(2, '0') + '-' + p.id.slice(2); p.label = p.id; });
  const STAND = [['p-loppusij', 'S01-loppusijoitukset'], ['p-sija1', 'S02-sija1'], ['p-sija2', 'S03-sija2'], ['p-sija3', 'S04-sija3'], ['p-onnittelut', 'S05-onnittelut']].map(([id, file]) => ({ id, file, label: id }));
  PIECES.push(...STAND);
  const OMAT_N = 6;
  const FILES = {}, LABEL = {};
  [...P, ...EXTRAS, ...PIECES].forEach(c => { if (c.file) FILES[c.id] = c.file; LABEL[c.id] = c.label; });
  const audioOf = c => c.audio || c.id;

  /* ---- tila ---- */
  const S = {
    auto: ls.get('k-auto', true), fired: ls.get('k-fired', {}), skip: ls.get('k-skip2', {}), ann: ls.get('k-ann2', {}),
    gong: ls.get('k-gong', true), standHaaste: ls.get('k-standh', true), vt: null, autoRes: true, over: ls.get('k-over', {}), editing: null, open: false, role: ls.get('k-role', (window.matchMedia && matchMedia('(pointer:fine)').matches) ? 'soitin' : 'kauko'), txt: {},
    omat: (() => { const s = ls.get('k-omat', []); return Array.from({ length: OMAT_N }, (_, i) => Object.assign({ label: 'Oma kuulutus ' + (i + 1), text: '', tone: 'warm' }, s[i] || {})); })(),
    ownAudio: {},
  };
  const p2 = n => String(n).padStart(2, '0');
  /* Testikello: virtuaaliaika, joka voi kulkea nopeutettuna (pikakelaus) */
  const now = () => S.vt ? new Date(S.vt.base + (Date.now() - S.vt.anchor) * S.vt.speed) : new Date();
  const setVirtual = ms => { S.vt = { base: ms, anchor: Date.now(), speed: S.vt ? S.vt.speed : 1 }; };
  const setSpeed = x => { if (!S.vt) return; S.vt = { base: now().getTime(), anchor: Date.now(), speed: x }; };
  const dayKey = () => { const d = now(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}${S.vt ? '-testi' : ''}${Store.demo ? '-harjoitus' : ''}`; };
  const ak = i => dayKey() + ':' + i;
  const isEventDay = () => { const d = now(), e = EVENT.date; return !!e && d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth() && d.getDate() === e.getDate(); };
  const live = () => isEventDay();
  const nowSec = () => { const d = now(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
  const isFired = c => live() && !!S.fired[dayKey() + ':' + c.id];
  const isSkip = c => !!S.skip[ak(c.id)];
  const loggedIn = () => typeof R !== 'undefined' && !!R.pin;

  /* ---- aikataulu tulospalvelusta ---- */
  const pairOf = i => { const [, a, b] = BASE[i]; return m => (m.home === a && m.away === b) || (m.home === b && m.away === a); };
  const matchesOf = i => ((typeof R !== 'undefined' && R.data && R.data.matches) || []).filter(pairOf(i));
  function kick(i) { const ms = matchesOf(i).filter(m => m.start != null); return ms.length ? Math.min(...ms.map(m => m.start)) : parseTime(BASE[i][0]); }
  const timeOf = c => { const o = S.over[ak(c.id)]; return o != null ? o : kick(c.rel[0]) + c.rel[1]; };
  const autoTimeOf = c => kick(c.rel[0]) + c.rel[1];
  const origOf = c => parseTime(BASE[c.rel[0]][0]) + c.rel[1];
  const program = () => P.slice().sort((x, y) => timeOf(x) - timeOf(y));

  /* ---- tulokset tulospalvelusta ---- */
  const cancelled = m => /peru/.test(m.tila || '');
  function slotResult(i) {
    const [, a] = BASE[i], r = {}; let total = 0, done = 0;
    for (const m of matchesOf(i)) {
      if (cancelled(m)) continue; total++;
      if (!isFinal(m)) continue; done++;
      const s = /haaste/i.test(m.series) ? 'h' : 'k';
      r[s + 'a'] = m.home === a ? m.hg : m.ag; r[s + 'b'] = m.home === a ? m.ag : m.hg;
    }
    return { r, complete: total > 0 && done === total, any: done > 0, sig: JSON.stringify(r) };
  }
  function resultSeq(i) {
    const { r } = slotResult(i), [, a, b] = BASE[i], seq = [];
    [['k', 'p-kilpa'], ['h', 'p-haaste']].forEach(([s, pid]) => { if (r[s + 'a'] != null && r[s + 'b'] != null) seq.push(pid, 'p-' + a.toLowerCase(), `p-${r[s + 'a']}-kesken`, 'p-' + b.toLowerCase(), `p-${r[s + 'b']}-loppu`); });
    return seq.length ? ['p-tuloksia', ...seq, 'p-kiitos'] : null;
  }
  function resultText(i) {
    const { r } = slotResult(i), [, a, b] = BASE[i], parts = [];
    [['k', 'Kilpasarjassa'], ['h', 'Haastesarjassa']].forEach(([s, l]) => { if (r[s + 'a'] != null && r[s + 'b'] != null) parts.push(`${l} ${a} ${r[s + 'a']}, ${b} ${r[s + 'b']}.`); });
    return parts.length ? `Tuloksia! ${parts.join(' ')} Kiitos joukkueille hyvistä peleistä!` : '';
  }
  const tooBig = i => Object.values(slotResult(i).r).some(v => v > MAXN);
  const resultItem = i => { const seq = resultSeq(i); return seq && !tooBig(i) ? { key: 'r' + i, seq, label: 'Tulokset ' + BASE[i][1] + '–' + BASE[i][2] } : null; };
  function sayResult(i, manual) {
    if (!resultSeq(i)) { if (manual) toast('Tulosta ei ole vielä vahvistettu tulospalvelussa'); return; }
    if (!slotResult(i).complete && S.ann[ak(i)] == null) { if (manual) toast('Vahvista ensin kierroksen molempien otteluiden (kilpa ja haaste) tulokset.'); return; }
    if (tooBig(i)) { toast(`Yli ${MAXN} maalin lukemaa ei ole äänitiedostona. Kuuluta tämä tulos itse.`); return; }
    S.ann[ak(i)] = slotResult(i).sig; ls.set('k-ann2', S.ann); enqueue(resultItem(i));
    try { if (typeof R !== 'undefined' && R.view === 'list' && typeof render === 'function') render(); } catch (e) { }
  }

  /* ---- äänet ---- */
  let actx = null, stopFlag = 0, queue = [], running = false, playingKey = null, nodes = [];
  const raw = {}, buf = {}, trimC = {};
  /* Safari ja iPad: äänen saa käyttöön vain käyttäjän napautuksen sisällä. Soitetaan samalla hiljainen näyte, joka avaa äänen varmasti. */
  function unlock() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== 'running') { const p = actx.resume(); if (p && p.catch) p.catch(() => { }); }
      const b = actx.createBuffer(1, 1, 22050), s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(0);
    } catch (e) { }
  }
  async function ensureRunning() {
    if (!actx) unlock(); if (!actx) return false;
    if (actx.state === 'running') return true;
    try { await Promise.race([actx.resume(), wait(1200)]); } catch (e) { }
    return actx.state === 'running';
  }
  const needUnlock = () => !actx || actx.state !== 'running';
  function preload() { Object.entries(FILES).forEach(([id, f]) => { if (!raw[id]) raw[id] = fetch(AUDIO_DIR + f + '.mp3').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null); }); }
  async function getBuffer(id) {
    if (buf[id]) return buf[id];
    let data = null;
    if (/^oma\d$/.test(id)) { const b = await idb('readonly', s => s.get(id)); if (b) data = await b.arrayBuffer(); }
    else { if (!raw[id] && FILES[id]) raw[id] = fetch(AUDIO_DIR + FILES[id] + '.mp3').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null); const d = await raw[id]; if (d) data = d.slice(0); }
    if (!data || !actx) return null;
    try { buf[id] = await new Promise((res, rej) => actx.decodeAudioData(data, res, rej)); } catch (e) { return null; }
    return buf[id];
  }
  function trimmed(id, b) {
    if (trimC[id]) return trimC[id];
    const d = b.getChannelData(0), th = .015; let s = 0, e = d.length - 1;
    while (s < e && Math.abs(d[s]) < th) s++; while (e > s && Math.abs(d[e]) < th) e--;
    const pad = Math.floor(b.sampleRate * .025); s = Math.max(0, s - pad); e = Math.min(d.length - 1, e + pad);
    const out = actx.createBuffer(b.numberOfChannels, e - s + 1, b.sampleRate);
    for (let ch = 0; ch < b.numberOfChannels; ch++) out.getChannelData(ch).set(b.getChannelData(ch).subarray(s, e + 1));
    let sum = 0, pk = 0; const c0 = out.getChannelData(0); for (let i = 0; i < c0.length; i++) { sum += c0[i] * c0[i]; pk = Math.max(pk, Math.abs(c0[i])); }
    const rms = Math.sqrt(sum / Math.max(1, c0.length)); let g = rms > 0 ? .125 / rms : 1; g = Math.max(.4, Math.min(g, 3, .95 / Math.max(pk, 1e-4)));
    for (let ch = 0; ch < out.numberOfChannels; ch++) { const x = out.getChannelData(ch); for (let i = 0; i < x.length; i++) x[i] *= g; }
    return trimC[id] = out;
  }
  const GAP = { 'p-tuloksia': .4, 'p-kilpa': .12, 'p-haaste': .12, 'p-kiitos': 0 };
  const gapOf = id => GAP[id] ?? (/-kesken$/.test(id) ? .28 : /-loppu$/.test(id) ? .6 : .07);
  function tone(f, t, len, vol) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + len); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + len + .05); nodes.push(o); }
  function gongAt(t) { if (!S.gong) return 0; tone(659.3, t, 1.2, .5); tone(523.3, t + .55, 1.2, .5); return 1.5; }
  function fanfareAt(t) { if (!S.gong) return 0; [[523.3, 0], [659.3, .16], [784, .32]].forEach(([f, d]) => tone(f, t + d, .5, .35)); [523.3, 659.3, 784, 1046.5].forEach(f => tone(f, t + .5, 1.3, .18)); return 1.7; }
  function attnAt(t) { [[392, 0], [523.3, .32], [659.3, .64], [784, .96]].forEach(([f, d]) => { tone(f, t + d, 1.4, .55); tone(f * 2, t + d, .6, .08); }); return 2.6; }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function playItem(it) {
    const my = stopFlag;
    if (!(await ensureRunning())) { toast('Selain esti äänen. Napauta sivua kerran ja paina nappia uudelleen.'); return; }
    if (it.chime) { playingKey = it.key; paint(); await wait(attnAt(actx.currentTime + .05) * 1000 + 300); if (my === stopFlag) { nodes = []; playingKey = null; } return; }
    const ids = it.seq || [it.id], bufs = [];
    for (const id of ids) { const b = await getBuffer(id); if (!b) { toast(`Ääntä "${LABEL[id] || id}" ei löytynyt. Tarkista nettiyhteys.`); return; } bufs.push(it.seq ? trimmed(id, b) : b); }
    if (my !== stopFlag) return;
    playingKey = it.key; paint();
    const t0 = actx.currentTime + .05; let t = t0 + (it.seq ? fanfareAt(t0) : gongAt(t0));
    bufs.forEach((b, i) => { const s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(t); nodes.push(s); t += b.duration + (it.seq ? gapOf(ids[i]) + (/^p-(sija[23]|haaste|onnittelut)$/.test(ids[i + 1] || '') ? .25 : 0) : 0); });
    await wait(Math.max(0, (t - actx.currentTime) * 1000) + 400);
    if (my === stopFlag) { nodes = []; playingKey = null; }
  }
  async function runQueue() { if (running) return; running = true; const my = stopFlag; while (queue.length && my === stopFlag) { const it = queue.shift(); paint(); await playItem(it); } if (my === stopFlag) { running = false; playingKey = null; paint(); } }
  function enqueue(it, front) { if (!it) return; unlock(); if (queue.some(q => q.key === it.key) || playingKey === it.key) return; front ? queue.unshift(it) : queue.push(it); paint(); runQueue(); }
  function stopAll() { stopFlag++; queue = []; nodes.forEach(n => { try { n.stop(); } catch (e) { } }); nodes = []; playingKey = null; running = false; paint(); }

  /* ---- omat kuulutukset: äänet IndexedDB:ssä ---- */
  let dbp = null;
  function db() { if (!dbp) dbp = new Promise((res, rej) => { try { const r = indexedDB.open('talviliiga-kuulutus', 1); r.onupgradeneeded = () => r.result.createObjectStore('omat'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); return dbp; }
  async function idb(mode, fn) { try { const d = await db(); return await new Promise((res, rej) => { const tx = d.transaction('omat', mode); const r = fn(tx.objectStore('omat')); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); } catch (e) { return null; } }
  const saveOmat = () => ls.set('k-omat', S.omat);
  const ONES = ['nolla', 'yksi', 'kaksi', 'kolme', 'neljä', 'viisi', 'kuusi', 'seitsemän', 'kahdeksan', 'yhdeksän'];
  function numFi(n) { n = +n; if (n < 10) return ONES[n]; if (n === 10) return 'kymmenen'; if (n < 20) return ONES[n - 10] + 'toista'; if (n < 100) { const t = Math.floor(n / 10), r = n % 10; return ONES[t] + 'kymmentä' + (r ? ONES[r] : ''); } if (n < 1000) { const h = Math.floor(n / 100), r = n % 100; return (h === 1 ? 'sata' : ONES[h] + 'sataa') + (r ? numFi(r) : ''); } return String(n); }
  const LETTER = { A: 'aa', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'äf', G: 'gee', H: 'hoo', I: 'ii', J: 'jii', K: 'koo', L: 'äl', M: 'äm', N: 'än', O: 'oo', P: 'pee', Q: 'kuu', R: 'är', S: 'äs', T: 'tee', U: 'uu', V: 'vee', W: 'vee', X: 'äks', Y: 'yy', Z: 'tset', 'Å': 'oo', 'Ä': 'ää', 'Ö': 'öö' };
  const TONES = { excited: { tag: '[excited] ', name: 'Innostunut' }, warm: { tag: '[warmly] ', name: 'Lämmin' }, calm: { tag: '', name: 'Asiallinen' } };
  function toEl(text, tone) {
    let t = ' ' + String(text || '').replace(/\s+/g, ' ').trim() + ' ';
    if (!t.trim()) return '';
    Object.keys(SPOKEN).forEach(k => { if (k !== 'Jaro') t = t.replace(new RegExp('(^|[^\\wåäöÅÄÖ])' + k + '(?![\\wåäöÅÄÖ])', 'gi'), '$1' + SPOKEN[k]); });
    t = t.replace(/\b(?:klo|kello)\s*(\d{1,2})[.:](\d{2})\b/gi, (_, h, m) => 'kello ' + numFi(h) + (+m ? ' ' + numFi(m) : ''));
    t = t.replace(/\b(?:klo|kello)\s*(\d{1,2})\b/gi, (_, h) => 'kello ' + numFi(h));
    t = t.replace(/\b(\d{1,2})[.:](\d{2})\b/g, (_, h, m) => numFi(h) + (+m ? ' ' + numFi(m) : ''));
    t = t.replace(/(\d+)\s*(?:€|e\b|eur\b)/gi, (_, n) => numFi(n) + ' euroa');
    t = t.replace(/\b\d{1,3}\b/g, n => numFi(n));
    t = t.replace(/(^|[^\wåäöÅÄÖ])([A-ZÅÄÖ]{2,5})(?![\wåäöÅÄÖ])/g, (_, p, w) => p + [...w].map(ch => LETTER[ch] || ch).join(' '));
    t = t.replace(/\s*€/g, ' euroa').trim();
    if (!/[.!?]$/.test(t)) t += '.';
    return (TONES[tone] || TONES.warm).tag + t.charAt(0).toUpperCase() + t.slice(1);
  }

  /* ---- automaatti ---- */
  let lock = null;
  function fire(c) {
    S.fired[dayKey() + ':' + c.id] = true; ls.set('k-fired', S.fired);
    enqueue({ key: c.id, id: audioOf(c), label: c.label });
  }
  function tickAuto() {
    if (S.role === 'kauko') return;
    if (!S.auto || !live() || !loggedIn()) return;
    const m = nowSec() / 60;
    program().forEach(c => { const at = timeOf(c); if (m >= at && m < at + 3 && !isFired(c) && !isSkip(c) && !c.manual) fire(c); });
  }
  async function setAuto(on) {
    S.auto = on; ls.set('k-auto', on);
    if (on) { unlock(); try { lock = await navigator.wakeLock.request('screen'); } catch (e) { }
      const m = nowSec() / 60; if (live()) program().forEach(c => { if (timeOf(c) + 3 <= m) S.fired[dayKey() + ':' + c.id] = true; }); ls.set('k-fired', S.fired); tickAuto(); }
    else { try { if (lock) { await lock.release(); lock = null; } } catch (e) { } }
    draw();
  }
  document.addEventListener('visibilitychange', async () => { if (S.auto && document.visibilityState === 'visible') { try { lock = await navigator.wakeLock.request('screen'); } catch (e) { } } });
  function nextItem() { const m = nowSec() / 60, pr = program(); if (!live()) return pr.find(c => !isSkip(c)) || pr[0]; return pr.find(c => timeOf(c) + 3 > m && !isFired(c) && !isSkip(c)) || pr[pr.length - 1]; }

  /* ---- piirto ---- */
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  let panel, toastT;
  function toast(msg) { const t = document.querySelector('.kp-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 7000); }
  function cdText(sec) { if (sec <= 0) return 'nyt'; const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60); return h ? `${h} h ${p2(m)} min` : m >= 10 ? `${m} min` : `${m}.${p2(s)}`; }
  function resLine(i) {
    const sr = slotResult(i); if (!sr.any) return '';
    const { r } = sr, [, a, b] = BASE[i];
    const txt = [['k', 'Kilpa'], ['h', 'Haaste']].filter(([s]) => r[s + 'a'] != null).map(([s, l]) => `${l} ${a} ${r[s + 'a']}–${r[s + 'b']} ${b}`).join(' · ');
    const st = S.ann[ak(i)] != null ? (S.ann[ak(i)] === sr.sig ? 'kuulutettu' : 'tulos muuttunut') : sr.complete ? 'valmis kuulutettavaksi' : 'odottaa toista ottelua';
    return `<div class="kp-res"><span>${esc(txt)} <em>· ${st}</em></span><button class="kp-mini" data-kres="${i}" ${sr.complete || S.ann[ak(i)] != null ? '' : 'disabled title="Vahvista ensin molemmat ottelut"'}>${S.ann[ak(i)] != null ? 'Uudelleen' : 'Kuuluta'}</button></div>`;
  }
  /* ---- loppusijoitukset sarjataulukosta ---- */
  const allMatches = () => ((typeof R !== 'undefined' && R.data && R.data.matches) || []);
  const allDone = () => { const ms = allMatches().filter(m => !cancelled(m)); return ms.length > 0 && ms.every(isFinal); };
  const seriesOf = re => seriesList(allMatches()).find(x => re.test(x));
  function standTop(series) { if (!series) return []; return standings(allMatches(), series, (R.data && R.data.adjust) || []).slice(0, 3); }
  function standParts() {
    const parts = [['k', 'Kilpasarjassa', seriesOf(/kilpa/i)]]; if (S.standHaaste) parts.push(['h', 'Haastesarjassa', seriesOf(/haaste/i)]);
    return parts.map(([k, l, ser]) => ({ k, l, top: standTop(ser) })).filter(x => x.top.length);
  }
  const standLot = () => standParts().some(x => x.top.some(r => r.lot));
  function standText() { const ps = standParts(); if (!ps.length) return ''; return 'Päivän loppusijoitukset! ' + ps.map(x => x.l + ' ' + x.top.map((r, n) => ['ensimmäisenä', 'toisena', 'kolmantena'][n] + ' ' + r.team).join(', ') + '.').join(' ') + ' Onnittelut menestyneille – ja kiitos kaikille joukkueille upeista peleistä!'; }
  function standSeq() { const seq = ['p-loppusij']; standParts().forEach(x => { seq.push(x.k === 'k' ? 'p-kilpa' : 'p-haaste'); x.top.forEach((r, n) => seq.push('p-sija' + (n + 1), 'p-' + r.team.toLowerCase())); }); seq.push('p-onnittelut'); return seq; }
  const standAnn = () => S.ann[ak('stand')] != null;
  function sayStand(withEnd) {
    if (!allDone()) { toast('Kaikkien otteluiden tulokset pitää ensin vahvistaa.'); return; }
    if (standLot()) { toast('Kärkikolmikossa on tasapisteitä, jotka pitää ratkaista. Aseta sija ylläpidon Taulukko-välilehdellä.'); return; }
    const bad = standSeq().filter(id => !FILES[id]); if (bad.length) { toast('Joukkueen nimeä ei löydy äänitiedostoista: ' + bad.join(', ')); return; }
    S.ann[ak('stand')] = 1; ls.set('k-ann2', S.ann);
    enqueue({ key: 'stand', seq: standSeq(), label: 'Loppusijoitukset' });
    if (withEnd) { const c = P.find(x => x.id === 'lopetus'); S.fired[dayKey() + ':lopetus'] = true; ls.set('k-fired', S.fired); enqueue({ key: 'lopetus', id: 'lopetus', label: c.label }); }
    draw();
  }
  function standBox(inNext) {
    const done = allDone(), lot = done && standLot(), ann = standAnn(), txt = standText();
    if (inNext && (!done || ann)) return '';
    const missing = allMatches().filter(m => !cancelled(m) && !isFinal(m)).length;
    return `<div class="${inNext ? 'kp-ready' : ''}">${inNext ? '<div class="kp-eyebrow">Loppusijoitukset valmiina</div>' : ''}<div class="kp-rcard">
      ${txt ? `<p>”${esc(txt)}”</p>` : ''}
      <label class="kp-chk" style="margin:0"><input type="checkbox" data-kstandh ${S.standHaaste ? 'checked' : ''}> Kuulutetaan myös haastesarjan kärki</label>
      <p class="kp-help" style="margin:0">${!done ? `Odottaa vielä ${missing} ottelun tulosta. Sijoitukset voivat muuttua.` : lot ? 'Kärkikolmikossa on ratkaisemattomia tasapisteitä. Aseta sija Taulukko-välilehdellä.' : ann ? 'Kuulutettu.' : 'Kaikki tulokset vahvistettu.'}</p>
      <button class="kp-rbtn" data-kstand="1" ${done && !lot ? '' : 'disabled'}>📣 ${ann ? 'Kuuluta uudelleen' : 'Kuuluta loppusijoitukset'} + lopetus</button>
      <button class="kp-mini" data-kstand="0" ${done && !lot ? '' : 'disabled'}>Vain loppusijoitukset</button></div></div>`;
  }
  function readyBox() {
    const ready = BASE.map((_, i) => i).filter(i => slotResult(i).complete && S.ann[ak(i)] == null);
    if (!ready.length) return '';
    if (!ready.length) return standBox(true);
    return `<div class="kp-ready"><div class="kp-eyebrow">Tulokset valmiina kuulutettavaksi</div>${ready.map(i => `<div class="kp-rcard"><p>”${esc(resultText(i))}”</p><button class="kp-rbtn" data-kres="${i}">📣 Kuuluta tulokset ${BASE[i][1]}–${BASE[i][2]}</button></div>`).join('')}<div class="kp-note">Hyvä hetki on otteluiden välissä, ennen seuraavaa ottelukutsua.</div></div>`;
  }
  function row(c, nx) {
    const t = timeOf(c), moved = t !== origOf(c) || S.over[ak(c.id)] != null, f = isFired(c), sk = isSkip(c);
    return `<div class="kp-row ${c === nx ? 'next' : ''} ${f ? 'done' : ''} ${sk ? 'skip' : ''}">
      ${S.editing === c.id ? `<div class="kp-tedit"><input type="time" step="60" data-kover="${c.id}" value="${fmtTime(t).replace('.', ':')}" aria-label="Uusi aika"><div class="kp-btns" style="gap:4px"><button class="kp-mini kp-save" data-kovsave="${c.id}">✓ Tallenna</button><button class="kp-mini" data-kovreset="${c.id}" title="Palauta aikataulun mukainen aika">Autom.</button><button class="kp-mini" data-kovcancel>✕</button></div></div>` : `<button class="kp-t kp-tbtn" data-kedit="${c.id}" title="Muuta aikaa">${fmtTime(t)}${moved ? `<s>${fmtTime(S.over[ak(c.id)] != null ? autoTimeOf(c) : origOf(c))}</s>` : ''}${S.over[ak(c.id)] != null ? '<em>käsin</em>' : ''}</button>`}
      <div class="kp-l" data-ktxt="${c.id}" title="Näytä kuulutuksen teksti"><b>${esc(c.label)}</b><small>${esc(c.sub)}${f ? ' · kuulutettu' : ''}${sk ? ' · ohitetaan' : ''}</small>${!f && !sk ? `<span class="kp-cd" data-kcd="${t}"></span>` : ''}</div>
      <button class="kp-skip ${sk ? 'on' : ''}" data-kskip="${c.id}">${sk ? 'Palauta' : 'Ohita'}</button>
      <button class="kp-play" data-kplay="${c.id}" aria-label="Soita ${esc(c.label)}">${PLAY}</button></div>${S.txt[c.id] ? `<div class="kp-txt"><p>”${esc(TEXTS[audioOf(c)] || '')}”</p>${c.slot != null ? `<p class="kp-txtres"><b>Tuloskuulutus ottelujen jälkeen:</b> ${resultText(c.slot) ? '”' + esc(resultText(c.slot)) + '”' : 'tulee, kun tulokset on vahvistettu. Muoto: ”Tuloksia! Kilpasarjassa ' + c.a + ' 3, ' + c.b + ' 1. Haastesarjassa … Kiitos joukkueille hyvistä peleistä!”'}</p>` : ''}</div>` : ''}${c.slot != null ? resLine(c.slot) : ''}`;
  }
  function draw() {
    if (!panel) return;
    document.body.classList.toggle('kp-on', loggedIn());
    if (!loggedIn()) return;
    const nx = nextItem(), lv = live();
    const autoTxt = S.auto ? (lv ? `Kuulutetaan automaattisesti klo ${fmtTime(timeOf(nx))}. Jos haluat sen jo aiemmin, paina ”Kuuluta nyt”: kuulutus tulee heti, eikä sitä toisteta enää klo ${fmtTime(timeOf(nx))}.` : `Tänään ei ole turnauspäivä. Automaatti alkaa kuuluttaa itse turnauspäivänä${EVENT.dateText ? ' (' + EVENT.dateText + ')' : ''}. Voit kuunnella kuulutuksia listan ▶-napeista, tai kokeilla koko päivää kohdassa Asetukset ja testaus → Testikello.`) : 'Automaatti pois. Kuulutukset tulevat vain, kun painat nappia.';
    panel.querySelector('.kp-next').innerHTML = `
      <div class="kp-unlock" data-kunlock hidden>🔈 Napauta tästä, jotta kuulutukset kuuluvat</div>
      <div class="kp-eyebrow">${lv ? 'Seuraavaksi' : 'Turnauspäivän ensimmäinen'} · klo ${fmtTime(timeOf(nx))}</div>
      <div class="kp-what">${esc(nx.label)}</div>
      <div class="kp-big" data-kbig="${timeOf(nx)}"></div>
      ${S.role === 'kauko' ? '<div class="kp-note"><b>📱 Kauko-ohjain.</b> Automaatti ja äänet toimivat kuulutuskoneella.</div>' : `<div class="kp-btns"><button class="kp-auto ${S.auto ? 'on' : ''}" data-kauto>${S.auto ? 'Automaatti päällä · pysäytä' : 'Käynnistä automaatti'}</button></div>`}
      <div class="kp-btns">${lv ? `<button class="kp-ghost" data-kfirenow="${nx.id}" title="Soittaa tämän kuulutuksen heti. Automaatti ei soita sitä enää uudelleen.">Kuuluta nyt</button>` : ''}<button class="kp-ghost" data-kattn>🔔 Huomioääni</button></div>
      <div class="kp-note">${autoTxt}</div><div class="kp-q" data-kq></div>${readyBox()}`;
    const ed = panel.querySelector('[data-kover]'), edVal = ed && ed.value, edFocus = ed && document.activeElement === ed;
    panel.querySelector('.kp-list').innerHTML = program().map(c => row(c, nx)).join('');
    if (ed) { const ne = panel.querySelector('[data-kover]'); if (ne) { ne.value = edVal; if (edFocus) ne.focus(); } }
    panel.querySelector('.kp-extras').innerHTML = EXTRAS.map(c => `<button class="kp-xbtn" data-kplay="${c.id}" title="${esc(TEXTS[c.id] || '')}">${PLAY}<span>${esc(c.label)}</span></button>`).join('');
    panel.querySelector('.kp-testwrap').innerHTML = roleBox() + testBar();
    panel.querySelector('.kp-stand').innerHTML = standBox(false);
    drawOmat(); paint(); tickCd();
  }
  function drawOmat(force) {
    const box = panel.querySelector('.kp-omat');
    if (!force && box.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')) return;
    box.innerHTML = S.omat.map((o, i) => { const id = 'oma' + (i + 1), ok = !!S.ownAudio[id], el = toEl(o.text, o.tone);
      return `<div class="kp-oma ${ok ? 'ok' : ''}">
        <div class="kp-oh"><input data-koml="${i}" value="${esc(o.label)}" maxlength="40" aria-label="Napin nimi"><button class="kp-play" data-kplay="${id}" aria-label="Soita">${PLAY}</button></div>
        <details ${ok ? '' : ''}><summary>${ok ? 'Ääni valmis · muokkaa' : 'Tee kuulutus'}</summary>
          <textarea data-komt="${i}" rows="2" placeholder="Kirjoita tavallisesti, esim. Grilli auki klo 12.30 asti!">${esc(o.text)}</textarea>
          <div class="kp-btns"><select data-komtone="${i}">${Object.entries(TONES).map(([k, v]) => `<option value="${k}" ${o.tone === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select>
            <button class="kp-mini" data-komcopy="${i}">Kopioi ElevenLabsiin</button>
            <label class="kp-mini kp-file">${ok ? 'Vaihda ääni' : 'Lisää ääni'}<input type="file" accept="audio/*,.mp3" data-komfile="${id}"></label></div>
          <p class="kp-el" data-komel="${i}">${el ? esc(el) : '<i>ElevenLabs-teksti näkyy tässä.</i>'}</p></details></div>`; }).join('');
  }
  function paint() {
    if (!panel) return;
    matchCard();
    panel.querySelectorAll('[data-kplay]').forEach(b => b.classList.toggle('playing', b.dataset.kplay === playingKey));
    panel.querySelectorAll('[data-kres]').forEach(b => b.classList.toggle('playing', 'r' + b.dataset.kres === playingKey));
    const ab = panel.querySelector('[data-kattn]'); if (ab) ab.classList.toggle('playing', playingKey === 'huomio');
    panel.querySelector('[data-kstop]').disabled = !playingKey && !queue.length;
    const q = panel.querySelector('[data-kq]'); if (q) q.textContent = queue.length ? 'Jonossa: ' + queue.map(i => i.label || LABEL[i.id] || i.key).join(' → ') : '';
  }
  function tickCd() {
    if (!panel || !loggedIn()) return;
    const d = now(), sec = nowSec(), lv = live();
    panel.querySelector('.kp-clock').innerHTML = `${p2(d.getHours())}.${p2(d.getMinutes())}<span>.${p2(d.getSeconds())}</span>`;
    panel.querySelectorAll('[data-kcd]').forEach(el => { const t = el.dataset.kcd * 60 - sec; el.textContent = lv && t > -180 ? (t > 0 ? 'kuulutetaan ' + cdText(t) + ' päästä' : 'kuulutetaan nyt') : ''; });
    const b = panel.querySelector('[data-kbig]');
    if (b) { const t = b.dataset.kbig * 60 - sec; b.innerHTML = !lv ? '' : t > 0 ? `${t >= 3600 ? Math.floor(t / 3600) + '.' + p2(Math.floor(t % 3600 / 60)) + '.' + p2(t % 60) : Math.floor(t / 60) + '.' + p2(t % 60)}<small>kuulutukseen</small>` : `Nyt<small>${S.auto ? 'kuulutetaan' : 'paina Kuuluta nyt'}</small>`; }
    const un = panel.querySelector('[data-kunlock]'); if (un) un.hidden = !needUnlock();
  }

  /* ---- paneeli ---- */
  function build() {
    panel = document.createElement('aside'); panel.className = 'kp'; panel.setAttribute('aria-label', 'Kuulutukset');
    panel.innerHTML = `
      <div class="kp-head"><div><div class="kp-title">Kuulutukset</div><div class="kp-sub">Ajat seuraavat tulospalvelun aikataulua</div></div><div class="kp-clock">--.--</div>
        <button class="kp-stop" data-kstop disabled>Stop</button><button class="kp-close" data-kclose aria-label="Sulje">✕</button></div>
      <div class="kp-body">
        <details class="kp-sec kp-memo"><summary>📋 Muistilista</summary>
          <h4>Kuulutuskone: läppäri</h4>
          <ul><li>Kansi auki ja virtajohto kiinni. Kannen sulkeminen vie koneen lepotilaan.</li>
          <li>Chrome, ylläpito auki ja kirjautuneena (ilman #harjoitus-loppua).</li>
          <li>Macissa <b>Älä häiritse</b> päälle, ettei ilmoitusäänet kuulu kaiuttimista.</li>
          <li>Macin äänenvoimakkuus noin 75 %, varsinainen taso mikseristä.</li></ul>
          <h4>Kuulutuskone: iPad</h4>
          <ul><li>Valitse yläosasta <b>🔊 Kuulutuskone</b>. iPad on oletuksena kauko-ohjain.</li>
          <li>Asetukset → Näyttö ja kirkkaus → <b>Automaattilukitus: Ei koskaan</b>.</li>
          <li><b>Virransäästötila pois.</b> Se lyhentää lukituksen 30 sekuntiin.</li>
          <li>Safari edessä, älä vaihda sovellusta äläkä paina virtanappia. Varmin tapa on <b>Ohjattu käyttö</b> (Käytettävyys → Ohjattu käyttö, sivupainike 3 kertaa).</li>
          <li>Jos näyttö lukittuu, sivu pysähtyy: automaatti ja kauko-ohjaus eivät toimi, ja yli 3 min myöhästyneet kuulutukset jäävät soimatta.</li>
          <li>USB-C- tai Lightning-adapteri 3,5 mm:iin. Lataa iPad täyteen aamulla.</li>
          <li>Ohjauskeskuksessa ei mykistystä.</li></ul>
          <h4>Äänentoisto (Alto-mikseri)</h4>
          <ul><li>Hallin oma Aux-johto LINE IN 3/4:ssä, taso "Aux – volume" -kanavalla.</li>
          <li>Varalla 3,5 mm → 2 × RCA ja 2 × RCA → 6,3 mm -adapterit LINE IN 3/4:ään (tai RCA:t TAPE IN:iin).</li>
          <li>Surina laturin kanssa → maadoitussilmukan erotin tai akulla.</li></ul>
          <h4>Aamulla ennen 9.45</h4>
          <ul><li>Napauta sivua kerran, jotta ääni sallitaan. Punainen palkki katoaa.</li>
          <li>Testaa ääni (Asetukset ja testaus → Testaa ääni) ja Huomioääni.</li>
          <li>Automaatti päällä, kortissa ”Seuraavaksi · klo 09.45 · Tervetuloa”.</li>
          <li>Kauko-ohjain: kokeile puhelimesta yksi Muut kuulutukset -nappi, kuittaus tulee muutamassa sekunnissa.</li></ul>
          <h4>Päivän aikana</h4>
          <ul><li>Myöhästymiset: siirrä otteluita ylläpidon Aikataulu-välilehdellä, kuulutukset siirtyvät mukana. Yksittäisen kuulutuksen aikaa voi muuttaa klikkaamalla kellonaikaa.</li>
          <li>Tulevaan aikaan siirretty kuulutus soi itse. Yli 3 min menneeseen aikaan siirretty pitää kuuluttaa ”Kuuluta nyt”.</li>
          <li>Tulokset: nappi aktivoituu, kun kierroksen kilpa ja haaste on vahvistettu. Kuuluta otteluiden välissä.</li>
          <li>Lopuksi: ”Kuuluta loppusijoitukset + lopetus”. Lopetus ei soi itsestään.</li>
          <li>Ottelukutsuissa sanotaan alkuperäinen kellonaika, vaikka aikataulu siirtyisi.</li></ul>
        </details>
        <div class="kp-testwrap"></div>
        <section class="kp-next"></section>
        <details class="kp-sec" open><summary>Päivän ohjelma</summary><div class="kp-list"></div>
          <p class="kp-help">Kutsut soivat 2 min ennen ottelua (päivän ja iltapäivän ensimmäinen 5 min ennen). Kun siirrät otteluita Aikataulu-välilehdellä, kuulutukset siirtyvät mukana. Lisäkuulutukset (kahvio, lounas, QR, pukukopit, kannustus) soivat otteluiden välissä minuutti pelien päättymisen jälkeen; ohita turhat. Tuloskuulutus kootaan automaattisesti tulospalvelun vahvistetuista tuloksista, mutta se kuulutetaan vasta, kun painat Kuuluta tulokset -nappia. Nappi ilmestyy keltaiseen korttiin, kun kierroksen molemmat ottelut on vahvistettu.</p></details>
        <details class="kp-sec"><summary>Loppusijoitukset</summary><div class="kp-stand"></div><p class="kp-help">Kootaan sarjataulukosta (3 parasta). Lopetuskuulutus ei soi itsestään, vaan tulee tämän napin kautta loppusijoitusten perään.</p></details>
        <details class="kp-sec" open><summary>Muut kuulutukset</summary><div class="kp-extras"></div></details>
        <details class="kp-sec"><summary>Omat kuulutukset</summary>
          <p class="kp-help">Kirjoita teksti tavallisesti → <b>Kopioi ElevenLabsiin</b> → <a href="https://elevenlabs.io/app/speech-synthesis/text-to-speech" target="_blank" rel="noopener">ElevenLabs</a> (Christoffer Weiss · v4 · Finnish · Stability 40 % · Similarity 75 %) → lataa mp3 → <b>Lisää ääni</b>. Äänet tallentuvat tämän koneen selaimeen.</p>
          <div class="kp-omat"></div></details>
        <details class="kp-sec"><summary>Asetukset ja testaus</summary>
          <label class="kp-chk"><input type="checkbox" data-kgong ${S.gong ? 'checked' : ''}> Merkkiääni ennen kuulutusta ja fanfaari ennen tuloksia</label>
          <div class="kp-btns"><button class="kp-mini" data-ktest>Testaa ääni</button><button class="kp-mini" data-kclock>Testikello: aloita testi alusta (09.44)</button><button class="kp-mini" data-kjump>Hyppää 10 s ennen seuraavaa kuulutusta</button><button class="kp-mini" data-krealclock>Oikea kello</button><button class="kp-mini" data-kreset>Nollaa soitetut ja kuulutetut</button></div>
          <p class="kp-help">Kytke kone hallin äänentoistoon ja testaa äänenvoimakkuus. Pidä tämä sivu auki ja kone hereillä (kansi auki, virtajohto kiinni).</p></details>
      </div>
`;
    document.body.append(panel);
    const tst = document.createElement('div'); tst.className = 'kp-toast'; tst.setAttribute('role', 'status'); tst.hidden = true; document.body.append(tst);
    const fab = document.createElement('button'); fab.className = 'kp-fab'; fab.dataset.kopen = ''; fab.innerHTML = '🔊 Kuulutukset'; document.body.append(fab);
  }

  /* ---- tapahtumat ---- */
  ['pointerdown', 'mousedown', 'click', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (needUnlock()) unlock(); }, true));
  document.addEventListener('click', async e => {
    const q = s => e.target.closest(s); let t;
    if (q('[data-kopen]')) { panel.classList.add('open'); return; }
    if (q('[data-kclose]')) { panel.classList.remove('open'); return; }
    if ((t = q('[data-krole]'))) { S.role = t.dataset.krole; ls.set('k-role', S.role); if (S.role === 'kauko') stopAll(); draw(); toast(S.role === 'kauko' ? 'Tämä laite on nyt kauko-ohjain: kuulutukset soivat kuulutuskoneelta.' : 'Tämä laite on nyt kuulutuskone: kuulutukset soivat tästä.'); return; }
    if ((t = q('[data-kedit]'))) { S.editing = t.dataset.kedit; draw(); const inp = panel.querySelector('[data-kover]'); if (inp) { inp.focus(); try { inp.showPicker && inp.showPicker(); } catch (err) { } } return; }
    if ((t = q('[data-kovreset]'))) { setOver(t.dataset.kovreset, null); return; }
    if ((t = q('[data-kovsave]'))) { commitOver(panel.querySelector(`[data-kover="${t.dataset.kovsave}"]`)); return; }
    if (q('[data-kovcancel]')) { S.editing = null; draw(); return; }
    if (S.role === 'kauko') { const cmd = remoteCmd(q); if (cmd) { sendRemote(...cmd); return; } }
    if ((t = q('[data-kstand]'))) { if (playingKey === 'stand') { stopAll(); return; } unlock(); sayStand(t.dataset.kstand === '1'); return; }
    if ((t = q('[data-kmres]'))) { const i = +t.dataset.kmres; if (playingKey === 'r' + i) { stopAll(); return; } unlock(); sayResult(i, true); draw(); matchCard(); return; }
    if (!panel || !panel.contains(e.target)) return;
    if (q('[data-kunlock]')) { unlock(); setTimeout(tickCd, 200); return; }
    if (q('[data-kauto]')) { setAuto(!S.auto); return; }
    if ((t = q('[data-kfirenow]'))) { const c = P.find(x => x.id === t.dataset.kfirenow); if (c) { fire(c); draw(); } return; }
    if (q('[data-kstop]')) { stopAll(); return; }
    if (q('[data-kattn]')) { if (playingKey === 'huomio') { stopAll(); return; } enqueue({ key: 'huomio', chime: true, label: 'Huomioääni' }, true); return; }
    if ((t = q('[data-kplay]'))) { const id = t.dataset.kplay; if (playingKey === id) { stopAll(); return; }
      const c = P.find(x => x.id === id) || EXTRAS.find(x => x.id === id);
      if (/^oma\d$/.test(id)) { if (!S.ownAudio[id]) { toast('Lisää ensin ääni tälle napille'); return; } enqueue({ key: id, id, label: S.omat[+id.slice(3) - 1].label }); return; }
      enqueue({ key: id, id: audioOf(c), label: c.label }); return; }
    if ((t = q('[data-kres]'))) { const i = +t.dataset.kres; if (playingKey === 'r' + i) { stopAll(); return; } sayResult(i, true); draw(); return; }
    if ((t = q('[data-ktxt]'))) { const id = t.dataset.ktxt; S.txt[id] = !S.txt[id]; draw(); return; }
    if ((t = q('[data-kskip]'))) { const id = t.dataset.kskip; if (S.skip[ak(id)]) delete S.skip[ak(id)]; else S.skip[ak(id)] = true; ls.set('k-skip2', S.skip); queue = queue.filter(x => x.key !== id); draw(); return; }
    if (q('[data-ktest]')) { stopAll(); unlock(); const t0 = actx.currentTime + .05; gongAt(t0); fanfareAt(t0 + 1.8); return; }
    if (q('[data-kclock]')) { ['fired', 'ann', 'skip'].forEach(k => Object.keys(S[k]).forEach(x => { if (x.includes('-testi')) delete S[k][x]; })); ls.set('k-fired', S.fired); ls.set('k-ann2', S.ann); ls.set('k-skip2', S.skip); stopAll(); const e0 = EVENT.date || new Date(2026, 9, 24); setVirtual(new Date(e0.getFullYear(), e0.getMonth(), e0.getDate(), 9, 44, 30).getTime()); if (S.auto) setAuto(true); else draw(); toast('Testikello: kello hyppäsi turnausaamuun ja testin kuulutukset nollattiin'); return; }
    if (q('[data-kjump]')) { if (!S.vt) { toast('Aloita ensin testi'); return; } const nx = nextItem(), d = now(); const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime() + timeOf(nx) * 60000 - 10000; setVirtual(target); draw(); toast('Kello: 10 s ennen kuulutusta ' + nx.label); return; }
    if (q('[data-krealclock]')) { S.vt = null; stopAll(); draw(); toast('Testi lopetettu, kello on taas oikea'); return; }
    if ((t = q('[data-kspeed]'))) { setSpeed(+t.dataset.kspeed); draw(); return; }
    if (q('[data-kfulltest]')) { startFullTest(); return; }
    if ((t = q('[data-kreset]'))) { if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Paina uudelleen vahvistaaksesi'; setTimeout(() => { t.dataset.sure = ''; t.textContent = 'Nollaa soitetut ja kuulutetut'; }, 3000); return; }
      S.fired = {}; S.ann = {}; S.skip = {}; ls.set('k-fired', {}); ls.set('k-ann2', {}); ls.set('k-skip2', {}); draw(); return; }
    if ((t = q('[data-komcopy]'))) { const i = +t.dataset.komcopy, txt = toEl(S.omat[i].text, S.omat[i].tone);
      if (!txt) { t.textContent = 'Kirjoita ensin teksti'; setTimeout(() => t.textContent = 'Kopioi ElevenLabsiin', 1500); return; }
      try { await navigator.clipboard.writeText(txt); t.textContent = 'Kopioitu'; } catch (err) { t.textContent = 'Valitse ja kopioi teksti alta'; }
      setTimeout(() => t.textContent = 'Kopioi ElevenLabsiin', 1800); return; }
  });
  document.addEventListener('input', e => {
    const d = e.target.dataset || {};
    if (d.koml != null) { S.omat[d.koml].label = e.target.value; saveOmat(); return; }
    if (d.komt != null) { S.omat[d.komt].text = e.target.value; saveOmat(); const p = panel.querySelector(`[data-komel="${d.komt}"]`); if (p) p.textContent = toEl(S.omat[d.komt].text, S.omat[d.komt].tone); }
  });
  document.addEventListener('change', async e => {
    const d = e.target.dataset || {};
    if (d.komtone != null) { S.omat[d.komtone].tone = e.target.value; saveOmat(); const p = panel.querySelector(`[data-komel="${d.komtone}"]`); if (p) p.textContent = toEl(S.omat[d.komtone].text, e.target.value); return; }
    if (d.komfile && e.target.files[0]) { const id = d.komfile; await idb('readwrite', s => s.put(e.target.files[0], id)); S.ownAudio[id] = true; delete buf[id]; drawOmat(true); toast('Ääni lisätty'); return; }
    if (d.kautores != null) { S.autoRes = e.target.checked; return; }
    if (d.kstandh != null) { S.standHaaste = e.target.checked; ls.set('k-standh', S.standHaaste); draw(); return; }
    if (d.kgong != null) { S.gong = e.target.checked; ls.set('k-gong', S.gong); }
  });

  /* ---- kauko-ohjaus: puhelin lähettää komennon, kuulutuskone soittaa ----
     Komento kulkee tulospalvelun Asetukset-välilehden rivin viimeisin_testi kautta (sama kuin yhteystesti).
     Kuulutuskone lukee riviä muutaman sekunnin välein ja kuittaa. */
  function setOver(id, min, fromRemote) {
    if (min == null) delete S.over[ak(id)]; else S.over[ak(id)] = min;
    ls.set('k-over', S.over); S.editing = null;
    const c = P.find(x => x.id === id);
    if (c && min != null && min * 60 > nowSec()) delete S.fired[dayKey() + ':' + id];
    draw();
    if (!fromRemote) toast(min == null ? `${c ? c.label : id}: aika palautettu aikataulun mukaiseksi` : `${c ? c.label : id}: kuulutetaan klo ${fmtTime(min)}`);
    if (S.role === 'kauko' && !fromRemote) sendRemote('time', `${id}:${min == null ? '' : min}`);
  }
  function remoteCmd(q) {
    let t;
    if ((t = q('[data-kmres]')) || (t = q('[data-kres]'))) return ['res', t.dataset.kmres ?? t.dataset.kres];
    if ((t = q('[data-kstand]'))) return ['stand', t.dataset.kstand];
    if ((t = q('[data-kfirenow]'))) return ['fire', t.dataset.kfirenow];
    if ((t = q('[data-kplay]'))) return ['play', t.dataset.kplay];
    if (q('[data-kattn]')) return ['attn', ''];
    if (q('[data-kstop]')) return ['stop', ''];
    return null;
  }
  const CMD_LABEL = { time: 'kellonajan muutos', res: 'tulokset', stand: 'loppusijoitukset', fire: 'kuulutus', play: 'kuulutus', attn: 'huomioääni', stop: 'pysäytys' };
  let pending = null;
  async function sendRemote(cmd, arg) {
    if (cmd === 'res' && !slotResult(+arg).complete && S.ann[ak(+arg)] == null) { toast('Vahvista ensin kierroksen molempien otteluiden tulokset.'); return; }
    const nonce = Math.random().toString(36).slice(2, 8);
    try { await Store.send({ action: 'ping', value: `K|${nonce}|${cmd}|${arg}|${Date.now()}` }, R.pin); }
    catch (e) { toast('Komentoa ei saatu lähetettyä. Tarkista nettiyhteys.'); return; }
    if (cmd === 'res') { S.ann[ak(+arg)] = slotResult(+arg).sig; ls.set('k-ann2', S.ann); }
    if (cmd === 'stand') { S.ann[ak('stand')] = 1; ls.set('k-ann2', S.ann); }
    pending = { nonce, cmd, at: Date.now() }; draw(); matchCard();
    toast(`📡 Lähetetty kuulutuskoneelle: ${CMD_LABEL[cmd]}. Odotetaan kuittausta…`);
  }
  async function readRemote() {
    if (Store.demo) { const d = ls.get('tulospalvelu-demo-v2', null); return (d && d.settings && d.settings.viimeisin_testi) || ''; }
    const rows = await Store.gviz('Asetukset'); const r = rows.find(x => (x.avain || '').trim().toLowerCase() === 'viimeisin_testi'); return r ? String(r.arvo || '') : '';
  }
  let lastPoll = 0, polling = false;
  async function pollRemote() {
    if (!loggedIn() || polling) return;
    const iv = S.role === 'soitin' ? 4000 : pending ? 3000 : 0; if (!iv || Date.now() - lastPoll < iv) return;
    lastPoll = Date.now(); polling = true;
    try {
      const v = await readRemote(), parts = v.split('|');
      if (S.role === 'soitin' && parts[0] === 'K') {
        const [, nonce, cmd, arg, ts] = parts, seen = ls.get('k-lastnonce', '');
        if (nonce && nonce !== seen && Math.abs(Date.now() - +ts) < 300000) { ls.set('k-lastnonce', nonce); await execRemote(cmd, arg); try { await Store.send({ action: 'ping', value: `A|${nonce}|ok` }, R.pin); } catch (e) { } }
      }
      if (S.role === 'kauko' && pending) {
        if (parts[0] === 'A' && parts[1] === pending.nonce) { toast(`✓ Kuulutuskone kuuluttaa: ${CMD_LABEL[pending.cmd]}`); pending = null; }
        else if (Date.now() - pending.at > 30000) { toast('Kuulutuskone ei kuitannut. Onko kone päällä, ylläpito auki ja kirjautuneena?'); pending = null; }
      }
    } catch (e) { } finally { polling = false; }
  }
  async function execRemote(cmd, arg) {
    unlock();
    /* Puhelimella juuri vahvistettu tulos ei ehkä ole vielä tällä koneella: haetaan tiedot ensin */
    if ((cmd === 'res' && !slotResult(+arg).complete) || (cmd === 'stand' && !allDone())) { try { if (typeof load === 'function') await load(); } catch (e) { } }
    if (cmd === 'res') { const i = +arg; S.ann[ak(i)] = null; delete S.ann[ak(i)]; sayResult(i, true); }
    else if (cmd === 'stand') sayStand(arg === '1');
    else if (cmd === 'fire') { const c = P.find(x => x.id === arg); if (c) fire(c); }
    else if (cmd === 'play') { const c = P.find(x => x.id === arg) || EXTRAS.find(x => x.id === arg); if (/^oma\d$/.test(arg)) { if (S.ownAudio[arg]) enqueue({ key: arg, id: arg, label: S.omat[+arg.slice(3) - 1].label }); } else if (c) enqueue({ key: arg, id: audioOf(c), label: c.label }); }
    else if (cmd === 'attn') enqueue({ key: 'huomio', chime: true, label: 'Huomioääni' }, true);
    else if (cmd === 'stop') stopAll();
    else if (cmd === 'time') { const [id, m] = arg.split(':'); setOver(id, m === '' ? null : +m, true); }
    toast('📡 Kauko-ohjaus: ' + (CMD_LABEL[cmd] || cmd)); draw();
  }
  function roleBox() {
    return `<div class="kp-role"><span>Tämä laite:</span><button class="kp-mini ${S.role === 'soitin' ? 'on' : ''}" data-krole="soitin">🔊 Kuulutuskone</button><button class="kp-mini ${S.role === 'kauko' ? 'on' : ''}" data-krole="kauko">📱 Kauko-ohjain</button></div>
      ${S.role === 'kauko' ? '<p class="kp-help" style="margin:0">Napit lähettävät kuulutuksen kuulutuskoneelle (läppäri äänentoistossa). Kuittaus tulee muutamassa sekunnissa. Tämä laite ei soita mitään itse.</p>' : ''}`;
  }
  /* ---- koko päivän testi pikakelauksella ---- */
  function startFullTest() {
    ['fired', 'ann', 'skip'].forEach(k => Object.keys(S[k]).forEach(x => { if (x.includes('-testi')) delete S[k][x]; }));
    ls.set('k-fired', S.fired); ls.set('k-ann2', S.ann); ls.set('k-skip2', S.skip); stopAll();
    if (Store.demo) { const d = Store.demoData(); d.matches.forEach(m => { m.hg = null; m.ag = null; m.tila = ''; if (m.start == null) return; }); d.goals = []; d.adjust = []; ls.set('tulospalvelu-demo-v2', d); if (typeof load === 'function') load(); }
    const e0 = EVENT.date || new Date(2026, 9, 24);
    S.vt = null; setVirtual(new Date(e0.getFullYear(), e0.getMonth(), e0.getDate(), 9, 44, 0).getTime()); setSpeed(20);
    unlock(); setAuto(true);
    toast('Testi alkoi klo 09.44, kello kulkee 20× nopeammin');
  }
  /* Testissä tulokset arvotaan itsestään, kun ottelu päättyy (vain harjoitustilassa) */
  let lastRes = 0;
  function autoResults() {
    if (!S.vt || !Store.demo || !S.autoRes || typeof R === 'undefined' || !R.data || typeof window.enqueue !== 'function') return;
    if (Date.now() - lastRes < 1500) return;
    const m0 = nowSec() / 60, dur = EVENT.matchMin || 30;
    const m = R.data.matches.find(x => x.start != null && !isFinal(x) && !cancelled(x) && x.start + dur <= m0);
    if (m) { lastRes = Date.now(); window.enqueue({ action: 'result', match: m.id, hg: Math.floor(Math.random() * 5), ag: Math.floor(Math.random() * 4) }); }
  }
  function testBar() {
    if (!S.vt && !Store.demo) return '';
    if (!S.vt) return `<div class="kp-test"><b>🧪 Harjoitustila</b><p>Käy koko turnauspäivä läpi muutamassa minuutissa: kello kelautuu, kuulutukset soivat itse ja tulokset arvotaan otteluiden päättyessä. Kuulutat tulokset ja loppusijoitukset itse napeista kuten turnauksessa.</p><button class="kp-rbtn" data-kfulltest>▶ Aloita koko päivän testi</button></div>`;
    const sp = S.vt.speed;
    return `<div class="kp-test"><b>🧪 Testi käynnissä · kello ${sp}× nopeammin</b>
      <div class="kp-btns">${[1, 10, 20, 40].map(x => `<button class="kp-mini ${sp === x ? 'on' : ''}" data-kspeed="${x}">${x}×</button>`).join('')}<button class="kp-mini" data-kjump>⏭ Seuraava kuulutus</button></div>
      ${Store.demo ? `<label class="kp-chk" style="margin:0"><input type="checkbox" data-kautores ${S.autoRes ? 'checked' : ''}> Arvo tulokset otteluiden päättyessä</label>` : '<p>Oikeassa tulospalvelussa: tuloksia ei arvota.</p>'}
      <div class="kp-btns"><button class="kp-mini" data-kfulltest>↺ Alusta uudelleen</button><button class="kp-mini" data-krealclock>■ Lopeta testi</button></div></div>`;
  }
  /* ---- tuloskuulutus myös ottelun ylläpitonäkymään ---- */
  function matchCard() {
    const appEl = document.getElementById('app');
    if (!appEl || typeof R === 'undefined' || R.view !== 'match' || !R.data || !loggedIn()) return;
    const m = R.data.matches.find(x => x.id === R.match); if (!m) return;
    const i = BASE.findIndex((_, k) => pairOf(k)(m));
    const old = appEl.querySelector('.kp-mcard');
    if (i < 0) { if (old) old.remove(); return; }
    const sr = slotResult(i), txt = resultText(i), done = S.ann[ak(i)] != null, changed = done && S.ann[ak(i)] !== sr.sig;
    const others = matchesOf(i).filter(x => !cancelled(x) && !isFinal(x)).map(x => x.series);
    const status = !sr.any ? 'Tuloskuulutus kootaan, kun lopputulos on vahvistettu.' : changed ? 'Tulos on muuttunut kuuluttamisen jälkeen.' : done ? 'Kuulutettu.' : others.length ? `Kuulutusnappi aktivoituu, kun myös ${others.join(' ja ').toLowerCase()}-ottelun tulos on vahvistettu.` : 'Valmis kuulutettavaksi.';
    const html = `<section class="card kp-mcard" style="display:grid;gap:10px"><div class="sec-h" style="margin:0"><h2>Tuloskuulutus</h2><small>${esc(BASE[i][1])}–${esc(BASE[i][2])} · kilpa ja haaste yhdessä</small></div>
      ${txt ? `<p style="margin:0;font-size:1.05rem">”${esc(txt)}”</p>` : ''}<p class="note" style="margin:0">${status}</p>
      <button class="btn kp-mbtn ${playingKey === 'r' + i ? 'playing' : ''}" data-kmres="${i}" ${sr.complete || done ? '' : 'disabled'}>${playingKey === 'r' + i ? '■ Pysäytä' : done ? (S.role === 'kauko' ? '📡 Kuuluta uudelleen kuulutuskoneelta' : '📣 Kuuluta tulokset uudelleen') : sr.complete ? (S.role === 'kauko' ? '📡 Kuuluta tulokset kuulutuskoneelta' : '📣 Kuuluta tulokset') : '📣 Kuuluta tulokset · odottaa ' + (others.length ? others.join(' ja ').toLowerCase() + '-ottelun vahvistusta' : 'tulosta')}</button></section>`;
    const sig = html;
    if (old && old.dataset.sig === sig) return;
    const tmp = document.createElement('div'); tmp.innerHTML = html; const node = tmp.firstElementChild; node.dataset.sig = sig;
    if (old) old.replaceWith(node); else { const first = appEl.querySelector('section.card'); if (first) first.after(node); }
  }
  /* Kellonajan muokkaus: tallentuu Tallenna-napista tai Enterillä, Esc peruu */
  const commitOver = el => { if (!el || el.dataset.kover == null || el.dataset.done) return; el.dataset.done = '1'; const [h, mi] = (el.value || '').split(':').map(Number); if (!isNaN(h) && !isNaN(mi)) setOver(el.dataset.kover, h * 60 + mi); else { S.editing = null; draw(); } };
  document.addEventListener('keydown', e => { if (e.target.dataset && e.target.dataset.kover != null) { if (e.key === 'Enter') { e.preventDefault(); commitOver(e.target); } if (e.key === 'Escape') { e.target.dataset.done = '1'; S.editing = null; draw(); } } });
  /* ---- käynnistys ---- */
  /* Testin aikana myös ylläpidon ottelutilat (käynnissä, odottaa tulosta) seuraavat testikelloa */
  if (typeof window.clock === 'function') { const orig = window.clock; window.clock = () => S.vt ? { day: 0, min: Math.floor(nowSec() / 60), demo: Store.demo } : orig(); }
  build(); preload();
  { const appEl = document.getElementById('app'); if (appEl) new MutationObserver(() => matchCard()).observe(appEl, { childList: true }); }
  idb('readonly', s => s.getAllKeys()).then(keys => { (keys || []).forEach(k => S.ownAudio[k] = true); draw(); });
  let lastSig = '';
  setInterval(() => {
    tickAuto(); tickCd(); autoResults(); pollRemote();
    const sig = [loggedIn(), nextItem().id, dayKey(), JSON.stringify(((typeof R !== 'undefined' && R.data && R.data.matches) || []).map(m => [m.start, m.hg, m.ag, m.tila]))].join('|');
    if (sig !== lastSig) { lastSig = sig; draw(); }
  }, 1000);
  draw();
  if (S.auto) setAuto(true);
  window.KUULUTUS = { annOf: m => { const i = BASE.findIndex((_, k) => pairOf(k)(m)); if (i < 0) return null; const a = S.ann[ak(i)]; return a == null ? null : a === slotResult(i).sig ? 'ann' : 'changed'; }, S, program, timeOf, get queue() { return queue; }, get playing() { return playingKey; }, get audio() { return actx ? actx.state + ' ' + actx.sampleRate + ' ' + (actx.sinkId ?? '') : 'ei luotu'; }, tickAuto };
})();

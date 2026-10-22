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

  /* ---- kuulutukset: aika = ottelupaikan (slot) alkamisaika + siirto minuutteina ---- */
  const P = [
    { id: 'tervetuloa', file: '01-tervetuloa', label: 'Tervetuloa', sub: 'Avauskuulutus', rel: [0, -15] },
    { id: 'saannot-aamu', audio: 'saannot', label: 'Säännöt', sub: 'Sääntömuistutus', rel: [0, -10] },
    { id: 'tauko', file: '07-tauko', label: 'Tauko alkaa', sub: 'Aamupäivä pelattu', rel: [4, 32] },
    { id: 'tauko-loppuu', file: '08-tauko-loppuu', label: 'Tauko loppuu', sub: '15 min iltapäivään', rel: [5, -15] },
    { id: 'saannot-ip', audio: 'saannot', label: 'Säännöt', sub: 'Sääntömuistutus', rel: [5, -10] },
    { id: 'lopetus', file: '14-lopetus', label: 'Kiitos ja näkemiin', sub: 'Päivän päätös', rel: [9, 32] },
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
  const OMAT_N = 6;
  const FILES = {}, LABEL = {};
  [...P, ...EXTRAS, ...PIECES].forEach(c => { if (c.file) FILES[c.id] = c.file; LABEL[c.id] = c.label; });
  const audioOf = c => c.audio || c.id;

  /* ---- tila ---- */
  const S = {
    auto: ls.get('k-auto', true), fired: ls.get('k-fired', {}), skip: ls.get('k-skip', {}), ann: ls.get('k-ann', {}),
    gong: ls.get('k-gong', true), offset: null, open: false,
    omat: (() => { const s = ls.get('k-omat', []); return Array.from({ length: OMAT_N }, (_, i) => Object.assign({ label: 'Oma kuulutus ' + (i + 1), text: '', tone: 'warm' }, s[i] || {})); })(),
    ownAudio: {},
  };
  const p2 = n => String(n).padStart(2, '0');
  const now = () => new Date(Date.now() + (S.offset || 0));
  const dayKey = () => { const d = now(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}${S.offset != null ? '-testi' : ''}`; };
  const isEventDay = () => { const d = now(), e = EVENT.date; return !!e && d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth() && d.getDate() === e.getDate(); };
  const live = () => isEventDay();
  const nowSec = () => { const d = now(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
  const isFired = c => live() && !!S.fired[dayKey() + ':' + c.id];
  const isSkip = c => !!S.skip[c.id];
  const loggedIn = () => typeof R !== 'undefined' && !!R.pin;

  /* ---- aikataulu tulospalvelusta ---- */
  const pairOf = i => { const [, a, b] = BASE[i]; return m => (m.home === a && m.away === b) || (m.home === b && m.away === a); };
  const matchesOf = i => ((typeof R !== 'undefined' && R.data && R.data.matches) || []).filter(pairOf(i));
  function kick(i) { const ms = matchesOf(i).filter(m => m.start != null); return ms.length ? Math.min(...ms.map(m => m.start)) : parseTime(BASE[i][0]); }
  const timeOf = c => kick(c.rel[0]) + c.rel[1];
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
  const tooBig = i => Object.values(slotResult(i).r).some(v => v > MAXN);
  const resultItem = i => { const seq = resultSeq(i); return seq && !tooBig(i) ? { key: 'r' + i, seq, label: 'Tulokset ' + BASE[i][1] + '–' + BASE[i][2] } : null; };
  function sayResult(i, manual) {
    if (!resultSeq(i)) { if (manual) toast('Tulosta ei ole vielä vahvistettu tulospalvelussa'); return; }
    if (tooBig(i)) { toast(`Yli ${MAXN} maalin lukemaa ei ole äänitiedostona. Kuuluta tämä tulos itse.`); return; }
    S.ann[i] = slotResult(i).sig; ls.set('k-ann', S.ann); enqueue(resultItem(i));
  }

  /* ---- äänet ---- */
  let actx = null, stopFlag = 0, queue = [], running = false, playingKey = null, nodes = [];
  const raw = {}, buf = {}, trimC = {};
  function unlock() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state !== 'running') actx.resume(); } catch (e) { } }
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
    if (it.chime) { playingKey = it.key; paint(); await wait(attnAt(actx.currentTime + .05) * 1000 + 300); if (my === stopFlag) { nodes = []; playingKey = null; } return; }
    const ids = it.seq || [it.id], bufs = [];
    for (const id of ids) { const b = await getBuffer(id); if (!b) { toast(`Ääntä "${LABEL[id] || id}" ei löytynyt. Tarkista nettiyhteys.`); return; } bufs.push(it.seq ? trimmed(id, b) : b); }
    if (my !== stopFlag) return;
    playingKey = it.key; paint();
    const t0 = actx.currentTime + .05; let t = t0 + (it.seq ? fanfareAt(t0) : gongAt(t0));
    bufs.forEach((b, i) => { const s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(t); nodes.push(s); t += b.duration + (it.seq ? gapOf(ids[i]) : 0); });
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
    const t = timeOf(c);
    BASE.forEach((_, i) => { const sr = slotResult(i); if (kick(i) < t && sr.complete && S.ann[i] == null) sayResult(i); });
    enqueue({ key: c.id, id: audioOf(c), label: c.label });
  }
  function tickAuto() {
    if (!S.auto || !live() || !loggedIn()) return;
    const m = nowSec() / 60;
    program().forEach(c => { const at = timeOf(c); if (m >= at && m < at + 3 && !isFired(c) && !isSkip(c)) fire(c); });
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
  function toast(msg) { const t = panel.querySelector('.kp-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 7000); }
  function cdText(sec) { if (sec <= 0) return 'nyt'; const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60); return h ? `${h} h ${p2(m)} min` : m >= 10 ? `${m} min` : `${m}.${p2(s)}`; }
  function resLine(i) {
    const sr = slotResult(i); if (!sr.any) return '';
    const { r } = sr, [, a, b] = BASE[i];
    const txt = [['k', 'Kilpa'], ['h', 'Haaste']].filter(([s]) => r[s + 'a'] != null).map(([s, l]) => `${l} ${a} ${r[s + 'a']}–${r[s + 'b']} ${b}`).join(' · ');
    const st = S.ann[i] != null ? (S.ann[i] === sr.sig ? 'kuulutettu' : 'tulos muuttunut') : sr.complete ? 'kuulutetaan ennen seuraavaa kutsua' : 'odottaa toista ottelua';
    return `<div class="kp-res"><span>${esc(txt)} <em>· ${st}</em></span><button class="kp-mini" data-kres="${i}">${S.ann[i] != null ? 'Uudelleen' : 'Kuuluta'}</button></div>`;
  }
  function row(c, nx) {
    const t = timeOf(c), moved = t !== origOf(c), f = isFired(c), sk = isSkip(c);
    return `<div class="kp-row ${c === nx ? 'next' : ''} ${f ? 'done' : ''} ${sk ? 'skip' : ''}">
      <div class="kp-t">${fmtTime(t)}${moved ? `<s>${fmtTime(origOf(c))}</s>` : ''}</div>
      <div class="kp-l"><b>${esc(c.label)}</b><small>${esc(c.sub)}${f ? ' · soitettu' : ''}${sk ? ' · ei soiteta' : ''}</small>${!f && !sk ? `<span class="kp-cd" data-kcd="${t}"></span>` : ''}</div>
      <button class="kp-skip ${sk ? 'on' : ''}" data-kskip="${c.id}">${sk ? 'Palauta' : 'Ohita'}</button>
      <button class="kp-play" data-kplay="${c.id}" aria-label="Soita ${esc(c.label)}">${PLAY}</button></div>${c.slot != null ? resLine(c.slot) : ''}`;
  }
  function draw() {
    if (!panel) return;
    document.body.classList.toggle('kp-on', loggedIn());
    if (!loggedIn()) return;
    const nx = nextItem(), lv = live();
    const autoTxt = S.auto ? (lv ? `Automaatti soittaa tämän itse klo ${fmtTime(timeOf(nx))}. ”Soita heti” soittaa sen nyt, eikä se soi enää uudelleen.` : `Tänään ei ole turnauspäivä. Automaatti alkaa soittaa itse turnauspäivänä${EVENT.dateText ? ' (' + EVENT.dateText + ')' : ''}. Voit kuunnella kuulutuksia listan ▶-napeista, tai kokeilla koko päivää kohdassa Asetukset ja testaus → Testikello.`) : 'Automaatti pois. Kuulutukset soivat vain napista.';
    panel.querySelector('.kp-next').innerHTML = `
      <div class="kp-unlock" data-kunlock hidden>🔈 Napauta tästä, jotta kuulutukset kuuluvat</div>
      <div class="kp-eyebrow">${lv ? 'Seuraavaksi' : 'Turnauspäivän ensimmäinen'} · klo ${fmtTime(timeOf(nx))}</div>
      <div class="kp-what">${esc(nx.label)}</div>
      <div class="kp-big" data-kbig="${timeOf(nx)}"></div>
      <div class="kp-btns"><button class="kp-auto ${S.auto ? 'on' : ''}" data-kauto>${S.auto ? 'Automaatti päällä · pysäytä' : 'Käynnistä automaatti'}</button></div>
      <div class="kp-btns">${lv ? `<button class="kp-ghost" data-kfirenow="${nx.id}" title="Soittaa tämän kuulutuksen heti. Automaatti ei soita sitä enää uudelleen.">Soita heti</button>` : ''}<button class="kp-ghost" data-kattn>🔔 Huomioääni</button></div>
      <div class="kp-note">${autoTxt}</div><div class="kp-q" data-kq></div>`;
    panel.querySelector('.kp-list').innerHTML = program().map(c => row(c, nx)).join('');
    panel.querySelector('.kp-extras').innerHTML = EXTRAS.map(c => `<button class="kp-xbtn" data-kplay="${c.id}">${PLAY}<span>${esc(c.label)}</span></button>`).join('');
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
    panel.querySelectorAll('[data-kcd]').forEach(el => { const t = el.dataset.kcd * 60 - sec; el.textContent = lv && t > -180 ? (t > 0 ? 'soi ' + cdText(t) + ' päästä' : 'soi nyt') : ''; });
    const b = panel.querySelector('[data-kbig]');
    if (b) { const t = b.dataset.kbig * 60 - sec; b.innerHTML = !lv ? '' : t > 0 ? `${t >= 3600 ? Math.floor(t / 3600) + '.' + p2(Math.floor(t % 3600 / 60)) + '.' + p2(t % 60) : Math.floor(t / 60) + '.' + p2(t % 60)}<small>${S.auto ? 'soi itse' : 'kuulutukseen'}</small>` : `Nyt<small>${S.auto ? 'soi itse' : 'soita napista'}</small>`; }
    const un = panel.querySelector('[data-kunlock]'); if (un) un.hidden = !(S.auto && needUnlock());
  }

  /* ---- paneeli ---- */
  function build() {
    panel = document.createElement('aside'); panel.className = 'kp'; panel.setAttribute('aria-label', 'Kuulutukset');
    panel.innerHTML = `
      <div class="kp-head"><div><div class="kp-title">Kuulutukset</div><div class="kp-sub">Ajat seuraavat tulospalvelun aikataulua</div></div><div class="kp-clock">--.--</div>
        <button class="kp-stop" data-kstop disabled>Stop</button><button class="kp-close" data-kclose aria-label="Sulje">✕</button></div>
      <div class="kp-body">
        <section class="kp-next"></section>
        <details class="kp-sec" open><summary>Päivän ohjelma</summary><div class="kp-list"></div>
          <p class="kp-help">Kutsut soivat 2 min ennen ottelua (päivän ja iltapäivän ensimmäinen 5 min ennen). Kun siirrät otteluita Aikataulu-välilehdellä, kuulutukset siirtyvät mukana. Lisäkuulutukset (kahvio, lounas, QR, pukukopit, kannustus) soivat otteluiden välissä minuutti pelien päättymisen jälkeen; ohita turhat. Vahvistetut tulokset kuulutetaan automaattisesti ennen seuraavaa kuulutusta, kun saman ottelukierroksen molemmat ottelut on vahvistettu.</p></details>
        <details class="kp-sec" open><summary>Muut kuulutukset</summary><div class="kp-extras"></div></details>
        <details class="kp-sec"><summary>Omat kuulutukset</summary>
          <p class="kp-help">Kirjoita teksti tavallisesti → <b>Kopioi ElevenLabsiin</b> → <a href="https://elevenlabs.io/app/speech-synthesis/text-to-speech" target="_blank" rel="noopener">ElevenLabs</a> (Christoffer Weiss · v4 · Finnish · Stability 40 % · Similarity 75 %) → lataa mp3 → <b>Lisää ääni</b>. Äänet tallentuvat tämän koneen selaimeen.</p>
          <div class="kp-omat"></div></details>
        <details class="kp-sec"><summary>Asetukset ja testaus</summary>
          <label class="kp-chk"><input type="checkbox" data-kgong ${S.gong ? 'checked' : ''}> Merkkiääni ennen kuulutusta ja fanfaari ennen tuloksia</label>
          <div class="kp-btns"><button class="kp-mini" data-ktest>Testaa ääni</button><button class="kp-mini" data-kclock>Testikello: turnausaamu 09.44</button><button class="kp-mini" data-krealclock>Oikea kello</button><button class="kp-mini" data-kreset>Nollaa soitetut ja kuulutetut</button></div>
          <p class="kp-help">Kytke kone hallin äänentoistoon ja testaa äänenvoimakkuus. Pidä tämä sivu auki ja kone hereillä (kansi auki, virtajohto kiinni).</p></details>
      </div>
      <div class="kp-toast" role="status" hidden></div>`;
    document.body.append(panel);
    const fab = document.createElement('button'); fab.className = 'kp-fab'; fab.dataset.kopen = ''; fab.innerHTML = '🔊 Kuulutukset'; document.body.append(fab);
  }

  /* ---- tapahtumat ---- */
  document.addEventListener('pointerdown', () => { if (needUnlock()) unlock(); }, true);
  document.addEventListener('click', async e => {
    const q = s => e.target.closest(s); let t;
    if (q('[data-kopen]')) { panel.classList.add('open'); return; }
    if (q('[data-kclose]')) { panel.classList.remove('open'); return; }
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
    if ((t = q('[data-kskip]'))) { const id = t.dataset.kskip; if (S.skip[id]) delete S.skip[id]; else S.skip[id] = true; ls.set('k-skip', S.skip); queue = queue.filter(x => x.key !== id); draw(); return; }
    if (q('[data-ktest]')) { stopAll(); unlock(); const t0 = actx.currentTime + .05; gongAt(t0); fanfareAt(t0 + 1.8); return; }
    if (q('[data-kclock]')) { const e0 = EVENT.date || new Date(2026, 9, 24); S.offset = new Date(e0.getFullYear(), e0.getMonth(), e0.getDate(), 9, 44, 30) - Date.now(); if (S.auto) setAuto(true); else draw(); toast('Testikello päällä: kello hyppäsi turnausaamuun'); return; }
    if (q('[data-krealclock]')) { S.offset = null; draw(); return; }
    if ((t = q('[data-kreset]'))) { if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Paina uudelleen vahvistaaksesi'; setTimeout(() => { t.dataset.sure = ''; t.textContent = 'Nollaa soitetut ja kuulutetut'; }, 3000); return; }
      S.fired = {}; S.ann = {}; S.skip = {}; ls.set('k-fired', {}); ls.set('k-ann', {}); ls.set('k-skip', {}); draw(); return; }
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
    if (d.kgong != null) { S.gong = e.target.checked; ls.set('k-gong', S.gong); }
  });

  /* ---- käynnistys ---- */
  build(); preload();
  idb('readonly', s => s.getAllKeys()).then(keys => { (keys || []).forEach(k => S.ownAudio[k] = true); draw(); });
  let lastSig = '';
  setInterval(() => {
    tickAuto(); tickCd();
    const sig = [loggedIn(), nextItem().id, dayKey(), JSON.stringify(((typeof R !== 'undefined' && R.data && R.data.matches) || []).map(m => [m.start, m.hg, m.ag, m.tila]))].join('|');
    if (sig !== lastSig) { lastSig = sig; draw(); }
  }, 1000);
  draw();
  if (S.auto) setAuto(true);
  window.KUULUTUS = { S, program, timeOf, get queue() { return queue; }, get playing() { return playingKey; }, tickAuto };
})();

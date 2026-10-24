/* Kuulutukset ylläpitonäkymässä (yllapito.html).
   Kuulutusohjelma lasketaan turnauksen otteluista päivä kerrallaan: avaus, ottelukutsut, tauot, tulokset, päivän päätös,
   loppusijoitukset ja lopetus. Turnauksen omat kuulutukset (kahvio, lounas, säännöt…) tulevat Sheetin Kuulutukset-välilehdeltä.
   Kun ylläpito siirtää aikataulua, kuulutukset siirtyvät mukana, ja kutsuissa sanotaan aina ajantasainen kellonaika.

   Äänet kootaan paloista. Pala haetaan ensin turnauksen kansiosta (aanet/), sitten moottorin yhteisistä paloista
   (pelipaiva/aanet/: luvut, kellonajat, tulokset, sijoitukset, tutut joukkueet ja kentät). Kummankin kansion aanet.json
   kertoo, mitkä palat on äänitetty. Jos jokin pala puuttuu, kuulutus luetaan selaimen suomenkielisellä puheäänellä,
   tai jos sitä ei ole, teksti näytetään ruudulla luettavaksi. Äänet-osio listaa puuttuvat palat ElevenLabs-teksteineen.
   Omat pikakuulutukset (äänitiedosto tältä koneelta) tallentuvat tämän selaimen muistiin. */
(() => {
  const OWN_DIR = 'aanet/', ENG_DIR = ENGINE + 'aanet/';
  const MAXN = 15;                 // suurin lukema, jolle on äänipala
  const OMAT_N = 6;
  const DUR = () => EVENT.matchMin || 30;
  const p2 = n => String(n).padStart(2, '0');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---- viivakuvakkeet (sama tyyli kuin sivuston muut kuvakkeet) ---- */
  const IC = {
    spk: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    send: '<path d="M4 12l16-7-6 16-3-6z"/><path d="M11 15l9-10"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.5"/>',
    test: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.5M4.5 12h.5M4.5 18h.5"/>',
    mega: '<path d="M3 10v4h3l7 4V6L6 10z"/><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M7 14l1.5 5h2.5l-1.3-4.3"/>',
    wave: '<path d="M4 12h2M8 8v8M12 5v14M16 8v8M20 12h0"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  };
  const ico = k => `<svg class="kp-i" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';

  /* ---- tila ---- */
  const S = {
    auto: ls.get('k-auto', true), fired: ls.get('k-fired', {}), skip: ls.get('k-skip', {}), ann: ls.get('k-ann', {}),
    gong: ls.get('k-gong', true), standOff: ls.get('k-standoff', []), vt: null, autoRes: true, over: ls.get('k-over', {}), editing: null, txt: {},
    role: /[?&]kone=kuulutus/.test(location.search) ? (ls.set('k-role', 'soitin'), 'soitin') : /[?&]kone=kauko/.test(location.search) ? (ls.set('k-role', 'kauko'), 'kauko') : ls.get('k-role', (window.matchMedia && matchMedia('(pointer:fine)').matches) ? 'soitin' : 'kauko'),
    omat: (() => { const s = ls.get('k-omat', []); return Array.from({ length: OMAT_N }, (_, i) => Object.assign({ label: 'Oma kuulutus ' + (i + 1), text: '', tone: 'warm' }, s[i] || {})); })(),
    ownAudio: {}, viewDay: null, ANN: [], man: { own: {}, eng: {} }, manOk: false, showText: null,
  };

  /* ---- kello: oikea tai testikello (virtuaaliaika, joka voi kulkea nopeutettuna) ---- */
  const now = () => S.vt ? new Date(S.vt.base + (Date.now() - S.vt.anchor) * S.vt.speed) : new Date();
  const setVirtual = ms => { S.vt = { base: ms, anchor: Date.now(), speed: S.vt ? S.vt.speed : 1 }; };
  const setSpeed = x => { if (!S.vt) return; S.vt = { base: now().getTime(), anchor: Date.now(), speed: x }; };
  const dayIdxOf = d => EVENT.date ? Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - EVENT.date) / 864e5) : 0;
  const nowAt = () => { const d = now(); return dayIdxOf(d) * DAY + d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  const today = () => dayIdxOf(now());
  const live = () => (EVENT.days || [0]).includes(today());
  const dayKey = () => { const d = now(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}${S.vt ? '-testi' : ''}${Store.demo ? '-harjoitus' : ''}`; };
  const ak = id => dayKey() + ':' + id;
  /* Näytettävä päivä: tänään, jos tänään pelataan; muuten valittu tai seuraava pelipäivä */
  const shownDay = () => live() ? today() : S.viewDay != null && (EVENT.days || []).includes(S.viewDay) ? S.viewDay : currentDay(mkClock(Math.floor(nowAt()), false));
  const loggedIn = () => typeof R !== 'undefined' && !!R.pin;
  const allMatches = () => ((typeof R !== 'undefined' && R.data && R.data.matches) || []);
  const cancelled = m => /peru/.test(m.tila || '');

  /* ---- äänipalat ja niiden tekstit ---- */
  const ONES = ['nolla', 'yksi', 'kaksi', 'kolme', 'neljä', 'viisi', 'kuusi', 'seitsemän', 'kahdeksan', 'yhdeksän'];
  function numFi(n) { n = +n; if (n < 10) return ONES[n]; if (n === 10) return 'kymmenen'; if (n < 20) return ONES[n - 10] + 'toista'; if (n < 100) { const t = Math.floor(n / 10), r = n % 10; return ONES[t] + 'kymmentä' + (r ? ONES[r] : ''); } if (n < 1000) { const h = Math.floor(n / 100), r = n % 100; return (h === 1 ? 'sata' : ONES[h] + 'sataa') + (r ? numFi(r) : ''); } return String(n); }
  /* Yhteiset palat: äänitetään kerran moottorin kansioon ja käytetään kaikissa turnauksissa */
  const FIXED = {
    'tuloksia': 'Tuloksia!', 'kiitos': 'Kiitos joukkueille hyvistä peleistä!', 'loppusijoitukset': 'Loppusijoitukset!',
    'sija1': 'ensimmäisenä', 'sija2': 'toisena', 'sija3': 'kolmantena', 'onnittelut': 'Onnittelut menestyneille – ja kiitos kaikille joukkueille upeista peleistä!',
    'kello': 'Kello', 'vastaan': 'vastaan',
    'kutsu-alku': 'Seuraavat ottelut!', 'kutsu-5min': 'Ottelut alkavat viiden minuutin kuluttua!', 'kutsu-loppu': 'Joukkueet, valmiiksi kentän laidalle!',
    'yleinen-tervetuloa': 'Hyvää huomenta ja tervetuloa! Ohjelman ja tulokset löydät puhelimeesi otteluohjelmajulisteen QR-koodista. Hyvää pelipäivää kaikille!',
    'tauko': 'Nyt pidetään tauko – hienoa työtä, kaikki joukkueet! Seuraavat ottelut alkavat',
    'tauko-loppuu': 'Tauko alkaa olla ohi! Seuraavat ottelut alkavat viidentoista minuutin kuluttua. Joukkueet, aloitetaan lämmittely.',
    'paiva-paattyy': 'Tämän päivän ottelut on pelattu! Kiitos kaikille, ja nähdään huomenna. Huomenna ensimmäiset ottelut alkavat',
    'yleinen-lopetus': 'Turnaus on pelattu! Iso kiitos kaikille joukkueille, valmentajille, tuomareille ja vanhemmille – ja kiitos kaikille talkoolaisille. Turvallista kotimatkaa!',
  };
  const teamByPiece = id => EVENT.teamNames.find(t => 'joukkue-' + slug(t) === id);
  const seriesByPiece = id => seriesList(allMatches()).find(s => 'sarja-' + slug(s) === id);
  const fieldPiece = f => 'kentta-' + (slug(f).replace(/^kentta-?/, '') || slug(f));   // "Kenttä 1" → kentta-1, "Takakenttä" → kentta-takakentta
  const fieldByPiece = id => fieldList(allMatches()).find(f => fieldPiece(f) === id);
  /* "Kenttä 1" → "kentällä yksi", "Takakenttä" → "takakentällä" */
  function fieldSaid(f) {
    const m = String(f).match(/^kenttä\s*(\d+|[a-zåäö])$/i);
    if (m) return 'kentällä ' + (/^\d+$/.test(m[1]) ? numFi(m[1]) : m[1].toUpperCase());
    const w = f.trim().toLowerCase(); return /[äöy]/.test(w) ? w + 'llä' : w + 'lla';
  }
  const seriesSaid = s => /\s/.test(s.trim()) ? 'Sarjassa ' + s : s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase() + 'sarjassa';
  /* Palan teksti. say = ääntämysasu (ElevenLabs ja puheääni): luvut sanoina, joukkueet lausuntasarakkeen mukaan.
     Ilman sitä teksti näytettäväksi: luvut numeroina, joukkueet niminään. */
  function pieceText(id, say) {
    const a = S.ANN.find(x => x.id === id); if (a) return a.text;
    if (FIXED[id]) return FIXED[id];
    let m;
    if ((m = id.match(/^luku-(\d+)-(kesken|loppu)$/))) return say ? numFi(m[1]) : m[1];
    if ((m = id.match(/^tunti-(\d+)$/))) return say ? numFi(m[1]) : m[1];
    if ((m = id.match(/^minuutti-(\d+)$/))) return say ? numFi(m[1]) : m[1];
    const t = teamByPiece(id); if (t) return say ? (EVENT.teams[t] && EVENT.teams[t].say) || t : t;
    const s = seriesByPiece(id); if (s) return seriesSaid(s);
    const f = fieldByPiece(id); if (f) return fieldSaid(f);
    return id;
  }
  /* Ohje äänittäjälle: miten pala sanotaan (intonaatio) */
  function pieceHint(id) {
    if (/^luku-.*-kesken$/.test(id)) return 'nouseva sävy, lause jatkuu';
    if (/^luku-.*-loppu$/.test(id)) return 'laskeva sävy, lause päättyy';
    if (/^(tunti|minuutti)-/.test(id)) return 'kellonajan osa';
    if (/^joukkue-/.test(id)) return 'joukkueen nimi';
    if (/^sarja-/.test(id)) return 'tuloskuulutuksen sarja';
    if (/^kentta-/.test(id)) return 'ottelukutsun kenttä';
    return '';
  }
  /* Turnauksen omat (Kuulutukset-välilehti) kuuluvat turnauksen kansioon, kaikki muu on yhteistä */
  const pieceOwn = id => S.ANN.some(a => a.id === id);
  const audioUrl = id => S.man.own[id] ? OWN_DIR + S.man.own[id] : S.man.eng[id] ? ENG_DIR + S.man.eng[id] : null;
  /* Koottu teksti näytölle ja puheäänelle: tauon kohdalle pilkku tai piste, kuten paloja soitettaessa */
  function seqText(seq, say) {
    const out = [];
    for (let i = 0; i < seq.length; i++) {
      let id = seq[i], t;
      if (/^tunti-/.test(id)) {
        // Kellonaika yhtenä: tunti-10 + minuutti-35 → "10.35" (tai sanoina "kymmenen kolmekymmentäviisi")
        const h = id.slice(6), mm = /^minuutti-/.test(seq[i + 1] || '') ? (id = seq[++i]).slice(9) : null;
        t = say ? numFi(h) + (mm ? ' ' + numFi(mm) : '') : p2(h) + '.' + (mm || '00');
      } else t = pieceText(id, say);
      if (id === 'kello' && out.length && !/[.!?]$/.test(out[out.length - 1])) t = t.toLowerCase();
      const next = seq[i + 1], g = gapOf(id, next);
      if (next && !/[.!?,]$/.test(t)) t += g >= .45 ? '.' : g >= .25 ? ',' : '';
      out.push(t);
    }
    return out.join(' ').replace(/([.!?]) ([a-zåäö])/g, (_, p, c) => p + ' ' + c.toUpperCase());
  }
  async function loadManifests() {
    const get = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    const [own, eng] = await Promise.all([get(OWN_DIR + 'aanet.json'), get(ENG_DIR + 'aanet.json')]);
    S.man = { own, eng }; S.manOk = true; draw();
  }

  /* ---- Kuulutukset-välilehti ---- */
  const KORVAA = { 'avaus': 'avaus', 'tervetuloa': 'avaus', 'tauko': 'tauko', 'tauko alkaa': 'tauko', 'tauko loppuu': 'tauko-loppuu', 'päivä päättyy': 'paiva-paattyy', 'paiva paattyy': 'paiva-paattyy', 'lopetus': 'lopetus' };
  function parseWhen(v) {
    const s = String(v || '').trim().toLowerCase(); let m;
    if (!s) return { kind: 'nappi' };
    if (KORVAA[s]) return { kind: 'korvaa', what: KORVAA[s] };
    if ((m = s.match(/^(?:klo|kello)?\s*(\d{1,2}[.:]\d{2})$/))) return { kind: 'klo', min: parseTime(m[1]) };
    if ((m = s.match(/^ennen\s*(\d+)/))) return { kind: 'ennen', n: +m[1] };
    if ((m = s.match(/^jälkeen\s*(\d+)/)) || (m = s.match(/^(\d+)\.?\s*kierroksen jälkeen/))) return { kind: 'jalkeen', n: +m[1] };
    return { kind: 'nappi', bad: v };
  }
  async function loadAnn() {
    try {
      const rows = await Store.announcements();
      S.ANN = rows.map(r => ({ id: slug(r.tunnus), label: (r.otsikko || r.tunnus).trim(), text: (r.teksti || '').trim(), when: parseWhen(r.milloin),
        days: String(r['päivä'] ?? r.paiva ?? '').trim() ? String(r['päivä'] ?? r.paiva).split(/[,;]/).map(x => dayOf(x.trim())) : null }));
    } catch (e) { }
    draw();
  }
  const forDay = (a, d) => !a.days || a.days.includes(d);
  const replOf = (what, d) => S.ANN.find(a => a.when.kind === 'korvaa' && a.when.what === what && forDay(a, d));

  /* ---- kuulutusohjelma päivälle ---- */
  /* Päivän ottelupaikat, joissa on ainakin yksi pelattava ottelu. key on pysyvä (päivä-järjestysnumero), joten aikataulun siirto ei hukkaa tietoa. */
  function daySlots(d) {
    return slotsOf(allMatches()).filter(s => s.day === d).map((s, i) => Object.assign(s, { key: d + '-' + i, act: s.ms.filter(m => !cancelled(m)) })).filter(s => s.act.length);
  }
  const allSlots = () => (EVENT.days || [0]).flatMap(daySlots);
  const slotByKey = k => allSlots().find(s => s.key === k);
  const timeSeq = min => { const h = Math.floor(min / 60), m = min % 60; return ['tunti-' + h, ...(m ? ['minuutti-' + p2(m)] : [])]; };
  const multiField = () => fieldList(allMatches()).length > 1;
  const multiSer = () => seriesList(allMatches()).length > 1;
  function callSeq(s, five) {
    const seq = [five ? 'kutsu-5min' : 'kutsu-alku', 'kello', ...timeSeq(s.start)];
    const ms = s.same ? [s.act[0]] : s.act;
    ms.forEach(m => seq.push('joukkue-' + slug(m.home), 'vastaan', 'joukkue-' + slug(m.away), ...(multiField() && !s.same ? [fieldPiece(m.field)] : [])));
    seq.push('kutsu-loppu'); return seq;
  }
  const pairLabel = s => (s.same ? [s.act[0]] : s.act).map(m => `${m.home}–${m.away}`).join(' · ');
  const annItem = (a, d, at, kind) => ({ id: `oma-${a.id}-${d}`, kind: kind || 'oma', label: a.label, sub: kind ? 'Turnauksen oma kuulutus' : 'Lisäkuulutus', at, day: d, seq: [a.id], manual: kind === 'lopetus' || kind === 'paiva-paattyy' });
  function buildProgram(d) {
    const sl = daySlots(d); if (!sl.length) return [];
    const out = [], first = sl[0], last = sl[sl.length - 1], days = EVENT.days || [0], nextDay = days.find(x => x > d);
    const r = replOf('avaus', d);
    out.push(r ? annItem(r, d, first.at - 15, 'avaus') : { id: `avaus-${d}`, kind: 'avaus', label: 'Tervetuloa', sub: 'Avauskuulutus', at: first.at - 15, day: d, seq: ['yleinen-tervetuloa'] });
    sl.forEach((s, i) => {
      const prev = sl[i - 1], afterBreak = prev && s.at - (prev.at + DUR()) >= 20;
      if (afterBreak) {
        const rt = replOf('tauko', d), rl = replOf('tauko-loppuu', d), gap = s.at - (prev.at + DUR());
        out.push(rt ? annItem(rt, d, prev.at + DUR() + 2, 'tauko') : { id: `tauko-${d}-${i}`, kind: 'tauko', label: 'Tauko alkaa', sub: `Seuraavat ottelut klo ${fmtTime(s.start)}`, at: prev.at + DUR() + 2, day: d, seq: ['tauko', 'kello', ...timeSeq(s.start)] });
        if (gap >= 40) out.push(rl ? annItem(rl, d, s.at - 15, 'tauko-loppuu') : { id: `taukoloppuu-${d}-${i}`, kind: 'tauko-loppuu', label: 'Tauko loppuu', sub: '15 min seuraaviin otteluihin', at: s.at - 15, day: d, seq: ['tauko-loppuu'] });
      }
      const five = i === 0 || afterBreak;
      out.push({ id: `kutsu-${s.key}`, kind: 'kutsu', slot: s.key, label: pairLabel(s), sub: `Ottelukutsu ${five ? '5' : '2'} min ennen`, at: s.at - (five ? 5 : 2), day: d, seq: callSeq(s, five) });
    });
    for (const a of S.ANN) {
      if (!forDay(a, d)) continue;
      const w = a.when;
      if (w.kind === 'klo' && w.min != null) out.push(annItem(a, d, d * DAY + w.min));
      if (w.kind === 'ennen') out.push(annItem(a, d, first.at - w.n));
      if (w.kind === 'jalkeen' && sl[w.n - 1]) out.push(annItem(a, d, sl[w.n - 1].at + DUR() + 1));
    }
    if (nextDay != null) {
      const ns = daySlots(nextDay)[0], rp = replOf('paiva-paattyy', d);
      out.push(rp ? annItem(rp, d, last.at + DUR() + 5, 'paiva-paattyy') : { id: `paivapaattyy-${d}`, kind: 'paiva-paattyy', label: 'Päivä päättyy', sub: 'Käsin, kun päivän tulokset on kuulutettu', at: last.at + DUR() + 5, day: d, seq: ['paiva-paattyy', 'kello', ...(ns ? timeSeq(ns.start) : [])], manual: true });
    } else {
      const rl = replOf('lopetus', d);
      out.push(rl ? annItem(rl, d, last.at + DUR() + 5, 'lopetus') : { id: `lopetus-${d}`, kind: 'lopetus', label: 'Kiitos ja näkemiin', sub: 'Turnauksen päätös · käsin loppusijoitusten jälkeen', at: last.at + DUR() + 5, day: d, seq: ['yleinen-lopetus'], manual: true });
    }
    return out;
  }
  let progCache = { sig: '', list: [] };
  function program(d = shownDay()) {
    const sig = d + '|' + JSON.stringify(allMatches().map(m => [m.id, m.at, m.tila])) + '|' + S.ANN.length;
    if (progCache.sig !== sig) progCache = { sig, list: buildProgram(d) };
    return progCache.list.slice().sort((x, y) => timeOf(x) - timeOf(y));
  }
  const findItem = id => { for (const d of EVENT.days || [0]) { const c = buildProgram(d).find(x => x.id === id); if (c) return c; } return null; };
  const timeOf = c => { const o = S.over[ak(c.id)]; return o != null ? c.day * DAY + o : c.at; };
  const minOf = at => ((at % DAY) + DAY) % DAY;
  const isFired = c => live() && !!S.fired[ak(c.id)];
  const isSkip = c => !!S.skip[ak(c.id)];
  const itemText = (c, say) => seqText(c.seq, say);

  /* ---- tulokset ---- */
  function slotResult(s) {
    let done = 0; const r = s.act.map(m => { if (isFinal(m)) done++; return [m.id, m.hg, m.ag]; });
    return { complete: s.act.length > 0 && done === s.act.length, any: done > 0, sig: JSON.stringify(r) };
  }
  /* Tuloskuulutus: sarjoittain (jos sarjoja on useita), joukkue ja lukema nousevalla, toinen joukkue ja lukema laskevalla sävyllä */
  function resultSeq(s) {
    const fin = s.act.filter(isFinal); if (!fin.length) return null;
    const seq = ['tuloksia'], order = seriesList(allMatches());
    for (const ser of order) {
      const ms = fin.filter(m => m.series === ser); if (!ms.length) continue;
      if (multiSer()) seq.push('sarja-' + slug(ser));
      ms.forEach(m => seq.push('joukkue-' + slug(m.home), `luku-${m.hg}-kesken`, 'joukkue-' + slug(m.away), `luku-${m.ag}-loppu`));
    }
    seq.push('kiitos'); return seq;
  }
  function resultText(s) {
    const fin = s.act.filter(isFinal); if (!fin.length) return '';
    const parts = seriesList(allMatches()).map(ser => { const ms = fin.filter(m => m.series === ser); return ms.length ? (multiSer() ? seriesSaid(ser) + ' ' : '') + ms.map(m => `${m.home} ${m.hg}, ${m.away} ${m.ag}.`).join(' ') : ''; }).filter(Boolean);
    return `Tuloksia! ${parts.join(' ')} Kiitos joukkueille hyvistä peleistä!`;
  }
  const tooBig = s => s.act.some(m => isFinal(m) && (m.hg > MAXN || m.ag > MAXN));
  const resLabel = s => s.act.length === 1 || s.same ? `Tulokset ${s.act[0].home}–${s.act[0].away}` : `Tulokset klo ${fmtTime(s.start)}`;
  function sayResult(key, manual) {
    const s = slotByKey(key); if (!s) return;
    if (!resultSeq(s)) { if (manual) toast('Tulosta ei ole vielä vahvistettu tulospalvelussa'); return; }
    if (!slotResult(s).complete && S.ann[ak('r' + key)] == null) { if (manual) toast('Vahvista ensin kaikkien samaan aikaan pelattujen otteluiden tulokset.'); return; }
    S.ann[ak('r' + key)] = slotResult(s).sig; ls.set('k-ann', S.ann);
    enqueue({ key: 'r' + key, seq: tooBig(s) ? null : resultSeq(s), text: resultText(s), say: tooBig(s) ? null : seqText(resultSeq(s), true), fanfare: true, label: resLabel(s) });
    try { if (typeof R !== 'undefined' && R.view === 'list' && typeof render === 'function') render(); } catch (e) { }
  }

  /* ---- loppusijoitukset ---- */
  const allDone = () => { const ms = allMatches().filter(m => !cancelled(m)); return ms.length > 0 && ms.every(isFinal); };
  const standSeries = () => seriesList(allMatches()).filter(s => !S.standOff.includes(s));
  const standTop = ser => standings(allMatches(), ser, (R.data && R.data.adjust) || []).slice(0, 3);
  const standLot = () => standSeries().some(ser => standTop(ser).some(r => r.lot && !(r.adj && r.adj.pos)));
  function standSeq() {
    const seq = ['loppusijoitukset'];
    standSeries().forEach(ser => { if (multiSer()) seq.push('sarja-' + slug(ser)); standTop(ser).forEach((r, n) => seq.push('sija' + (n + 1), 'joukkue-' + slug(r.team))); });
    seq.push('onnittelut'); return seq;
  }
  function standText() {
    const ps = standSeries().map(ser => ({ ser, top: standTop(ser) })).filter(x => x.top.length);
    if (!ps.length) return '';
    return 'Loppusijoitukset! ' + ps.map(x => (multiSer() ? seriesSaid(x.ser) + ' ' : '') + x.top.map((r, n) => ['ensimmäisenä', 'toisena', 'kolmantena'][n] + ' ' + r.team).join(', ') + '.').join(' ') + ' ' + FIXED.onnittelut;
  }
  const standAnn = () => S.ann[ak('stand')] != null;
  function sayStand(withEnd) {
    if (!allDone()) { toast('Kaikkien otteluiden tulokset pitää ensin vahvistaa.'); return; }
    if (standLot()) { toast('Kärkikolmikossa on tasapisteitä, jotka pitää ratkaista. Aseta sija ylläpidon Taulukko-välilehdellä.'); return; }
    S.ann[ak('stand')] = 1; ls.set('k-ann', S.ann);
    enqueue({ key: 'stand', seq: standSeq(), text: standText(), say: seqText(standSeq(), true), fanfare: true, label: 'Loppusijoitukset' });
    if (withEnd) { const c = buildProgram(EVENT.days[EVENT.days.length - 1]).find(x => x.kind === 'lopetus'); if (c) fire(c); }
    draw();
  }

  /* ---- äänentoisto ---- */
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
  const fetchRaw = url => raw[url] || (raw[url] = fetch(url).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null));
  async function getBuffer(id) {
    if (buf[id]) return buf[id];
    let data = null;
    if (/^oma\d$/.test(id)) { const b = await idb('readonly', s => s.get(id)); if (b) data = await b.arrayBuffer(); }
    else { const u = audioUrl(id); if (!u) return null; const d = await fetchRaw(u); if (d) data = d.slice(0); }
    if (!data || !actx) return null;
    try { buf[id] = await new Promise((res, rej) => actx.decodeAudioData(data, res, rej)); } catch (e) { return null; }
    return buf[id];
  }
  /* Palat leikataan hiljaisuudesta ja tasataan äänenvoimakkuudeltaan, jotta koottu kuulutus kuulostaa yhtenäiseltä */
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
  function gapOf(id, next) {
    if (id === 'tuloksia') return .4; if (id === 'kiitos') return 0;
    if (/^sarja-/.test(id)) return .15; if (/-kesken$/.test(id)) return .28; if (/-loppu$/.test(id)) return .6;
    if (/^kentta-/.test(id) || id === 'kutsu-5min' || id === 'kutsu-alku') return .5;
    if (/^minuutti-|^tunti-/.test(id) && !/^minuutti-/.test(next || '')) return .45;
    if (/^joukkue-/.test(id) && /^(joukkue-|kutsu-loppu)/.test(next || '')) return .45;
    return /^(sija[23]|sarja-|onnittelut)/.test(next || '') ? .3 : .07;
  }
  function tone(f, t, len, vol) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + len); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + len + .05); nodes.push(o); }
  function gongAt(t) { if (!S.gong) return 0; tone(659.3, t, 1.2, .5); tone(523.3, t + .55, 1.2, .5); return 1.5; }
  function fanfareAt(t) { if (!S.gong) return 0; [[523.3, 0], [659.3, .16], [784, .32]].forEach(([f, d]) => tone(f, t + d, .5, .35)); [523.3, 659.3, 784, 1046.5].forEach(f => tone(f, t + .5, 1.3, .18)); return 1.7; }
  function attnAt(t) { [[392, 0], [523.3, .32], [659.3, .64], [784, .96]].forEach(([f, d]) => { tone(f, t + d, 1.4, .55); tone(f * 2, t + d, .6, .08); }); return 2.6; }
  /* Varaääni: selaimen suomenkielinen puheääni (esim. Macin Satu). Palauttaa false, jos sellaista ei ole. */
  const fiVoice = () => { try { return (speechSynthesis.getVoices() || []).find(v => /^fi(-|_|$)/i.test(v.lang)) || null; } catch (e) { return null; } };
  function speak(text) {
    text = toEl(text, 'calm');
    return new Promise(res => {
      const v = fiVoice(); if (!v || !text) return res(false);
      const u = new SpeechSynthesisUtterance(text.replace(/[–—]/g, ',')); u.voice = v; u.lang = v.lang; u.rate = .95;
      u.onend = () => res(true); u.onerror = () => res(false); speechSynthesis.speak(u);
    });
  }
  async function playItem(it) {
    const my = stopFlag;
    if (!(await ensureRunning())) { toast('Selain esti äänen. Napauta sivua kerran ja paina nappia uudelleen.'); return; }
    if (it.chime) { playingKey = it.key; paint(); await wait(attnAt(actx.currentTime + .05) * 1000 + 300); if (my === stopFlag) { nodes = []; playingKey = null; } return; }
    const ids = it.own ? [it.own] : it.seq || [], bufs = [];
    let missing = !ids.length;
    for (const id of ids) { const b = await getBuffer(id); if (!b) { missing = true; break; } bufs.push(ids.length > 1 ? trimmed(id, b) : b); }
    if (my !== stopFlag) return;
    playingKey = it.key; paint();
    const t0 = actx.currentTime + .05, intro = it.fanfare ? fanfareAt(t0) : gongAt(t0);
    if (missing) {
      // Äänitettyjä paloja ei ole kaikkia: puheääni tai teksti ruudulle
      await wait(intro * 1000 + 100);
      if (my !== stopFlag) return;
      const spoke = await speak(it.say || it.text);
      if (!spoke && my === stopFlag) { S.showText = { label: it.label, text: it.text }; draw(); }
      if (my === stopFlag) { nodes = []; playingKey = null; paint(); }
      return;
    }
    let t = t0 + intro;
    bufs.forEach((b, i) => { const s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(t); nodes.push(s); t += b.duration + (ids.length > 1 ? gapOf(ids[i], ids[i + 1]) : 0); });
    await wait(Math.max(0, (t - actx.currentTime) * 1000) + 400);
    if (my === stopFlag) { nodes = []; playingKey = null; }
  }
  async function runQueue() { if (running) return; running = true; const my = stopFlag; while (queue.length && my === stopFlag) { const it = queue.shift(); paint(); await playItem(it); } if (my === stopFlag) { running = false; playingKey = null; paint(); } }
  function enqueue(it, front) { if (!it) return; unlock(); if (queue.some(q => q.key === it.key) || playingKey === it.key) return; front ? queue.unshift(it) : queue.push(it); paint(); runQueue(); }
  function stopAll() { stopFlag++; queue = []; nodes.forEach(n => { try { n.stop(); } catch (e) { } }); nodes = []; try { speechSynthesis.cancel(); } catch (e) { } playingKey = null; running = false; paint(); }
  const playable = c => ({ key: c.id, seq: c.seq, text: itemText(c), say: itemText(c, true), label: c.label });

  /* ---- omat pikakuulutukset: äänet IndexedDB:ssä tällä koneella ---- */
  let dbp = null;
  function db() { if (!dbp) dbp = new Promise((res, rej) => { try { const r = indexedDB.open('pelipaiva-kuulutus-' + LS_NS, 1); r.onupgradeneeded = () => r.result.createObjectStore('omat'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); return dbp; }
  async function idb(mode, fn) { try { const d = await db(); return await new Promise((res, rej) => { const tx = d.transaction('omat', mode); const r = fn(tx.objectStore('omat')); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); } catch (e) { return null; } }
  const saveOmat = () => ls.set('k-omat', S.omat);
  /* ElevenLabs-teksti: numerot ja kellonajat sanoiksi, lyhenteet kirjaimittain (joukkueiden lausunta Joukkueet-välilehdeltä) */
  const LETTER = { A: 'aa', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'äf', G: 'gee', H: 'hoo', I: 'ii', J: 'jii', K: 'koo', L: 'äl', M: 'äm', N: 'än', O: 'oo', P: 'pee', Q: 'kuu', R: 'är', S: 'äs', T: 'tee', U: 'uu', V: 'vee', W: 'vee', X: 'äks', Y: 'yy', Z: 'tset', 'Å': 'oo', 'Ä': 'ää', 'Ö': 'öö' };
  const TONES = { excited: { tag: '[excited] ', name: 'Innostunut' }, warm: { tag: '[warmly] ', name: 'Lämmin' }, calm: { tag: '', name: 'Asiallinen' } };
  function toEl(text, tone) {
    let t = ' ' + String(text || '').replace(/\s+/g, ' ').trim() + ' ';
    if (!t.trim()) return '';
    EVENT.teamNames.forEach(k => { const say = EVENT.teams[k] && EVENT.teams[k].say; if (say) t = t.replace(new RegExp('(^|[^\\wåäöÅÄÖ])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\wåäöÅÄÖ])', 'gi'), '$1' + say); });
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
  function fire(c) { S.fired[ak(c.id)] = true; ls.set('k-fired', S.fired); enqueue(playable(c)); }
  function tickAuto() {
    if (S.role === 'kauko' || !S.auto || !live() || !loggedIn()) return;
    const m = nowAt();
    program(today()).forEach(c => { const at = timeOf(c); if (m >= at && m < at + 3 && !isFired(c) && !isSkip(c) && !c.manual) fire(c); });
  }
  async function setAuto(on) {
    S.auto = on; ls.set('k-auto', on);
    if (on) { unlock(); try { lock = await navigator.wakeLock.request('screen'); } catch (e) { } tickAuto(); }
    else { try { if (lock) { await lock.release(); lock = null; } } catch (e) { } }
    draw();
  }
  document.addEventListener('visibilitychange', async () => { if (S.auto && document.visibilityState === 'visible') { try { lock = await navigator.wakeLock.request('screen'); } catch (e) { } } });
  function nextItem() { const m = nowAt(), pr = program(); if (!pr.length) return null; if (!live()) return pr.find(c => !isSkip(c)) || pr[0]; return pr.find(c => timeOf(c) + 3 > m && !isFired(c) && !isSkip(c)) || pr[pr.length - 1]; }
  const isMissed = c => live() && c.day === today() && !isFired(c) && !isSkip(c) && !c.manual && timeOf(c) + 3 <= nowAt();

  /* ---- piirto ---- */
  let panel, toastT;
  function toast(msg) { const t = document.querySelector('.kp-toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 7000); }
  function cdText(sec) { if (sec <= 0) return 'nyt'; const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60); return h ? `${h} h ${p2(m)} min` : m >= 10 ? `${m} min` : `${m}.${p2(s)}`; }
  function resLine(key) {
    const s = slotByKey(key); if (!s) return ''; const sr = slotResult(s); if (!sr.any) return '';
    const txt = s.act.filter(isFinal).map(m => `${multiSer() ? m.series + ' ' : ''}${m.home} ${m.hg}–${m.ag} ${m.away}`).join(' · ');
    const a = S.ann[ak('r' + key)], st = a != null ? (a === sr.sig ? 'kuulutettu' : 'tulos muuttunut') : sr.complete ? 'valmis kuulutettavaksi' : 'odottaa muita otteluita';
    return `<div class="kp-res"><span>${esc(txt)} <em>· ${st}</em></span><button class="kp-mini" data-kres="${key}" ${sr.complete || a != null ? '' : 'disabled title="Vahvista ensin kaikki samaan aikaan pelatut ottelut"'}>${a != null ? 'Uudelleen' : 'Kuuluta'}</button></div>`;
  }
  function standBox(inNext) {
    const done = allDone(), lot = done && standLot(), ann = standAnn(), txt = standText();
    if (inNext && (!done || ann)) return '';
    const missing = allMatches().filter(m => !cancelled(m) && !isFinal(m)).length;
    const sers = seriesList(allMatches());
    return `<div class="${inNext ? 'kp-ready' : ''}">${inNext ? '<div class="kp-eyebrow">Loppusijoitukset valmiina</div>' : ''}<div class="kp-rcard">
      ${txt ? `<p>”${esc(txt)}”</p>` : ''}
      ${sers.length > 1 ? sers.map(s => `<label class="kp-chk" style="margin:0"><input type="checkbox" data-kstandser="${esc(s)}" ${S.standOff.includes(s) ? '' : 'checked'}> Kuulutetaan ${esc(s)}-sarjan kärki</label>`).join('') : ''}
      <p class="kp-help" style="margin:0">${!done ? `Odottaa vielä ${missing} ottelun tulosta. Sijoitukset voivat muuttua.` : lot ? 'Kärkikolmikossa on ratkaisemattomia tasapisteitä. Aseta sija Taulukko-välilehdellä.' : ann ? 'Kuulutettu.' : 'Kaikki tulokset vahvistettu.'}</p>
      <button class="kp-rbtn" data-kstand="1" ${done && !lot ? '' : 'disabled'}>${ico('mega')} ${ann ? 'Kuuluta uudelleen' : 'Kuuluta loppusijoitukset'} + lopetus</button>
      <button class="kp-mini" data-kstand="0" ${done && !lot ? '' : 'disabled'}>Vain loppusijoitukset</button></div></div>`;
  }
  function readyBox() {
    const ready = daySlots(shownDay()).filter(s => slotResult(s).complete && S.ann[ak('r' + s.key)] == null);
    if (!ready.length) return standBox(true);
    return `<div class="kp-ready"><div class="kp-eyebrow">Tulokset valmiina kuulutettavaksi</div>${ready.map(s => `<div class="kp-rcard"><p>”${esc(resultText(s))}”</p><button class="kp-rbtn" data-kres="${s.key}">${ico('mega')} Kuuluta ${esc(resLabel(s).toLowerCase())}</button></div>`).join('')}<div class="kp-note">Hyvä hetki on otteluiden välissä, ennen seuraavaa ottelukutsua.</div></div>`;
  }
  /* Puuttuvat äänipalat ohjelmasta, tuloksista ja sijoituksista. Ilman niitä kuulutus tulee puheäänellä tai tekstinä. */
  function neededPieces() {
    const set = new Set(['tuloksia', 'kiitos', 'loppusijoitukset', 'sija1', 'sija2', 'sija3', 'onnittelut']);
    (EVENT.days || [0]).forEach(d => buildProgram(d).forEach(c => c.seq.forEach(id => set.add(id))));
    const teams = uniq(allMatches().flatMap(m => [m.home, m.away]));
    teams.forEach(t => set.add('joukkue-' + slug(t)));
    if (multiSer()) seriesList(allMatches()).forEach(s => set.add('sarja-' + slug(s)));
    for (let n = 0; n <= MAXN; n++) { set.add(`luku-${n}-kesken`); set.add(`luku-${n}-loppu`); }
    S.ANN.forEach(a => set.add(a.id));
    return [...set];
  }
  function audioBox() {
    if (!S.manOk) return '<p class="kp-help">Tarkistetaan äänipaloja…</p>';
    const need = neededPieces(), miss = need.filter(id => !audioUrl(id));
    const own = miss.filter(pieceOwn), shared = miss.filter(id => !pieceOwn(id));
    const line = id => `<div class="kp-arow"><code>${esc(id)}.mp3</code><span>${esc(toEl(pieceText(id, true), 'calm'))}${pieceHint(id) ? ` <em>· ${esc(pieceHint(id))}</em>` : ''}</span><button class="kp-play" data-kpiece="${esc(id)}" aria-label="Kuuntele puheäänellä">${PLAY}</button></div>`;
    return `<p class="kp-help">${need.length - miss.length}/${need.length} äänipalaa äänitetty. ${miss.length ? 'Puuttuvat kuulutetaan selaimen puheäänellä, tai jos sitä ei ole, teksti näytetään luettavaksi. Kuulutus kuulostaa parhaalta, kun palat on äänitetty samalla äänellä.' : 'Kaikki tarvittavat palat ovat valmiina.'}</p>
      ${!fiVoice() ? `<div class="kp-note">${ico('warn')} Tällä selaimella ei ole suomenkielistä puheääntä. Puuttuvat kuulutukset näytetään tekstinä, joka luetaan itse mikrofoniin.</div>` : ''}
      ${own.length ? `<h4>Turnauksen omat (kansioon <code>${esc(location.pathname.replace(/[^/]*$/, '').replace(/^\//, ''))}aanet/</code>)</h4>${own.map(line).join('')}` : ''}
      ${shared.length ? `<h4>Yhteiset (kansioon <code>pelipaiva/aanet/</code>, käytössä kaikissa turnauksissa)</h4>${shared.map(line).join('')}` : ''}
      ${miss.length ? `<div class="kp-btns"><button class="kp-mini" data-kcopymiss>Kopioi puuttuvat listana</button></div>
      <p class="kp-help">ElevenLabs (Christoffer Weiss · v4 · Finnish · Stability 40 % · Similarity 75 %): tee jokaisesta rivistä oma mp3 ja nimeä se rivin tiedostonimellä. Lisää tiedostot repoon ja aja <code>node pelipaiva/tyokalut/pelipaiva.mjs paivita</code>.</p>` : ''}`;
  }
  function row(c, nx) {
    const t = timeOf(c), f = isFired(c), sk = isSkip(c), ms = isMissed(c), over = S.over[ak(c.id)] != null, moved = over;
    return `<div class="kp-row ${c === nx ? 'next' : ''} ${f ? 'done' : ''} ${sk ? 'skip' : ''} ${ms ? 'missed' : ''}">
      ${S.editing === c.id ? `<div class="kp-tedit"><input type="time" step="60" data-kover="${c.id}" value="${fmtTime(minOf(t)).replace('.', ':')}" aria-label="Uusi aika"><div class="kp-btns" style="gap:4px"><button class="kp-mini kp-save" data-kovsave="${c.id}">Tallenna</button><button class="kp-mini" data-kovreset="${c.id}" title="Palauta aikataulun mukainen aika">Autom.</button><button class="kp-mini" data-kovcancel aria-label="Peru">✕</button></div></div>` : `<button class="kp-t kp-tbtn" data-kedit="${c.id}" title="Muuta aikaa">${fmtTime(minOf(t))}${moved ? `<s>${fmtTime(minOf(c.at))}</s><em>käsin</em>` : ''}</button>`}
      <div class="kp-l" data-ktxt="${c.id}" title="Näytä kuulutuksen teksti"><b>${esc(c.label)}</b><small>${esc(c.sub)}${f ? ' · kuulutettu' : ''}${sk ? ' · ohitetaan' : ''}${c.seq.some(id => !audioUrl(id)) && S.manOk ? ' · puheääni' : ''}</small>${ms ? `<span class="kp-miss">${ico('warn')} Jäi kuuluttamatta <button class="kp-mini kp-save" data-kfirenow="${c.id}">Kuuluta nyt</button></span>` : !f && !sk && !c.manual ? `<span class="kp-cd" data-kcd="${t}"></span>` : ''}</div>
      <button class="kp-skip ${sk ? 'on' : ''}" data-kskip="${c.id}">${sk ? 'Palauta' : 'Ohita'}</button>
      <button class="kp-play" data-kplay="${c.id}" aria-label="Soita ${esc(c.label)}">${PLAY}</button></div>${S.txt[c.id] ? `<div class="kp-txt"><p>”${esc(itemText(c))}”</p>${c.slot ? `<p class="kp-txtres"><b>Tuloskuulutus otteluiden jälkeen:</b> ${resultText(slotByKey(c.slot) || { act: [] }) ? '”' + esc(resultText(slotByKey(c.slot))) + '”' : 'kootaan, kun tulokset on vahvistettu.'}</p>` : ''}</div>` : ''}${c.slot ? resLine(c.slot) : ''}`;
  }
  function dayPick() {
    if (!EVENT.multiDay || live()) return '';
    const d = shownDay();
    return `<div class="kp-days" role="group" aria-label="Päivä">${EVENT.days.map(x => `<button class="kp-mini ${x === d ? 'on' : ''}" data-kday="${x}">${esc(dayShort(x))}</button>`).join('')}</div>`;
  }
  function draw() {
    if (!panel) return;
    document.body.classList.toggle('kp-on', loggedIn());
    if (!loggedIn()) return;
    const nx = nextItem(), lv = live(), pr = program();
    const head = nx ? `<div class="kp-eyebrow">${lv ? 'Seuraavaksi' : (EVENT.multiDay ? esc(dayShort(nx.day)) + ' · ensimmäinen' : 'Turnauspäivän ensimmäinen')} · klo ${fmtTime(minOf(timeOf(nx)))}</div><div class="kp-what">${esc(nx.label)}</div>` : '<div class="kp-what">Ei otteluita</div>';
    const autoTxt = !nx ? '' : S.auto ? (lv ? `Kuulutetaan automaattisesti klo ${fmtTime(minOf(timeOf(nx)))}. Jos haluat sen jo aiemmin, paina Kuuluta nyt: kuulutus tulee heti, eikä sitä toisteta.` : `Tänään ei pelata. Automaatti alkaa kuuluttaa itse pelipäivinä (${esc(EVENT.dateText)}). Voit kuunnella kuulutuksia listan soitto-napeista tai kokeilla koko päivää kohdassa Asetukset ja testaus.`) : 'Automaatti pois. Kuulutukset tulevat vain, kun painat nappia.';
    panel.querySelector('.kp-next').innerHTML = `
      <div class="kp-unlock" data-kunlock hidden>${ico('spk')} Napauta tästä, jotta kuulutukset kuuluvat</div>
      ${S.showText ? `<div class="kp-readout"><div class="kp-eyebrow">Lue ääneen · ${esc(S.showText.label)}</div><p>${esc(S.showText.text)}</p><button class="kp-mini" data-kreadok>Luettu</button></div>` : ''}
      ${head}<div class="kp-big" data-kbig="${nx ? timeOf(nx) : ''}"></div>
      ${S.role === 'kauko' ? `<div class="kp-note">${ico('phone')} <b>Kauko-ohjain.</b> Automaatti ja äänet toimivat kuulutuskoneella.</div>` : `<div class="kp-btns"><button class="kp-auto ${S.auto ? 'on' : ''}" data-kauto>${S.auto ? 'Automaatti päällä · pysäytä' : 'Käynnistä automaatti'}</button></div>`}
      <div class="kp-btns">${lv && nx ? `<button class="kp-ghost" data-kfirenow="${nx.id}" title="Soittaa tämän kuulutuksen heti. Automaatti ei soita sitä enää uudelleen.">Kuuluta nyt</button>` : ''}<button class="kp-ghost" data-kattn>${ico('bell')} Huomioääni</button></div>
      <div class="kp-note">${autoTxt}</div><div class="kp-q" data-kq></div>${(() => { const mi = pr.filter(isMissed); return mi.length ? `<div class="kp-note" style="font-weight:700">${ico('warn')} ${mi.length} kuulutus${mi.length > 1 ? 'ta' : ''} jäi kuuluttamatta (${mi.map(c => esc(c.label)).join(', ')}). Kuuluta ne listasta tai ohita.</div>` : ''; })()}${readyBox()}`;
    const ed = panel.querySelector('[data-kover]'), edVal = ed && ed.value, edFocus = ed && document.activeElement === ed;
    panel.querySelector('.kp-daypick').innerHTML = dayPick();
    panel.querySelector('.kp-list').innerHTML = pr.map(c => row(c, nx)).join('') || '<p class="kp-help">Tälle päivälle ei ole otteluita.</p>';
    if (ed) { const ne = panel.querySelector('[data-kover]'); if (ne) { ne.value = edVal; if (edFocus) ne.focus(); } }
    const extras = S.ANN.filter(a => a.when.kind === 'nappi' || a.when.kind === 'klo' || a.when.kind === 'ennen' || a.when.kind === 'jalkeen');
    panel.querySelector('.kp-extras').innerHTML = extras.length ? extras.map(a => `<button class="kp-xbtn" data-kann="${esc(a.id)}" title="${esc(a.text)}">${PLAY}<span>${esc(a.label)}</span></button>`).join('')
      : '<p class="kp-help" style="margin:0">Lisää turnauksen omat kuulutukset (kahvio, lounas, säännöt…) Google Sheetin Kuulutukset-välilehdelle.</p>';
    const bad = S.ANN.filter(a => a.when.bad); panel.querySelector('.kp-annbad').innerHTML = bad.length ? `<div class="kp-note">${ico('warn')} Kuulutukset-välilehdellä tuntematon milloin-arvo: ${bad.map(a => `${esc(a.label)} (”${esc(a.when.bad)}”)`).join(', ')}. Ne näkyvät vain nappeina.</div>` : '';
    panel.querySelector('.kp-testwrap').innerHTML = roleBox() + testBar();
    panel.querySelector('.kp-stand').innerHTML = standBox(false);
    const ab = panel.querySelector('.kp-aanet'); if (ab && ab.closest('details').open) ab.innerHTML = audioBox();
    drawOmat(); paint(); tickCd();
  }
  function drawOmat(force) {
    const box = panel.querySelector('.kp-omat');
    if (!force && box.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')) return;
    box.innerHTML = S.omat.map((o, i) => { const id = 'oma' + (i + 1), ok = !!S.ownAudio[id], el = toEl(o.text, o.tone);
      return `<div class="kp-oma ${ok ? 'ok' : ''}">
        <div class="kp-oh"><input data-koml="${i}" value="${esc(o.label)}" maxlength="40" aria-label="Napin nimi"><button class="kp-play" data-kplay="${id}" aria-label="Soita">${PLAY}</button></div>
        <details><summary>${ok ? 'Ääni valmis · muokkaa' : 'Tee kuulutus'}</summary>
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
    panel.querySelectorAll('[data-kann]').forEach(b => b.classList.toggle('playing', 'ann-' + b.dataset.kann === playingKey));
    panel.querySelectorAll('[data-kres]').forEach(b => b.classList.toggle('playing', 'r' + b.dataset.kres === playingKey));
    const ab = panel.querySelector('[data-kattn]'); if (ab) ab.classList.toggle('playing', playingKey === 'huomio');
    panel.querySelector('[data-kstop]').disabled = !playingKey && !queue.length;
    const q = panel.querySelector('[data-kq]'); if (q) q.textContent = queue.length ? 'Jonossa: ' + queue.map(i => i.label || i.key).join(' → ') : '';
  }
  function tickCd() {
    if (!panel || !loggedIn()) return;
    const d = now(), at = nowAt(), lv = live();
    panel.querySelector('.kp-clock').innerHTML = `${p2(d.getHours())}.${p2(d.getMinutes())}<span>.${p2(d.getSeconds())}</span>`;
    panel.querySelectorAll('[data-kcd]').forEach(el => { const t = (el.dataset.kcd - at) * 60; el.textContent = lv && t > -180 ? (t > 0 ? 'kuulutetaan ' + cdText(t) + ' päästä' : 'kuulutetaan nyt') : ''; });
    const b = panel.querySelector('[data-kbig]');
    if (b && b.dataset.kbig !== '') { const t = Math.round((b.dataset.kbig - at) * 60); b.innerHTML = !lv ? '' : t > 0 ? `${t >= 3600 ? Math.floor(t / 3600) + '.' + p2(Math.floor(t % 3600 / 60)) + '.' + p2(t % 60) : Math.floor(t / 60) + '.' + p2(t % 60)}<small>kuulutukseen</small>` : `Nyt<small>${S.auto ? 'kuulutetaan' : 'paina Kuuluta nyt'}</small>`; }
    const un = panel.querySelector('[data-kunlock]'); if (un) un.hidden = !needUnlock();
  }

  /* ---- paneeli ---- */
  function build() {
    panel = document.createElement('aside'); panel.className = 'kp'; panel.setAttribute('aria-label', 'Kuulutukset');
    panel.innerHTML = `
      <div class="kp-head"><div><div class="kp-title">Kuulutukset</div><div class="kp-sub">Ajat seuraavat tulospalvelun aikataulua</div></div><div class="kp-clock">--.--</div>
        <button class="kp-stop" data-kstop disabled>Stop</button><button class="kp-close" data-kclose aria-label="Sulje">✕</button></div>
      <div class="kp-body">
        <section class="kp-next"></section>
        <div class="kp-testwrap"></div>
        <details class="kp-sec kp-memo"><summary>${ico('list')} Muistilista</summary>
          <h4>Kuulutuskone: läppäri</h4>
          <ul><li>Kansi auki ja virtajohto kiinni. Kannen sulkeminen vie koneen lepotilaan.</li>
          <li>Chrome, ylläpito auki ja kirjautuneena (ilman #harjoitus-loppua).</li>
          <li>Macissa <b>Älä häiritse</b> päälle, ettei ilmoitusäänet kuulu kaiuttimista.</li>
          <li>Koneen äänenvoimakkuus noin 75 %, varsinainen taso hallin mikseristä.</li></ul>
          <h4>Kuulutuskone: iPad</h4>
          <ul><li>Valitse yläosasta <b>Kuulutuskone</b>. iPad on oletuksena kauko-ohjain.</li>
          <li>Asetukset → Näyttö ja kirkkaus → <b>Automaattilukitus: Ei koskaan</b>. Virransäästötila pois.</li>
          <li>Safari edessä, älä vaihda sovellusta äläkä paina virtanappia. Varmin tapa on <b>Ohjattu käyttö</b>.</li>
          <li>Jos näyttö lukittuu, sivu pysähtyy: automaatti ja kauko-ohjaus eivät toimi, ja yli 3 min myöhästyneet kuulutukset jäävät soimatta.</li></ul>
          <h4>Äänentoisto</h4>
          <ul><li>Selvitä etukäteen hallin mikserin tulo (yleensä LINE IN tai Aux) ja ota varalle 3,5 mm → RCA- ja 6,3 mm -adapterit.</li>
          <li>Surina laturin kanssa → maadoitussilmukan erotin tai akulla.</li></ul>
          <h4>Pelipäivän aamuna</h4>
          <ul><li>Napauta sivua kerran, jotta ääni sallitaan. Punainen palkki katoaa.</li>
          <li>Testaa ääni (Asetukset ja testaus) ja Huomioääni.</li>
          <li>Automaatti päällä, kortissa näkyy päivän ensimmäinen kuulutus.</li>
          <li>Kauko-ohjain: kokeile puhelimesta yksi Muut kuulutukset -nappi, kuittaus tulee muutamassa sekunnissa.</li></ul>
          <h4>Päivän aikana</h4>
          <ul><li>Myöhästymiset: siirrä otteluita ylläpidon Aikataulu-välilehdellä. Kuulutukset siirtyvät mukana, ja kutsuissa sanotaan uusi kellonaika. Yksittäisen kuulutuksen aikaa voi muuttaa klikkaamalla kellonaikaa.</li>
          <li>Tulevaan aikaan siirretty kuulutus soi itse. Yli 3 min menneeseen aikaan siirretty pitää kuuluttaa Kuuluta nyt -napista.</li>
          <li>Tulokset: nappi aktivoituu, kun kaikki samaan aikaan pelatut ottelut on vahvistettu. Kuuluta otteluiden välissä.</li>
          <li>Päivän lopuksi: Päivä päättyy -kuulutus (monipäiväinen) tai Kuuluta loppusijoitukset + lopetus. Nämä eivät soi itsestään.</li></ul>
        </details>
        <details class="kp-sec" open><summary>Päivän ohjelma</summary><div class="kp-daypick"></div><div class="kp-list"></div>
          <p class="kp-help">Kutsut soivat 2 min ennen ottelua (päivän ensimmäinen ja tauon jälkeinen 5 min ennen). Tauko kuulutetaan, kun otteluiden väli on vähintään 20 min. Turnauksen omat kuulutukset ja niiden ajat tulevat Kuulutukset-välilehdeltä. Tuloskuulutus kootaan vahvistetuista tuloksista, mutta se kuulutetaan vasta, kun painat Kuuluta-nappia.</p></details>
        <details class="kp-sec"><summary>Loppusijoitukset</summary><div class="kp-stand"></div><p class="kp-help">Kootaan sarjataulukoista (3 parasta). Lopetuskuulutus ei soi itsestään, vaan tulee tämän napin kautta loppusijoitusten perään.</p></details>
        <details class="kp-sec" open><summary>Muut kuulutukset</summary><div class="kp-annbad"></div><div class="kp-extras"></div></details>
        <details class="kp-sec"><summary>Omat pikakuulutukset</summary>
          <p class="kp-help">Kirjoita teksti tavallisesti → <b>Kopioi ElevenLabsiin</b> → <a href="https://elevenlabs.io/app/speech-synthesis/text-to-speech" target="_blank" rel="noopener">ElevenLabs</a> → lataa mp3 → <b>Lisää ääni</b>. Äänet tallentuvat tämän koneen selaimeen.</p>
          <div class="kp-omat"></div></details>
        <details class="kp-sec" data-kaudio><summary>${ico('wave')} Äänet</summary><div class="kp-aanet"></div></details>
        <details class="kp-sec"><summary>Asetukset ja testaus</summary>
          <label class="kp-chk">Tämä laite: <select data-krolesel><option value="soitin">Kuulutuskone (soittaa äänet)</option><option value="kauko">Kauko-ohjain</option></select></label>
          <label class="kp-chk"><input type="checkbox" data-kgong ${S.gong ? 'checked' : ''}> Merkkiääni ennen kuulutusta ja fanfaari ennen tuloksia</label>
          <div class="kp-btns"><button class="kp-mini" data-ktest>Testaa ääni</button><button class="kp-mini" data-kclock>Testikello: päivän alkuun</button><button class="kp-mini" data-kjump>Hyppää 10 s ennen seuraavaa kuulutusta</button><button class="kp-mini" data-krealclock>Oikea kello</button><button class="kp-mini" data-kreset>Nollaa soitetut ja kuulutetut</button></div>
          <p class="kp-help">Kytke kone hallin äänentoistoon ja testaa äänenvoimakkuus. Pidä tämä sivu auki ja kone hereillä.</p></details>
      </div>
`;
    document.body.append(panel);
    const tst = document.createElement('div'); tst.className = 'kp-toast'; tst.setAttribute('role', 'status'); tst.hidden = true; document.body.append(tst);
    const fab = document.createElement('button'); fab.className = 'kp-fab'; fab.dataset.kopen = ''; fab.innerHTML = ico('spk') + ' Kuulutukset'; document.body.append(fab);
    panel.querySelector('[data-kaudio]').addEventListener('toggle', e => { if (e.target.open) draw(); });
  }

  /* ---- tapahtumat ---- */
  ['pointerdown', 'mousedown', 'click', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (needUnlock()) unlock(); }, true));
  function setRole(v) { if (S.role === v) return; S.role = v; ls.set('k-role', v); if (v === 'kauko') stopAll(); else preload(); draw(); toast(v === 'kauko' ? 'Tämä laite on nyt kauko-ohjain: kuulutukset soivat kuulutuskoneelta.' : 'Tämä laite on nyt kuulutuskone: kuulutukset soivat tästä.'); }
  function preload() { if (S.role !== 'soitin' || !S.manOk) return; neededPieces().forEach(id => { const u = audioUrl(id); if (u) fetchRaw(u); }); }
  document.addEventListener('pointerup', e => { const b = e.target.closest && e.target.closest('[data-krole]'); if (b) setRole(b.dataset.krole); }, true);
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.krolesel != null) setRole(e.target.value); });
  document.addEventListener('click', async e => {
    const q = s => e.target.closest(s); let t;
    if (q('[data-kopen]')) { panel.classList.add('open'); return; }
    if (q('[data-kclose]')) { panel.classList.remove('open'); return; }
    if ((t = q('[data-krole]'))) { setRole(t.dataset.krole); return; }
    if ((t = q('[data-kday]'))) { S.viewDay = +t.dataset.kday; draw(); return; }
    if ((t = q('[data-kedit]'))) { S.editing = t.dataset.kedit; draw(); const inp = panel.querySelector('[data-kover]'); if (inp) { inp.focus(); try { inp.showPicker && inp.showPicker(); } catch (err) { } } return; }
    if ((t = q('[data-kovreset]'))) { setOver(t.dataset.kovreset, null); return; }
    if ((t = q('[data-kovsave]'))) { commitOver(panel.querySelector(`[data-kover="${t.dataset.kovsave}"]`)); return; }
    if (q('[data-kovcancel]')) { S.editing = null; draw(); return; }
    if (q('[data-kreadok]')) { S.showText = null; draw(); return; }
    if (S.role === 'kauko') { const cmd = remoteCmd(q); if (cmd) { sendRemote(...cmd); return; } }
    if ((t = q('[data-kstand]'))) { if (playingKey === 'stand') { stopAll(); return; } unlock(); sayStand(t.dataset.kstand === '1'); return; }
    if ((t = q('[data-kmres]'))) { const k = t.dataset.kmres; if (playingKey === 'r' + k) { stopAll(); return; } unlock(); sayResult(k, true); draw(); matchCard(); return; }
    if (!panel || !panel.contains(e.target)) return;
    if (q('[data-kunlock]')) { unlock(); setTimeout(tickCd, 200); return; }
    if (q('[data-kauto]')) { setAuto(!S.auto); return; }
    if ((t = q('[data-kfirenow]'))) { const c = findItem(t.dataset.kfirenow); if (c) { fire(c); draw(); } return; }
    if (q('[data-kstop]')) { stopAll(); return; }
    if (q('[data-kattn]')) { if (playingKey === 'huomio') { stopAll(); return; } enqueue({ key: 'huomio', chime: true, label: 'Huomioääni' }, true); return; }
    if ((t = q('[data-kpiece]'))) { const id = t.dataset.kpiece; stopAll(); unlock(); enqueue({ key: 'pala-' + id, seq: [id], text: pieceText(id), say: pieceText(id, true), label: id }); return; }
    if ((t = q('[data-kann]'))) { const a = S.ANN.find(x => x.id === t.dataset.kann); if (!a) return; if (playingKey === 'ann-' + a.id) { stopAll(); return; } enqueue({ key: 'ann-' + a.id, seq: [a.id], text: a.text, label: a.label }); return; }
    if ((t = q('[data-kplay]'))) { const id = t.dataset.kplay; if (playingKey === id) { stopAll(); return; }
      if (/^oma\d$/.test(id)) { if (!S.ownAudio[id]) { toast('Lisää ensin ääni tälle napille'); return; } enqueue({ key: id, own: id, text: S.omat[+id.slice(3) - 1].text, label: S.omat[+id.slice(3) - 1].label }); return; }
      const c = findItem(id); if (c) enqueue(playable(c)); return; }
    if ((t = q('[data-kres]'))) { const k = t.dataset.kres; if (playingKey === 'r' + k) { stopAll(); return; } sayResult(k, true); draw(); return; }
    if ((t = q('[data-ktxt]'))) { const id = t.dataset.ktxt; S.txt[id] = !S.txt[id]; draw(); return; }
    if ((t = q('[data-kskip]'))) { const id = t.dataset.kskip; if (S.skip[ak(id)]) delete S.skip[ak(id)]; else S.skip[ak(id)] = true; ls.set('k-skip', S.skip); queue = queue.filter(x => x.key !== id); draw(); return; }
    if (q('[data-ktest]')) { stopAll(); unlock(); const t0 = actx.currentTime + .05; gongAt(t0); fanfareAt(t0 + 1.8); return; }
    if (q('[data-kclock]')) { startTest(1); toast('Testikello: kello hyppäsi päivän ensimmäistä kuulutusta edeltävään minuuttiin, ja testin kuulutukset nollattiin'); return; }
    if (q('[data-kjump]')) { if (!S.vt) { toast('Aloita ensin testi'); return; } const nx = nextItem(); if (!nx) return; setVirtual(dayDate(nx.day).getTime() + minOf(timeOf(nx)) * 60000 - 10000); draw(); toast('Kello: 10 s ennen kuulutusta ' + nx.label); return; }
    if (q('[data-krealclock]')) { S.vt = null; stopAll(); draw(); toast('Testi lopetettu, kello on taas oikea'); return; }
    if ((t = q('[data-kspeed]'))) { setSpeed(+t.dataset.kspeed); draw(); return; }
    if (q('[data-kfulltest]')) { startFullTest(); return; }
    if ((t = q('[data-kreset]'))) { if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Paina uudelleen vahvistaaksesi'; setTimeout(() => { t.dataset.sure = ''; t.textContent = 'Nollaa soitetut ja kuulutetut'; }, 3000); return; }
      S.fired = {}; S.ann = {}; S.skip = {}; ls.set('k-fired', {}); ls.set('k-ann', {}); ls.set('k-skip', {}); draw(); return; }
    if (q('[data-kcopymiss]')) { const miss = neededPieces().filter(id => !audioUrl(id)); const txt = miss.map(id => `${id}.mp3\t${toEl(pieceText(id, true), 'calm')}`).join('\n');
      try { await navigator.clipboard.writeText(txt); toast(`${miss.length} puuttuvaa palaa kopioitu leikepöydälle`); } catch (err) { toast('Kopiointi ei onnistunut tässä selaimessa'); } return; }
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
    if (d.kstandser != null) { const s = d.kstandser; S.standOff = e.target.checked ? S.standOff.filter(x => x !== s) : [...S.standOff, s]; ls.set('k-standoff', S.standOff); draw(); return; }
    if (d.kgong != null) { S.gong = e.target.checked; ls.set('k-gong', S.gong); }
  });

  /* ---- kauko-ohjaus: puhelin lähettää komennon, kuulutuskone soittaa ----
     Komento kulkee tulospalvelun Asetukset-välilehden rivin viimeisin_testi kautta (sama kuin yhteystesti).
     Kuulutuskone lukee riviä muutaman sekunnin välein ja kuittaa. */
  function setOver(id, min, fromRemote) {
    if (min == null) delete S.over[ak(id)]; else S.over[ak(id)] = min;
    ls.set('k-over', S.over); S.editing = null;
    const c = findItem(id);
    if (c && min != null && c.day * DAY + min > nowAt()) delete S.fired[ak(id)];
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
    if ((t = q('[data-kann]'))) return ['ann', t.dataset.kann];
    if (q('[data-kattn]')) return ['attn', ''];
    if (q('[data-kstop]')) return ['stop', ''];
    return null;
  }
  const CMD_LABEL = { time: 'kellonajan muutos', res: 'tulokset', stand: 'loppusijoitukset', fire: 'kuulutus', play: 'kuulutus', ann: 'kuulutus', attn: 'huomioääni', stop: 'pysäytys' };
  let pending = null;
  async function sendRemote(cmd, arg) {
    if (cmd === 'res') { const s = slotByKey(arg); if (s && !slotResult(s).complete && S.ann[ak('r' + arg)] == null) { toast('Vahvista ensin kaikkien samaan aikaan pelattujen otteluiden tulokset.'); return; } }
    const nonce = Math.random().toString(36).slice(2, 8);
    try { await Store.send({ action: 'ping', value: `K|${nonce}|${cmd}|${arg}|${Date.now()}` }, R.pin); }
    catch (e) { toast('Komentoa ei saatu lähetettyä. Tarkista nettiyhteys.'); return; }
    if (cmd === 'res') { const s = slotByKey(arg); if (s) { S.ann[ak('r' + arg)] = slotResult(s).sig; ls.set('k-ann', S.ann); } }
    if (cmd === 'stand') { S.ann[ak('stand')] = 1; ls.set('k-ann', S.ann); }
    pending = { nonce, cmd, at: Date.now() }; draw(); matchCard();
    toast(`Lähetetty kuulutuskoneelle: ${CMD_LABEL[cmd]}. Odotetaan kuittausta…`);
  }
  async function readRemote() {
    if (Store.demo) { const d = Store.demoData(); return (d && d.settings && d.settings.viimeisin_testi) || ''; }
    const rows = await Store.gviz('Asetukset'); const r = rows.find(x => (x.avain || '').trim().toLowerCase() === 'viimeisin_testi'); return r ? String(r.arvo || '') : '';
  }
  let lastPoll = 0, polling = false;
  async function pollRemote() {
    if (!loggedIn() || polling) return;
    const iv = S.role === 'soitin' ? 4000 : pending ? 3000 : 0; if (!iv || Date.now() - lastPoll < iv) return;
    lastPoll = Date.now(); polling = true;
    try {
      if (Store.demo) Store._demo = null; // harjoitustilassa kauko-ohjain ja kuulutuskone voivat olla saman selaimen eri välilehtiä
      const v = await readRemote(), parts = v.split('|');
      if (S.role === 'soitin' && parts[0] === 'K') {
        const [, nonce, cmd, arg, ts] = parts, seen = ls.get('k-lastnonce', '');
        if (nonce && nonce !== seen && Math.abs(Date.now() - +ts) < 300000) { ls.set('k-lastnonce', nonce); await execRemote(cmd, arg); try { await Store.send({ action: 'ping', value: `A|${nonce}|ok` }, R.pin); } catch (e) { } }
      }
      if (S.role === 'kauko' && pending) {
        if (parts[0] === 'A' && parts[1] === pending.nonce) { toast(`Kuulutuskone kuuluttaa: ${CMD_LABEL[pending.cmd]}`); pending = null; }
        else if (Date.now() - pending.at > 30000) { toast('Kuulutuskone ei kuitannut. Onko kone päällä, ylläpito auki ja kirjautuneena?'); pending = null; }
      }
    } catch (e) { } finally { polling = false; }
  }
  async function execRemote(cmd, arg) {
    unlock();
    /* Puhelimella juuri vahvistettu tulos ei ehkä ole vielä tällä koneella: haetaan tiedot ensin */
    if ((cmd === 'res' && !(slotByKey(arg) && slotResult(slotByKey(arg)).complete)) || (cmd === 'stand' && !allDone())) { try { if (typeof load === 'function') await load(); } catch (e) { } }
    if (cmd === 'res') { delete S.ann[ak('r' + arg)]; sayResult(arg, true); }
    else if (cmd === 'stand') sayStand(arg === '1');
    else if (cmd === 'fire') { const c = findItem(arg); if (c) fire(c); }
    else if (cmd === 'play') { if (/^oma\d$/.test(arg)) { if (S.ownAudio[arg]) enqueue({ key: arg, own: arg, text: S.omat[+arg.slice(3) - 1].text, label: S.omat[+arg.slice(3) - 1].label }); } else { const c = findItem(arg); if (c) enqueue(playable(c)); } }
    else if (cmd === 'ann') { const a = S.ANN.find(x => x.id === arg); if (a) enqueue({ key: 'ann-' + a.id, seq: [a.id], text: a.text, label: a.label }); }
    else if (cmd === 'attn') enqueue({ key: 'huomio', chime: true, label: 'Huomioääni' }, true);
    else if (cmd === 'stop') stopAll();
    else if (cmd === 'time') { const i = arg.lastIndexOf(':'), id = arg.slice(0, i), m = arg.slice(i + 1); setOver(id, m === '' ? null : +m, true); }
    toast('Kauko-ohjaus: ' + (CMD_LABEL[cmd] || cmd)); draw();
  }
  function roleBox() {
    return `<div class="kp-role"><span>Tämä laite:</span><button class="kp-mini ${S.role === 'soitin' ? 'on' : ''}" data-krole="soitin">${ico('spk')} Kuulutuskone</button><button class="kp-mini ${S.role === 'kauko' ? 'on' : ''}" data-krole="kauko">${ico('phone')} Kauko-ohjain</button></div>
      ${S.role === 'kauko' ? '<p class="kp-help" style="margin:0">Napit lähettävät kuulutuksen kuulutuskoneelle (läppäri äänentoistossa). Kuittaus tulee muutamassa sekunnissa. Tämä laite ei soita mitään itse.</p>' : ''}`;
  }

  /* ---- testi: koko päivä pikakelauksella ---- */
  function clearTest() { ['fired', 'ann', 'skip', 'over'].forEach(k => Object.keys(S[k]).forEach(x => { if (x.includes('-testi')) delete S[k][x]; })); ls.set('k-fired', S.fired); ls.set('k-ann', S.ann); ls.set('k-skip', S.skip); ls.set('k-over', S.over); stopAll(); }
  function startTest(speed) {
    clearTest();
    const d = shownDay(), pr = buildProgram(d), first = pr.length ? Math.min(...pr.map(c => c.at)) : d * DAY + 9 * 60;
    S.vt = null; setVirtual(dayDate(d).getTime() + (minOf(first) - 1) * 60000); setSpeed(speed);
    if (S.auto) setAuto(true); else draw();
  }
  function startFullTest() {
    if (Store.demo) { const d = Store.demoData(); d.matches.forEach(m => { if (m.day === shownDay()) { m.hg = null; m.ag = null; m.tila = ''; } }); d.goals = d.goals.filter(g => { const m = d.matches.find(x => x.id === g.match); return m && m.day !== shownDay(); }); ls.set(DEMO_KEY, d); if (typeof load === 'function') load(); }
    startTest(1); setSpeed(20); unlock(); setAuto(true);
    toast(`Testi alkoi ${EVENT.multiDay ? dayShort(shownDay()) + ' ' : ''}klo ${fmtTime(minOf(Math.floor(nowAt())))}, kello kulkee 20× nopeammin`);
  }
  /* Testissä tulokset arvotaan itsestään, kun ottelu päättyy (vain harjoitustilassa) */
  let lastRes = 0;
  function autoResults() {
    if (!S.vt || !Store.demo || !S.autoRes || typeof R === 'undefined' || !R.data || typeof window.enqueue !== 'function') return;
    if (Date.now() - lastRes < 1500) return;
    const at = nowAt();
    const m = R.data.matches.find(x => x.at != null && !isFinal(x) && !cancelled(x) && x.at + DUR() <= at);
    if (m) { lastRes = Date.now(); window.enqueue({ action: 'result', match: m.id, hg: Math.floor(Math.random() * 5), ag: Math.floor(Math.random() * 4) }); }
  }
  function testBar() {
    if (!S.vt && !Store.demo) return '';
    if (!S.vt) return `<div class="kp-test"><b>${ico('test')} Harjoitustila</b><p>Käy pelipäivä läpi muutamassa minuutissa: kello kelautuu, kuulutukset soivat itse ja tulokset arvotaan otteluiden päättyessä. Kuulutat tulokset ja loppusijoitukset itse napeista kuten turnauksessa.${EVENT.multiDay ? ' Valitse ensin päivä ohjelman yläpuolelta.' : ''}</p><button class="kp-rbtn" data-kfulltest>Aloita ${EVENT.multiDay ? esc(dayShort(shownDay())) + ' ' : ''}koko päivän testi</button></div>`;
    const sp = S.vt.speed;
    return `<div class="kp-test"><b>${ico('test')} Testi käynnissä · ${EVENT.multiDay ? esc(dayShort(today())) + ' · ' : ''}kello ${sp}× nopeammin</b>
      <div class="kp-btns">${[1, 10, 20, 40].map(x => `<button class="kp-mini ${sp === x ? 'on' : ''}" data-kspeed="${x}">${x}×</button>`).join('')}<button class="kp-mini" data-kjump>Seuraava kuulutus</button></div>
      ${Store.demo ? `<label class="kp-chk" style="margin:0"><input type="checkbox" data-kautores ${S.autoRes ? 'checked' : ''}> Arvo tulokset otteluiden päättyessä</label>` : '<p>Oikeassa tulospalvelussa: tuloksia ei arvota.</p>'}
      <div class="kp-btns"><button class="kp-mini" data-kfulltest>Alusta uudelleen</button><button class="kp-mini" data-krealclock>Lopeta testi</button></div></div>`;
  }

  /* ---- tuloskuulutus myös ottelun ylläpitonäkymään ---- */
  const slotOfMatch = m => allSlots().find(s => s.act.includes(m) || s.ms.some(x => x.id === m.id));
  function matchCard() {
    const appEl = document.getElementById('app');
    if (!appEl || typeof R === 'undefined' || R.view !== 'match' || !R.data || !loggedIn()) return;
    const m = R.data.matches.find(x => x.id === R.match), old = appEl.querySelector('.kp-mcard');
    const s = m && slotOfMatch(m);
    if (!s) { if (old) old.remove(); return; }
    const sr = slotResult(s), txt = resultText(s), a = S.ann[ak('r' + s.key)], done = a != null, changed = done && a !== sr.sig;
    const others = s.act.filter(x => !isFinal(x) && x.id !== m.id);
    const status = !sr.any ? 'Tuloskuulutus kootaan, kun lopputulos on vahvistettu.' : changed ? 'Tulos on muuttunut kuuluttamisen jälkeen.' : done ? 'Kuulutettu.' : others.length ? `Kuulutusnappi aktivoituu, kun myös ${others.map(x => `${x.home}–${x.away}`).join(', ')} on vahvistettu.` : 'Valmis kuulutettavaksi.';
    const rem = S.role === 'kauko', pk = playingKey === 'r' + s.key;
    const html = `<section class="card kp-mcard" style="display:grid;gap:10px"><div class="sec-h" style="margin:0"><h2>Tuloskuulutus</h2><small>${s.act.length > 1 ? `${s.act.length} ottelua klo ${fmtTime(s.start)} yhdessä` : ''}</small></div>
      ${txt ? `<p style="margin:0;font-size:1.05rem">”${esc(txt)}”</p>` : ''}<p class="note" style="margin:0">${status}</p>
      <button class="btn kp-mbtn ${pk ? 'playing' : ''}" data-kmres="${s.key}" ${sr.complete || done ? '' : 'disabled'}>${pk ? 'Pysäytä' : ico(rem ? 'send' : 'mega') + ' ' + (done ? (rem ? 'Kuuluta uudelleen kuulutuskoneelta' : 'Kuuluta tulokset uudelleen') : sr.complete ? (rem ? 'Kuuluta tulokset kuulutuskoneelta' : 'Kuuluta tulokset') : 'Kuuluta tulokset · odottaa muita tuloksia')}</button></section>`;
    if (old && old.dataset.sig === html) return;
    const tmp = document.createElement('div'); tmp.innerHTML = html; const node = tmp.firstElementChild; node.dataset.sig = html;
    if (old) old.replaceWith(node); else { const first = appEl.querySelector('section.card'); if (first) first.after(node); }
  }
  /* Kellonajan muokkaus: tallentuu Tallenna-napista tai Enterillä, Esc peruu */
  const commitOver = el => { if (!el || el.dataset.kover == null || el.dataset.done) return; el.dataset.done = '1'; const [h, mi] = (el.value || '').split(':').map(Number); if (!isNaN(h) && !isNaN(mi)) setOver(el.dataset.kover, h * 60 + mi); else { S.editing = null; draw(); } };
  document.addEventListener('keydown', e => { if (e.target.dataset && e.target.dataset.kover != null) { if (e.key === 'Enter') { e.preventDefault(); commitOver(e.target); } if (e.key === 'Escape') { e.target.dataset.done = '1'; S.editing = null; draw(); } } });

  /* ---- käynnistys ---- */
  /* Testin aikana myös ylläpidon ottelutilat (käynnissä, odottaa tulosta) seuraavat testikelloa */
  if (typeof window.clock === 'function') { const orig = window.clock; window.clock = () => S.vt ? mkClock(Math.floor(nowAt()), Store.demo) : orig(); }
  build();
  loadManifests().then(preload); loadAnn();
  try { speechSynthesis.onvoiceschanged = () => draw(); } catch (e) { }
  { const appEl = document.getElementById('app'); if (appEl) new MutationObserver(() => matchCard()).observe(appEl, { childList: true }); }
  idb('readonly', s => s.getAllKeys()).then(keys => { (keys || []).forEach(k => S.ownAudio[k] = true); draw(); });
  let lastSig = '', lastAnnLoad = Date.now();
  setInterval(() => {
    tickAuto(); tickCd(); autoResults(); pollRemote();
    if (Date.now() - lastAnnLoad > 600000) { lastAnnLoad = Date.now(); loadAnn(); }
    const nx = nextItem();
    const sig = [loggedIn(), nx && nx.id, dayKey(), shownDay(), JSON.stringify(allMatches().map(m => [m.at, m.hg, m.ag, m.tila]))].join('|');
    if (sig !== lastSig) { lastSig = sig; draw(); }
  }, 1000);
  draw();
  if (S.auto) setAuto(true);
  window.KUULUTUS = {
    annOf: m => { const s = slotOfMatch(m); if (!s) return null; const a = S.ann[ak('r' + s.key)]; return a == null ? null : a === slotResult(s).sig ? 'ann' : 'changed'; },
    S, program, buildProgram, timeOf, neededPieces, pieceText, audioUrl, get queue() { return queue; }, get playing() { return playingKey; }, tickAuto,
  };
})();

// Syömisen aikajana (docs/logiikka.md, osa 3). Vaiheet V1–V10 ovat omina funktioinaan.
import { SAANNOT as S, IKKUNAT } from "./saannot.js";
import { paallekkaisyysVaroitukset, paivanAlku, seuraavaPvm, taydennaKestot } from "./aika.js";
import { rasitus } from "./rasitus.js";

const NK = ["nopea", "keskitaso"];
const N = ["nopea"];
const PRIORITEETTI = ["taydentavaAamiainen", "palautus", "tankkaus", "pikatankkaus", "aamiainen", "kevytAamiainen",
  "paaateria", "lamminAteria", "iltapala", "valipala", "kevyt", "aukko"]; // 3.3
const SUOLAINEN = ["palautus", "tankkaus", "iltapala"]; // S22
const PORTAAN_NOUSU = ["valipala", "aukko", "palautus"]; // S5

const HUOM = {
  arvioitu: (k) => `Kesto arvioitu (${k} min)`,
  vatsa: "Kevyesti, vatsa edellä",
  myohainen: "Myöhäinen peli: syö kunnolla ennen nukkumaan menoa",
  kevytAnnos: "Kevyt annos: pelin alkuun alle 2 h",
  suolainen: "Ota mukaan jotain suolaista",
  eilen: "Tankkaus jatkuu eiliseltä",
  huomenna: "Tankkaus jatkuu: huomenna on pelejä",
};

function ikkuna(tyyppi, osio, pvm, alku, loppu, t = {}) {
  return {
    id: `${tyyppi}:${osio.id}`,
    tyyppi,
    rooli: null,
    osioId: osio.id,
    pvm,
    alku,
    loppu,
    otsikko: IKKUNAT[tyyppi]?.otsikko ?? tyyppi,
    syominen: tyyppi !== "peli" && tyyppi !== "liikunta",
    tavoite: { hh: t.hh ? [...t.hh] : null, prot: t.prot ? [...t.prot] : null, neste: t.neste ? [...t.neste] : null },
    sulavuus: t.sulavuus ? [...t.sulavuus] : null,
    saanto: IKKUNAT[tyyppi]?.saanto ?? null,
    huomautukset: [...(t.huomautukset ?? [])],
  };
}

// S13: kulaus noin 15 min välein. Noin 45 min (n = 3) käyttää suoraan S13:n pelihaarukkaa.
export function nesteKulauksista(kesto) {
  const n = Math.round(kesto / S.nesteKulaus.vali);
  if (n === 3) return [...S.peli.neste];
  return [Math.max(1, Math.min(n, S.nesteKulaus.alaKatto)), Math.max(2, Math.min(2 * n, S.nesteKulaus.ylaKatto))];
}

// V1
function juominen(osiot, pvm) {
  const tulos = [];
  for (const o of osiot) {
    if (o.tyyppi === "ateria") continue;
    const tyyppi = o.tyyppi === "peli" ? "peli" : "liikunta";
    tulos.push(ikkuna(tyyppi, o, pvm, o.alkuMin, o.loppuMin, {
      neste: nesteKulauksista(o.kestoMin),
      huomautukset: o.kestoArvioitu ? [HUOM.arvioitu(o.kestoMin)] : [],
    }));
    if (o.tyyppi === "peli" && o.kestoMin > S.pitkaPeliRaja) {
      const puoli = o.alkuMin + Math.floor(o.kestoMin / 2);
      tulos.push(ikkuna("puoliaika", o, pvm, puoli - 5, puoli + 5, { hh: S.puoliaika.hh, sulavuus: N }));
    }
  }
  return tulos;
}

const palautusTavoite = { hh: S.palautus.hh, prot: S.palautus.prot, neste: S.palautus.neste };
const kevytTavoite = { hh: S.kevyt.hh, neste: S.kevyt.neste, sulavuus: N };

// V2
function ennenEnsimmaista(peli, paiva, osiot, pvm) {
  const a = peli.alkuMin;
  const alku0 = paivanAlku(paiva);
  const aamiainen = osiot.find((o) => o.tyyppi === "ateria" && o.ateria === "aamiainen");
  const aamupeli = a - alku0 < S.aamupeliRaja || (aamiainen && aamiainen.alkuMin <= a && a - aamiainen.alkuMin < S.aamupeliRaja);
  const w = [];
  if (aamupeli) {
    if (aamiainen) {
      if (a - aamiainen.alkuMin >= S.kiinteaKevytRaja) w.push(ikkuna("kevyt", peli, pvm, a - S.kevyt.alku, a - S.kevyt.loppu, kevytTavoite));
    } else {
      w.push(ikkuna("kevytAamiainen", peli, pvm, Math.max(alku0, a - 120), a - 60, S.kevytAamiainen));
    }
    return { ikkunat: w, aamupeli: true };
  }
  w.push(ikkuna("paaateria", peli, pvm, a - S.paaateria.alku, a - S.paaateria.loppu, { hh: S.paaateria.hh, neste: S.paaateria.neste, sulavuus: NK }));
  w.push(ikkuna("valipala", peli, pvm, a - S.valipala.alku, a - S.valipala.loppu, { hh: S.valipala.hh, neste: S.valipala.neste, sulavuus: NK }));
  w.push(ikkuna("kevyt", peli, pvm, a - S.kevyt.alku, a - S.kevyt.loppu, kevytTavoite));
  if (!aamiainen) w.push(ikkuna("aamiainen", peli, pvm, alku0, alku0 + S.aamiainenKesto, { hh: S.paaateria.hh, neste: S.paaateria.neste }));
  return { ikkunat: w, aamupeli: false };
}

function palautusTaiTaydentava(peli, pvm, aamupeli) {
  const l = peli.loppuMin;
  return aamupeli
    ? ikkuna("taydentavaAamiainen", peli, pvm, l, l + 60, { hh: S.paaateria.hh, prot: S.palautus.prot, neste: S.palautus.neste })
    : ikkuna("palautus", peli, pvm, l, l + 60, palautusTavoite);
}

// V3
function pelienValissa(ed, seur, pvm, aamupeli) {
  const l = ed.loppuMin;
  const a2 = seur.alkuMin;
  const v = a2 - l;
  if (v <= 0) return [];
  if (v > S.valiPitka) {
    return [palautusTaiTaydentava(ed, pvm, aamupeli), ikkuna("kevyt", seur, pvm, a2 - S.kevyt.alku, a2 - S.kevyt.loppu, kevytTavoite)];
  }
  if (v >= S.valiKeski) {
    const loppu = Math.min(l + 60, a2 - 30);
    const w = [ikkuna("tankkaus", ed, pvm, l, loppu, S.tankkaus)];
    if (a2 - loppu >= 90) w.push(ikkuna("kevyt", seur, pvm, a2 - S.kevyt.alku, a2 - S.kevyt.loppu, kevytTavoite));
    return w;
  }
  return [ikkuna("pikatankkaus", ed, pvm, l, a2, { ...S.pikatankkaus, huomautukset: [HUOM.vatsa] })];
}

// V4
function viimeisenJalkeen(peli, osiot, pvm, aamupeli, seuraavaPaivaPeleja) {
  const l = peli.loppuMin;
  const w = [palautusTaiTaydentava(peli, pvm, aamupeli)];
  const ateriat = osiot.filter((o) => o.tyyppi === "ateria");

  if (l > S.myohainenPeliRaja) {
    const p = w[0];
    if (p.tyyppi === "palautus") p.tavoite.hh = [...S.tankkaus.hh];
    p.huomautukset.push(HUOM.myohainen);
  } else {
    const ateriaTulossa = ateriat.some((o) => (o.ateria === "lounas" || o.ateria === "paivallinen") && o.alkuMin > l && o.alkuMin <= l + S.lamminAteriaRaja);
    if (!ateriaTulossa) {
      const [a, b] = S.lamminAteriaAjoitus;
      w.push(ikkuna("lamminAteria", peli, pvm, l + a, l + b, { hh: S.paaateria.hh, prot: S.palautus.prot }));
    }
  }

  const kiinteaIltapala = ateriat.some((o) => o.ateria === "iltapala");
  if (!kiinteaIltapala && (l >= S.iltapala.viimeinenPeliJalkeen || seuraavaPaivaPeleja)) {
    const alku = Math.max(S.iltapalaOletusAlku, l + 120);
    if (alku < S.iltapalaMyohaisin) w.push(ikkuna("iltapala", peli, pvm, alku, alku + 60, { hh: S.iltapala.hh, prot: S.iltapala.prot }));
  }
  return w;
}

// V4: harjoituksen tai testin jälkeinen palautus (S20)
function liikunnanJalkeen(osiot, pelit, pvm) {
  return osiot
    .filter((o) => (o.tyyppi === "harjoitus" || o.tyyppi === "testi") && o.kestoMin >= S.harjoitusPalautusRaja)
    .filter((o) => !pelit.some((p) => p.alkuMin >= o.loppuMin && p.alkuMin - o.loppuMin <= 180))
    .map((o) => ikkuna("palautus", o, pvm, o.loppuMin, o.loppuMin + 60, palautusTavoite));
}

const leikkaa = (a, b) => a.alku < b.loppu && b.alku < a.loppu;
const prioriteetti = (t) => { const i = PRIORITEETTI.indexOf(t); return i < 0 ? PRIORITEETTI.length : i; };

// V5. Palauttaa kiinteät ikkunat ja poistaa korvatut lasketuista.
function kiinteatAteriat(osiot, pelit, pvm, laskettu) {
  let jaljella = laskettu;
  const tulos = [];
  const ateriat = osiot.filter((o) => o.tyyppi === "ateria");
  const viimeinen = pelit[pelit.length - 1];

  for (const o of ateriat) {
    const k = ikkuna("kiintea", o, pvm, o.alkuMin, o.alkuMin + S.kestoOletus.ateria);
    k.syominen = true;
    k.otsikko = o.nimi;
    k.rajattu = false;
    const seuraava = pelit.find((p) => p.alkuMin >= o.alkuMin);
    const edellinen = [...pelit].reverse().find((p) => p.loppuMin <= o.alkuMin);

    // 1. Korvaa lasketun ikkunan
    const osuvat = jaljella.filter((w) => leikkaa(w, k));
    if (osuvat.length) {
      const paras = [...osuvat].sort((a, b) => prioriteetti(a.tyyppi) - prioriteetti(b.tyyppi))[0];
      k.rooli = paras.tyyppi;
      k.tavoite = structuredClone(paras.tavoite);
      k.sulavuus = paras.sulavuus ? [...paras.sulavuus] : null;
      k.saanto = paras.saanto;
      k.huomautukset = [...paras.huomautukset];
      jaljella = jaljella.filter((w) => !osuvat.includes(w));
    }

    // 2. Aamupeli (S11)
    if (o.ateria === "aamiainen" && seuraava && seuraava.alkuMin - o.alkuMin < S.aamupeliRaja) {
      k.rooli = "kevytAamiainen";
      k.tavoite = { hh: [...S.kevytAamiainen.hh], prot: null, neste: [...S.kevytAamiainen.neste] };
      k.sulavuus = [...S.kevytAamiainen.sulavuus];
      k.saanto = IKKUNAT.kevytAamiainen.saanto;
    }

    // 3. Ei korvaa mitään
    if (!k.rooli) {
      k.rooli = "normaali";
      if (o.ateria === "iltapala") {
        k.tavoite = { hh: [...S.iltapala.hh], prot: [...S.iltapala.prot], neste: null };
        k.saanto = "S23";
      } else if (o.ateria === "valipala") {
        k.tavoite = { hh: [...S.valipala.hh], prot: null, neste: [...S.valipala.neste] };
        k.saanto = "S7";
      } else {
        k.tavoite = { hh: [...S.paaateria.hh], prot: null, neste: [...S.paaateria.neste] };
        k.saanto = "S1";
      }
      if (viimeinen && o.alkuMin >= viimeinen.loppuMin && o.alkuMin - viimeinen.loppuMin < S.lamminAteriaRaja && o.ateria !== "iltapala") {
        k.rooli = "lamminAteria";
        k.tavoite.prot = [...S.palautus.prot];
        k.saanto = "S21";
      }
    }

    // 4. Ennen peliä (S19, S9)
    if (seuraava) {
      const vali = seuraava.alkuMin - o.alkuMin;
      if (vali <= S.hidasKielto) {
        const vainNopea = k.sulavuus && k.sulavuus.length === 1 && k.sulavuus[0] === "nopea";
        if (!vainNopea) k.sulavuus = [...NK];
        jaljella = jaljella.filter((w) => !(w.osioId === seuraava.id && (w.tyyppi === "paaateria" || w.tyyppi === "valipala")));
        if (k.rooli === "normaali") k.saanto = `${k.saanto}, S19`;
      }
      if (vali < S.kiinteaKevytRaja) {
        if (!k.tavoite.hh || k.tavoite.hh[1] > S.kiinteaKevyt.hh[1]) k.tavoite.hh = [...S.kiinteaKevyt.hh];
        k.huomautukset.push(HUOM.kevytAnnos);
        k.rajattu = true;
        if (!k.saanto.includes("S19")) k.saanto = `${k.saanto}, S19`;
        jaljella = jaljella.filter((w) => !(w.osioId === seuraava.id && w.tyyppi === "kevyt"));
      }
      if (vali < S.valiKeski) {
        k.tavoite.hh = [...S.kevyt.hh];
        k.sulavuus = [...N];
      }
    }

    // 5. Pelin jälkeen (S20, S22)
    if (edellinen && o.alkuMin - edellinen.loppuMin <= 60 && (k.rooli === "normaali" || k.rooli === "lamminAteria")) {
      k.tavoite.neste = [...S.palautus.neste];
      k.tavoite.prot = [...S.palautus.prot];
    }
    tulos.push(k);
  }

  // V6 / tarkennus 3: laskettu kevyt pois, jos kiinteä ateria päättyy korkeintaan 30 min ennen sitä
  jaljella = jaljella.filter((w) => w.tyyppi !== "kevyt"
    || !tulos.some((k) => w.alku >= k.loppu && w.alku - k.loppu <= S.laheisyys.kiinteaKevyt));
  return { kiinteat: tulos, laskettu: jaljella };
}

// V8. Leikkaa ikkunan liikkumisosioiden ja päivän rajojen sisään. null, jos ei jää tarpeeksi.
function leikattu(w, liikunta, alku0) {
  let alku = Math.max(w.alku, alku0);
  let loppu = Math.min(w.loppu, 1439);
  for (const o of liikunta) {
    if (alku >= o.loppuMin || loppu <= o.alkuMin) continue;
    const ennen = o.alkuMin - alku;
    const jalkeen = loppu - o.loppuMin;
    if (ennen >= jalkeen) loppu = o.alkuMin;
    else alku = o.loppuMin;
  }
  if (loppu - alku < S.ikkunaMin) return null;
  return { ...w, alku, loppu };
}

// V6. Lasketut syömisikkunat eivät saa olla liian lähekkäin.
function poistaLaheiset(ikkunat) {
  let w = [...ikkunat].sort((a, b) => a.alku - b.alku);
  for (let i = 0; i + 1 < w.length; i++) {
    if (w[i + 1].alku - w[i].loppu < S.laheisyys.laskettu) {
      const poistettava = prioriteetti(w[i].tyyppi) > prioriteetti(w[i + 1].tyyppi) ? i : i + 1;
      w = w.filter((_, j) => j !== poistettava);
      i = -1;
    }
  }
  return w;
}

// V7. Yli 3 h aukot täytetään välipalalla.
function aukot(syomiset, liikunta, pvm) {
  const tulos = [];
  const j = [...syomiset].sort((a, b) => a.alku - b.alku);
  const kaytetyt = new Set();
  for (let i = 0; i + 1 < j.length; i++) {
    const ed = j[i];
    const seur = j[i + 1];
    if (seur.alku - ed.loppu <= S.ateriavali.aukko) continue;
    const a = ed.loppu + S.aukko.alku;
    const b = Math.min(ed.loppu + S.aukko.loppu, seur.alku - 30);
    if (b <= a) continue;
    const pohja = ikkuna("aukko", { id: ed.osioId }, pvm, a, b, { hh: S.aukko.hh, neste: S.aukko.neste });
    const w = leikattu(pohja, liikunta, 0);
    if (!w) continue;
    let id = w.id;
    for (let n = 2; kaytetyt.has(id); n++) id = `${w.id}-${n}`; // sama osio voi tuottaa kaksi aukkoa
    kaytetyt.add(id);
    tulos.push({ ...w, id });
  }
  return tulos;
}

// V9. Turnauspäivän porras (S5): lähin porras, jonka alaraja on nykyistä suurempi.
function nostaPortaalla(ikkunat) {
  for (const w of ikkunat) {
    const tyyppi = w.tyyppi === "kiintea" ? w.rooli : w.tyyppi;
    if (!PORTAAN_NOUSU.includes(tyyppi) || w.rajattu || !w.tavoite.hh) continue;
    const porras = S.porras.find(([min]) => min > w.tavoite.hh[0]);
    if (porras) w.tavoite.hh = [...porras];
  }
}

// V10
function monipaivaisyys(ikkunat, taso, { edellinenPaivaPeleja, seuraavaPaivaPeleja }) {
  const syomiset = ikkunat.filter((w) => w.syominen && w.tyyppi !== "puoliaika");
  if (taso === "kova" || taso === "turnaus") {
    for (const w of syomiset) {
      if (SUOLAINEN.includes(w.tyyppi === "kiintea" ? w.rooli : w.tyyppi)) w.huomautukset.push(HUOM.suolainen);
    }
  }
  if (!syomiset.length) return;
  if (edellinenPaivaPeleja) syomiset[0].huomautukset.push(HUOM.eilen);
  if (seuraavaPaivaPeleja) syomiset[syomiset.length - 1].huomautukset.push(HUOM.huomenna);
}

function vinkit(pelit, taso, seuraavaPaivaPeleja) {
  const v = [];
  if (pelit > 0) v.push("eiUusiaRuokia");
  if (["peli", "kova", "turnaus"].includes(taso)) v.push("vaaleaVirtsa");
  if (seuraavaPaivaPeleja) v.push("uni");
  if (pelit === 0 && seuraavaPaivaPeleja) v.push("valmistaudu");
  return v;
}

export function aikajana(paiva, ymparisto = {}) {
  const taso = ymparisto.taso ?? rasitus(paiva).taso;
  const seuraavaPaivaPeleja = Boolean(ymparisto.seuraavaPaivaPeleja);
  const edellinenPaivaPeleja = Boolean(ymparisto.edellinenPaivaPeleja);
  const osiot = taydennaKestot(paiva);
  const pvm = paiva.pvm;
  const pelit = osiot.filter((o) => o.tyyppi === "peli");
  const liikunta = osiot.filter((o) => o.tyyppi !== "ateria");
  const alku0 = paivanAlku(paiva);

  const juomat = juominen(osiot, pvm);
  let laskettu = liikunnanJalkeen(osiot, pelit, pvm);

  if (pelit.length) {
    const { ikkunat, aamupeli } = ennenEnsimmaista(pelit[0], paiva, osiot, pvm);
    laskettu.push(...ikkunat);
    for (let i = 0; i + 1 < pelit.length; i++) laskettu.push(...pelienValissa(pelit[i], pelit[i + 1], pvm, aamupeli && i === 0));
    laskettu.push(...viimeisenJalkeen(pelit[pelit.length - 1], osiot, pvm, aamupeli && pelit.length === 1, seuraavaPaivaPeleja));
  }

  const v5 = kiinteatAteriat(osiot, pelit, pvm, laskettu);
  // V8 ajetaan ennen V6:ta, jotta osion alle jäävä ikkuna ei poista muita.
  laskettu = poistaLaheiset(v5.laskettu.map((w) => leikattu(w, liikunta, alku0)).filter(Boolean));
  const syomiset = [...v5.kiinteat, ...laskettu];
  const kaikki = [...syomiset, ...aukot(syomiset, liikunta, pvm), ...juomat];

  if (taso === "turnaus") nostaPortaalla(kaikki);
  kaikki.sort((a, b) => a.alku - b.alku || Number(a.syominen) - Number(b.syominen));
  monipaivaisyys(kaikki, taso, { edellinenPaivaPeleja, seuraavaPaivaPeleja });

  return {
    ikkunat: kaikki.map(({ rajattu, ...w }) => w),
    varoitukset: paallekkaisyysVaroitukset(osiot),
    vinkit: vinkit(pelit.length, taso, seuraavaPaivaPeleja),
  };
}

// Koko ohjelman päivät: rasitus, ympäristö ja aikajana yhdessä.
export function ohjelmanPaivat(ohjelma) {
  const peleja = new Set(ohjelma.paivat.filter((p) => p.osiot.some((o) => o.tyyppi === "peli")).map((p) => p.pvm));
  return ohjelma.paivat.map((paiva) => {
    const r = rasitus(paiva);
    const edellinenPaivaPeleja = [...peleja].some((d) => seuraavaPvm(d) === paiva.pvm);
    const seuraavaPaivaPeleja = peleja.has(seuraavaPvm(paiva.pvm));
    return { paiva, rasitus: r, ...aikajana(paiva, { taso: r.taso, edellinenPaivaPeleja, seuraavaPaivaPeleja }) };
  });
}

// Pelipäivän eväät: ravitsemussäännöt vakioina.
// Jokainen arvo viittaa tunnukseen docs/lahteet.md-tiedostossa (S = sääntö lähteineen, A = sovelluksen oletus).
// Ajat ovat minuutteja, määrät grammoja (hiilihydraatti hh, proteiini prot) tai desilitroja (neste).
// Haarukat ovat suuntaa-antavia 10–12-vuotiaalle, muunnettu lähteiden g/kg-luvuista vertailupainolla 35–45 kg (A1).
// Ei kaloreita, ei painoa (S24).

export const SAANNOT = Object.freeze({
  versio: 1,
  tarkistettu: "2026-11-01",

  // Ateriarytmi
  ateriavali: { tavoite: 180, aukko: 180 },            // S1: noin 3 h välein; yli 3 h aukko täytetään välipalalla
  paivanHhTurnaus: { min: 200, max: 320 },              // S2, A1: suuntaa-antava koko päivän haarukka turnauspäivänä

  // Ennen peliä (minuutteja ennen pelin alkua)
  paaateria: { alku: 240, loppu: 180, hh: [50, 100], neste: [2, 3] },   // S6, S12
  valipala:  { alku: 120, loppu: 90,  hh: [25, 50],  neste: [2, 3] },   // S7, S12
  kevyt:     { alku: 60,  loppu: 30,  hh: [15, 30],  neste: [1, 2], sulavuus: ["nopea"] },   // S8
  hidasKielto: 240,                                     // S9: alle 4 h ennen peliä ei hitaasti sulavia tuotteita
  aamupeliRaja: 180,                                    // S11: jos peli alkaa alle 3 h heräämisestä/aamiaisesta → kevyt aamiainen + täydentävä aamiainen pelin jälkeen
  kevytAamiainen: { hh: [25, 50], neste: [2, 3], sulavuus: ["nopea", "keskitaso"] },   // S11

  // Pelin aikana
  peli: { neste: [3, 5], kulausVali: 15 },              // S13: vesi, kulaus 1–2 dl noin 15 min välein
  pitkaPeliRaja: 60,                                    // S14, A2: yli 60 min peli → puoliajan hiilihydraatti
  puoliaika: { hh: [10, 20], sulavuus: ["nopea"] },     // S14

  // Pelien välissä (minuutteja edellisen lopusta seuraavan alkuun)
  valiPitka: 180,                                       // S16: yli 3 h → palautus + normaali ennen peliä -ikkuna
  valiKeski: 90,                                        // S17: 1,5–3 h → yksi "palautus ja tankkaus" -ikkuna
  tankkaus:     { hh: [40, 70], prot: [10, 20], neste: [3, 5], sulavuus: ["nopea", "keskitaso"] },   // S17, S20
  pikatankkaus: { hh: [15, 30], neste: [2, 4], sulavuus: ["nopea"] },                               // S18: alle 1,5 h

  // Kiinteä ateria lähellä peliä
  kiinteaKevytRaja: 120,                                // S19: ateria alle 2 h ennen peliä → kevyt annos
  kiinteaKevyt: { hh: [30, 50], sulavuus: ["nopea", "keskitaso"] },   // S19
  kiinteaKorvaaIkkunan: [240, 120],                     // S19: ateria 2–4 h ennen korvaa pääateria/välipalaikkunan

  // Palautuminen
  palautus: { alku: 0, loppu: 60, hh: [30, 50], prot: [10, 20], neste: [3, 5] },   // S20, S22, A4
  toinenPalautus: { alku: 60, loppu: 120 },             // S20: uudelleen 1–2 h kuluttua, jos ei ateriaa
  lamminAteriaRaja: 120,                                // S21: jos kiinteä päivällinen ei ole alle 2 h viimeisestä pelistä, lisätään lämmin ateria
  iltapala: { viimeinenPeliJalkeen: 17 * 60, hh: [25, 50], prot: [10, 20] },   // S23: iltapala, kun viimeinen peli päättyy klo 17 jälkeen tai turnaus jatkuu

  // Aikajanan rakenne (docs/logiikka.md). Minuutteja.
  paivanAlkuOletus: 7 * 60,                             // A5: herääminen, jos ohjelma ei kerro
  kestoOletus: { harjoitus: 60, testi: 60, ateria: 30 },   // A6: tuntematon kesto
  nesteKulaus: { vali: 15, dl: [1, 2], alaKatto: 5, ylaKatto: 8 },   // S13: kulaus 1–2 dl 15 min välein, katot
  aamiainenKesto: 45,                                   // S1: laskettu aamiainen päivän alusta
  lamminAteriaAjoitus: [90, 150],                     // S21: viimeisen pelin lopusta
  myohainenPeliRaja: 19 * 60,                           // S21, S23: peli päättyy tämän jälkeen → ei lämmintä ateriaa, palautus 40–70 g
  iltapalaOletusAlku: 19 * 60 + 30,                     // S23: laskettu iltapala aikaisintaan
  iltapalaMyohaisin: 23 * 60,                           // S23: tämän jälkeen iltapalaa ei tehdä
  aukko: { alku: 120, loppu: 180, hh: [25, 50], neste: [2, 3] },   // S1: yli 3 h aukko täytetään
  porras: [[15, 30], [25, 50], [40, 70]],               // S5: turnauspäivänä välipala, aukko ja palautus nousevat portaan
  laheisyys: { laskettu: 30, kiinteaKevyt: 30 },        // V6: lasketut ikkunat vähintään 30 min erillään; kevyt pois, jos ateria päättyy ≤ 30 min ennen
  ikkunaMin: 15,                                        // V8: tätä lyhyempi leikattu ikkuna poistetaan
  harjoitusPalautusRaja: 60,                            // S20: vähintään tunnin harjoituksen jälkeen palautus

  // Rasitustasot (A3). Pelien määrä, peliminuutit ja lyhin väli.
  rasitus: {
    kovaPeliminuutit: 60,                               // A3: yli 60 peliminuuttia tai 2 peliä → kova pelipäivä
    turnausPelit: 3,                                    // A3: 3+ peliä → turnauspäivä
    turnausLyhytVali: 120,                              // A3, L7: 2 peliä alle 2 h välein → turnauspäivä
  },

  // Rajaukset
  kielletyt: {
    kofeiini: "S25",                                    // energiajuomat ja kofeiini: huomautus, ei ehdoteta ikkunoihin
    lisaravinne: "S26",                                 // ravintolisät: huomautus
  },

  // Pysyvät vinkit aikajanalla
  vinkit: {
    eiUusiaRuokia: "Pelipäivänä ei kokeilla uusia ruokia.",                 // S10
    valmistaudu: "Hanki eväät ja syö kunnolla jo edellisenä päivänä.",      // S4
    vaaleaVirtsa: "Juo ennen janoa. Vaalea virtsa kertoo, että nestettä on riittävästi.",   // S12
    uni: "Nuku noin 10 tuntia. Uni on osa tankkausta.",                     // S23
  },
});

// Rasitustasot, joihin aikajana nojaa (A3).
export const TASOT = Object.freeze(["lepo", "kevyt", "peli", "kova", "turnaus"]);

// Sulavuusluokat (docs/lahteet.md: Tuotteiden sulavuusluokitus).
export const SULAVUUS = Object.freeze(["nopea", "keskitaso", "hidas"]);

// Ikkunatyypit, joita aikajana tuottaa. Jokaisella on sääntöviite.
export const IKKUNAT = Object.freeze({
  aamiainen:        { otsikko: "Aamiainen",               saanto: "S1" },
  kevytAamiainen:   { otsikko: "Kevyt aamiainen",         saanto: "S11" },
  taydentavaAamiainen: { otsikko: "Täydentävä aamiainen", saanto: "S11" },
  paaateria:        { otsikko: "Pääateria",               saanto: "S6" },
  valipala:         { otsikko: "Välipala",                saanto: "S7" },
  kevyt:            { otsikko: "Kevyt välipala",          saanto: "S8" },
  peli:             { otsikko: "Juominen pelissä",        saanto: "S13" },
  liikunta:         { otsikko: "Juominen harjoituksessa", saanto: "S13" },
  puoliaika:        { otsikko: "Puoliaika",               saanto: "S14" },
  palautus:         { otsikko: "Palautus",                saanto: "S20" },
  tankkaus:         { otsikko: "Palautus ja tankkaus",    saanto: "S17" },
  pikatankkaus:     { otsikko: "Pikatankkaus",            saanto: "S18" },
  kiintea:          { otsikko: "Ateria",                  saanto: "S19" },
  lamminAteria:     { otsikko: "Lämmin ateria",           saanto: "S21" },
  iltapala:         { otsikko: "Iltapala",                saanto: "S23" },
  aukko:            { otsikko: "Välipala",                saanto: "S1" },
});

// Selkokielinen pelipäivän ohje (A13): esimerkkiruoat lähteiden omista esimerkeistä, ei grammoja.
// pakkaa: yksittäiset tavarat pakkauslistaan, kun syömiskerta osuu pelipaikalle.
export const OHJE = Object.freeze({
  aamiainen:        { otsikko: "Kunnon aamiainen", teksti: "Hiilihydraattia: puuroa, leipää, maitoa ja hedelmä.", esimerkit: ["puuro ja marjat", "leipä ja leikkele", "maito tai jogurtti", "hedelmä"] },   // S1, S6
  kevytAamiainen:   { otsikko: "Kevyt aamiainen", teksti: "Peli on pian, joten syö kevyesti.", esimerkit: ["juotava jogurtti", "banaani", "paahtoleipä"] },   // S11
  taydentavaAamiainen: { otsikko: "Täydentävä aamiainen", teksti: "Syö pelin jälkeen loput aamiaisesta.", esimerkit: ["puuro", "leipä", "maito", "hedelmä"] },   // S11
  paaateria:        { otsikko: "Pääateria", teksti: "Viimeinen kunnon ateria ennen peliä.", esimerkit: ["pasta, riisi tai peruna", "vähän kastiketta", "leipä", "maito"] },   // S6, S19
  valipala:         { otsikko: "Välipala", teksti: "Kevyempi kuin ateria.", esimerkit: ["täytetty sämpylä", "jogurtti", "banaani"], pakkaa: ["täytetty sämpylä", "jogurtti", "banaani"] },   // S7, L12
  aukko:            { otsikko: "Välipala", teksti: "Pidä tankki täynnä.", esimerkit: ["täytetty sämpylä", "jogurtti", "banaani"], pakkaa: ["täytetty sämpylä", "jogurtti", "banaani"] },   // S1
  kevyt:            { otsikko: "Kevyt välipala", teksti: "Viimeistään puoli tuntia ennen peliä. Nopeasti sulavaa.", esimerkit: ["banaani", "juotava jogurtti", "laimea mehu"], pakkaa: ["banaani", "juotava jogurtti"] },   // S8, L12
  pikatankkaus:     { otsikko: "Pelien välissä: kevyesti", teksti: "Vähän ja nopeasti sulavaa, vatsa edellä.", esimerkit: ["banaani", "rusinat", "juotava jogurtti", "laimea mehu"], pakkaa: ["banaani", "rusinat", "laimea mehu"] },   // S18
  tankkaus:         { otsikko: "Pelien välissä: syö heti", teksti: "Syö heti pelin jälkeen, niin ruoka ehtii sulaa.", esimerkit: ["täytetty sämpylä", "jogurtti ja banaani", "kaakao"], pakkaa: ["täytetty sämpylä", "jogurtti", "banaani", "kaakao"] },   // S17, S20
  palautus:         { otsikko: "Heti pelin jälkeen", teksti: "Hiilihydraattia ja vähän proteiinia puolen tunnin sisällä.", esimerkit: ["jogurtti ja hedelmä", "kaakao ja sämpylä", "rahka ja banaani"], pakkaa: ["jogurtti", "kaakao", "banaani", "täytetty sämpylä"] },   // S20
  kiintea:          { otsikko: "Ateria", teksti: "Syö kunnolla.", esimerkit: [] },   // S19
  kiinteaKevyt:     "Syö kevyesti, peli on pian: pastaa, riisiä tai perunaa ja leipää, vähän kastiketta. Loput pelin jälkeen.",   // S19
  lamminAteria:     { otsikko: "Lämmin ateria", teksti: "Kunnon ateria päivän päätteeksi.", esimerkit: ["pasta ja jauheliha", "kana ja riisi", "makaronilaatikko"] },   // S21
  iltapala:         { otsikko: "Iltapala", teksti: "Tukee palautumista ja unta.", esimerkit: ["puuro", "leipä", "maito tai jogurtti"] },   // S23
  puoliaika:        { otsikko: "Puoliaika", teksti: "Pieni pala nopeaa energiaa ja juomaa.", esimerkit: ["banaani", "urheilujuoma"], pakkaa: ["banaani"] },   // S14
  peli:             "Vesipullo vaihtopenkille. Kulaus vettä lämmittelyssä, aina vaihdossa ja heti pelin jälkeen.",   // S13
  vaihdossa:        "Vaihdossa voi ottaa pienen palan nopeaa energiaa: pala banaania, muutama rusina tai kulaus laimeaa mehua.",   // A12
  liikunta:         "Ota vesipullo mukaan ja juo tauoilla.",   // S13
  edellinenPaiva: [
    "Syö kunnolla jo edellisenä päivänä ja pakkaa eväät illalla.",   // S4
    "Nuku noin 10 tuntia. Uni on osa tankkausta.",   // S23
    "Pelipäivänä ei kokeilla uusia ruokia.",   // S10
  ],
});

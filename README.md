# P2015 tulokset

Osoite: **https://p2015-tulokset.sjk-juniorit.fi/**

| Polku | Sisältö | Data |
|---|---|---|
| `/` | Etusivu: tulevat tapahtumat, otteluohjelma, tulokset, kauden tilastot ja kehitys, sarjataulukot | `index.html` (turnauspäivän automaattinen ohjaus `REDIRECTS`-listassa, ohitus `#koti`) |
| `/talviliiga/` | Talviliiga 24.10.2026, oma tulospalvelusovellus | Google Sheets + Apps Script |
| `/turnaukset/` | Joukkueen talviturnaukset ja niiden tulokset | `turnaukset/data.json` |
| `/eerikkila/` | Huuhkajaliiga, kevät ja syksy | `eerikkila/data.json` |
| `/piirisarja/` | Kesän piirisarjat, kaikki joukkueet | `piirisarja/data.json` |
| `/kuva/` | Joukkuekuva SJK P2015 -kehyksellä (käsitellään vain puhelimessa) | |
| `assets/` | Yhteinen ilme (`site.css`), otteluluettelot ja taulukot (`matches.js`), etusivun kooste (`home.js`), logot | |

**Uusi oma turnaus:** kopioi `talviliiga/`-kansio uudella nimellä, tee sille oma Google Sheet ja Apps Script ja vaihda `common.js`:n `CONFIG`. Selaimen muisti on kansiokohtainen, joten turnaukset eivät sekoitu keskenään. Lisää turnaus etusivun kortteihin ja `turnaukset/data.json`-tiedostoon.

**Ei henkilötietoja:** sivustolla ei ole pelaajien nimiä, evästeitä eikä seurantaa. Pidä se niin, koska palvelu on seuran osoitteessa.

---

## Turnauksen tulospalvelu (`talviliiga/`)

Junioriturnauksen tulospalvelu, jota voi käyttää uudelleen seuraavissa turnauksissa. Toimii puhelimella, iPadilla ja koneella. Ilmainen: GitHub Pages + Google Sheets + Google Apps Script. **Kaikki turnauskohtainen tieto on Google Sheetissä**, joten koodiin ei tarvitse koskea uutta turnausta varten.

| Osoite | Kenelle | Mitä |
|---|---|---|
| `…/` | Kaikki | Ohjelma, live-tulokset, sarjataulukot, oman joukkueen suodatus, jaa tulos -kuva |
| `…/kentta.html` | Kenttävastaavat (PIN 5151) | Maalit reaaliajassa yhdellä napautuksella, numero jälkikäteen |
| `…/tuomari.html` | Tuomarit (PIN 1515) | Lopputuloksen vahvistus pelin jälkeen, maalit valinnaisesti |
| `…/kuva.html` | Kaikki | Joukkuekuva turnauskehyksellä somejakoon (kuva käsitellään vain puhelimessa) |
| `…/yllapito.html` | Ylläpitäjä (ADMIN_PIN) | Tilanne, korjaukset, peruminen, aikataulun siirto, sarjataulukon käsikorjaus, **testaus** |

Ilman asetuksia sivut käynnistyvät **demotilassa** (esimerkkiturnaus, simuloitu kello, tallennukset selaimeen).

## Google Sheetin välilehdet

| Välilehti | Sisältö |
|---|---|
| **Asetukset** | `avain` / `arvo`: nimi, alaotsikko, paikka, paiva (2026-10-24), ottelun_kesto, nayta_sarjataulukko, nayta_pelinumerot, tauko_teksti, jarjestaja, vari_pohja, vari_korostus |
| **Joukkueet** | nimi, tausta (#väri), teksti (#väri), reuna (#väri, valinnainen), reunatyyli (`raita` tai `ala`) |
| **Ottelut** | id, sarja, alku (14.35), kenttä, koti, vieras, koti_maalit, vieras_maalit, tila (`peruttu`) |
| **Maalit** | kirjaukset (sovellus täyttää) |
| **Korjaukset** | sarjataulukon käsikorjaukset (sovellus täyttää) |
| **Kahvio** | ryhmä, tuote, hinta (valinnainen; jos välilehteä ei ole, kahvionappia ei näytetä). Asetuksissa kahvio_teksti, kahvio_mobilepay, kahvio_saaja |

Sarjat ja kentät luetaan suoraan Ottelut-välilehdeltä. Sarjoja ja kenttiä voi olla kuinka monta tahansa, ja samaan aikaan voi pelata eri ottelupareja.

## Käyttöönotto (kerran)

### 1. Google Sheet ja Apps Script
1. Luo uusi Google Sheet.
2. **Laajennukset → Apps Script**, liitä `apps-script/Code.gs`, tallenna.
3. **Projektin asetukset → Skriptin ominaisuudet** → lisää `ADMIN_PIN` = vain ylläpitäjän tiedossa oleva PIN, **vähintään 6 numeroa**. Tuomarien PIN on **1515** ja kenttävastaavien **5151** (vaihdettavissa ominaisuuksilla `PIN_TUOMARI` ja `PIN_KENTTA`).
4. Valitse funktio `setup` ja **Suorita** (hyväksy oikeudet). Syntyy kaikki välilehdet esimerkkidatalla.
5. **Ota käyttöön → Uusi käyttöönotto → Verkkosovellus**: *Suorita käyttäjänä: Minä*, *Pääsy: Kaikki*. Kopioi `…/exec`-osoite.
6. Taulukon **Jaa** → *Kuka tahansa, jolla on linkki: Katselija*.

### 2. Sivusto
1. `common.js` → `CONFIG`: `SHEET_ID` (taulukon osoitteesta `/d/` ja `/edit` välistä) ja `API_URL` (kohdan 1.5 osoite).
2. Vaihda tarvittaessa logo: `logo-180.png`, `logo-512.png`, `icon-192.png`, `icon-512.png`.
3. Vie tiedostot GitHub-repoon omaan kansioonsa (esim. `talviliiga/`) → **Settings → Pages** (branch `main`, kansio `/`). Turnaus näkyy osoitteessa `p2015-tulokset.sjk-juniorit.fi/<kansio>/`.

## Testaus ennen turnausta

1. **Ylläpito → Testi → 1. Turnauksen tiedot**: tarkistaa otteluohjelman (tuntemattomat joukkueet, päällekkäiset ottelut samalla kentällä, väärät ajat, tuplat id:t…).
2. **Ylläpito → Testi → 2. Yhteystesti**: lukeminen, PIN-roolit, tallennus ja viive, kunnes tallennus näkyy julkisesti.
3. **Ylläpito → Testi → 3. Koeajo**: tarkistuslista käsin tehtäviin testeihin (lentotila, iPhone/Android, paikan päällä).
4. Koeajon jälkeen Apps Scriptissä: aja `tyhjennaTulokset` (ottelut, joukkueet ja asetukset jäävät).

**Harjoitustila:** lisää osoitteen perään `#harjoitus` (esim. `…/kentta.html#harjoitus`). Kaikki toimii esimerkkidatalla puhelimessa, eikä oikeaan dataan kosketa. Toimitsijat voivat harjoitella milloin tahansa, myös kesken turnauksen. Erillistä testisivustoa ei tarvita.

## Uusi turnaus

1. Apps Script → aja `uusiTurnaus`. Se tekee arkistokopion edellisestä turnauksesta ja tyhjentää tulokset, maalit, korjaukset ja pelinumerot.
2. Päivitä **Asetukset**, **Joukkueet** ja **Ottelut**.
3. Ylläpito → Testi → aja tarkistus ja yhteystesti.
4. Tulosteet (julisteet, laput, toimitsijakortti) ja kuulutukset tehdään turnauskohtaisesti.

## Turnauspäivänä
- **Aikataulu myöhässä?** Ylläpito → *Aikataulu* → siirrä kaikkia alkamattomia otteluita esim. +10 min.
- **Ottelu peruttu?** Ylläpito → ottelu → *Peru ottelu*.
- **Väärä tulos?** Ylläpito tai tuomarinäkymä → ottelu → korjaa.
- **Sarjataulukkoon pakko puuttua?** Ylläpito → *Taulukko*: korjaus tai pakotettu sija, selite pakollinen (näkyy julkisesti tähdellä).
- **Netti katkeaa?** Kirjaukset jäävät puhelimeen jonoon ja lähtevät, kun yhteys palaa.

Julkisen sivun alalaidassa on linkit tuomari- ja kenttänäkymiin (PIN-suojattuja). Ylläpidon osoitetta ei linkitetä mihinkään.

## Ennen julkaisua: tarkistuslista
- [ ] `ADMIN_PIN` vähintään 6 numeroa, vain ylläpitäjällä
- [ ] Taulukon jakoasetus *Katselija*; muokkausoikeus vain ylläpitäjällä
- [ ] Taulukossa ei muuta kuin turnauksen tiedot (taulukko on luettavissa linkin kautta)
- [ ] Apps Script: **Hallinnoi käyttöönottoja → Muokkaa → Uusi versio** aina koodimuutoksen jälkeen
- [ ] Ylläpito → Testi: ei virheitä, yhteystesti läpi, koeajo tehty
- [ ] `tyhjennaTulokset` ajettu koeajon jälkeen
- [ ] Turnausaamuna: *Tiedosto → Tee kopio* varmuuskopioksi
- [ ] Koodipäivitysten jälkeen nosta HTML-tiedostojen `?v=`-numeroa, jotta puhelimet hakevat uudet tiedostot

## Kehityssuunnitelma (Talviliigan 2026 jälkeen)

Kaikki uudet ominaisuudet tehdään valinnaisiksi Asetukset-välilehdeltä, jotta vanhat turnaukset toimivat sellaisenaan.

**1. Tarvitaan melkein joka turnauksessa**
- Pelikello: *Aloita ottelu*, jaksot (`jaksot`, `jakson_kesto`, `puoliaika`), automaattinen lisäaika (30+2'), *Ottelu päättyi*. Ilman kelloa toimii aikataulun mukaan kuten nyt.
- Pelikellon korjaus: "peli alkoi X min sitten" / kellonaika; maaliminuutit lasketaan uudelleen. Ylläpito voi korjata.
- Jatko- ja sijoitusottelut: "Lohko A 1. – Lohko B 2.", joukkueet täyttyvät automaattisesti.
- Rankkarikilpailu: potkut vuorotellen (onnistui/ohi, valinnainen numero), tulos "2–2 (rp. 4–3)", pisteytys asetuksella.
- Jatkoaika pudotuspeleihin.
- Luovutus yhdellä napilla (esim. 3–0).
- Pistesäännöt ja tasapisteiden ratkaisujärjestys asetuksiksi.
- Kokoonpanot: joukkueen pelaajanumerot ottelukohtaisesti, maalivahti ja kapteeni, joukkueenjohtaja vahvistaa ennen ottelua (joukkuekohtainen PIN), muokattavissa aloitukseen asti, sen jälkeen lukittu (ylläpito voi avata). Tuomari ja kenttävastaava näkevät vahvistetun kokoonpanon. Vain numerot, ei nimiä.

**2. Hyödyllisiä**
- Tiedotebanneri julkiselle sivulle ylläpidosta.
- Kortit, jäähyt ja aikalisät (asetuksella; julkinen näkyvyys erikseen valittavissa).
- Kuulutus suoraan vahvistetusta tuloksesta soundboardiin.
- Tapahtumaloki ylläpidolle (kuka kirjasi mitä ja milloin).
- Tulostettavat ottelupöytäkirjat paperivarmistukseksi.

**3. Myöhemmin**
- Arkisto aiemmista turnauksista samassa osoitteessa.
- Useampi turnaus tai ikäluokka samana päivänä.
- Otteluohjelman tuonti Excelistä.
- Useampi ylläpitäjä omilla PIN-koodeillaan.

**Ei oletuksena:** maalipörssi ja pelaajakohtaiset tilastot (yksilöiden korostus ja henkilötiedot juniorien kohdalla).

## Tietoturva lyhyesti
- PIN-koodit tarkistetaan palvelimella. Selaimen koodista niitä ei voi lukea.
- 25 väärää PIN-yritystä 10 minuutissa lukitsee kirjautumiset 5 minuutiksi, ja ylläpitäjä saa sähköpostin.
- Kirjausnäkymät eivät voi muuttaa aikataulua, perua otteluita tai korjata taulukkoa (vaatii ylläpitäjän PIN-koodin).
- Tallennettava teksti rajataan pituudeltaan, ja taulukkokaavat estetään. Sivulle tulostetaan data suojattuna (ei HTML-injektiota).
- Ei nimiä, ei evästeitä, ei seurantaa. Pelaajista tallennetaan vain pelinumerot.

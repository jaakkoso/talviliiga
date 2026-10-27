# Pelipäivä – turnauksen tulos- ja kuulutuspalvelu

Uudelleenkäytettävä versio Talviliigan (24.10.2026) tulospalvelusta. Koodi on tässä kansiossa kerran, ja jokaisella turnauksella on oma kansionsa ja osoitteensa, esimerkiksi `p2015-tulokset.sjk-juniorit.fi/sjk-cup-2027/`.

Talviliiga (`/talviliiga/`) on jäädytetty sellaisenaan: sillä on oma kopio vanhasta koodista, eikä tämä kansio vaikuta siihen.

## Rakenne

| Polku | Sisältö |
|---|---|
| `pelipaiva/*.js, *.css` | Moottori: data ja laskenta (`common.js`), yleisösivu (`app.js`), toimitsijat ja ylläpito (`ref.js`), kuulutukset (`kuulutus.js`), somekuva (`kuva.js`) |
| `pelipaiva/sivupohjat/` | Turnauksen sivujen pohjat. Turnauskansion sivut generoidaan näistä, eikä niitä muokata käsin. |
| `pelipaiva/aanet/` | Yhteiset äänipalat kaikille turnauksille: luvut, kellonajat, tulokset, sijoitukset, tutut joukkueet ja kentät |
| `pelipaiva/logot/` | Yhteinen seurojen logokirjasto (`sjk.png` = joukkue "SJK") |
| `pelipaiva/oletus/` | Uuden turnauksen oletuslogot |
| `pelipaiva/esikatselu/` | Moottorin oma esikatselu esimerkkidatalla: `/pelipaiva/esikatselu/` |
| `pelipaiva/tyokalut/pelipaiva.mjs` | Työkalu: uusi turnaus, sivujen päivitys, jäädytys |
| `<turnaus>/` | `turnaus.js` (taulukon ja Apps Scriptin osoitteet), generoidut sivut, logot ja turnauksen omat äänet (`aanet/`) |

## Uusi turnaus

1. `node pelipaiva/tyokalut/pelipaiva.mjs uusi sjk-cup-2027 --nimi "SJK Cup P12" --lyhytnimi "SJK Cup"`
2. Sivut toimivat heti esikatselussa esimerkkidatalla: `/sjk-cup-2027/`.
3. Tee turnaukselle oma Google Sheet ja Apps Script (alla), ja lisää `SHEET_ID` ja `API_URL` tiedostoon `sjk-cup-2027/turnaus.js`.
4. Vaihda logot tarvittaessa (`logo-180.png`, `logo-512.png`, `icon-192.png`, `icon-512.png`).
5. `node pelipaiva/tyokalut/pelipaiva.mjs paivita`, testaa harjoitustilassa (`#harjoitus`) ja julkaise.

## Moottorin muuttaminen

1. Muuta koodia ja kokeile esikatselussa (`/pelipaiva/esikatselu/`) puhelinkoossa.
2. `node pelipaiva/tyokalut/pelipaiva.mjs paivita` päivittää kaikkien aktiivisten turnausten sivut ja versioparametrit (`?v=`) tiedostojen sisällön mukaan. Versioita ei nosteta käsin.
3. `node pelipaiva/tyokalut/pelipaiva.mjs tarkista` kertoo, onko jokin sivu vanhentunut.

## Pelatun turnauksen jäädytys

`node pelipaiva/tyokalut/pelipaiva.mjs jaadyta sjk-cup-2027` kopioi moottorin, yhteiset äänet ja logot turnauksen kansioon. Sen jälkeen moottorin muutokset eivät enää vaikuta turnaukseen, ja tulokset säilyvät osoitteessaan sellaisinaan.

## Google Sheet

Välilehdet ovat samat kuin Talviliigassa (katso repon README), ja niihin on lisätty seuraavat:

| Välilehti | Uutta |
|---|---|
| **Asetukset** | `paiva` = turnauksen **ensimmäinen** päivä. |
| **Ottelut** | Valinnainen sarake **`päivä`**: tyhjä = ensimmäinen päivä, `1`/`2` = järjestysnumero, tai päivämäärä (`2027-04-11`, `11.4.2027`, `11.4.`). Kaksipäiväisessä turnauksessa ohjelmaan tulee päiväotsikot, ja aikataulun siirto koskee vain ajankohtaisen päivän otteluita. |
| **Joukkueet** | Valinnainen sarake **`lausunta`**: miten nimi sanotaan kuulutuksessa (esim. SJK → `äs jii koo`). |
| **Kuulutukset** (uusi, valinnainen) | `tunnus`, `otsikko`, `teksti`, `milloin`, `päivä`. Turnauksen omat kuulutukset. Ääni on tiedostossa `<turnaus>/aanet/<tunnus>.mp3`. |

**Kuulutukset-välilehden `milloin`:**
- tyhjä = vain napista (Muut kuulutukset)
- `klo 11.45` = tiettyyn aikaan
- `ennen 10` = 10 min ennen päivän ensimmäistä ottelua
- `jälkeen 3` = minuutti päivän 3. ottelukierroksen päättymisen jälkeen
- `avaus`, `tauko`, `tauko loppuu`, `päivä päättyy`, `lopetus` = korvaa vakiokuulutuksen

**`päivä`:** tyhjä = joka päivä, tai `1`, `2` tai päivämäärä.

## Kuulutukset

Kuulutusohjelma lasketaan otteluista päivittäin:
- avaus 15 min ennen ensimmäistä ottelua
- ottelukutsu 2 min ennen (päivän ensimmäinen ja tauon jälkeinen 5 min ennen)
- tauko, kun otteluiden väli on vähintään 20 min
- tulokset napista, kun kaikki samaan aikaan pelatut ottelut on vahvistettu
- päivän päätös (monipäiväinen turnaus) ja loppusijoitukset sekä lopetus napista

Kutsuissa ja tauoissa sanotaan aina ajantasainen kellonaika.

Äänet kootaan paloista. Pala haetaan ensin turnauksen `aanet/`-kansiosta ja sitten yhteisistä paloista. Jos pala puuttuu, kuulutus luetaan selaimen suomenkielisellä puheäänellä. Jos puheääntä ei ole, teksti näytetään luettavaksi.

Ylläpidon kuulutuspaneelin **Äänet**-osio listaa puuttuvat palat ElevenLabs-teksteineen. Tee niistä mp3:t, lisää ne oikeaan kansioon ja aja `paivita`, joka päivittää luettelon `aanet.json`.

## Apps Script

Palvelinkoodi on tiedostossa `pelipaiva/apps-script/Code.gs`. Ota käyttöön:

1. Turnauksen Google Sheet → Laajennukset → Apps Script.
2. Liitä Code.gs.
3. Lisää PIN-koodit skriptin ominaisuuksiin.
4. Aja `setup`.
5. Ota käyttöön verkkosovelluksena (ohje tiedoston alussa).

Testit: `node pelipaiva/apps-script/testi.mjs`.

**Turnauksen jälkeen** arkistoi käyttöönotto (Ota käyttöön → Hallinnoi käyttöönottoja → Arkistoi). Tulossivu toimii edelleen, mutta tuloksia ei voi enää muuttaa.

## Tietoturva

- **Julkinen data.** Tulossivu ja Google Sheet ovat julkisia (taulukko: kuka tahansa linkin saanut voi katsoa). Julkisen sivun automaattista lukemista ei voi estää, joten taulukkoon ei kirjoiteta mitään yksityistä:
  - Pelaajien nimiä ei tallenneta.
  - Pelinumerolistat ovat skriptin ominaisuuksissa.
  - Maalintekijöiden numerot ovat taulukossa vain, jos `nayta_pelinumerot = kyllä`.
- **Kirjautuminen.** PIN-koodilla kirjaudutaan kerran, ja laite saa 4 vuorokautta voimassa olevan istuntotunnisteen. PIN ei jää laitteelle. Kaikki istunnot mitätöidään ajamalla `mitatoiIstunnot()`.
- **Arvaaminen.** Väärä PIN hidastaa vastausta. 15 väärää yritystä 10 minuutissa lukitsee uudet kirjautumiset 15 minuutiksi, ja lukitus pitenee toistuessa. Ylläpitäjä saa sähköpostin. Jo kirjautuneet toimitsijat voivat jatkaa.
- **Roolit tarkistetaan palvelimella:**
  - Kenttävastaava: maalit, kunnes tulos on vahvistettu.
  - Tuomari: maalit ja lopputulos.
  - Ylläpito: kaikki.
  - Ylläpidon hyväksymää tulosta voi muuttaa vain ylläpito.
- **Syötteet** tarkistetaan (id:t, joukkueet, lukemat, ajat). Tekstit kirjoitetaan niin, ettei niitä tulkita kaavoiksi.
- **Sivut.** Sisältöturvakäytäntö sallii vain omat skriptit ja yhteydet Googlen taulukkoon ja Apps Scriptiin. `robots.txt` estää tekoälyindeksoijat, ja toimitsijasivut ovat `noindex`.

# Pelipäivän eväät (ravinto/)

Puhelimella käytettävä PWA, joka auttaa SJK P2015 -joukkueen pelaajia (pojat 10–12 v) ja vanhempia suunnittelemaan syömisen ja juomisen peli- ja turnauspäiville. Julkaistaan GitHub Pagesilla osoitteeseen `p2015-tulokset.sjk-juniorit.fi/ravinto/`. Suunnitelma: `~/.claude/plans/pasted-content-id-88ab-rakennetaan-puhe-dapper-bengio.md`.

## Mitä appi tekee
1. Lukee päivän ohjelman (pelit, testit, harjoitukset, kiinteät ateriat).
2. Laskee rasitustason läpinäkyvällä sääntömallilla ja näyttää aina perustelun.
3. Rakentaa syömisen aikajanan (pääateria, välipalat, juominen, palautus) ja sovittaa kiinteät ateriat siihen.
4. Antaa valita ikkunoihin tuotteet ja näyttää, täyttyykö tankkaustavoite (hiilihydraatti ja neste; proteiini palautuksessa).
5. Tuottaa päivän suunnitelman ja ostoslistan.

## Rajaukset (eivät neuvoteltavissa)
- Lapset ovat 10–12-vuotiaita. Ei kaloreiden laskentaa, ei painon kysymistä, ei laihduttamista. Tavoitteet esitetään tankkauksena ja suuntaa-antavina haarukkoina. Palaute on positiivista; ei punaisia grammarajoja.
- Ei kofeiinia, energiajuomia eikä lisäravinteita. Jos käyttäjä lisää tällaisen omaksi tuotteeksi, näytetään lyhyt huomautus.
- Pelipäivänä ei kokeilla uusia ruokia (vinkki aikajanassa).
- Ravitsemuslinjaukset perustuvat suomalaisiin nuoren urheilijan suosituksiin (Olympiakomitea / Urheiluakatemiat, Ruokavirasto, Terve urheilija). Lähteet ovat tiedostossa `docs/lahteet.md`, ja jokainen sääntö koodissa viittaa lähteen tunnukseen (esim. `// S3`).
- Ravintoarvoja ei keksitä. Yleiset elintarvikkeet Finelistä (CC BY 4.0, maininta appissa), merkkituotteet pakkauksista. Puuttuvat arvot ovat `null` ja `tarkistettu: false`; appi näyttää "arvot puuttuvat".
- Verkkokaupoista kerättyjä tuotetietoja ei julkaista. Ne pysyvät gitin ulkopuolisessa kansiossa `yksityinen/` ja tuodaan omalle laitteelle omina tuotteina.
- Tiedot vain laitteella (localStorage). Ei kirjautumista, ei henkilötietoja, ei lasten nimiä palvelimelle.
- Ei tokeneita, avaimia eikä salasanoja koodiin tai keskusteluun.

## Tekniikka
- Staattinen: HTML, CSS, vanilla JS ES-moduuleina. Ei kirjastoja tuotantokoodissa. Ei buildia.
- Logiikka (`js/rasitus.js`, `js/aikajana.js`, `js/tavoitteet.js`, `js/tuonti.js`) on puhtaita funktioita ilman DOM-riippuvuuksia. Ajat minuutteina keskiyöstä, päivät ISO-muodossa, ei Date-olioita logiikassa.
- Yksikkötestit `npm test`. Puhelintesti Playwrightilla iPhone-koossa (`npm run e2e`), myös offline.
- PWA: `manifest.webmanifest`, `sw.js` scope `/ravinto/`. Service worker ei saa koskea repon muihin polkuihin.
- Mobiili ensin, iso teksti, isot napit. Vaalea ja tumma teema. Ei emojeja; kuvakkeet yksinkertaisina inline-SVG-viivakuvakkeina.
- Ilme lainaa repon väreistä ja fonteista (`assets/site.css`: musta, kulta, Saira Condensed, Figtree), mutta `assets/`-kansioon ei kosketa.

## Työtapa ja mallijako
Etene vaiheittain. Kun vaihe ja malli vaihtuvat, pysähdy ja pyydä käyttäjää vaihtamaan malli.

| Vaihe | Sisältö | Malli |
|---|---|---|
| 0 | Ravitsemussäännöt ja lähteet (`docs/lahteet.md`, `js/saannot.js`) | Fable |
| 1 | Tietomalli ja testidata (`docs/tietomalli.md`, `data/`) | Opus |
| 2a | Logiikan suunnittelu ja testitapaukset (`docs/logiikka.md`) | Fable |
| 2b | Logiikan toteutus ja yksikkötestit | Opus |
| 3 | Käyttöliittymä | Opus |
| 4 | Tuotetietokanta ja tuotevalinta (Fineli-muunnos Sonnetilla, jos mekaaninen) | Opus |
| 5 | PWA, offline, julkaisu | Opus |
| 6 | Riippumaton tarkistus ali-agentilla, joka ei ole nähnyt toteutusta; raportoi, ei korjaa | Fable |

## Repon säännöt
- Muokkaa vain kansiota `ravinto/`. Kansioita `pelipaiva/`, `talviliiga/`, `eerikkila/`, `turnaukset/` ja `assets/` saa lukea, ei muokata.
- Aina `git pull --rebase` ennen pushia. Commit ja push vain käyttäjän pyynnöstä.
- Vastaa suomeksi. Koodin tunnisteet ja kommentit suomeksi, kuten muualla repossa.

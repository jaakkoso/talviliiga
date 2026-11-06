# Pelipäivän eväät

Puhelimella käytettävä appi, joka auttaa SJK P2015 -pelaajia ja vanhempia suunnittelemaan syömisen ja juomisen peli- ja turnauspäiville. Osoite: https://p2015-tulokset.sjk-juniorit.fi/ravinto/

## Käyttö

1. Avaa osoite puhelimessa ja kerro pelien kellonajat, pelin kesto ja mahdollinen yhteinen ruokailu. Valmiin turnauksen saa yhdellä napautuksella.
2. Pelipäivä-näkymä kertoo selkokielellä, mitä kannattaa syödä ja milloin: edellinen ilta, aamu, pelien välit, vaihtopenkki, pelin jälkeen ja pakkauslista.
3. Määrät-näkymässä ovat tarkat hiilihydraattihaarukat ja tuotevalinta. Syömiskerrat on värikoodattu koon mukaan: pieni, perus tai iso tankkaus.
4. Pelipäivänä ylimpänä näkyy käynnissä oleva tai seuraava syömiskerta.
5. Ohjelma-välilehdellä voi muuttaa pelejä ja ruokailuja, ja siellä ovat myös monipäiväiset ohjelmat (Eerikkilä) ja tuonti.

Kotivalikkoon: iPhonessa Safari > Jaa > Lisää Koti-valikkoon. Androidissa Chrome > valikko > Asenna sovellus. Kun appi on avattu kerran verkossa, se toimii myös ilman verkkoa.

Tiedot pysyvät vain omassa puhelimessa. Kirjautumista ei ole, eikä mitään lähetetä palvelimelle.

## Kehitys

```
npm install       # vain Playwright, puhelintestiä varten
npm test          # yksikkötestit
npm run e2e       # iPhone-kokoinen selaintesti, myös offline
```

Kun julkaistava tiedosto muuttuu, nosta `VERSIO` tiedostossa `sw.js`, ja jos tiedosto on uusi, lisää se sen `TIEDOSTOT`-listaan. Muuten puhelimet jatkavat vanhalla versiolla.

Tuotearvot päivitetään ajamalla `node tyokalut/fineli.mjs` (yleiset elintarvikkeet) ja `node tyokalut/openfoodfacts.mjs` (merkkituotteet ja tuotekuvat kansioon `kuvat/`, vaatii macOS:n). Coca-Colaa tai muita kofeiinijuomia ei lisätä. Verkkokaupoista kerätyt tiedot pysyvät kansiossa `yksityinen/`, joka ei mene gittiin.

Säännöt ja lähteet: `docs/lahteet.md`. Logiikka: `docs/logiikka.md`. Tietomalli: `docs/tietomalli.md`.

Ravintoarvot: Fineli, Terveyden ja hyvinvoinnin laitos, CC BY 4.0. Appi ei ole THL:n tuottama eikä suosittelema.

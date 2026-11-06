# Pelipäivän eväät

Puhelimella käytettävä appi, joka auttaa SJK P2015 -pelaajia ja vanhempia suunnittelemaan syömisen ja juomisen peli- ja turnauspäiville. Osoite: https://p2015-tulokset.sjk-juniorit.fi/ravinto/

## Käyttö

1. Avaa osoite puhelimessa ja kerro turnauksen päivä, pelien määrä, alkuaika, kesto, tauko ja yhteinen ruokailu. Muut ohjelmat (Eerikkilä, harjoitus, tuonti) löytyvät Ohjelma-välilehdeltä.
2. Katso päivän energiatarve ja aikajana. Syömiskerrat on värikoodattu koon mukaan: pieni, perus tai iso tankkaus.
3. Valitse tuotteet: ota pikavalinta yhdellä napautuksella tai etsi ja valitse itse. Mittari pysyy näkyvissä vierittäessä.
4. Pelipäivänä ylimpänä näkyy käynnissä oleva tai seuraava syömiskerta. Kuittaa syödyt.
5. Avaa ostoslista.

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

# Tietomalli

Skeemat ovat kansiossa `data/schema/`. Ne ovat dokumentaatio ja testien tuki, eikä appi lataa niitä.

## Ohjelma (`ohjelma.schema.json`)

Yksi tapahtuma, jossa on yksi tai useampi päivä. Testidata: `data/ohjelma-eerikkila-2026-11.json`.

- Kellonaika on muodossa `15.30`, kuten repon muussa datassa. Logiikka muuntaa sen minuuteiksi keskiyöstä.
- `osio.tyyppi` on `peli`, `harjoitus`, `testi` tai `ateria`. Ateriaosiolla on lisäksi `ateria`-kenttä.
- `osio.id` on pysyvä, ja tuotevalinnat ankkuroituvat siihen.
- `osio.kesto` on minuutteja. Pelillä se on pakollinen, muilla `null` tarkoittaa, että kestoa ei tiedetä. Vaihe 2a päättää, miten tuntematon kesto käsitellään.
- `peli.kesto` on koko pelin varaama aika tauko mukaan lukien (2 × 20 min = 45 min). Peliminuutit lasketaan tästä, koska perusteluesimerkki on "3 peliä, 135 min". `jaksot` kertoo pelatun ajan erikseen.
- `paiva.herays` on valinnainen, ja sitä tarvitaan aamupelin päättelyssä (S11), jos kiinteää aamiaista ei ole.

## Tuote (`tuote.schema.json`)

`data/tuotteet.json` sisältää kääreen `{ versio, lahdemaininta, tuotteet }`.

- Ravintoarvot ovat **yhtä annosta kohti**. `null` tarkoittaa, että arvoa ei ole vielä haettu.
- `annos.maara` on grammoja tai desilitroja. Se on `null`, kunnes annospaino on haettu Finelistä tai pakkauksesta. `annos.kuvaus` on ihmiselle näytettävä annos.
- `neste_dl` on juoman nestemäärä, ja se lasketaan ikkunan nestetavoitteeseen. Se on annoskoko, ei ravintoarvo.
- `sulavuus` on `nopea`, `keskitaso` tai `hidas` (`docs/lahteet.md`).
- `sopii` on joukko arvoista `ennen`, `peli`, `valissa` ja `palautus`. `peli` on lisätty alkuperäisiin kolmeen, koska peli-ikkunaan kelpaavat vain juomat (S13, S14).
- `lahde.tyyppi` on `fineli`, `pakkaus` tai `oma`. Finelin rivillä `lahde.id` on elintarvikkeen tunnus.
- `tarkistettu: false` ja puuttuvat arvot näytetään merkinnällä "arvot puuttuvat". Appi ei laske tällaista tuotetta tavoitteeseen.
- `kofeiini` ja `lisaravinne` koskevat omia tuotteita ja laukaisevat huomautuksen (S25, S26).
- `kcal` säilyy datassa lähdetietona, mutta sitä ei näytetä käyttöliittymässä (S24).

Tuotekannassa on 49 tuotetta. Fineli-rivit lasketaan työkalulla `tyokalut/fineli.mjs` tiedostosta `tyokalut/fineli-raaka.json`. Koosteruoassa `lahde.id` on `null`, ja `lahde.osat` kertoo Fineli-tunnukset ja grammat. Koosteiden suhteet ovat reseptioletuksia, mutta arvot tulevat Finelistä. Merkkituotteet (`lahde.tyyppi: pakkaus`) pysyvät `null`-riveinä, kunnes ne on tarkistettu pakkauksesta.

Omat tuotteet tehdään lomakkeella tai tuodaan JSON-tiedostosta (`js/omat-tuotteet.js`), ja ne ovat vain laitteen localStoragessa. Kansio `yksityinen/` on gitin ulkopuolella. Sen tiedostoon kerätyt S-kaupat-arvot ovat vain ylläpitäjän omaan käyttöön, eikä niitä saa lisätä `data/`-kansioon, koska repo ja sivu ovat julkisia.

## Tallennus (`suunnitelma.schema.json`)

Yksi localStorage-avain `ravinto.v1`. Suunnitelman luonnoksesta poiketen ikkunoita ei tallenneta. Ne lasketaan aina ohjelmasta, jolloin aikataulun muutos ei jätä vanhentuneita ikkunoita talteen. Tallessa ovat vain käyttäjän tekemät asiat:

- `ohjelmat` ja `aktiivinenOhjelma`
- `valinnat[ohjelmaId][ikkunaId]`: lista `{ tuoteId, annoksia }`
- `omatTuotteet`: tuoteskeeman mukaisia rivejä, ryhmä `oma`
- `ostettu[ohjelmaId]`: ostoslistalla kuitatut tuotteet
- `asetukset.teema`: `auto`, `vaalea` tai `tumma`

Ikkunan id on `<ikkunatyyppi>:<osion id>`, esimerkiksi `palautus:ma-peli1`. Valinnat säilyvät, vaikka pelin kellonaika muuttuisi. Vaihe 2a vahvistaa ankkuroinnin.

## Laskettu ikkuna (logiikan tuloste, ei tallenneta)

```json
{
  "id": "palautus:ma-peli1",
  "tyyppi": "palautus",
  "pvm": "2026-11-02",
  "alku": 690,
  "loppu": 750,
  "tavoite": { "hh": [30, 50], "prot": [10, 20], "neste": [3, 5] },
  "sulavuus": null,
  "saanto": "S20",
  "huomautukset": []
}
```

`alku` ja `loppu` ovat minuutteja keskiyöstä. Tarkka muoto lukitaan vaiheessa 2a.

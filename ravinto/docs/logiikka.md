# Logiikka: rasitus, aikajana, tavoitteet ja tuonti

Tämä dokumentti on vaiheen 2b toteutuksen ja testien määrittely. Jokainen sääntö viittaa tunnukseen `docs/lahteet.md`-tiedostossa (S = sääntö, A = oletus, L = lähde). Kynnysarvot ovat `js/saannot.js`-tiedostossa, eikä niitä kirjoiteta koodiin muualle.

Kaikki funktiot ovat puhtaita: syöte sisään, tulos ulos, ei DOM:ia, ei `Date`-olioita, ei satunnaisuutta. Ajat ovat minuutteja keskiyöstä (`"15.30"` → 930). Päivät ovat ISO-merkkijonoja.

## 1. Yhteiset apufunktiot (`js/aika.js`)

| Funktio | Toiminta |
|---|---|
| `minuutit("15.30")` | `930`. Hyväksyy myös `"15:30"` ja `"9.45"`. Virheellinen muoto heittää `RangeError`. |
| `kello(930)` | `"15.30"`. Negatiivinen tai ≥ 1440 heittää. |
| `kestoTeksti(195)` | `"3 h 15 min"`. `45` → `"45 min"`, `120` → `"2 h"`, `0` → `"0 min"`. |

### Kestojen täydennys (A6)

Ohjelmassa `kesto: null` tarkoittaa, että kestoa ei tiedetä. Logiikka täydentää sen ennen laskentaa funktiolla `taydennaKestot(paiva)`, joka palauttaa uuden osiolistan (ei muokkaa syötettä) kentillä `alkuMin`, `kestoMin`, `loppuMin` ja `kestoArvioitu: true|false`.

- `peli`: kesto on pakollinen (skeema). `kestoArvioitu: false`.
- `harjoitus`, `testi`: `min(60, seuraavan osion alku − oma alku)`. Jos seuraavaa osiota ei ole, 60. `kestoArvioitu: true`.
- `ateria`: 30. `kestoArvioitu: true`.

Osiot järjestetään alkuajan mukaan. Samalla alkuajalla järjestys on syötteen järjestys.

### Päivän alku (A5)

`paivanAlku(paiva)`: `herays` jos annettu; muuten kiinteän aamiaisen alku; muuten 07.00 (420). Laskettu ikkuna, joka päättyy ennen päivän alkua, poistetaan; joka alkaa ennen sitä, leikataan alkamaan päivän alusta.

## 2. Rasitus (`js/rasitus.js`)

`rasitus(paiva) → { taso, pelit, peliminuutit, lyhinVali, muuRasitus, muuRasitusArvioitu, perustelu, varoitukset }`

Laskenta täydennetyistä osioista:

- `pelit`: `peli`-osioiden määrä.
- `peliminuutit`: pelien `kesto`-kenttien summa. Käytetään varattua aikaa (45), ei jaksojen summaa (40), koska käyttäjän perusteluesimerkki on "3 peliä, 135 min".
- `lyhinVali`: pienin arvo `seuraavan pelin alku − edellisen pelin loppu` peräkkäisten pelien välillä. `null`, jos pelejä on alle 2. Negatiivinen väli (päällekkäiset pelit) lasketaan nollaksi ja tuottaa varoituksen.
- `muuRasitus`: `harjoitus`- ja `testi`-osioiden kestojen summa. `muuRasitusArvioitu: true`, jos jokin niistä on arvio.

Taso (A3), ensimmäinen täyttyvä rivi voittaa. Kynnykset `SAANNOT.rasitus`.

| Ehto | Taso |
|---|---|
| `pelit ≥ 3` | `turnaus` |
| `pelit = 2` ja `lyhinVali < 120` | `turnaus` |
| `pelit = 2` tai `peliminuutit > 60` | `kova` |
| `pelit = 1` | `peli` |
| `pelit = 0` ja `muuRasitus > 0` | `kevyt` |
| muuten | `lepo` |

Perustelu on yksi lause ilman tasonimeä (käyttöliittymä näyttää tason erikseen):

- Pelejä: `"<n> peliä, <peliminuutit> min"`, yhdellä pelillä `"1 peli, 45 min"`. Kun pelejä ≥ 2: `", lyhin tauko <kestoTeksti>"`. Kun `muuRasitus > 0`: `", lisäksi harjoitusta <kestoTeksti>"` ja arvion kanssa `" (arvio)"`. Testit lasketaan harjoitukseksi perustelussa.
- Ei pelejä, mutta harjoitusta: `"Ei pelejä, harjoitusta <kestoTeksti>"` (+ `" (arvio)"`).
- Ei mitään: `"Ei pelejä eikä harjoituksia"`.

Varoitukset (`varoitukset: string[]`): päällekkäiset osiot `"Osiot <id> ja <id> ovat päällekkäin"`. Varoitukset ovat tekstiä ihmiselle, eivät estä laskentaa.

## 3. Aikajana (`js/aikajana.js`)

`aikajana(paiva, ymparisto) → { ikkunat, varoitukset, vinkit }`

`ymparisto = { taso, edellinenPaivaPeleja: bool, seuraavaPaivaPeleja: bool }`. `taso` tulee `rasitus()`-funktiosta; `aikajana` ei laske sitä uudestaan.

### 3.1 Ikkunan muoto (lukittu)

```json
{
  "id": "palautus:ma-peli2",
  "tyyppi": "palautus",
  "rooli": null,
  "osioId": "ma-peli2",
  "pvm": "2026-11-02",
  "alku": 930,
  "loppu": 990,
  "otsikko": "Palautus",
  "syominen": true,
  "tavoite": { "hh": [40, 70], "prot": [10, 20], "neste": [3, 5] },
  "sulavuus": null,
  "saanto": "S20",
  "huomautukset": []
}
```

- `id` on `<tyyppi>:<osioId>`. Kiinteällä aterialla tyyppi on aina `kiintea`, ja `rooli` kertoo, mitä ikkunaa ateria hoitaa. Näin valinnat säilyvät, vaikka aterian rooli muuttuisi kellonajan muutoksen takia.
- `tyyppi` on jokin `IKKUNAT`-avaimista. `rooli` on `null` paitsi kiinteällä aterialla, jolloin se on jokin `IKKUNAT`-avain tai `"normaali"`.
- `syominen` on `false` tyypeillä `peli` ja `liikunta` (vain juominen). Aukko- ja päällekkäisyyssäännöt koskevat vain syömisikkunoita.
- `tavoite.hh`, `tavoite.prot` ja `tavoite.neste` ovat `[min, max]` tai `null`, kun ikkunalla ei ole sitä tavoitetta.
- `sulavuus` on sallittujen luokkien lista tai `null` (kaikki käyvät).
- `saanto` on yksi tunnus tai pilkuilla erotettu lista, esim. `"S19, S6"`.
- Ikkunat palautetaan `alku`-järjestyksessä. Samalla alulla `syominen: false` ensin.

### 3.2 Vaiheet

Aikajana rakennetaan seuraavassa järjestyksessä. Jokainen vaihe on oma funktionsa, jotta testit voivat kohdistua yhteen vaiheeseen.

**V1 Pelit ja liikunta (S13, S14).**
Jokaiselle `peli`-osiolle ikkuna `peli:<id>` välille `[alku, loppu]`, `neste = nesteKulauksista(kesto)`. Jokaiselle `harjoitus`- ja `testi`-osiolle `liikunta:<id>` samoin. Jos kesto on arvioitu, huomautus `"Kesto arvioitu (<kesto> min)"`.
`nesteKulauksista(kesto)`: `n = round(kesto / 15)`. Kun `n = 3`, tulos on S13:n pelihaarukka `[3, 5]`. Muuten `[max(1, min(n, 5)), max(2, min(2n, 8))]` desilitraa. 45 min → `[3, 5]`, 30 → `[2, 4]`, 60 → `[4, 8]`, 90 → `[5, 8]`.
Jos pelin kesto > `pitkaPeliRaja` (60): `puoliaika:<id>` välille `[alku + kesto/2 − 5, alku + kesto/2 + 5]`, `hh [10, 20]`, sulavuus `["nopea"]`, `syominen: true`.

**V2 Ennen ensimmäistä peliä (S6, S7, S8, S11).**
Olkoon `a` päivän ensimmäisen pelin alku ja `alku0 = paivanAlku(paiva)`.
- Jos `a − alku0 < aamupeliRaja` (180): aamupeli. Ei pääateria-, välipala- eikä kevyt-ikkunaa. Jos kiinteää aamiaista ei ole, lisätään `kevytAamiainen:<pelin id>` välille `[max(alku0, a − 120), a − 60]`, `hh [25, 50]`, `neste [2, 3]`, sulavuus `["nopea", "keskitaso"]`. Kiinteä aamiainen saa roolin `kevytAamiainen` vaiheessa V5. Peli merkitään `aamupeli = true` vaihetta V4 varten.
- Muuten: `paaateria:<id>` `[a − 240, a − 180]` (hh 50–100, neste 2–3), `valipala:<id>` `[a − 120, a − 90]` (hh 25–50, neste 2–3), `kevyt:<id>` `[a − 60, a − 30]` (hh 15–30, neste 1–2, sulavuus `["nopea"]`). Lisäksi, jos kiinteää aamiaista ei ole, `aamiainen:<id>` välille `[alku0, alku0 + 45]`, hh 50–100, neste 2–3, S1.
- Sulavuusrajoitus S9: `paaateria` ja `valipala` saavat `sulavuus: ["nopea", "keskitaso"]`, koska ne ovat alle 4 h ennen peliä. `kevyt` on aina `["nopea"]`.

**V3 Pelien välissä (S16, S17, S18).**
Jokaiselle peräkkäiselle peliparille (edellinen loppu `l`, seuraava alku `a2`, väli `v = a2 − l`):

| Väli | Ikkunat |
|---|---|
| `v > 180` | `palautus:<edellinen>` `[l, l + 60]` (S20) ja `kevyt:<seuraava>` `[a2 − 60, a2 − 30]` (S16, S8). Ei pääateriaa eikä välipalaa; yli 3 h aukon täyttää V7. |
| `90 ≤ v ≤ 180` | `tankkaus:<edellinen>` `[l, min(l + 60, a2 − 30)]`, hh 40–70, prot 10–20, neste 3–5, sulavuus `["nopea", "keskitaso"]` (S17). Lisäksi `kevyt:<seuraava>`, jos `a2 − tankkauksen loppu ≥ 90` (S8). |
| `0 < v < 90` | `pikatankkaus:<edellinen>` `[l, a2]`, hh 15–30, neste 2–4, sulavuus `["nopea"]`, huomautus `"Kevyesti, vatsa edellä"` (S18). |
| `v ≤ 0` | Ei ikkunaa. Varoitus päällekkäisyydestä tulee jo rasituksesta. |

**V4 Viimeisen pelin jälkeen (S20, S21, S23).**
Olkoon `l` viimeisen pelin loppu.
- `palautus:<id>` `[l, l + 60]`, hh 30–50, prot 10–20, neste 3–5.
- Jos pelin `aamupeli = true` ja väli seuraavaan peliin on yli 180 tai seuraavaa ei ole: palautuksen tilalle `taydentavaAamiainen:<id>` `[l, l + 60]`, hh 50–100, prot 10–20, neste 3–5, S11. Tämä koskee myös V3:n `v > 180` -palautusta, kun edellinen peli oli aamupeli.
- Jos `l ≤ 1140` (19.00) eikä ohjelmassa ole lounasta tai päivällistä välillä `(l, l + 120]`: `lamminAteria:<id>` `[l + 90, l + 150]`, hh 50–100, prot 10–20, S21.
- Jos `l > 1140`: viimeisen pelin palautusikkuna saa `hh [40, 70]` ja huomautuksen `"Myöhäinen peli: syö kunnolla ennen nukkumaan menoa"` (S21, S23).
- Iltapala: jos `l ≥ 1020` (17.00) tai `seuraavaPaivaPeleja`, ja ohjelmassa ei ole kiinteää iltapalaa: `iltapala:<id>` `[max(1170, l + 120), max(1170, l + 120) + 60]`, hh 25–50, prot 10–20, S23. Jos tuloksena oleva alku ≥ 1380 (23.00), ikkunaa ei tehdä.
- Harjoitus tai testi, jonka kesto ≥ 60 (myös arvioitu) ja jonka jälkeen ei ole peliä 180 minuutin sisällä: `palautus:<id>` `[loppu, loppu + 60]`, hh 30–50, prot 10–20, neste 3–5 (S20).

**V5 Kiinteät ateriat (S19, S11, S21, S23).**
Jokaiselle `ateria`-osiolle ikkuna `kiintea:<id>` välille `[alku, alku + 30]`. Rooli ja tavoite päätetään tässä järjestyksessä:

1. **Korvaa lasketun ikkunan.** Jos aterian väli `[alku, loppu)` leikkaa jonkin V2–V4:ssä lasketun syömisikkunan, se laskettu ikkuna poistetaan ja ateria perii sen `tyyppi`-arvon rooliksi sekä tavoitteen, sulavuuden ja säännön. Jos ateria leikkaa useita, peritään korkeimman prioriteetin ikkuna (3.3) ja muut leikatut poistetaan.
2. **Aamupeli (S11).** Jos `ateria = "aamiainen"` ja ensimmäisen pelin alku − aterian alku < 180: rooli `kevytAamiainen`, hh 25–50, neste 2–3, sulavuus `["nopea", "keskitaso"]`. Tämä ohittaa kohdan 1 roolin.
3. **Ei korvaa mitään.** Rooli `normaali`: `aamiainen`, `lounas`, `paivallinen` → hh 50–100, neste 2–3, S1; `iltapala` → hh 25–50, prot 10–20, S23; `valipala` → hh 25–50, S7. Jos ateria on alle 120 min viimeisen pelin lopusta (ja pelin jälkeen), rooli `lamminAteria`, prot 10–20, S21.
4. **Ennen peliä (S19, S9).** Jos seuraavan pelin alku − aterian alku on `≤ 240`: sulavuus `["nopea", "keskitaso"]`, ja pelin `paaateria`- ja `valipala`-ikkunat poistetaan. Jos väli on `< 120`: hh rajataan enintään `[30, 50]` (pienempi peritty haarukka säilyy), huomautus `"Kevyt annos: pelin alkuun alle 2 h"`, ja pelin `kevyt`-ikkuna poistetaan. Jos väli on `< 90`: hh `[15, 30]`, sulavuus `["nopea"]`.
5. **Pelin jälkeen (S20, S22).** Jos aterian alku on 0–60 min edellisen pelin lopusta eikä kohta 1 jo antanut nestetavoitetta: `neste [3, 5]`, `prot [10, 20]`.

Kiinteän aterian otsikko on osion `nimi`. Ateriaa ei koskaan poisteta eikä siirretä.

**V6 Päällekkäisyydet (3.3).**
Kaksi laskettua syömisikkunaa eivät saa leikata toisiaan eikä olla alle 30 min päässä toisistaan. Jos näin on, matalamman prioriteetin ikkuna poistetaan. Kiinteä ateria ei osallistu tähän (se korvasi jo V5:ssä), paitsi että laskettu `kevyt`-ikkuna poistetaan, jos kiinteä ateria päättyy alle 30 min ennen sen alkua.

**V7 Aukot (S1).**
Syömisikkunat käydään läpi järjestyksessä. Jos seuraavan alku − edellisen loppu > 180: lisätään `aukko:<edellisen ikkunan osioId>` välille `[edellisen loppu + 120, min(edellisen loppu + 180, seuraavan alku − 30)]`, hh 25–50, neste 2–3, S1. Aukkoa ei tehdä, jos se jäisi alle 15 min pituiseksi tai leikkaisi peli- tai liikuntaosiota (silloin se leikataan osion ulkopuolelle ja poistetaan, jos alle 15 min jää). Aukkoja ei tehdä ennen päivän ensimmäistä eikä viimeisen jälkeen.

**V8 Leikkaus ja päivän alku.**
Laskettu syömisikkuna, joka leikkaa peli-, harjoitus- tai testiosiota, leikataan osion ulkopuolelle. Jos jäljelle jää alle 15 min, ikkuna poistetaan. Ikkuna, joka päättyy ennen `paivanAlku`-aikaa tai alkaa 1440:n jälkeen, poistetaan.

**V9 Turnauspäivän porras (S5).**
Kun `taso = "turnaus"`: ikkunoiden `valipala`, `aukko` ja `palautus` hh-haarukka nousee yhden portaan: `[15, 30] → [25, 50] → [40, 70]`. Kiinteän aterian peritty tavoite nousee samoin, jos sen rooli on jokin näistä. `kevyt`-ikkunaa ei nosteta (S8 pitää sen pienenä), eikä kohdan V5.4 rajattua haarukkaa nosteta.

**V10 Monipäiväisyys (S3) ja huomautukset.**
- `edellinenPaivaPeleja`: päivän ensimmäinen syömisikkuna saa huomautuksen `"Tankkaus jatkuu eiliseltä"`.
- `seuraavaPaivaPeleja`: päivän viimeinen syömisikkuna saa huomautuksen `"Tankkaus jatkuu: huomenna on pelejä"`.
- `taso` on `kova` tai `turnaus`: jokainen `palautus`-, `tankkaus`- ja `iltapala`-ikkuna (myös kiinteän aterian rooli) saa huomautuksen `"Ota mukaan jotain suolaista"` (S22).

**Vinkit** (`vinkit: string[]`, avaimia `SAANNOT.vinkit`-olioon): `eiUusiaRuokia` aina, kun pelejä on; `vaaleaVirtsa`, kun taso on vähintään `peli`; `uni`, kun `seuraavaPaivaPeleja`; `valmistaudu` palautetaan vain, kun päivässä ei ole pelejä mutta `seuraavaPaivaPeleja` on tosi.

### 3.3 Prioriteetti

Korkeimmasta matalimpaan: `taydentavaAamiainen`, `palautus`, `tankkaus`, `pikatankkaus`, `aamiainen`, `kevytAamiainen`, `paaateria`, `lamminAteria`, `iltapala`, `valipala`, `kevyt`, `aukko`.

## 4. Tavoitteet (`js/tavoitteet.js`)

`ikkunanTila(ikkuna, valinnat, tuotteet) → { hh, prot, neste, puuttuvat, huomautukset }`

- `valinnat` on lista `{ tuoteId, annoksia }`. `tuotteet` on `Map` tai olio id → tuote (sisältää omat tuotteet).
- Tuote lasketaan mukaan vain, jos `tarkistettu = true` ja tarvittava arvo ei ole `null`. Muuten `tuoteId` lisätään `puuttuvat`-listaan eikä se vaikuta summiin. Tuntematon `tuoteId` menee myös `puuttuvat`-listaan.
- `hh.summa = Σ hiilihydraatti_g × annoksia`, `prot.summa = Σ proteiini_g × annoksia`, `neste.summa = Σ neste_dl × annoksia` (vain tuotteet, joilla `neste_dl` ei ole `null`). Pyöristys yhteen desimaaliin.
- Kullekin ravintoaineelle `{ summa, tavoite, tila }`. `tavoite` on ikkunan `[min, max]` tai `null`. `tila` on `null`, kun tavoitetta ei ole; muuten `"lisaa"` (summa < min), `"tankissa"` (min ≤ summa ≤ max) tai `"reilusti"` (summa > max). Mikään tila ei ole virhe (S24).
- Huomautukset: tuote, jonka `sulavuus` ei kuulu ikkunan `sulavuus`-listaan → `"<nimi> sulaa hitaasti tähän ikkunaan"` (S9). Tuote, jonka `kofeiini = true` → `"<nimi>: kofeiini ei kuulu lasten pelipäivään"` (S25). `lisaravinne = true` → `"<nimi>: ravinto riittää ilman lisäravinteita"` (S26). Ikkunaan `peli` valittu tuote, jonka `sopii` ei sisällä `"peli"` → `"<nimi>: pelin aikana vain juotavaa"` (S13).

`paivanYhteenveto(ikkunat, valinnatIkkunoittain, tuotteet) → { hh: { summa, vahintaan, tila }, puuttuvat }`

- `vahintaan` on syömisikkunoiden `hh`-alarajojen summa. `tila` on `"tankissa"`, kun `summa ≥ vahintaan`, muuten `"lisaa"`. Ylärajaa ei näytetä (S2, S24). S2:n haarukkaa 200–320 g ei käytetä rajana; se on vain `docs/lahteet.md`-tiedoston tausta.

`ostoslista(ohjelma, valinnat, tuotteet) → [{ tuoteId, nimi, ryhma, annoksia, kuvaus }]`

- Summaa saman tuotteen annokset kaikkien päivien kaikista ikkunoista, järjestää ryhmittäin ja nimen mukaan. `ostettu`-kuittaus on käyttöliittymän asia.

## 5. Tuonti (`js/tuonti.js`)

`tuoOhjelma(json, valinnat?) → { ohjelma, varoitukset }`. Tunnistaa muodon ja palauttaa `ohjelma.schema.json`-muotoisen ohjelman. Heittää `Error`, jos muotoa ei tunnisteta.

| Muoto | Tunnistus | Muunnos |
|---|---|---|
| Oma (`versio: 1` ja `paivat`) | `json.versio === 1 && Array.isArray(json.paivat)` | Normalisoidaan kellonajat (`"15:30"` → `"15.30"`), puuttuvat `id`-kentät täytetään muotoon `<pvm:n päivä>-<tyyppi><järjestysnumero>` (esim. `02-peli1`), puuttuva `kesto` on `null`. |
| Repon ottelulista (`eerikkila/data.json`) | `json.events[].matches` | `valinnat.eventId` valitsee tapahtuman (oletus ensimmäinen). Jokainen ottelu → `peli`-osio: `alku = time`, `nimi = "home - away"`, `kesto = 45`, `pelimuoto` tulkitaan `format`-kentästä (`"7v7"`), `jaksot` kentästä `"2 × 20 min"` jos löytyy, muuten jätetään pois. Varoitus `"Pelin kesto oletettu 45 min"` kerran. Ateriat lisätään käsin. |
| Repon turnauslista (`turnaukset/data.json`) | `json.events[].teams[].matches` | `valinnat.eventId` ja `valinnat.teamName` (oletus ensimmäinen joukkue). Muuten kuten yllä, `pelimuoto` ja `jaksot` jätetään pois, kesto 45 + varoitus. |

Kaikissa muodoissa: ohjelman `id` on tapahtuman `id`, `nimi` on `name` tai `title`, `lahde.tyyppi` on `"json"`. Tulos järjestetään päivittäin ja ajoittain. Ohjelma validoidaan kevyesti (`validoiOhjelma(ohjelma) → string[]`): kellonajan muoto, `peli`-osion kesto on luku, `ateria`-osiolla on `ateria`-kenttä, id:t yksilöllisiä. Skeematiedostoa ei ladata ajossa.

## 6. Testitapaukset

Odotetut arvot on laskettu käsin tämän dokumentin säännöillä. Kellonajat on kirjoitettu luettavuuden vuoksi `HH.MM`-muodossa; testit vertaavat minuutteja. Taulukoissa `sul.` = sulavuus, `n/k` = `["nopea","keskitaso"]`, `n` = `["nopea"]`, `–` = `null`.

### T1 Eerikkilä sunnuntai 2026-11-01

Ympäristö: `edellinenPaivaPeleja: false`, `seuraavaPaivaPeleja: true`.

Rasitus: `taso "kova"`, `pelit 2`, `peliminuutit 90`, `lyhinVali 180`, `muuRasitus 90`, `muuRasitusArvioitu true`, perustelu `"2 peliä, 90 min, lyhin tauko 3 h, lisäksi harjoitusta 1 h 30 min (arvio)"`.

| # | id | rooli | alku–loppu | hh | prot | neste | sul. | saanto | huomautukset |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `aamiainen:su-peli1` | – | 07.00–07.45 | 50–100 | – | 2–3 | – | S1 | – |
| 2 | `aukko:su-peli1` | – | 09.45–10.45 | 25–50 | – | 2–3 | – | S1 | – |
| 3 | `kiintea:su-lounas` | `paaateria` | 11.30–12.00 | 50–100 | – | 2–3 | n/k | S6 | – |
| 4 | `liikunta:su-testit` | – | 13.00–13.30 | – | – | 2–4 | – | S13 | – |
| 5 | `liikunta:su-juoksu` | – | 13.30–14.30 | – | – | 4–8 | – | S13 | Kesto arvioitu (60 min) |
| 6 | `kevyt:su-peli1` | – | 14.30–15.00 | 15–30 | – | 1–2 | n | S8 | – |
| 7 | `peli:su-peli1` | – | 15.30–16.15 | – | – | 3–5 | – | S13 | – |
| 8 | `kiintea:su-paivallinen` | `tankkaus` | 17.00–17.30 | 40–70 | 10–20 | 3–5 | n/k | S17 | Ota mukaan jotain suolaista |
| 9 | `kevyt:su-peli2` | – | 18.15–18.45 | 15–30 | – | 1–2 | n | S8 | – |
| 10 | `peli:su-peli2` | – | 19.15–20.00 | – | – | 3–5 | – | S13 | – |
| 11 | `kiintea:su-iltapala` | `palautus` | 20.30–21.00 | 40–70 | 10–20 | 3–5 | – | S20 | Myöhäinen peli…; Ota mukaan jotain suolaista; Tankkaus jatkuu: huomenna on pelejä |

Perustelut: ohjelmassa ei ole aamiaista eikä `herays`-aikaa, joten päivän alku on 07.00 ja aamiainen lasketaan (S1); aamiaisen lopusta lounaaseen on 225 min, joten väliin tulee aukko. Lounas alkaa täsmälleen 240 min ennen peliä, joten se leikkaa pääateriaikkunaa 11.30–12.30 ja perii sen; väli on `≤ 240`, joten sulavuus on n/k (V5.4). Välipalaikkuna 13.30–14.00 osuu kokonaan juoksuosion sisään ja poistuu (V8). Pelien väli on 180 → tankkaus 16.15–17.15, jonka päivällinen perii; `a2 − 17.15 = 120 ≥ 90` → kevyt ennen toista peliä. Viimeinen peli päättyy 20.00 > 19.00, joten palautus nousee 40–70:een eikä lämmintä ateriaa tehdä; iltapala perii palautuksen. Vinkit: `eiUusiaRuokia`, `vaaleaVirtsa`, `uni`.

### T2 Eerikkilä maanantai 2026-11-02

Ympäristö: `edellinenPaivaPeleja: true`, `seuraavaPaivaPeleja: true`.

Rasitus: `taso "turnaus"`, `pelit 3`, `peliminuutit 135`, `lyhinVali 195`, `muuRasitus 0`, perustelu `"3 peliä, 135 min, lyhin tauko 3 h 15 min"`.

| # | id | rooli | alku–loppu | hh | prot | neste | sul. | saanto | huomautukset |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `kiintea:ma-aamiainen` | `kevytAamiainen` | 08.15–08.45 | 25–50 | – | 2–3 | n/k | S11 | Tankkaus jatkuu eiliseltä |
| 2 | `kevyt:ma-peli1` | – | 09.45–10.15 | 15–30 | – | 1–2 | n | S8 | – |
| 3 | `peli:ma-peli1` | – | 10.45–11.30 | – | – | 3–5 | – | S13 | – |
| 4 | `kiintea:ma-lounas` | `taydentavaAamiainen` | 12.15–12.45 | 50–100 | 10–20 | 3–5 | n/k | S11 | – |
| 5 | `kevyt:ma-peli2` | – | 13.45–14.15 | 15–30 | – | 1–2 | n | S8 | – |
| 6 | `peli:ma-peli2` | – | 14.45–15.30 | – | – | 3–5 | – | S13 | – |
| 7 | `palautus:ma-peli2` | – | 15.30–16.30 | 40–70 | 10–20 | 3–5 | – | S20 | Ota mukaan jotain suolaista |
| 8 | `kiintea:ma-paivallinen` | `normaali` | 16.45–17.15 | 50–100 | – | 2–3 | n/k | S1, S19 | – |
| 9 | `kevyt:ma-peli3` | – | 18.30–19.00 | 15–30 | – | 1–2 | n | S8 | – |
| 10 | `peli:ma-peli3` | – | 19.30–20.15 | – | – | 3–5 | – | S13 | – |
| 11 | `kiintea:ma-iltapala` | `palautus` | 20.45–21.15 | 40–70 | 10–20 | 3–5 | – | S20 | Myöhäinen peli…; Ota mukaan jotain suolaista; Tankkaus jatkuu: huomenna on pelejä |

Perustelut: aamiainen on 150 min ennen ensimmäistä peliä → aamupeli (S11); kevyt-ikkuna tehdään silti, koska V2:n aamupelihaara jättää vain lasketun kevyt-aamiaisen pois, ei S8:n kevyttä välipalaa, kun kiinteä aamiainen on olemassa. **Tarkennus V2:een:** aamupelissä, jossa on kiinteä aamiainen, `kevyt:<id>` tehdään, jos aamiaisen alku on ≥ 120 min ennen peliä (S7-rooli ei täyty); muuten ei. Tässä 150 ≥ 120 → kevyt tehdään. Ensimmäisen pelin jälkeen väli on 195 > 180, joten palautuksen tilalle tulee täydentävä aamiainen, jonka lounas perii. Lounas on 150 min ennen toista peliä → n/k, ei rajausta. Palautus 15.30–16.30 ei leikkaa päivällistä 16.45, joten molemmat jäävät; päivällinen on 165 min ennen kolmatta peliä → n/k. Turnausporras nostaa palautuksen 30–50 → 40–70; kevyt-ikkunoita ei nosteta. Iltapala perii viimeisen palautuksen (myöhäinen peli → 40–70, porras ei nosta enää). Ei aukkoja.

### T3 Eerikkilä tiistai 2026-11-03

Ympäristö: `edellinenPaivaPeleja: true`, `seuraavaPaivaPeleja: false`.

Rasitus: `taso "kova"`, `pelit 2`, `peliminuutit 90`, `lyhinVali 135`, perustelu `"2 peliä, 90 min, lyhin tauko 2 h 15 min"`.

| # | id | rooli | alku–loppu | hh | prot | neste | sul. | saanto | huomautukset |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `kiintea:ti-aamiainen` | `kevytAamiainen` | 07.45–08.15 | 25–50 | – | 2–3 | n/k | S11 | Tankkaus jatkuu eiliseltä |
| 2 | `peli:ti-peli1` | – | 09.45–10.30 | – | – | 3–5 | – | S13 | – |
| 3 | `kiintea:ti-lounas` | `tankkaus` | 11.00–11.30 | 30–50 | 10–20 | 3–5 | n/k | S17, S19 | Kevyt annos: pelin alkuun alle 2 h; Ota mukaan jotain suolaista |
| 4 | `peli:ti-peli2` | – | 12.45–13.30 | – | – | 3–5 | – | S13 | – |
| 5 | `palautus:ti-peli2` | – | 13.30–14.30 | 30–50 | 10–20 | 3–5 | – | S20 | Ota mukaan jotain suolaista |
| 6 | `lamminAteria:ti-peli2` | – | 15.00–16.00 | 50–100 | 10–20 | – | – | S21 | – |

Perustelut: aamiainen on 120 min ennen peliä → aamupeli, ja koska 120 < 120 ei päde, aamiainen ei saa kevyt annos -rajausta; aamiainen on ≥ 120 min ennen peliä, joten V2-tarkennuksen mukaan `kevyt:ti-peli1` tehtäisiin 08.45–09.15, mutta V6 poistaa sen, koska kiinteä ateria päättyy 30 min ennen sen alkua (alle 30 ei päde, 30 = 30). **Lukitaan:** V6:n ehto on "alle tai tasan 30 min" (`≤ 30`), joten ikkuna poistuu. Väli 135 → tankkaus 10.30–11.30, jonka lounas perii; lounas on 105 min ennen toista peliä → hh rajataan 30–50; `a2 − 11.30 = 75 < 90` → ei kevyttä. Viimeinen peli päättyy 13.30 ≤ 19.00 eikä lounasta tai päivällistä ole 120 min sisällä → lämmin ateria 15.00–16.00. Iltapalaa ei tehdä (13.30 < 17.00, ei huomista). Vinkit: `eiUusiaRuokia`, `vaaleaVirtsa`.

### T4 Tyhjä päivä

`osiot: []`, ympäristö kaikki `false`. Rasitus: `taso "lepo"`, perustelu `"Ei pelejä eikä harjoituksia"`, `lyhinVali null`. Aikajana: `ikkunat []`, `vinkit []`, `varoitukset []`.

### T5 Vain harjoitus

Yksi osio: harjoitus 18.00, `kesto null`. Täydennetty kesto 60 (ei seuraavaa osiota). Rasitus: `taso "kevyt"`, perustelu `"Ei pelejä, harjoitusta 1 h (arvio)"`. Aikajana: `liikunta:h1` 18.00–19.00 neste 4–8 (huomautus kesto arvioitu), `palautus:h1` 19.00–20.00 hh 30–50 prot 10–20 neste 3–5. Ei iltapalaa (ei pelejä, ei huomista). Vinkit `[]` (ei pelejä). Jos `seuraavaPaivaPeleja: true`: palautus saa huomautuksen "Tankkaus jatkuu…", vinkit `["uni", "valmistaudu"]`, ja lisäksi `iltapala:h1` 21.00–22.00 **ei** tehdä, koska iltapala vaatii pelin. (Lukitaan: V4:n iltapala tehdään vain, kun päivässä on peli.)

### T6 Kolme peliä lyhyin välein, ei aterioita

Pelit 10.00, 11.15 ja 12.30, kesto 45. Ei `herays`-aikaa → päivän alku 07.00. Ympäristö kaikki `false`.

Rasitus: `taso "turnaus"`, `lyhinVali 30`, perustelu `"3 peliä, 135 min, lyhin tauko 30 min"`.

| # | id | alku–loppu | hh | prot | neste | sul. | saanto |
|---|---|---|---|---|---|---|---|
| 1 | `aamiainen:p1` | 07.00–07.45 | 50–100 | – | 2–3 | – | S1 |
| 2 | `kevyt:p1` | 09.00–09.30 | 15–30 | – | 1–2 | n | S8 |
| 3 | `peli:p1` | 10.00–10.45 | – | – | 3–5 | – | S13 |
| 4 | `pikatankkaus:p1` | 10.45–11.15 | 15–30 | – | 2–4 | n | S18 |
| 5 | `peli:p2` | 11.15–12.00 | – | – | 3–5 | – | S13 |
| 6 | `pikatankkaus:p2` | 12.00–12.30 | 15–30 | – | 2–4 | n | S18 |
| 7 | `peli:p3` | 12.30–13.15 | – | – | 3–5 | – | S13 |
| 8 | `palautus:p3` | 13.15–14.15 | 40–70 | 10–20 | 3–5 | – | S20 |
| 9 | `lamminAteria:p3` | 14.45–15.45 | 50–100 | 10–20 | – | – | S21 |

Perustelut: `10.00 − 07.00 = 180`, ei aamupeli. Pääateria 06.00–07.00 päättyy päivän alussa → poistuu. Välipala 08.00–08.30 on 15 min aamiaisen jälkeen → V6 poistaa (aamiainen on korkeammalla). Pikatankkaukset saavat huomautuksen "Kevyesti, vatsa edellä" ja suolaisen huomautuksen eivät saa (sääntö koskee palautusta, tankkausta ja iltapalaa). Palautus nousee portaan (turnaus). Ei iltapalaa (13.15 < 17.00).

### T7 Päällekkäiset pelit (tuplapeli samaan aikaan)

Pelit `p1` ja `p2` molemmat 15.30, kesto 45. Rasitus: `pelit 2`, `lyhinVali 0`, `taso "turnaus"`, `varoitukset ["Osiot p1 ja p2 ovat päällekkäin"]`. Aikajana: ei `pikatankkaus`-ikkunaa (väli ≤ 0), kaksi `peli`-ikkunaa, pelien edellä normaalit V2-ikkunat `p1`:lle (pääateria 11.30–12.30, välipala 13.30–14.00, kevyt 14.30–15.00, aamiainen 07.00–07.45, aukko 09.45–10.45 aamiaisen ja pääaterian väliin, koska 07.45 → 11.30 on 225 min), `palautus:p2` 16.15–17.15 (40–70), `lamminAteria:p2` 17.45–18.45. Aikajanan `varoitukset` toistaa rasituksen varoituksen.

### T8 Kiinteä ateria liian lähellä peliä

Lounas 14.00, peli 15.00 (kesto 45), ei muuta. Päivän alku 07.00. Rasitus `peli`.
Lasketut ennen peliä: aamiainen 07.00–07.45, pääateria 11.00–12.00, välipala 13.00–13.30, kevyt 14.00–14.30. Lounas 14.00–14.30 leikkaa kevyt-ikkunan → perii roolin `kevyt` (hh 15–30, sul. n). Väli 60 < 120 → rajaus: hh pysyy 15–30 (pienempi säilyy), sulavuus `n` (väli < 90), huomautus "Kevyt annos: pelin alkuun alle 2 h"; pelin välipala- ja pääateriaikkunat poistetaan (väli ≤ 240). Aamiaisen 07.45 ja lounaan 14.00 väliin tulee aukko 09.45–10.45 (S1). Odotetut syömisikkunat: aamiainen 07.00–07.45, aukko 09.45–10.45, kiintea:lounas (rooli `kevyt`) 14.00–14.30, palautus 15.45–16.45, lamminAteria 17.15–18.15. Ei iltapalaa (15.45 < 17.00).

### T9 Aamupeli ilman aamiaista

Peli 09.00 (kesto 45), ei aterioita, `herays "07.00"`. `09.00 − 07.00 = 120 < 180` → aamupeli. Ikkunat: `kevytAamiainen:p1` 07.00–08.00 (hh 25–50, neste 2–3, n/k, S11), `peli:p1` 09.00–09.45, `taydentavaAamiainen:p1` 09.45–10.45 (hh 50–100, prot 10–20, neste 3–5, S11), `lamminAteria:p1` 11.15–12.15. Ei pääateriaa, välipalaa eikä kevyttä.

### T10 Pitkä peli

Yksi peli 14.00, kesto 90 (11v11). Rasitus: `peliminuutit 90 > 60` → `taso "kova"`, perustelu `"1 peli, 90 min"`. Aikajana sisältää `puoliaika:p1` 14.40–14.50 (hh 10–20, sul. n, S14) ja `peli:p1` neste 5–8 sekä normaalit V2-ikkunat (aamiainen 07.00–07.45, pääateria 10.00–11.00, välipala 12.00–12.30, kevyt 13.00–13.30; ei aukkoa, koska 07.45 → 10.00 on 135 min).

### T11 Pitkä aukko

Aamiainen (kiinteä) 08.00, peli 16.00 (45), ei muuta, ympäristö `false`. Aikajana: `kiintea:aamiainen` (normaali) 08.00–08.30, `aukko:aamiainen` 10.30–11.30 (hh 25–50, S1), `paaateria:p1` 12.00–13.00, `valipala:p1` 14.00–14.30, `kevyt:p1` 15.00–15.30, `peli:p1` 16.00–16.45, `palautus:p1` 16.45–17.45, `lamminAteria:p1` 18.15–19.15. Ei iltapalaa: 16.45 < 17.00 eikä huomista. Aamiainen on 480 min ennen peliä → ei sulavuusrajausta (`–`).

### T12 Tavoitteet

Ikkuna `palautus` hh 30–50, prot 10–20, neste 3–5, sulavuus `null`. Tuotteet (testin omat, `tarkistettu: true`): `banaani` hh 20, prot 1, neste null; `maito` hh 10, prot 7, neste 2 (per 2 dl); `riisipiirakka` hh 15, prot 3, sulavuus keskitaso; `patukka` kaikki `null`, `tarkistettu false`.

| Valinnat | hh | prot | neste | puuttuvat |
|---|---|---|---|---|
| banaani 1, maito 1 | 30 `tankissa` | 8 `lisaa` | 2 `lisaa` | `[]` |
| banaani 1, maito 2 | 40 `tankissa` | 15 `tankissa` | 4 `tankissa` | `[]` |
| banaani 3 | 60 `reilusti` | 3 `lisaa` | 0 `lisaa` | `[]` |
| banaani 1, patukka 1 | 20 `lisaa` | 1 `lisaa` | 0 `lisaa` | `["patukka"]` |
| maito 1 ikkunaan `kevyt` (sul. `n`) | 10 `lisaa` | – (`tavoite null`, `tila null`) | 2 `tankissa` | huomautus "Maito sulaa hitaasti tähän ikkunaan" |
| oma tuote `kofeiini: true` | – | – | – | huomautus S25 |

`paivanYhteenveto` T2:n ikkunoilla: `vahintaan = 25 + 15 + 50 + 15 + 40 + 50 + 15 + 40 = 250`.

### T13 Tuonti

- `eerikkila/data.json`, tapahtuma `syksy-2026`: tuloksena 3 päivää, 7 `peli`-osiota, joiden `alku` ja `nimi` vastaavat `data/ohjelma-eerikkila-2026-11.json`-tiedoston pelejä, `kesto 45`, `pelimuoto "7v7"`, `jaksot { maara 2, pituus 20 }`, varoitus pelin kestosta kerran. Ei ateriaosioita.
- `turnaukset/data.json`, tapahtuma `jjk-talviliiga-2026`, ensimmäinen joukkue: kaikki pelit yhdelle päivälle `2026-11-07`, `kesto 45`, ei `pelimuoto`-kenttää.
- Oma muoto, jossa `"alku": "9:45"` ja ilman `id`-kenttiä → `"09.45"` ja id:t `07-peli1`, `07-ateria1` tms.
- Tuntematon muoto (`{}`) → heittää.
- `validoiOhjelma` palauttaa virheen, kun `peli`-osion `kesto` on `null`, kun `ateria`-osiolta puuttuu `ateria`, ja kun kaksi osiota jakaa saman `id`:n.

## 7. Lukitut tarkennukset (koottu edellä olevista huomioista)

Nämä tarkentavat osia 3.2–3.3 ja ovat voimassa, jos teksti edellä on ristiriidassa.

1. **V2 aamupeli kiinteällä aamiaisella:** `kevyt:<id>` tehdään, kun aamiaisen alku on ≥ 120 min ennen peliä. T2 saa sen, T3 ei (poistuu joka tapauksessa V6:ssa).
2. **V5.4 ja peritty rooli:** sulavuus n/k asetetaan aina, kun ateria on ≤ 240 min ennen peliä, myös perityn `paaateria`-roolin päälle. T1:n lounas on `n/k`.
3. **V6 kiinteä ateria ja kevyt:** laskettu `kevyt` poistetaan, kun kiinteä ateria päättyy ≤ 30 min ennen sen alkua.
4. **V4 iltapala** tehdään vain, kun päivässä on vähintään yksi peli.
5. **V4 lämmin ateria** tehdään myös silloin, kun ainoa myöhempi ateria on iltapala (iltapala ei ole lounas eikä päivällinen).
6. **Porras (V9)** ei nosta V4:n myöhäisen pelin 40–70:tä eikä V5.4:n rajattua haarukkaa uudestaan.
7. **Pyöristys:** `nesteKulauksista` käyttää `Math.round`-pyöristystä; kesto 22 → n = 1 → `[1, 2]`.
8. **V6 ei koske aukkoja:** aukot syntyvät V7:ssä V6:n jälkeen, ja ne saavat olla 30 min päässä seuraavasta ikkunasta (V7 leikkaa ne `seuraavan alku − 30`:een). T11:n aukko 10.30–11.30 ja pääateria 12.00 ovat molemmat voimassa.
9. **Laskettu aamiainen (V2)** tehdään vain, kun päivässä on peli ja kiinteää aamiainen-osiota ei ole. T1:ssä se syntyy, vaikka ohjelma alkaa lounaalla, koska lapsi syö aamiaisen joka tapauksessa.

Vaiheessa 2b lisätyt tarkennukset. Ne ratkaisevat ristiriidat sääntötekstin ja käsin laskettujen testitapausten välillä, ja testitapaukset jäivät ennalleen:

10. **Suoritusjärjestys:** V8:n leikkaus ajetaan ennen V6:ta, jotta osion alle jäävä ikkuna ei poista muita. Ikkuna, joka päättyy täsmälleen päivän alkuun, poistuu (T6).
11. **Aamupeli** täyttyy, kun peli on alle 180 min päivän alusta tai kiinteästä aamiaisesta (S11).
12. **Porras (V9):** haarukka nousee lähimpään portaaseen, jonka alaraja on nykyistä suurempi. Siksi 30–50 ja 25–50 nousevat 40–70:een, ja 40–70 pysyy.
13. **S19 sääntöviitteessä:** S19 lisätään, kun rooli on `normaali` ja peliin on enintään 240 min, tai kun peliin on alle 120 min.
14. **Valinnat:** `ostoslista` ottaa mukaan vain nykyisen ohjelman ikkunoiden valinnat, joten poistuneen ikkunan tuote ei jää listalle. `ohjelmanPaivat(ohjelma)` laskee rasituksen ja viereiset pelipäivät; viereisyys päätellään kalenteripäivistä.
15. **Aukon id:** jos sama osio tuottaisi kaksi aukkoa, jälkimmäinen saa päätteen `-2`.

## 8. Avoimet kohdat käyttäjälle

- Tuplapelit Eerikkilässä on mallinnettu yhtenä 45 min pelinä aikaväliä kohti (vaihe 1). Jos sama pelaaja pelaa molemmat, osiot kannattaa kirjata kahtena pelinä (esim. 15.30 ja 16.20), jolloin T7:n sijaan väli on positiivinen ja logiikka tuottaa pikatankkauksen.
- Rasitustasot ja porras (S5) ovat sovelluksen oma malli (A3). Ne eivät väitä olevansa lähteistä mitattuja rajoja.
- `lamminAteria`-ikkunan ajoitus `l + 90…l + 150` on oletus, jolla ikkuna ei lomitu palautuksen kanssa.

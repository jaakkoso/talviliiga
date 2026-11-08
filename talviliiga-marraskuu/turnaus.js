/* Talviliiga P12 – turnauksen asetukset (Pelipäivä). Sivut generoidaan näistä:
   node pelipaiva/tyokalut/pelipaiva.mjs paivita
   SHEET_ID ja API_URL tyhjänä = esikatselu esimerkkidatalla. PIN-koodit ovat vain Apps Scriptin ominaisuuksissa, eivät tässä. */
window.TURNAUS = {
  id: "talviliiga-marraskuu", // kansion nimi; erottaa selaimen muistin muista turnauksista
  nimi: "Talviliiga P12", // sivun otsikko ennen kuin taulukon tiedot latautuvat
  lyhytnimi: "Talviliiga", // kotinäytön kuvakkeen nimi
  kuvaus: "Talviliiga P12 Wallsportilla 21.11.2026: kilpa ja haaste, tulokset ja sarjataulukot.", // hakukoneille ja linkin esikatseluun
  otsikkoliite: "", // esim. "· SJK P2015" selaimen välilehden otsikon perään
  vari: "#211e1e", // selaimen yläpalkin väri
  SHEET_ID: "", // Google Sheetin tunnus
  API_URL: "", // Apps Script -verkkosovelluksen …/exec-osoite
};

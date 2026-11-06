// Offline-tuki. Koskee vain omaan kansioon kuuluviin pyyntöihin; muut polut ja fontit menevät suoraan verkkoon.
// Kun jokin tiedosto muuttuu, nosta VERSIO, niin puhelimet hakevat uudet tiedostot.
const VERSIO = "2026-11-06-5";
const ETULIITE = "ravinto-";
const VALIMUISTI = ETULIITE + VERSIO;
const KANSIO = new URL("./", self.location).pathname;
const SIVU = KANSIO + "index.html";

const TIEDOSTOT = [
  "./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "js/aika.js", "js/aikajana.js", "js/omat-tuotteet.js", "js/rasitus.js", "js/saannot.js", "js/tallennus.js", "js/tavoitteet.js", "js/tuonti.js", "js/turnaus.js",
  "data/tuotteet.json", "data/ohjelma-eerikkila-2026-11.json", "data/ohjelma-jyvaskyla-2026-11-07.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VALIMUISTI).then(async (c) => {
    await c.addAll(TIEDOSTOT);
    // Tuotekuvat luetaan tuotelistasta, jotta uutta kuvaa ei tarvitse lisätä tähän käsin. Puuttuva kuva ei estä asennusta.
    const { tuotteet } = await (await c.match("data/tuotteet.json")).json();
    await Promise.allSettled(tuotteet.filter((t) => t.kuva).map((t) => c.add(t.kuva)));
  }).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  // Alkuperä on yhteinen repon muiden sivujen kanssa, joten poistetaan vain omat vanhat välimuistit.
  e.waitUntil(caches.keys()
    .then((nimet) => Promise.all(nimet.filter((n) => n.startsWith(ETULIITE) && n !== VALIMUISTI).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

async function verkkoEnsin(pyynto) {
  const c = await caches.open(VALIMUISTI);
  try {
    const v = await fetch(pyynto);
    if (v.ok) await c.put(pyynto, v.clone());
    return v;
  } catch (virhe) {
    const tallessa = await c.match(pyynto);
    if (tallessa) return tallessa;
    throw virhe;
  }
}

async function valimuistiEnsin(pyynto) {
  const c = await caches.open(VALIMUISTI);
  return (await c.match(pyynto, { ignoreSearch: true })) ?? fetch(pyynto);
}

self.addEventListener("fetch", (e) => {
  const osoite = new URL(e.request.url);
  if (e.request.method !== "GET" || osoite.origin !== self.location.origin || !osoite.pathname.startsWith(KANSIO)) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.open(VALIMUISTI).then((c) => c.match(SIVU))));
  } else if (osoite.pathname.startsWith(KANSIO + "data/")) {
    e.respondWith(verkkoEnsin(e.request));
  } else {
    e.respondWith(valimuistiEnsin(e.request));
  }
});

#!/bin/bash
# Huuhkajaliigan pelipäivän live-silmukka: tarkistaa aikataulun tulospalvelusta ja hakee tilanteen minuutin välein vain otteluiden aikana.
# Tulosmuutokset julkaistaan heti, muuten 2 min välein.
# ja vie sen sivustolle. Loppuu itsestään, kun päivän pelit ovat ohi (paivita.mjs palauttaa koodin 3).
# Käynnistyy automaattisesti paivita-kotona.sh:sta pelipäivinä. Käsin: scripts/kotikone/live.sh
cd "$(dirname "$0")/../.." || exit 1
LUKKO=/tmp/p2015-live.lock
if ! mkdir "$LUKKO" 2>/dev/null; then
  # Vanha lukko jää, jos kone sammui kesken: ohitetaan, jos prosessi ei ole enää käynnissä
  if [ -f "$LUKKO/pid" ] && kill -0 "$(cat "$LUKKO/pid")" 2>/dev/null; then echo "Live-haku on jo käynnissä."; exit 0; fi
  rm -rf "$LUKKO"; mkdir "$LUKKO" || exit 1
fi
echo $$ > "$LUKKO/pid"
trap 'rm -rf "$LUKKO"' EXIT
# Estetään koneen automaattinen lepotila silmukan ajaksi (kannen sulkeminen nukuttaa silti)
command -v caffeinate >/dev/null && caffeinate -i -w $$ &
[ -d "/Applications/Google Chrome.app" ] && export SELAIN=chrome
echo "== live alkaa $(date '+%-d.%-m. %H.%M') =="
export LIVE_VERSIO=2   # paivita.mjs tunnistaa tästä ajantasaisen silmukan
for kierros in $(seq 1 2000); do
  git pull -q --rebase -X theirs 2>/dev/null || { git rebase --abort 2>/dev/null; git fetch -q && git reset -q --hard origin/main; }
  ( cd scripts/paivitys && PAIVITA=live node paivita.mjs ); koodi=$?
  if [ "$(cat /tmp/p2015-live-julkaise 2>/dev/null || echo 1)" != "1" ]; then
    git checkout -q -- eerikkila turnaukset scripts/paivitys/tila-live.json 2>/dev/null   # vain kello muuttui: odotetaan seuraavaa julkaisua
  elif [ -n "$(git status --porcelain eerikkila turnaukset scripts/paivitys/tila-live.json)" ]; then
    git add eerikkila turnaukset scripts/paivitys/tila-live.json
    git -c user.name="Tulospäivitys (kotikone)" -c user.email="tulospaivitys@users.noreply.github.com" \
      commit -q -m "Live-tulokset $(date '+%-d.%-m. klo %H.%M')"
    for i in 1 2 3; do git push -q && break; git pull -q --rebase -X theirs || { git rebase --abort; git pull -q --rebase; }; sleep 5; done
    touch /tmp/p2015-live-julkaistu
  fi
  [ "$koodi" = "3" ] && { echo "== päivän pelit ohi $(date '+%H.%M') =="; break; }
  # Nukutaan seuraavaan otteluun asti (pelien aikana 1 min, muuten enintään tunti, jotta aikataulumuutokset huomataan)
  SEURAAVA=$(cat /tmp/p2015-live-seuraava 2>/dev/null || echo 4)
  case "$SEURAAVA" in ''|*[!0-9]*) SEURAAVA=4;; esac
  [ "$SEURAAVA" -gt 60 ] && SEURAAVA=60
  echo "seuraava haku $SEURAAVA min päästä"
  sleep $((SEURAAVA * 60))
done

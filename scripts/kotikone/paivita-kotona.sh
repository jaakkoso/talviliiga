#!/bin/bash
# Kotikoneen ajastettu haku: Palloliiton tulokset, taulukot ja ottelutiedot → sivusto.
cd "$(dirname "$0")/../.." || exit 1
echo "== $(date '+%-d.%-m.%Y %H.%M') =="
git pull -q --rebase || { git rebase --abort 2>/dev/null; git fetch -q && git reset -q --hard origin/main; }
cd scripts/paivitys
[ -d node_modules ] || npm install --no-audit --no-fund --silent
node testi.mjs >/dev/null || { echo "Jäsennystesti epäonnistui, haku ohitetaan."; exit 1; }
[ -d "/Applications/Google Chrome.app" ] && export SELAIN=chrome
PAIVITA=palloliitto node paivita.mjs
cd ../..
rm -f scripts/paivitys/varoitukset.txt
if [ -n "$(git status --porcelain piirisarja eerikkila scripts/paivitys/tila-palloliitto.json)" ]; then
  git add piirisarja eerikkila scripts/paivitys/tila-palloliitto.json
  git -c user.name="Tulospäivitys (kotikone)" -c user.email="tulospaivitys@users.noreply.github.com" \
    commit -q -m "Palloliiton tulokset päivitetty $(date '+%-d.%-m.%Y klo %H.%M')"
  for i in 1 2 3; do git push -q && { echo "Viety sivustolle."; break; }; git pull -q --rebase -X theirs || { git rebase --abort; git pull -q --rebase; }; sleep 5; done
else
  echo "Ei muutoksia."
fi

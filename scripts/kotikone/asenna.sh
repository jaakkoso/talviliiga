#!/bin/bash
# P2015-tulospäivitys kotikoneelle (macOS).
# Hakee Palloliiton tulokset kahden tunnin välein ja vie ne sivustolle. Aja Päätteessä:
#   curl -fsSL https://raw.githubusercontent.com/jaakkoso/talviliiga/main/scripts/kotikone/asenna.sh | bash
set -e
KANSIO="$HOME/p2015-tulokset"
REPO="https://github.com/jaakkoso/talviliiga.git"
NIMI="fi.p2015.tulospaivitys"
PLIST="$HOME/Library/LaunchAgents/$NIMI.plist"
LOKI="$HOME/Library/Logs/p2015-tulospaivitys.log"

echo "== P2015-tulospäivitys: asennus =="

# 1. Node.js ja git
NODE="$(command -v node || true)"
if [ -z "$NODE" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; NODE="$(command -v node || true)"; fi
if [ -z "$NODE" ]; then echo "Node.js puuttuu. Asenna LTS-versio osoitteesta https://nodejs.org ja aja tämä komento uudelleen."; exit 1; fi
NODEBIN="$(dirname "$NODE")"
command -v git >/dev/null || { echo "git puuttuu. Aja ensin: xcode-select --install"; exit 1; }
echo "Node: $("$NODE" -v)"

# 2. Sivuston kopio kotikoneelle
if [ -d "$KANSIO/.git" ]; then git -C "$KANSIO" pull -q --rebase; else git clone -q "$REPO" "$KANSIO"; fi
git -C "$KANSIO" config credential.helper osxkeychain

# 3. Hakuohjelma ja selain
cd "$KANSIO/scripts/paivitys"
"$NODEBIN/npm" install --no-audit --no-fund --silent
"$NODEBIN/npx" playwright install chromium

# 4. Oikeus viedä tulokset GitHubiin (tallennetaan macOS:n avainnippuun)
if ! git -C "$KANSIO" push --dry-run -q >/dev/null 2>&1; then
  echo
  echo "Tarvitaan GitHub-avain, jolla tulokset viedään sivustolle:"
  echo "  1. Avaa https://github.com/settings/personal-access-tokens/new"
  echo "  2. Nimi: p2015-tulospaivitys · Expiration: 1 vuosi"
  echo "  3. Repository access: Only select repositories → talviliiga"
  echo "  4. Permissions → Repository permissions → Contents: Read and write"
  echo "  5. Generate token ja kopioi avain"
  printf "Liitä avain tähän (ei näy kirjoittaessa) ja paina Enter: "
  read -rs TOKEN < /dev/tty; echo
  printf "protocol=https\nhost=github.com\nusername=jaakkoso\npassword=%s\n\n" "$TOKEN" | git credential-osxkeychain store
  git -C "$KANSIO" push --dry-run -q >/dev/null 2>&1 || { echo "Avain ei toiminut. Tarkista oikeudet (Contents: Read and write) ja aja asennus uudelleen."; exit 1; }
fi
echo "GitHub-yhteys kunnossa."

# 5. Ajastus: kahden tunnin välein ja heti kun kone herää
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$NIMI</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$KANSIO/scripts/kotikone/paivita-kotona.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$NODEBIN:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>StartInterval</key><integer>7200</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOKI</string>
  <key>StandardErrorPath</key><string>$LOKI</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/$NIMI" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo
echo "Valmis. Ensimmäinen haku käynnistyi taustalle. Loki: $LOKI"
echo "Poisto: launchctl bootout gui/\$(id -u)/$NIMI && rm \"$PLIST\""

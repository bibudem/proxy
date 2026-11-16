#!/bin/sh
# Change la version dans les trois manifestes et indique les commandes pour publier.
# Usage : scripts/version.sh 1.2.4
set -eu
V="${1:?Usage : scripts/version.sh X.Y.Z}"
echo "$V" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "Version invalide : $V" >&2; exit 1; }
cd "$(dirname "$0")/.."
for n in firefox chrome edge; do
  sed -i.bak -E "s/(\"version\": *\")[^\"]+\"/\1$V\"/" "$n/manifest.json" && rm "$n/manifest.json.bak"
  grep '"version"' "$n/manifest.json"
done
echo
echo "Ensuite :"
echo "  git commit -am \"Version $V\""
echo "  git push                    # le workflow crée l'étiquette v$V et la release"

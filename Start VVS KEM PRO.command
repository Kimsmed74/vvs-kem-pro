#!/bin/bash
# Dobbeltklikk denne filen i Finder for å starte VVS KEM PRO lokalt.
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -d "$DIR/vvs-kem-pro" ]; then
  cd "$DIR/vvs-kem-pro" || exit 1
else
  cd "$DIR" || exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js er ikke installert. Last ned fra https://nodejs.org og prøv igjen."
  read -r -p "Trykk Enter for å lukke…"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Første gangs oppstart: installerer avhengigheter…"
  npm install --no-audit --no-fund || { echo "Installasjon feilet."; read -r -p "Trykk Enter for å lukke…"; exit 1; }
fi

echo "Starter VVS KEM PRO (Kommandosentral & Beregningsmotor) – nettleseren åpnes automatisk."
echo "Avslutt med Ctrl+C i dette vinduet."
npm run dev -- --open

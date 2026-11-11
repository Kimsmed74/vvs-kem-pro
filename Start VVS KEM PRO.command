#!/bin/bash
# Dobbeltklikk denne filen i Finder for å starte VVS KEM PRO lokalt.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js er ikke installert. Last ned fra https://nodejs.org og prøv igjen."
  read -r -p "Trykk Enter for å lukke…"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Første gangs oppstart: installerer avhengigheter (krever internett)…"
  npm install --no-audit --no-fund || { echo "Installasjon feilet."; read -r -p "Trykk Enter for å lukke…"; exit 1; }
fi

echo "Starter VVS KEM PRO – nettleseren åpnes automatisk. Avslutt med Ctrl+C."
npm run dev -- --open

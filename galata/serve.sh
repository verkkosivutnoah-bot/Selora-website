#!/bin/sh
# Peilaa sivuston väliaikaiskansioon localhost-palvelinta varten (macOS estää
# palvelinta lukemasta Desktop-kansiota). Aja muokkausten jälkeen.
SRC="$(cd "$(dirname "$0")" && pwd)/"
DST="/private/tmp/claude-501/-Users-noahtuokkola-Desktop-Selora-Outputs/d5079b82-702d-4d2c-901c-d14fa6741bb8/scratchpad/galata-serve/"
mkdir -p "$DST"
rsync -a --delete --exclude serve.sh --exclude '*.py' "$SRC" "$DST"
echo "peilattu -> $DST"

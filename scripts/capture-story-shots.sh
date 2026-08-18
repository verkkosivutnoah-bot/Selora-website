#!/usr/bin/env bash
# Capture the still that each example card shows.
#
# Every card in the examples marquee needs a 920x575 WebP under assets/img/.
# Phones and tablets never mount the live iframe, so on those the still IS the
# preview: a card without one is a blank slab.
#
#   ./scripts/capture-story-shots.sh                 # all examples
#   ./scripts/capture-story-shots.sh ardenwood       # just one
#
# Uses the Chrome already on the machine, headless. --virtual-time-budget lets
# webfonts, images and entrance animations settle before the frame is taken;
# without it you capture the pre-animation state, which for several of these
# sites is an empty coloured box.
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/img"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# slug -> path, matching the data-src values in the markup
entry_path() {
  case "$1" in
    vantage-site|plume|nocturne|green-electrician|harbourline) echo "portfolio/$1.html" ;;
    *) echo "portfolio/$1/index.html" ;;
  esac
}

shoot() {
  slug="$1"
  src="$ROOT/$(entry_path "$slug")"
  [ -f "$src" ] || { echo "skip $slug, no $src"; return; }
  # Several examples hold themselves behind an intro curtain that only lifts
  # on a click, and headless Chrome cannot click. Shoot a throwaway copy
  # beside the original, with those overlays hidden, so the still shows the
  # actual page rather than its splash screen. It sits in the site's own
  # directory so relative CSS, JS and image paths still resolve.
  shot="$(dirname "$src")/__shot.html"
  python3 - "$src" "$shot" <<'PYEOF'
import sys
src, dst = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
hide = ('<style id="__shot">#gate,.gate,#loader,.loader,#preloader,'
        '.preloader,#intro,.intro-overlay{display:none!important}'
        'html,body{overflow:visible!important}</style>')
html = html.replace('</head>', hide + '</head>', 1) if '</head>' in html else hide + html
open(dst, 'w', encoding='utf-8').write(html)
PYEOF
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
            --window-size=1440,900 --virtual-time-budget=8000 \
            --screenshot="$TMP/$slug.png" "file://$shot" >/dev/null 2>&1 || true
  rm -f "$shot"
  [ -s "$TMP/$slug.png" ] || { echo "FAILED $slug"; return; }
  # sips on this machine cannot write WebP, so Pillow does the encode
  python3 - "$TMP/$slug.png" "$OUT/story-$slug.webp" <<'PYEOF'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB').resize((920, 575), Image.LANCZOS)
im.save(dst, 'WEBP', quality=72, method=6)
PYEOF
  printf "%-20s %s\n" "$slug" "$(du -h "$OUT/story-$slug.webp" | cut -f1)"
}

if [ $# -gt 0 ]; then
  for s in "$@"; do shoot "$s"; done
else
  for s in vantage-site plume nocturne green-electrician harbourline aurelian stillpoint ardenwood fernwood; do
    shoot "$s"
  done
fi

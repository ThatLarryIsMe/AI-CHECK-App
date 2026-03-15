#!/usr/bin/env bash
# ── Build Factward extension for dev or prod ──
#
# Usage: ./scripts/build.sh [dev|prod]
# Output: dist/ directory ready to load as unpacked extension
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$DIR/dist"
MODE="${1:-dev}"

rm -rf "$DIST"
mkdir -p "$DIST/icons"

# Copy source files
cp "$DIR"/*.js "$DIR"/*.html "$DIR"/*.css "$DIST/"
cp "$DIR"/icons/icon-*.png "$DIST/icons/"

if [ "$MODE" = "dev" ]; then
  cp "$DIR/manifest.dev.json" "$DIST/manifest.json"
  sed -i 's|const API_BASE = "https://factward.ai"|const API_BASE = "http://localhost:3000"|g' \
    "$DIST/popup.js" "$DIST/background.js"
  sed -i 's|const API_BASE = "https://factward.ai"|const API_BASE = "http://localhost:3000"|g' \
    "$DIST/welcome.html"
  sed -i 's|https://factward.ai/signup|http://localhost:3000/signup|g' \
    "$DIST/welcome.html" "$DIST/popup.html"
  echo "Built DEV extension → $DIST"
  echo "Load this folder as unpacked extension in chrome://extensions"
elif [ "$MODE" = "prod" ]; then
  cp "$DIR/manifest.json" "$DIST/manifest.json"
  echo "Built PROD extension → $DIST"
else
  echo "Usage: $0 [dev|prod]" >&2
  exit 1
fi

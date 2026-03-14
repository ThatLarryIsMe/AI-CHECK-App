#!/usr/bin/env bash
# ── Package Factward extension for Chrome Web Store upload ──
#
# Usage: ./package.sh
# Output: factward-extension.zip (ready for Chrome Web Store upload)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$SCRIPT_DIR/factward-extension.zip"

# Remove old build
rm -f "$OUTPUT"

# Files to include in the package
cd "$SCRIPT_DIR"
zip -r "$OUTPUT" \
  manifest.json \
  background.js \
  popup.html \
  popup.js \
  popup.css \
  content.js \
  content.css \
  welcome.html \
  privacy.html \
  icons/icon-16.png \
  icons/icon-48.png \
  icons/icon-128.png \
  -x "*.DS_Store" "*.map"

echo ""
echo "✓ Packaged: $OUTPUT"
echo ""
echo "Next steps:"
echo "  1. Go to https://chrome.google.com/webstore/devconsole"
echo "  2. Click 'New Item' and upload factward-extension.zip"
echo "  3. Fill in the store listing (see STORE_LISTING.md)"
echo "  4. Submit for review"

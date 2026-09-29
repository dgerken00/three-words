#!/bin/bash
# Redraws the link-preview image for a /describe/ cloud from the live answers.
#   tools/make-cloud-image.sh 2026   ->   docs/describe/2026/og.png
# Needs Google Chrome. The image shows real answers with the count and date, so re-run it as the cloud grows.
set -euo pipefail
slug="${1:-2026}"
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/docs/describe/$slug/og.png"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=10000 \
  --screenshot="$out" "file://$root/tools/cloud-image.html?t=$slug" >/dev/null 2>&1
echo "wrote $out"

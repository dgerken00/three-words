#!/bin/bash
# Redraws the link-preview image for a /describe/ cloud from the live answers.
#   tools/make-cloud-image.sh 2026   ->   docs/describe/2026/og.png
#   tools/make-cloud-image.sh 2026 store-assets/producthunt/cloud-2026.png 1270 760
#                                    ->   the same cloud at another size and place (Product Hunt gallery)
# Needs Google Chrome. The image shows real answers with the count and date, so re-run it as the cloud grows.
set -euo pipefail
slug="${1:-2026}"
root="$(cd "$(dirname "$0")/.." && pwd)"
out="${2:-$root/docs/describe/$slug/og.png}"
w="${3:-1200}"; h="${4:-630}"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="$w,$h" --virtual-time-budget=10000 \
  --screenshot="$out" "file://$root/tools/cloud-image.html?t=$slug&w=$w&h=$h" >/dev/null 2>&1
echo "wrote $out"

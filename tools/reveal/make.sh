#!/bin/bash
# Builds 15-second vertical "cloud reveal" clips of the public clouds, for YouTube Shorts,
# TikTok and Instagram Reels:
#   tools/reveal/make.sh              -> the 2026 and year-ahead clouds
#   tools/reveal/make.sh your-job     -> just the clouds named
# Output: store-assets/shorts/<slug>-reveal.mp4, plus a 1080x1920 cover .jpg of the finished cloud.
# Each run first fetches the named clouds into data.js, so a clip shows the answers as of the
# day it's built: watch it before posting. Reuses ../video/capture.mjs, encode.swift and
# mux.swift unchanged. Needs Google Chrome, Node, and the Xcode command line tools.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
video="$root/tools/video"
out="$root/store-assets/shorts"
work="$(mktemp -d "${TMPDIR:-/tmp}/three-words-reveal.XXXXXX")"
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"
slugs=("$@"); [ ${#slugs[@]} -eq 0 ] && slugs=(2026 year-ahead)

echo "== data: fetching ${slugs[*]} into data.js"
URL=$(grep -o -E "https://[a-z0-9]+\.supabase\.co" "$root/docs/describe/cloud.js" | head -1)
KEY=$(grep -o -E "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" "$root/docs/describe/cloud.js" | head -1)
for slug in "${slugs[@]}"; do
  curl -sf -X POST "$URL/rest/v1/rpc/get_topic_cloud" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" -d "{\"p_slug\":\"$slug\",\"p_limit\":30}" > "$work/$slug.json"
done
python3 - "$work" "$here/data.js" "${slugs[@]}" <<'PY'
import datetime, json, sys
work, out, *slugs = sys.argv[1:]
clouds = {}
for slug in slugs:
    d = json.load(open(f"{work}/{slug}.json"))
    if not d or not d.get("words"):
        sys.exit(f"cloud '{slug}' has no answers yet")
    clouds[slug] = {"title": d["title"], "total": d["total"], "words": [[x["w"], x["c"]] for x in d["words"]]}
    print(f"   {slug}: {d['total']} answers, {len(d['words'])} words shown")
data = {"as_of": datetime.date.today().isoformat(), "clouds": clouds}
open(out, "w").write("// The public clouds as the reveal clips show them (up to 30 most-said words each),\n"
                     "// fetched by make.sh from the public get_topic_cloud RPC on the date below.\n"
                     "window.REVEAL = " + json.dumps(data) + ";\n")
PY

swiftc -O -suppress-warnings "$video/encode.swift" -o "$work/encode"
swiftc -O -suppress-warnings "$video/mux.swift" -o "$work/mux"

for slug in "${slugs[@]}"; do
  echo "== $slug: music"
  node "$here/music.mjs" "$slug" "$work/$slug.wav"
  afconvert -f m4af -d aac -b 192000 "$work/$slug.wav" "$work/$slug.m4a"
  echo "== $slug: frames (450 at 30 fps)"
  node "$video/capture.mjs" "$work/$slug-frames" 30 15 1080 1920 "../reveal/reveal.html?slug=$slug"
  echo "== $slug: encode"
  "$work/encode" "$work/$slug-frames" "$work/$slug-silent.mp4" 30
  "$work/mux" "$work/$slug-silent.mp4" "$work/$slug.m4a" "$out/$slug-reveal.mp4"
  sips -s format jpeg -s formatOptions 85 "$work/$slug-frames/f0420.png" --out "$out/$slug-reveal.jpg" >/dev/null
done
ls -la "$out"

#!/bin/bash
# Builds the 30-second three·words promo:
#   tools/video/make.sh            -> docs/video/three-words-in-30-seconds.mp4 (+ poster .jpg)
#   REFRESH=1 tools/video/make.sh  -> the same, after fetching the live clouds into data.js first;
#                                     the words, counts and date in the video change with it,
#                                     so watch the result before publishing it
# Steps: synthesize the soundtrack (promo-music.mjs) -> AAC, capture promo.html frame by
# frame with headless Chrome (capture.mjs), encode with AVFoundation (encode.swift),
# mux audio under video (mux.swift). Needs Google Chrome, Node, and the Xcode command
# line tools (swiftc, afconvert). Each run works in its own temporary folder, so two
# builds running at once can't mix their frames.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/three-words-video.XXXXXX")"
trap 'rm -rf "$work"' EXIT
out="$root/docs/video"
mkdir -p "$work/frames" "$out"

if [ "${REFRESH:-0}" = 1 ]; then
  echo "== data: fetching the live clouds into data.js"
  URL=$(grep -o -E "https://[a-z0-9]+\.supabase\.co" "$root/docs/describe/cloud.js" | head -1)
  KEY=$(grep -o -E "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" "$root/docs/describe/cloud.js" | head -1)
  for spec in 2026:40 year-ahead:3 your-job:3; do
    curl -sf -X POST "$URL/rest/v1/rpc/get_topic_cloud" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" -d "{\"p_slug\":\"${spec%:*}\",\"p_limit\":${spec#*:}}" > "$work/${spec%:*}.json"
  done
  python3 - "$work" "$here/data.js" <<'PY'
import datetime, json, sys
work, out = sys.argv[1:3]
clouds = {}
for slug in ("2026", "year-ahead", "your-job"):
    d = json.load(open(f"{work}/{slug}.json"))
    clouds[slug] = {"total": d["total"], "words": [[x["w"], x["c"]] for x in d["words"]]}
    print(f"   {slug}: {d['total']} answers")
head = "".join(line for line in open(out) if line.startswith("//"))  # keep the file's own comment
data = {"as_of": datetime.date.today().isoformat(), "clouds": clouds}
open(out, "w").write(head + "window.PROMO_DATA = " + json.dumps(data) + ";\n")
PY
fi

echo "== music"
node "$here/promo-music.mjs" "$work/music.wav"
afconvert -f m4af -d aac -b 192000 "$work/music.wav" "$work/music.m4a"

echo "== frames (900 at 30 fps)"
node "$here/capture.mjs" "$work/frames" 30 30 1080 1080 promo.html

echo "== encode"
swiftc -O -suppress-warnings "$here/encode.swift" -o "$work/encode"
swiftc -O -suppress-warnings "$here/mux.swift" -o "$work/mux"
"$work/encode" "$work/frames" "$work/silent.mp4" 30
"$work/mux" "$work/silent.mp4" "$work/music.m4a" "$out/three-words-in-30-seconds.mp4"

echo "== poster (the finished 2026 cloud, frame at 22.9 s)"
sips -s format jpeg -s formatOptions 85 "$work/frames/f0687.png" --out "$out/three-words-in-30-seconds.jpg" >/dev/null
ls -la "$out"

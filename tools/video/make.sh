#!/bin/bash
# Builds the 30-second three·words explainer:
#   tools/video/make.sh            -> docs/video/three-words-in-30-seconds.mp4 (+ poster .jpg)
# Steps: synthesize the soundtrack (music.mjs) -> AAC, capture explainer.html frame by
# frame with headless Chrome (capture.mjs), encode with AVFoundation (encode.swift),
# mux audio under video (mux.swift). Needs Google Chrome, Node, and the Xcode command
# line tools (swiftc, afconvert). Run tools/make-cloud-image.sh first if you want
# data.js refreshed: this script re-fetches the 2026 cloud into data.js itself.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
work="${TMPDIR:-/tmp}/three-words-video"
out="$root/docs/video"
mkdir -p "$work/frames" "$out"

echo "== data: fetching the live 2026 cloud"
URL=$(grep -o -E "https://[a-z0-9]+\.supabase\.co" "$root/docs/describe/cloud.js" | head -1)
KEY=$(grep -o -E "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" "$root/docs/describe/cloud.js" | head -1)
curl -s -X POST "$URL/rest/v1/rpc/get_topic_cloud" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d '{"p_slug":"2026","p_limit":40}' | python3 -c "
import json,sys,datetime; d=json.load(sys.stdin)
today=datetime.date.today().isoformat()
out={'total':d['total'],'distinct':d['distinct_words'],'as_of':today,'words':[{'w':x['w'],'c':x['c']} for x in d['words']]}
open('$here/data.js','w').write('// Real answers from /describe/2026/, fetched '+today+'. Regenerate with make.sh.\nwindow.DATA_2026 = '+json.dumps(out)+';\n')
print('  ', out['total'], 'answers,', len(out['words']), 'words')"

echo "== music"
node "$here/music.mjs" "$work/music.wav"
afconvert -f m4af -d aac -b 192000 "$work/music.wav" "$work/music.m4a"

echo "== frames (900 at 30 fps)"
rm -f "$work/frames"/*.png
node "$here/capture.mjs" "$work/frames" 30 30 1080 1080 explainer.html

echo "== encode"
[ -x "$work/encode" ] || swiftc -O "$here/encode.swift" -o "$work/encode"
[ -x "$work/mux" ] || swiftc -O "$here/mux.swift" -o "$work/mux"
"$work/encode" "$work/frames" "$work/silent.mp4" 30
"$work/mux" "$work/silent.mp4" "$work/music.m4a" "$out/three-words-in-30-seconds.mp4"

echo "== poster (the 2026 cloud, frame at 18.5 s)"
sips -s format jpeg -s formatOptions 85 "$work/frames/f0555.png" --out "$out/three-words-in-30-seconds.jpg" >/dev/null
ls -la "$out"

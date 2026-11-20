#!/usr/bin/env bash
# Final mux + delivery encodes for the Bashman hepatitis B ad.
set -euo pipefail
cd "$(dirname "$0")"

RAW="${1:-video/frames_raw.mp4}"
AUD="audio/final_master.wav"
OUTDIR="deliver"
mkdir -p "$OUTDIR"
MASTER="$OUTDIR/bashman-hepatitis-b-ad-1080x1920.mp4"

echo "==> master 1080x1920"
./bin/ffmpeg -hide_banner -loglevel error -y \
  -i "$RAW" -i "$AUD" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -profile:v high -level 4.2 -preset slow -crf 18 \
  -x264-params "keyint=60:min-keyint=30:scenecut=0:ref=4:bframes=3:aq-mode=3" \
  -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart -shortest "$MASTER"

echo "==> 720x1280 (lighter feed version)"
./bin/ffmpeg -hide_banner -loglevel error -y \
  -i "$MASTER" \
  -vf "scale=720:1280:flags=lanczos" \
  -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 21 \
  -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -movflags +faststart "$OUTDIR/bashman-hepatitis-b-ad-720x1280.mp4"

echo "==> poster"
./bin/ffmpeg -hide_banner -loglevel error -y -ss 1.7 -i "$MASTER" -frames:v 1 -q:v 2 "$OUTDIR/poster.jpg"

echo
for f in "$OUTDIR"/*; do
  printf "%-58s %8s  " "$(basename "$f")" "$(du -h "$f" | cut -f1)"
  ./bin/ffmpeg -hide_banner -i "$f" 2>&1 | grep -oE "Duration: [0-9:.]+" | head -1 || true
done
echo
./bin/ffmpeg -hide_banner -i "$MASTER" 2>&1 | grep -E "Stream|Duration" || true

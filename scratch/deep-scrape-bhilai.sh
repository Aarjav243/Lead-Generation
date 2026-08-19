#!/bin/bash
# Runs the remaining Bhilai restaurant keywords as separate sequential jobs
# (depth 10, one keyword each) to stay under the scraper's ~60s inactivity
# watchdog that killed the 9-keyword/depth-15 combined job. One job at a time
# per the scraper skill's rate-limit guidance.
set -uo pipefail
BASE="http://localhost:8080/api/v1"
LAT="21.2120677"
LON="81.3732849"
OUT_DIR="scratch"

KEYWORDS=(
  "family restaurants in Bhilai"
  "veg restaurants in Bhilai"
  "non veg restaurants in Bhilai"
  "dhaba in Bhilai"
  "fast food in Bhilai"
  "fine dining in Bhilai"
  "hotel restaurant in Bhilai"
  "cafe in Bhilai"
  "Kwality restaurant Bhilai"
)

i=0
for KW in "${KEYWORDS[@]}"; do
  i=$((i+1))
  echo "=== [$i/${#KEYWORDS[@]}] $KW ==="
  BODY=$(node -e "console.log(JSON.stringify({name:'bhilai-kw-$i',keywords:[process.argv[1]],lang:'en',zoom:15,lat:process.argv[2],lon:process.argv[3],fast_mode:false,radius:12000,depth:10,email:true,max_time:180}))" "$KW" "$LAT" "$LON")
  ID=$(curl -s -X POST "$BASE/jobs" -H "Content-Type: application/json" -d "$BODY" | grep -oE '"id":"[^"]*"' | cut -d'"' -f4)
  echo "job id: $ID"
  if [ -z "$ID" ]; then echo "FAILED to create job, skipping"; continue; fi
  S=""
  for p in $(seq 1 20); do
    S=$(curl -s "$BASE/jobs/$ID" | grep -oE '"Status":"[^"]*"' | head -1 | cut -d'"' -f4)
    [ "$S" = ok ] && break
    [ "$S" = failed ] && break
    sleep 8
  done
  echo "status: $S"
  if [ "$S" = ok ]; then
    curl -s "$BASE/jobs/$ID/download" -o "$OUT_DIR/bhilai-kw-$i.csv"
    LINES=$(wc -l < "$OUT_DIR/bhilai-kw-$i.csv")
    echo "saved $OUT_DIR/bhilai-kw-$i.csv ($LINES lines)"
  fi
  sleep 3
done
echo "ALL_DONE"

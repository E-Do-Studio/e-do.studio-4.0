#!/bin/bash
UPLOADS_DIR="../public/uploads"
TOTAL_SAVED=0
COUNT=0
OPTIMIZED=0

echo "=== VIDEO OPTIMIZATION ==="

for f in "$UPLOADS_DIR"/*.mp4 "$UPLOADS_DIR"/*.mov; do
  [ -f "$f" ] || continue
  COUNT=$((COUNT + 1))

  ORIGINAL_SIZE=$(stat -f%z "$f")
  ORIGINAL_KB=$((ORIGINAL_SIZE / 1024))
  BASENAME=$(basename "$f")
  EXT="${f##*.}"
  TMPFILE="${f}.optimized.mp4"

  echo -n "[$COUNT] $BASENAME (${ORIGINAL_KB}KB) → "

  # Compress with H.264, CRF 28 (good quality, much smaller), scale down to 1080p max
  ffmpeg -y -i "$f" \
    -c:v libx264 -crf 28 -preset medium \
    -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    -loglevel error \
    "$TMPFILE" 2>&1

  if [ $? -eq 0 ] && [ -f "$TMPFILE" ]; then
    NEW_SIZE=$(stat -f%z "$TMPFILE")
    NEW_KB=$((NEW_SIZE / 1024))

    if [ "$NEW_SIZE" -lt "$ORIGINAL_SIZE" ]; then
      SAVED=$((ORIGINAL_SIZE - NEW_SIZE))
      SAVED_KB=$((SAVED / 1024))
      TOTAL_SAVED=$((TOTAL_SAVED + SAVED))
      OPTIMIZED=$((OPTIMIZED + 1))

      # Replace original with optimized version
      mv "$TMPFILE" "$f"

      # If it was a .mov, rename to .mp4
      if [ "$EXT" = "mov" ] || [ "$EXT" = "MOV" ]; then
        NEWNAME="${f%.*}.mp4"
        mv "$f" "$NEWNAME"
        echo "${NEW_KB}KB (saved ${SAVED_KB}KB, converted to mp4)"
      else
        echo "${NEW_KB}KB (saved ${SAVED_KB}KB)"
      fi
    else
      rm "$TMPFILE"
      echo "already optimal"
    fi
  else
    rm -f "$TMPFILE"
    echo "ERROR"
  fi
done

TOTAL_SAVED_MB=$((TOTAL_SAVED / 1024 / 1024))
echo ""
echo "========== VIDEO OPTIMIZATION COMPLETE =========="
echo "Total videos:  $COUNT"
echo "Optimized:     $OPTIMIZED"
echo "Space saved:   ${TOTAL_SAVED_MB} MB"

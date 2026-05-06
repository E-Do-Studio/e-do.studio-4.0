#!/usr/bin/env bash
set -euo pipefail

# Seed gallery-categories and gallery-projects in Strapi.
# Usage: STRAPI_TOKEN=<your-api-token> ./scripts/seed-gallery.sh
#
# Prerequisites:
#   1. Create "Gallery Category" and "Gallery Project" content types in Strapi admin
#   2. Generate a full-access API token in Settings → API Tokens
#   3. Enable public find/findOne for both content types in Settings → Roles → Public

STRAPI_URL="${STRAPI_URL:-https://cms.e-do.studio}"
TOKEN="${STRAPI_TOKEN:?Set STRAPI_TOKEN to a full-access API token}"

post() {
  local endpoint="$1"
  local data="$2"
  curl -s -X POST "${STRAPI_URL}/api/${endpoint}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"data\": ${data}}"
}

echo "=== Seeding gallery categories ==="

cat_pap=$(post gallery-categories '{"title_fr":"Prêt-à-porter","title_en":"Ready-to-wear","slug":"pap","rank":1}')
echo "  ✓ Prêt-à-porter → $(echo "$cat_pap" | jq -r '.data.id // .error.message')"

cat_acc=$(post gallery-categories '{"title_fr":"Accessoires","title_en":"Accessories","slug":"accessoires","rank":2}')
echo "  ✓ Accessoires → $(echo "$cat_acc" | jq -r '.data.id // .error.message')"

cat_eye=$(post gallery-categories '{"title_fr":"Eyewear","title_en":"Eyewear","slug":"eyewear","rank":3}')
echo "  ✓ Eyewear → $(echo "$cat_eye" | jq -r '.data.id // .error.message')"

cat_bij=$(post gallery-categories '{"title_fr":"Bijoux","title_en":"Jewelry","slug":"bijoux","rank":4}')
echo "  ✓ Bijoux → $(echo "$cat_bij" | jq -r '.data.id // .error.message')"

cat_cos=$(post gallery-categories '{"title_fr":"Cosmétique","title_en":"Cosmetics","slug":"cosmetique","rank":5}')
echo "  ✓ Cosmétique → $(echo "$cat_cos" | jq -r '.data.id // .error.message')"

cat_food=$(post gallery-categories '{"title_fr":"Food & Spiritueux","title_en":"Food & Spirits","slug":"food","rank":6}')
echo "  ✓ Food & Spiritueux → $(echo "$cat_food" | jq -r '.data.id // .error.message')"

# Extract IDs
id_pap=$(echo "$cat_pap" | jq -r '.data.id')
id_acc=$(echo "$cat_acc" | jq -r '.data.id')
id_eye=$(echo "$cat_eye" | jq -r '.data.id')
id_bij=$(echo "$cat_bij" | jq -r '.data.id')
id_cos=$(echo "$cat_cos" | jq -r '.data.id')
id_food=$(echo "$cat_food" | jq -r '.data.id')

echo ""
echo "=== Seeding gallery projects ==="

seed_project() {
  local order="$1" title="$2" slug="$3" cat_id="$4" stage="$5" year="$6"
  local result
  result=$(post gallery-projects "{\"title\":\"${title}\",\"slug\":\"${slug}\",\"category\":${cat_id},\"stage\":\"${stage}\",\"year\":${year},\"rank\":${order}}")
  echo "  ✓ ${title} → $(echo "$result" | jq -r '.data.id // .error.message')"
}

seed_project 1  "Maison Ortho"      "maison-ortho"      "$id_pap"  "cyclorama"  2026
seed_project 2  "Le Monde Béryl"    "le-monde-beryl"    "$id_acc"  "horizontal" 2026
seed_project 3  "Atelier Soie"      "atelier-soie"      "$id_pap"  "vertical"   2026
seed_project 4  "Kôji — Chapter 3"  "koji-chapter-3"    "$id_eye"  "eclipse"    2025
seed_project 5  "Rue Saint-Honoré"  "rue-saint-honore"  "$id_cos"  "horizontal" 2025
seed_project 6  "Ganymède"          "ganymede"          "$id_bij"  "eclipse"    2025
seed_project 7  "Moa Studio FW26"   "moa-studio-fw26"   "$id_pap"  "live"       2026
seed_project 8  "Maison Margin"     "maison-margin"     "$id_pap"  "vertical"   2025
seed_project 9  "Toby Ombré"        "toby-ombre"        "$id_food" "horizontal" 2026
seed_project 10 "Noir Étoilé"       "noir-etoile"       "$id_cos"  "cyclorama"  2025
seed_project 11 "Orbite"            "orbite"            "$id_eye"  "eclipse"    2025
seed_project 12 "Studio 11"         "studio-11"         "$id_acc"  "horizontal" 2026
seed_project 13 "Parure"            "parure"            "$id_bij"  "eclipse"    2026
seed_project 14 "Rue Cadet"         "rue-cadet"         "$id_pap"  "cyclorama"  2025
seed_project 15 "Atelier Bois"      "atelier-bois"      "$id_food" "horizontal" 2025
seed_project 16 "Maison Ardent"     "maison-ardent"     "$id_pap"  "vertical"   2026
seed_project 17 "Saar Paris"        "saar-paris"        "$id_acc"  "eclipse"    2026
seed_project 18 "Solène"            "solene"            "$id_bij"  "cyclorama"  2025

echo ""
echo "=== Done! ==="
echo "6 categories + 18 projects seeded."
echo "Images can be uploaded per project in the Strapi admin."

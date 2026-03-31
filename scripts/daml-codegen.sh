#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") -i <dar-dir> -o <output-dir>

Run dpm codegen-js for every .dar file in a directory.

Options:
  -i <dar-dir>      Directory containing .dar files (required)
  -o <output-dir>   Directory to write generated JS/TS files into (required)
  -h                Show this help message

Example:
  $(basename "$0") \\
    -i /path/to/dars \\
    -o backend/src/generated/daml.js

Each DAR is generated into its own subdirectory inside <output-dir>,
named after the DAR file (without the .dar extension).
EOF
}

DAR_DIR=""
OUT_DIR=""

while getopts "i:o:h" opt; do
  case $opt in
    i) DAR_DIR="$OPTARG" ;;
    o) OUT_DIR="$OPTARG" ;;
    h) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done

if [ -z "$DAR_DIR" ] || [ -z "$OUT_DIR" ]; then
  echo "ERROR: -i and -o are both required."
  echo ""
  usage
  exit 1
fi

if [ ! -d "$DAR_DIR" ]; then
  echo "ERROR: DAR directory not found: $DAR_DIR"
  exit 1
fi

DARS=("$DAR_DIR"/*.dar)
if [ ! -e "${DARS[0]}" ]; then
  echo "ERROR: No .dar files found in $DAR_DIR"
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Output directory: $OUT_DIR"
echo ""

SUCCESS=0
FAIL=0

for DAR in "${DARS[@]}"; do
  NAME="$(basename "$DAR" .dar)"
  echo "▶ $NAME"
  if dpm codegen-js "$DAR" -o "$OUT_DIR" -s daml.js; then
    echo "  ✓ done"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ✗ failed"
    FAIL=$((FAIL + 1))
  fi
  echo ""
done

echo "────────────────────────────────"
echo "Complete: $SUCCESS succeeded, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

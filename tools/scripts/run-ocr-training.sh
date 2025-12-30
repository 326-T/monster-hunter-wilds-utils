#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INPUT_JSON="${1:-$ROOT/tools/ocr-dataset/input.json}"
DATA_DIR="$ROOT/tools/ocr-dataset"
IMAGES_DIR="$DATA_DIR/images"
TESSTRAIN_DIR="$ROOT/tools/tesstrain"
GROUND_TRUTH_DIR="$TESSTRAIN_DIR/data/mhwu-ground-truth"
TESSDATA_DIR="$ROOT/tools/tessdata_best"
PUBLIC_TESSDATA_DIR="$ROOT/public/tessdata"

if [[ ! -f "$INPUT_JSON" ]]; then
  echo "Input JSON not found: $INPUT_JSON" >&2
  echo "Place the downloaded dataset at tools/ocr-dataset/input.json or pass a path." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required." >&2
  exit 1
fi

if ! command -v gmake >/dev/null 2>&1; then
  echo "gmake is required (GNU Make 4.2+)." >&2
  exit 1
fi

if ! command -v tesseract >/dev/null 2>&1; then
  echo "tesseract is required." >&2
  exit 1
fi

mkdir -p "$IMAGES_DIR" "$GROUND_TRUTH_DIR" "$TESSDATA_DIR" "$PUBLIC_TESSDATA_DIR"
rm -f "$GROUND_TRUTH_DIR"/*.box "$GROUND_TRUTH_DIR"/*.lstmf
rm -f "$DATA_DIR/labels.tsv" "$DATA_DIR/training.txt"

node "$ROOT/tools/scripts/prepare-ocr-dataset.mjs" "$INPUT_JSON" "$DATA_DIR"
node "$ROOT/tools/scripts/build-ocr-training-text.mjs" "$INPUT_JSON" "$DATA_DIR/training.txt"

cp "$IMAGES_DIR"/* "$GROUND_TRUTH_DIR/"

if [[ ! -f "$TESSDATA_DIR/jpn.traineddata" ]]; then
  if command -v curl >/dev/null 2>&1; then
    curl -L -o "$TESSDATA_DIR/jpn.traineddata" \
      "https://github.com/tesseract-ocr/tessdata_best/raw/main/jpn.traineddata"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$TESSDATA_DIR/jpn.traineddata" \
      "https://github.com/tesseract-ocr/tessdata_best/raw/main/jpn.traineddata"
  else
    echo "curl or wget is required to download jpn.traineddata." >&2
    exit 1
  fi
fi

cd "$TESSTRAIN_DIR"
gmake training MODEL_NAME=mhwu START_MODEL=jpn TESSDATA=../tessdata_best
gmake traineddata MODEL_NAME=mhwu

TRAINED_MODEL="$TESSTRAIN_DIR/data/mhwu.traineddata"
if [[ -f "$TRAINED_MODEL" ]]; then
  cp "$TRAINED_MODEL" "$PUBLIC_TESSDATA_DIR/jpn.traineddata"
  echo "Updated: $PUBLIC_TESSDATA_DIR/jpn.traineddata"
else
  echo "mhwu.traineddata not found. Check tesstrain output." >&2
  exit 1
fi

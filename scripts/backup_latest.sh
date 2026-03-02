#!/bin/zsh
set -euo pipefail
setopt null_glob

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backup"

mkdir -p "$BACKUP_DIR"
rm -f "$BACKUP_DIR"/*.tar.gz

TS="$(date +%Y%m%d_%H%M%S)"
ARCHIVE_PATH="$BACKUP_DIR/denarrator_approved_${TS}.tar.gz"

cd "$ROOT_DIR"
tar \
  --exclude='./backup' \
  --exclude='./dist' \
  --exclude='./node_modules' \
  --exclude='./src-tauri/target' \
  --exclude='./.git' \
  --exclude='./.DS_Store' \
  -czf "$ARCHIVE_PATH" .

echo "Created backup: $ARCHIVE_PATH"

#!/bin/sh
# Zips extension/ into public/instalog-extension.zip so the app's
# "Chrome 확장 프로그램 설치" button always serves the current extension source.
# Runs automatically before every build (see package.json's "prebuild").
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)/instalog-extension"

mkdir -p "$STAGE"
cp -r "$ROOT/extension/"* "$STAGE/"
mkdir -p "$ROOT/public"

(cd "$(dirname "$STAGE")" && zip -rq "$ROOT/public/instalog-extension.zip" instalog-extension -x '*.DS_Store')
rm -rf "$(dirname "$STAGE")"

echo "[package-extension] public/instalog-extension.zip updated."

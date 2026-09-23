#!/bin/bash
# Runs the instalog -> 본부 OS deal sync headlessly via the claude CLI.
# Invoked hourly by ~/Library/LaunchAgents/com.instalog.dealsync.plist,
# independent of whether the Claude desktop app is open.
set -euo pipefail

# launchd runs with a minimal PATH, so homebrew bins (claude, git, node, ...) aren't found otherwise.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="/Users/teeny/dev/instalog"
cd "$PROJECT_DIR"

notify() {
  osascript -e 'on run argv' -e 'display notification (item 1 of argv) with title "instalog 딜 동기화"' -e 'end run' "$1" >/dev/null 2>&1
}
trap 'notify "데이터 동기화 실패"' ERR

BEFORE="$(npm run -s sync:count)"

OUTPUT="$(claude -p "$(cat server/deal-sync-prompt.md)" \
  --permission-mode acceptEdits \
  --allowedTools "Bash mcp__fanding-os__add_deal" \
  --output-format text)"
echo "$OUTPUT"

AFTER="$(npm run -s sync:count)"
SYNCED=$((BEFORE - AFTER))

if [ "$SYNCED" -gt 0 ]; then
  notify "${SYNCED}건의 데이터 동기화 완료"
else
  notify "동기화할 데이터가 없습니다."
fi

# 파이프라인에 매핑되지 않아 계속 밀려있는 프로젝트가 있으면 별도로 알린다 — 그렇지 않으면
# 특정 계정의 로그가 조용히 영원히 unmapped로만 쌓이는 걸 아무도 알아채지 못한다.
UNMAPPED_LINE="$(echo "$OUTPUT" | grep '^UNMAPPED:' || true)"
if [ -n "$UNMAPPED_LINE" ]; then
  notify "미매핑 프로젝트 있음 — ${UNMAPPED_LINE#UNMAPPED: }"
fi

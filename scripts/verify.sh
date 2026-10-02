#!/bin/bash
# 병합·push 전 한 명령 검증 — CI(.github/workflows/ci.yml)와 같은 검사를 로컬에서 돈다.
#
# 실서버 계약 시험(파일명이 realBackend 인 시험 — 백엔드가 떠 있어야 한다)은 뺀다. 그건 scripts/test-contract.sh.
# 사양 대조 시험(apiErrorCodes.test.ts)은 backend 저장소의 docs/API_SPEC.md 를 읽는다 — 형제 clone(../backend) 또는 API_SPEC_PATH.
# 시간대를 UTC 로 고정한다(R46-CIFIX) — CI 러너가 UTC 라서, 한국 시간대에서 그냥 돌리면 "로컬은 통과 · CI 만 실패" 가 난다.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d node_modules ] || npm ci --no-audit --no-fund
npx next typegen   # tsc 가 읽는 라우트 타입(LayoutProps 등)을 만든다
npx tsc --noEmit
npm run lint
TZ=UTC npx vitest run --exclude '**/*[Rr]ealBackend*.test.ts'
echo "verify 통과: web"

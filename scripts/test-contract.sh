#!/bin/bash
# 실서버 계약 검사 — **시드를 새로 깔고 한 번만** 돌린다.
#
# 왜 (2026-09-20)
#   src/features/*/api/realBackend.test.ts 는 진짜 백엔드에 요청을 보내고, 그중 일부가 **상태를
#   소비한다**(비상 알림을 확인 처리 · 회차 정원을 채움). 그래서 시드를 새로 깔지 않고 연달아
#   두 번 돌리면 **늘 같은 3건이 실패**한다 — 고친 것과 무관한데 원인을 찾느라 시간을 버린다.
#   ⇒ 실행 전에 시드를 새로 까는 것을 절차로 굳힌다. 백엔드 쪽 전용 DB(scripts/test.sh)와 같은 뜻이다.
#
# ⚠ 백엔드·DB 컨테이너를 통째로 다시 만든다(약 1분). 고친 부분만 볼 때는 이 스크립트가 아니라
#   평범하게 그 검사 파일만 돌려라 — `node node_modules/vitest/vitest.mjs run <파일>`.
set -euo pipefail
WEB_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# compose 파일은 backend 저장소에 있다(2026-10-02 저장소 분리) — 기본은 형제 clone
cd "${BACKEND_ROOT:-$WEB_ROOT/../backend}"
export PATH="/Applications/Code/Docker.app/Contents/Resources/bin:$PATH"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.app.yml"
# 계약 시험은 시험 전용 시드(db/fixture)로 띄운 서버에 돈다 — 기본(local)은 QA Mock(db/qa-seed)이라 시험이 붙드는
# 계정·회차 id 가 없다(2026-10-03 backend 시드 분리). 이 변수는 backend docker-compose.app.yml 이 읽는다.
export BACKEND_PROFILES=local,fixture
echo "시드를 새로 깐다 — 컨테이너 재생성"
$COMPOSE down >/dev/null 2>&1
$COMPOSE up -d >/dev/null 2>&1

printf "백엔드 기동 대기"
for _ in $(seq 1 60); do
  if $COMPOSE exec -T backend curl -sf localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
    echo " — 준비됨"; break
  fi
  printf "."; sleep 3
done

cd "$WEB_ROOT"
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 \
  node node_modules/vitest/vitest.mjs run "${@:-src}"

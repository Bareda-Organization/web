@AGENTS.md

# 바래다 관계자 웹

학원 통학버스 관리 플랫폼의 **관계자 웹**(Next.js) — 학원 관계자 화면과 메인 관리자 콘솔(`(admin)` 라우트 그룹). 운영 배포는 **Vercel**.

- **작업 공간 폴더(`baraeda/` = `Bareda-Organization/workspace`) 안에 clone 해서 쓴다** — 형제 저장소 `backend`(Spring Boot) · `mobile`(Flutter 앱 2종). 상위 폴더의 `CLAUDE.md` 가 전체 규칙이다
- **모든 문서는 작업 공간의 `../docs/` 에 있다** — 진입점 `../docs/README.md` · 사양 `../docs/planning/` · 웹 구현 계획 `../docs/frontend/IMPLEMENTATION_PLAN.md`. 이 저장소에 문서를 두지 않는다
- **코드 규칙은 `../docs/frontend/web/CONVENTIONS_REACT.md`**
- **디자인 시스템 사본 `design-system/` 은 읽기 전용**(정본은 claude.ai 원격) — 고칠 값은 `src/shared/styles/tokens.css` 에서 덮는다
- 2026-10-02 통합 저장소(`mskim98/School-Bus`)에서 분리했다 — 그 전 경로 `frontend/apps/academy-web/` 가 이 저장소 루트다

## 명령

```bash
scripts/verify.sh            # CI 와 같은 검사 — 타입 · lint · 단위 시험(실서버 계약 시험 제외)
scripts/test-contract.sh     # 실서버 계약 시험 — ../backend 의 compose 로 시드를 새로 깔고 돈다
npm run dev                  # http://localhost:3000 — 백엔드 주소는 NEXT_PUBLIC_API_BASE_URL(기본 http://localhost:8080)
```

- ⚠ **로컬 포트는 3000 이어야 한다** — 네이버 지도 키의 서비스 URL 과 백엔드 CORS 허용 목록이 `http://localhost:3000` 으로 등록돼 있다. Vercel 도메인도 두 곳에 같이 등록해야 지도·API 가 열린다
- ⚠ **Vercel(https) 에서 백엔드를 부르려면 백엔드도 https·wss 여야 한다** — 브라우저가 http API 호출을 막는다(mixed content)

@AGENTS.md

# 바래다 관계자 웹

학원 통학버스 관리 플랫폼의 **관계자 웹**(Next.js) — 학원 관계자 화면과 메인 관리자 콘솔(`(admin)` 라우트 그룹). 운영 배포는 **Vercel**.

- **같은 조직의 형제 저장소** — `backend`(Spring Boot · 세 저장소 공통 사양 `docs/`) · `mobile`(Flutter 앱 2종). 로컬에서는 세 저장소를 같은 폴더 아래 나란히 clone 한다
- **사양은 backend 저장소 `docs/` 가 단일 기준이다** — 진입점 `../backend/docs/README.md`. 웹 구현 계획은 `../backend/docs/frontend/IMPLEMENTATION_PLAN.md`. 이 저장소에 사양을 복사하지 않는다
- **코드 규칙은 `docs/CONVENTIONS_REACT.md`**
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

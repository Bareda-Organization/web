@AGENTS.md

# Baraeda staff web

The **staff web** (Next.js) of the academy shuttle platform — the academy staff screens plus the main admin console (`(admin)` route group). Production deploys to **Vercel**.

- **Used cloned inside the workspace folder (`baraeda/` = `Bareda-Organization/workspace`)** — sibling repos `backend` (Spring Boot) · `mobile` (2 Flutter apps). The parent folder's `CLAUDE.md` holds the overall rules
- **All documents are in the workspace's `../docs/`** — entry `../docs/README.md` · specs `../docs/planning/` · web implementation plan `../docs/frontend/IMPLEMENTATION_PLAN.md`. Don't put documents in this repo
- **Code rules: `../docs/frontend/web/CONVENTIONS_REACT.md`**
- **The design-system copy `design-system/` is read-only** (the source is remote on claude.ai) — override values in `src/shared/styles/tokens.css`
- Split from the monorepo (`mskim98/School-Bus`) on 2026-10-02 — the old path `frontend/apps/academy-web/` is this repo's root

## Commands

```bash
scripts/verify.sh            # same checks as CI — types · lint · unit tests (excludes live-server contract tests)
scripts/test-contract.sh     # live-server contract tests — reseeds via the ../backend compose, then runs
npm run dev                  # http://localhost:3000 — the backend URL is NEXT_PUBLIC_API_BASE_URL (default http://localhost:8080)
```

- ⚠ **The local port must be 3000** — the Naver Maps key's service URL and the backend CORS allow-list are registered as `http://localhost:3000`. The Vercel domain must also be registered in both places for the map and the API to work
- ⚠ **Calling the backend from Vercel (https) requires the backend to be https·wss too** — browsers block http API calls (mixed content)

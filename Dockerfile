# academy-web — Next.js standalone 멀티스테이지 빌드.
#
# ⚠ 빌드 컨텍스트는 이 파일이 있는 디렉터리(apps/academy-web/)가 아니라
#   그 두 단계 위인 frontend/ 여야 한다. globals.css 가 상대 경로 @import 로
#   frontend/design-system/styles.css 를 가리키므로(토큰 원본을 복사하지 않고 링크),
#   빌드 시점에 그 디렉터리가 컨텍스트 안에 함께 들어와야 한다.
#   (next.config.ts 의 turbopack.root 도 같은 이유로 frontend/ 를 가리킨다.)
#
#   frontend/ 에서 실행:
#     docker build -f apps/academy-web/Dockerfile -t academy-web .

# ---- deps: 의존성만 먼저 설치해 레이어 캐시를 살린다 ----
FROM node:22-alpine AS deps
WORKDIR /repo/apps/academy-web
COPY apps/academy-web/package.json apps/academy-web/package-lock.json ./
RUN npm ci

# ---- builder: design-system 토큰 원본과 함께 빌드 ----
FROM node:22-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/apps/academy-web/node_modules ./apps/academy-web/node_modules
COPY apps/academy-web ./apps/academy-web
COPY design-system ./design-system
WORKDIR /repo/apps/academy-web
ENV NEXT_TELEMETRY_DISABLED=1
# ⚠ `NEXT_PUBLIC_*` 는 런타임 환경변수가 아니라 **빌드 시점에 번들에 박힌다** —
#   compose 의 `environment:` 로 주면 브라우저 번들에는 반영되지 않는다. 그래서 build arg 로 받는다.
#   값의 기준은 **브라우저가 보는 주소**이지 컨테이너 네트워크 이름이 아니다(브라우저는 호스트에서 돈다).
#   컨테이너로 띄울 때는 프록시(:80)가 유일한 진입점이므로 `http://localhost` 다.
#   ⚠ 스킴을 빼지 마라 — `shared/lib/ws/wsUrl.ts` 가 `http://`→`ws://` 로 바꿔 WS 주소를 만든다.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN npm run build

# ---- runner: standalone 산출물만 담은 최소 실행 이미지 ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# turbopack.root 를 frontend/ 로 잡았기 때문에 standalone 산출물이
# .next/standalone/apps/academy-web/ 아래에 중첩된다 — 그 안쪽만 꺼내 온다.
COPY --from=builder --chown=nextjs:nodejs \
  /repo/apps/academy-web/.next/standalone/apps/academy-web ./
COPY --from=builder --chown=nextjs:nodejs \
  /repo/apps/academy-web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs \
  /repo/apps/academy-web/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

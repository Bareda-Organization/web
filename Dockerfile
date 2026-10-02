# 관계자 웹 — Next.js standalone 멀티스테이지 빌드. 운영 배포는 Vercel 이고 이 이미지는 로컬·스테이징용이다
# (backend 저장소의 docker-compose.app.yml · docker-compose.staging.yml 이 `../web` 을 컨텍스트로 빌드한다).
#
#   이 저장소 루트에서 실행:
#     docker build -t academy-web .

# ---- deps: 의존성만 먼저 설치해 레이어 캐시를 살린다 ----
FROM node:24.21.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: design-system 토큰 원본(저장소 루트의 design-system/)과 함께 빌드 ----
FROM node:24.21.0-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
ENV NEXT_TELEMETRY_DISABLED=1
# ⚠ `NEXT_PUBLIC_*` 는 런타임 환경변수가 아니라 **빌드 시점에 번들에 박힌다** —
#   compose 의 `environment:` 로 주면 브라우저 번들에는 반영되지 않는다. 그래서 build arg 로 받는다.
#   값의 기준은 **브라우저가 보는 주소**이지 컨테이너 네트워크 이름이 아니다(브라우저는 호스트에서 돈다).
#   컨테이너로 띄울 때는 프록시(:80)가 유일한 진입점이므로 `http://localhost` 다.
#   ⚠ 스킴을 빼지 마라 — `shared/lib/ws/wsUrl.ts` 가 `http://`→`ws://` 로 바꿔 WS 주소를 만든다.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
# 테스트 데이터 초기화 버튼(Ruling 364) — 스테이징 compose 만 "true" 로 준다. 기본은 꺼짐.
ARG NEXT_PUBLIC_TEST_DATA_RESET=false
ENV NEXT_PUBLIC_TEST_DATA_RESET=${NEXT_PUBLIC_TEST_DATA_RESET}
RUN npm run build

# ---- runner: standalone 산출물만 담은 최소 실행 이미지 ----
FROM node:24.21.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

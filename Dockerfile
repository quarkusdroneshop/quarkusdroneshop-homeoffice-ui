# ── ビルドステージ ──────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
ENV NODE_ENV=production
RUN npx webpack --config webpack.prod.js

# ── 実行ステージ ────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY server.js ./
COPY --from=builder /app/dist ./dist

EXPOSE 8080

USER node
CMD ["node", "server.js"]

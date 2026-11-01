# ===============================
# Stage 1: Builder
# ===============================
FROM node:20-alpine AS builder

WORKDIR /app

# 安裝原生依賴編譯工具（部分 npm 套件需要）
RUN apk add --no-cache libc6-compat

# 先複製依賴清單，利用 Docker layer cache
COPY package.json package-lock.json ./

# 安裝依賴（包含 devDependencies，build 需要）
RUN npm ci

# 複製所有程式碼
COPY . .

# Next.js 16 + Turbopack 在 Docker 中需要設定
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# 正式打包
RUN npm run build

# ===============================
# Stage 2: Runner
# ===============================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 建立非 root user 執行 Next.js（安全最佳實踐）
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# 從 builder 複製必要檔案
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# public/data 是 Server File 功能的 CSV 讀取目錄
COPY --from=builder --chown=nextjs:nodejs /app/public/data ./public/data

# 設定目錄權限
RUN mkdir -p .next \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

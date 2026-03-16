# ---------- BUILD ---------- 
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma/

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm install --frozen-lockfile
COPY . .

# Prisma generate
RUN npx prisma generate

# Build your project
RUN pnpm build

# ---------- PRODUCTION ----------
FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 5000 5005

CMD ["./start.sh"]
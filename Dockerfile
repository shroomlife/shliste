# Use a minimal base image for the builder stage
FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /app

COPY package.json ./

RUN pnpm install

COPY . .

RUN pnpm run build

FROM node:22-alpine AS prod-deps

RUN corepack enable
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

RUN pnpm install --prod

FROM oven/bun:1

WORKDIR /app

ENV NODE_ENV=development

COPY --from=builder /app/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]

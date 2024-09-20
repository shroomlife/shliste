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

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.output ./.output
COPY ./server/static ./.output/server/static

COPY --from=prod-deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

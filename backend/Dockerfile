FROM oven/bun:1.2-alpine AS deps

USER root
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2-alpine AS runtime

USER root
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun src ./src
RUN mkdir -p /app/logs && chown -R bun:bun /app

USER bun

EXPOSE 5000

CMD ["bun", "src/index.ts"]

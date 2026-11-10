# syntax=docker/dockerfile:1.7
FROM node:24.22.1-bookworm-slim AS dependencies
WORKDIR /app
COPY apps/cms/package*.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS builder
ARG LVD_COMMIT
ENV LVD_COMMIT=$LVD_COMMIT NEXT_TELEMETRY_DISABLED=1 LVD_WORKERS_DISABLED=1
COPY apps/cms/ ./
COPY assets/ /legacy-assets/
COPY index.html /legacy-index.html
COPY ops/portable/next.config.mjs /tmp/portable-next.config.mjs
COPY ops/portable/build-maintenance.mjs /tmp/build-maintenance.mjs
RUN mv next.config.mjs next.base.config.mjs && cp /tmp/portable-next.config.mjs next.config.mjs && mkdir -p public/assets && cp -a /legacy-assets/. public/assets/ && node scripts/prepare-container.mjs
RUN --mount=type=cache,id=lvd-portable-next,target=/app/.next/cache,sharing=locked PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npm run payload -- generate:importmap && PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npx next build --webpack
RUN cp /tmp/build-maintenance.mjs ./build-maintenance.mjs && node build-maintenance.mjs && rm -rf .next/standalone/public

FROM node:24.22.1-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libjpeg-turbo-progs && rm -rf /var/lib/apt/lists/*
ARG LVD_COMMIT
LABEL org.opencontainers.image.source="https://github.com/logen007/luatvietduc" org.opencontainers.image.revision=$LVD_COMMIT
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/maintenance-runtime ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./presentation-releases/base
COPY --from=builder --chown=node:node /app/portable-release.json ./portable-release.json
RUN ln -s base presentation-releases/current && ln -s presentation-releases/current public && mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:24.22.1-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libjpeg-turbo-progs && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY apps/cms/package*.json ./
RUN npm ci --ignore-scripts
COPY apps/cms/ ./
COPY assets/ /legacy-assets/
COPY index.html /legacy-index.html
RUN mkdir -p public/assets && cp -a /legacy-assets/. public/assets/ && node scripts/prepare-container.mjs && chmod -R a+rX public
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,id=luatvietduc-next-v1,target=/app/.next/cache,sharing=locked node scripts/trim-build-cache.mjs && PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npm run payload -- generate:importmap && LVD_WORKERS_DISABLED=1 PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npx next build --webpack && node scripts/trim-build-cache.mjs
RUN mkdir -p .next/cache && chown node:node .next/cache && mkdir presentation-releases && mv public presentation-releases/base && ln -s base presentation-releases/current && ln -s presentation-releases/current public
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
USER node
RUN node -e "const fs=require('node:fs');const walk=p=>{for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;e.isDirectory()?walk(f):fs.accessSync(f,fs.constants.R_OK)}};walk('public')"
EXPOSE 3000
CMD ["sh","-c","npm run migrate && npx next start --hostname 0.0.0.0"]

FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY apps/cms/package*.json ./
RUN npm ci --ignore-scripts
COPY apps/cms/ ./
COPY assets/ /legacy-assets/
COPY index.html /legacy-index.html
RUN mkdir -p public/assets && cp -a /legacy-assets/. public/assets/ && node scripts/prepare-container.mjs && chmod -R a+rX public
ENV NEXT_TELEMETRY_DISABLED=1
RUN PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npm run payload -- generate:importmap && PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npx next build --webpack
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
USER node
RUN node -e "const fs=require('node:fs');const walk=p=>{for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;e.isDirectory()?walk(f):fs.accessSync(f,fs.constants.R_OK)}};walk('public')"
EXPOSE 3000
CMD ["sh","-c","npm run migrate && npx next start --hostname 0.0.0.0"]

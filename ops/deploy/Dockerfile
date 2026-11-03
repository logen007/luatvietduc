FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY apps/cms/package*.json ./
RUN npm ci --ignore-scripts
COPY apps/cms/ ./
COPY assets/ /legacy-assets/
COPY index.html /legacy-index.html
RUN mkdir -p public/assets && cp -a /legacy-assets/. public/assets/ && node scripts/prepare-container.mjs
ENV NEXT_TELEMETRY_DISABLED=1
RUN PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npm run payload -- generate:importmap && PAYLOAD_SECRET=build-placeholder-not-for-runtime-secret npx next build --webpack
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
USER node
EXPOSE 3000
CMD ["sh","-c","npm run migrate && npx next start --hostname 0.0.0.0"]

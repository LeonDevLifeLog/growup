ARG NODE_IMAGE=docker.1ms.run/library/node:24-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm ci --registry=${NPM_REGISTRY}
COPY index.html vite.config.js ./
COPY web ./web
COPY docs/guide ./docs/guide
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DEMO_MODE=0 DATA_PATH=/app/data/growup.sqlite
WORKDIR /app
RUN mkdir /app/data && chown node:node /app/data
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node --from=build /app/dist ./dist
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health', {signal: AbortSignal.timeout(3000)}).then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"
CMD ["node", "server/index.mjs"]

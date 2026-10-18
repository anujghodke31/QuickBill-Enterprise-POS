# syntax=docker/dockerfile:1.7
# One image serves both the API and the built web app.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build -w @quickbill/web && npm run build -w @quickbill/api \
  && npm prune --omit=dev --no-audit --no-fund

FROM node:24-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api/package.json /app/apps/api/prisma.config.ts ./apps/api/
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/api/public
WORKDIR /app/apps/api
RUN mkdir -p .cache && chown -R node:node .cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

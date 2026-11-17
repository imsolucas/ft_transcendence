# Users service: Fastify + Better Auth + Prisma on Node 24 (runs TypeScript natively).
# Build context: repository root.
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/services/users
COPY services/users/package.json services/users/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY services/users/ ./
COPY services/shared/types/api.types.ts /app/services/shared/types/api.types.ts
RUN npx prisma generate && mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app/uploads
USER node
ENV NODE_ENV=production PORT=4000 UPLOAD_DIR=/usr/src/app/uploads
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]

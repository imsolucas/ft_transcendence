# Game service: Fastify + Socket.IO, authoritative Pong simulation (TypeScript via tsx).
# Build context: repository root (needs services/shared).
FROM node:24-slim
WORKDIR /app/services/game
COPY services/game/package.json services/game/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY services/shared/ /app/services/shared/
COPY services/game/src ./src
COPY services/game/tsconfig.json ./
USER node
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "src/index.ts"]

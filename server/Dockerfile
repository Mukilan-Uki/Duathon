# --- deps ---
FROM node:25-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace server --omit=dev

# --- runtime ---
FROM node:25-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S duothan && adduser -S duothan -G duothan
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY package.json ./package.json
USER duothan
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "server/src/server.js"]

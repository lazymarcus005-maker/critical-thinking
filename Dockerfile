FROM node:26-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev; npm cache clean --force

COPY server/src ./src
COPY 90day-site ./90day-site

ENV PORT=3000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/90day-site
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]

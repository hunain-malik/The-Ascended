# The Ascended — production image.
# Runs the web app and (when credentials are provided) the Telegram/Drive
# sync workers in one container. See docker-entrypoint.sh.
#
# Debian slim, not alpine: sharp + Prisma engines need glibc/openssl.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Dev deps stay in the image on purpose: the sync workers run via tsx.
RUN npm ci

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Everything that must survive restarts lives under one mount point:
#   /app/storage/data    -> sqlite db
#   /app/storage/media   -> originals + thumbnails
#   /app/storage/secrets -> google oauth client + token
ENV DATABASE_URL="file:/app/storage/data/ascended.db" \
    MEDIA_DIR=/app/storage/media \
    GOOGLE_CREDENTIALS_PATH=/app/storage/secrets/google-credentials.json \
    GOOGLE_TOKEN_PATH=/app/storage/secrets/google-token.json

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000
VOLUME /app/storage
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -fsS http://localhost:3000/login > /dev/null || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]

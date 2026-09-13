# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

WORKDIR /app

# mediasoup may need to build its native worker when a matching prebuilt
# binary is unavailable.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    openssl \
    python3 \
    python3-pip \
    python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

# Reconcile the current workspace manifests with the lockfile. The lockfile
# currently lacks mediasoup and its transitive/optional packages.
RUN --mount=type=cache,id=global-messenger-npm-api,target=/root/.npm,sharing=locked \
    npm install --include=dev --no-audit --no-fund

COPY . .
RUN npm run build -w apps/server

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=4000
ENV UPLOAD_DIR=/data/uploads

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --create-home appuser

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
COPY --from=build /app/node_modules ./node_modules

RUN mkdir -p /data/uploads && chown -R appuser:appuser /app /data/uploads

USER appuser
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/server/prisma/schema.prisma && exec node apps/server/dist/index.js"]

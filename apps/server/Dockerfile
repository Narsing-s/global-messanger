FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    openssl \
    pkg-config \
    libuv1-dev \
    libssl-dev \
    python3 \
    python3-pip \
    git \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

# The root lockfile is currently behind apps/web/package.json. Use npm install here
# so Docker remains buildable while the lockfile is synchronized in source control.
RUN --mount=type=cache,id=global-messenger-npm-api,target=/root/.npm,sharing=locked \
    npm install --workspace apps/server --include-workspace-root=false --no-audit --no-fund

COPY . .

# Keep Docker and the repository build path identical. The server build script
# applies the required Prisma/TypeScript/mediasoup compatibility patch before
# generating Prisma Client and compiling the server.
RUN npm run build -w apps/server

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates libuv1 \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --create-home appuser

WORKDIR /app

COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/apps/server/package.json /app/apps/server/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/server/dist /app/apps/server/dist
COPY --from=build /app/apps/server/prisma /app/apps/server/prisma
COPY --from=build /app/apps/server/scripts /app/apps/server/scripts

RUN chown -R appuser:appuser /app
USER appuser

WORKDIR /app/apps/server

EXPOSE 4000

CMD ["node", "scripts/validate-production-config.mjs"]

# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    python3 \
    python3-pip \
    python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
ENV VITE_APP_VERSION=$APP_VERSION
ENV VITE_GIT_COMMIT=$GIT_COMMIT

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json

# Keep Docker builds resilient while the workspace lockfile is being brought
# back in sync with mediasoup/Rollup dependencies.
RUN --mount=type=cache,id=global-messenger-npm,target=/root/.npm,sharing=locked \
    npm install --include=dev --no-audit --no-fund

COPY . .
RUN npm run build -w apps/web

FROM nginx:1.29-alpine AS runtime

LABEL org.opencontainers.image.title="Global Messenger Web"
LABEL org.opencontainers.image.description="Production frontend for Global Messenger"

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.d/40-global-messenger-config.sh

RUN chmod +x /docker-entrypoint.d/40-global-messenger-config.sh \
  && printf '%s\n' '<!doctype html><html><body>ok</body></html>' > /usr/share/nginx/html/healthz

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

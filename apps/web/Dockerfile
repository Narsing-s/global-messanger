FROM node:22-bookworm-slim AS build

WORKDIR /app

# mediasoup may need to build its native worker when a matching prebuilt
# binary is unavailable. Keep the image reproducible with the required
# Python/PIP and native build toolchain available during npm ci.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    python3 \
    python3-pip \
    python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

# Optional build metadata makes it possible to verify exactly which source
# commit produced a running frontend image.
ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
ENV VITE_APP_VERSION=$APP_VERSION
ENV VITE_GIT_COMMIT=$GIT_COMMIT

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json

RUN npm ci --include=dev

# Always copy the complete current source tree before the frontend build.
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

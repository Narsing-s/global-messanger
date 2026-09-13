# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
ENV VITE_APP_VERSION=$APP_VERSION
ENV VITE_GIT_COMMIT=$GIT_COMMIT

# Install only the web workspace. The server workspace contains mediasoup,
# whose native worker is not needed to build the browser bundle.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=global-messenger-npm,target=/root/.npm,sharing=locked \
    npm install --workspace apps/web --include-workspace-root=false --include=dev --include=optional --ignore-scripts --no-audit --no-fund \
    && npm install --prefix apps/web --no-save --ignore-scripts --no-audit --no-fund @esbuild/linux-x64@0.25.12

COPY apps/web ./apps/web
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

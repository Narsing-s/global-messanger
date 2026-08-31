FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY apps/server/package*.json apps/server/
RUN npm ci

COPY apps/web ./apps/web

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w apps/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.d/40-global-messenger-config.sh
RUN chmod +x /docker-entrypoint.d/40-global-messenger-config.sh
EXPOSE 8080

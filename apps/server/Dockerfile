FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/server/package*.json apps/server/
COPY apps/web/package*.json apps/web/
RUN npm ci
COPY . .
RUN npm run db:generate
RUN npm run build -w apps/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server
EXPOSE 8000
CMD ["node", "apps/server/dist/index.js"]

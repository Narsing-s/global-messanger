FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY apps/server/package*.json apps/server/
COPY apps/web/package*.json apps/web/
RUN npm ci --include=dev

COPY . .
RUN npm run db:generate
RUN npm run build -w apps/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server

# Render injects DATABASE_URL and PORT at runtime.
# Run Prisma migrations only after the database is reachable.
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/server/prisma/schema.prisma && node apps/server/dist/index.js"]

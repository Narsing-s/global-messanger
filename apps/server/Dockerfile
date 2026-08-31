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
# Wait for PostgreSQL to become reachable, apply Prisma migrations,
# then start the API. This prevents transient database startup races.
CMD ["sh", "-c", "set -e; echo 'Waiting for production database...'; i=0; until npx prisma migrate deploy --schema apps/server/prisma/schema.prisma; do i=$((i+1)); if [ $i -ge 30 ]; then echo 'Database did not become ready after 30 attempts'; exit 1; fi; echo \"Database not ready; retrying in 5s (attempt $i/30)...\"; sleep 5; done; exec node apps/server/dist/index.js"]

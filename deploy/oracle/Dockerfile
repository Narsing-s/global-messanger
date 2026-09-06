FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
RUN npm ci --include=dev
COPY apps/server apps/server
WORKDIR /app/apps/server
RUN npm run build
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "dist/index.js"]

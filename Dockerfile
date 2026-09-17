# Single-container deploy: Express serves both the API and the built frontend.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
# POSTGRES_URL (and JWT_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD) must be set
# at runtime — see .env.example. There's no local disk/volume to manage
# anymore now that state lives in Postgres instead of a SQLite file.
EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]

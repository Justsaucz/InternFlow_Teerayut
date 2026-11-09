FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
COPY . .

RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 10000
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]

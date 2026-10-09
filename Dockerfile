FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY prisma.config.ts ./

RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node","server.js"]
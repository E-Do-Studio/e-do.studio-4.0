FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 strapi && \
    adduser --system --uid 1001 strapi

COPY --from=builder --chown=strapi:strapi /app ./

USER strapi

EXPOSE 1337

CMD ["npm", "run", "start"]

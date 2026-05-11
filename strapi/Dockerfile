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
# Strapi 5's admin build runs Vite + esbuild and routinely peaks above
# the default V8 heap (~1.5 GiB on a 2 GiB container), which Coolify
# reports only as "Deployment failed" because the Node process is
# OOM-killed mid-build. Pin the heap below the container ceiling so the
# build fails loudly instead of silently if it ever does run out.
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=3072
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

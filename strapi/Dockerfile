# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Combined install + build stage. We used to have a separate `deps` stage
# whose `node_modules` was then `COPY --from=deps`'d into the builder; on
# the Coolify build host that COPY of the ~1.5 GiB Strapi node_modules was
# enough to exhaust disk and silently kill the build with exit 255 right
# after `npm ci` finished. Doing the install and build in one stage avoids
# the duplicate copy.
FROM base AS builder
WORKDIR /app

ENV NODE_ENV=production
# Strapi 5's admin build runs Vite + esbuild and routinely peaks above
# the default V8 heap (~1.5 GiB on a 2 GiB container). Pin the heap below
# the container ceiling so the build fails loudly with a real OOM stack if
# it ever does run out instead of being silently killed.
ENV NODE_OPTIONS=--max-old-space-size=3072

COPY package.json package-lock.json* ./
# BuildKit cache mount keeps the npm download cache out of the image layer
# (and off the builder tmpfs), which both speeds up reinstalls and reduces
# the disk pressure that was killing the build mid-COPY.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 strapi && \
    adduser --system --uid 1001 strapi

COPY --from=builder --chown=strapi:strapi /app ./

USER strapi

EXPOSE 1337

CMD ["npm", "run", "start"]

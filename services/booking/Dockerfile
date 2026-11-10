# Contexte de build : la RACINE du dépôt (le service importe le moteur de devis
# src/lib/booking-engine.ts et les gabarits d'e-mail du site).
#   docker build -f services/booking/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY services/booking/package.json services/booking/pnpm-lock.yaml services/booking/
RUN cd services/booking && pnpm install --frozen-lockfile
COPY src/lib/booking-engine.ts src/lib/booking-engine.ts
COPY supabase/functions/send-email/renderers.ts supabase/functions/send-email/renderers.ts
COPY services/booking services/booking
RUN cd services/booking && pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY services/booking/package.json services/booking/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune
COPY --from=build /app/services/booking/dist ./dist
COPY services/booking/migrations ./migrations
ENV MIGRATIONS_DIR=/app/migrations
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
USER node
CMD ["node", "dist/server.js"]

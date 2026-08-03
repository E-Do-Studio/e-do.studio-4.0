FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_STRAPI_URL
ARG VITE_STRAPI_TOKEN
ARG VITE_STRAPI_PREVIEW_TOKEN
ARG VITE_PREVIEW_SECRET
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_KEY
ARG VITE_GTM_ID
ARG VITE_HUBSPOT_PORTAL_ID
ARG VITE_HUBSPOT_BOOKING_FORM_ID
ARG VITE_HUBSPOT_CONTACT_FORM_ID
RUN pnpm build

# Le rendu se fait à la requête : l'image finale embarque un runtime Node, plus
# un serveur statique. dist/server/server.js garde des imports externes (react,
# @tanstack/*), d'où les dépendances de production installées ici.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune
COPY --from=build /app/dist ./dist
COPY server.mjs ./
EXPOSE 3000
CMD ["node", "server.mjs"]

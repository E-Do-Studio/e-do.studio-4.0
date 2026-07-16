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

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80

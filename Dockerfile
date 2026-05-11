FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_STRAPI_URL
ARG VITE_STRAPI_TOKEN
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_KEY
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80

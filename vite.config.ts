import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

export default defineConfig({
  plugins: [
    // tanstackStart doit précéder react() : il génère l'arbre de routes et les
    // entrées serveur/client que le plugin React transforme ensuite.
    //
    // Pas de `prerender` : le rendu se fait à la requête. Le build produit
    // dist/client (assets) et dist/server/server.js, qui exporte un handler
    // `fetch` — c'est server.mjs qui l'expose en HTTP.
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // En dev seulement : évite le CORS côté navigateur. Les loaders qui
      // tournent côté Node visent le CMS en absolu (cf. src/lib/strapi.ts).
      '/api': {
        target: 'https://cms.e-do.studio',
        changeOrigin: true,
      },
    },
  },
});

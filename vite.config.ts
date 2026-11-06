import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

export default defineConfig({
  // `@/` doit être déclaré ici ET dans tsconfig.json : tsc résout les chemins
  // pour le typecheck, Vite pour le bundle. N'en déclarer qu'un donne un
  // typecheck vert et un build cassé.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    // tanstackStart doit précéder react() : il génère l'arbre de routes et les
    // entrées serveur/client que le plugin React transforme ensuite.
    //
    // Pas de `prerender` : le rendu se fait à la requête. Le build produit
    // dist/client (assets) et dist/server/server.js, qui exporte un handler
    // `fetch` — c'est server.mjs qui l'expose en HTTP.
    // Les composants de route sont importés statiquement : le rendu serveur
    // n'étant pas streamé, il ne peut pas attendre un React.lazy et rendrait le
    // fallback à la place du contenu. Le découpage pour le client reste assuré
    // par le plugin, qui émet un chunk par route sans passer par Suspense.
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
  // La visite 3D charge three à la demande : sans cette liste, Vite ne découvre
  // ces modules qu'au premier passage sur la page, regroupe ses dépendances en
  // cours de session et invalide le JS des onglets ouverts — l'hydratation
  // échoue et plus aucun bouton ne répond.
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/environments/RoomEnvironment.js',
      'three/examples/jsm/geometries/RoundedBoxGeometry.js',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/GTAOPass.js',
      'three/examples/jsm/postprocessing/OutputPass.js',
      'three/examples/jsm/postprocessing/RenderPass.js',
      'three/examples/jsm/renderers/CSS2DRenderer.js',
    ],
  },
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

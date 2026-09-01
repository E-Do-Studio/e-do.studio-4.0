import { defineConfig } from 'vitest/config';

// Config distincte de vite.config.ts : les tests portent sur des modules purs
// et n'ont besoin ni du plugin TanStack Start (qui génère l'arbre de routes et
// les entrées serveur) ni de Tailwind. Les charger ici ne ferait que ralentir
// la suite et la coupler au build.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

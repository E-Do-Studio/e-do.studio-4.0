// Un fichier par point d'entrée, dépendances npm laissées externes : le moteur
// de devis et les gabarits d'e-mail, eux, sont pris dans le dépôt du site.
import { build } from 'esbuild';

await build({
  entryPoints: {
    server: 'src/server.ts',
    'import-supabase': 'scripts/import-supabase.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
});

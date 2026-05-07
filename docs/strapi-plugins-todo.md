# Strapi plugins TODO — SEO + sitemap

Suite à l'audit (Pl05–Pl06 dans `strapi-audit-2026-05-deep.md`). Pas installés
dans cette PR car la compatibilité Strapi 5 doit être vérifiée package par
package, avec un boot en staging avant prod.

## Pl05 — `@strapi-community/strapi-plugin-seo`

Ajoute un panel SEO Score dans la vue d'édition, complète le composant
`shared.seo-meta` (à créer en Phase 3 — voir audit X36/MissCT8).

Vérification avant install :

```bash
cd strapi
npm view @strapi-community/strapi-plugin-seo dist-tags
# confirmer compat Strapi 5 dans le README du package
```

Si OK :

```bash
npm install @strapi-community/strapi-plugin-seo
```

Puis activer dans `strapi/config/plugins.ts` :

```ts
'seo': {
  enabled: true,
},
```

Si le package n'a pas encore de release Strapi 5 stable, garder le ticket
en backlog.

## Pl06 — `strapi-plugin-sitemap`

Génère `sitemap.xml` à partir des URLs des content-types. Le site n'a
pas de sitemap aujourd'hui — pénalité SEO directe.

```bash
cd strapi
npm view strapi-plugin-sitemap@latest version
# regarder le tag strapi-v5 ou la branche main
```

Si OK :

```bash
npm install strapi-plugin-sitemap
```

Activer dans `plugins.ts` :

```ts
'sitemap': {
  enabled: true,
  config: {
    cron: '0 0 0 * * *',
    limit: 45000,
    xsl: true,
    autoGenerate: true,
  },
},
```

Configurer ensuite dans Settings → Sitemap : ajouter `gallery-project`,
`blog-post`, `machine`, `cyclorama`, `post-production-type` avec leurs
patterns d'URL respectifs (`/galerie/{slug}`, `/discovery/{slug}`,
`/plateau/{slug}`, etc.).

## Pl07 — `strapi-plugin-multilingual-default-fallback`

Renvoie automatiquement la locale par défaut quand une traduction manque.
Évite la logique `mEn = enTypes.find(...) ?? mFr` dispersée dans
`src/lib/strapi.ts`.

À évaluer en Phase 4 après stabilisation des autres plugins.

## Notes

- Aucun de ces plugins n'est bloquant pour la production actuelle.
- L'absence de sitemap est le manque le plus visible côté SEO — à prioriser.
- Avant d'installer, faire un boot Strapi sur staging avec la version
  npm pinnée et vérifier que le content-types builder n'a pas régressé.

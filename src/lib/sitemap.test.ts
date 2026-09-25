import { describe, expect, it } from 'vitest';
import { buildSitemap } from './sitemap';
import type { DiscoveryPost } from '../types';

const post = (over: Partial<DiscoveryPost> = {}): DiscoveryPost => ({
  id: 1,
  slug: 'pourquoi-louer-un-cyclorama',
  cat: 'guides',
  tone: 'mono',
  tag: { fr: 'Guide', en: 'Guide' },
  title: { fr: 'Titre', en: 'Title' },
  sub: { fr: '', en: '' },
  body: { fr: '', en: '' },
  date: { fr: '5 juin', en: 'June 5' },
  author: 'Studio',
  publishedAt: '2026-06-05T12:18:31.585Z',
  ...over,
});

const locs = (xml: string) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

describe('buildSitemap', () => {
  it('liste les pages fixes dans les deux langues', () => {
    const xml = buildSitemap([]);
    expect(locs(xml)).toContain('https://e-do.studio/fr/galerie');
    expect(locs(xml)).toContain('https://e-do.studio/en/gallery');
  });

  // Régression : le fichier statique ne pouvait pas lister les articles, que
  // l'index ne liait pas non plus — ils étaient invisibles aux moteurs.
  it('liste les articles, avec leur date', () => {
    const xml = buildSitemap([post()]);
    expect(locs(xml)).toContain(
      'https://e-do.studio/fr/discovery/pourquoi-louer-un-cyclorama',
    );
    expect(locs(xml)).toContain(
      'https://e-do.studio/en/discovery/pourquoi-louer-un-cyclorama',
    );
    expect(xml).toContain('<lastmod>2026-06-05</lastmod>');
  });

  it('exclut un article noindex dans l’une des langues', () => {
    const xml = buildSitemap([
      post({ seo: { fr: {}, en: { noIndex: true } } }),
    ]);
    expect(xml).not.toContain('pourquoi-louer-un-cyclorama');
  });

  it('déclare chaque URL avec ses alternatives de langue', () => {
    const xml = buildSitemap([]);
    const block = xml.split('<url>')[1];
    expect(block).toContain('hreflang="fr" href="https://e-do.studio/fr"');
    expect(block).toContain('hreflang="en" href="https://e-do.studio/en"');
    expect(block).toContain('hreflang="x-default"');
  });
});

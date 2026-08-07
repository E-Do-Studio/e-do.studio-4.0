import { describe, expect, it } from 'vitest';
import {
  buildBlogPostingSchema,
  buildBlogSchema,
  buildLocalBusinessSchema,
  buildPageBreadcrumb,
  buildWebSiteSchema,
} from './structured-data';
import type { DiscoveryPost } from '../types';

const post = (over: Partial<DiscoveryPost> = {}): DiscoveryPost => ({
  id: 1,
  slug: 'inside-e-do-studio',
  cat: 'backstage',
  tone: 'mono',
  tag: { fr: 'Backstage', en: 'Backstage' },
  title: { fr: 'Inside E-Do Studio', en: 'Inside E-Do Studio' },
  sub: { fr: 'Sous-titre', en: 'Subtitle' },
  body: { fr: '', en: '' },
  // Date d'AFFICHAGE localisée : volontairement non parsable.
  date: { fr: '5 juin', en: 'June 5' },
  read: '1 min',
  author: 'Studio',
  publishedAt: '2026-06-05T12:18:31.585Z',
  coverUrl: 'https://cdn.test/cover.jpg',
  coverMime: 'image/jpeg',
  ...over,
});

describe('buildBlogPostingSchema', () => {
  // Régression : l'URL pointait vers `?post=<id>`, forme abandonnée au passage
  // des articles en route dédiée. Le balisage envoyait Google sur des URLs mortes.
  it("pointe vers la route de l'article, pas vers un paramètre de requête", () => {
    const s = buildBlogPostingSchema(
      post(),
      'fr',
      '/discovery/inside-e-do-studio',
    );
    expect(s.url).toBe('https://e-do.studio/fr/discovery/inside-e-do-studio');
    expect(String(s.url)).not.toContain('?post=');
  });

  // Régression : datePublished lisait `date`, une chaîne localisée que
  // Date.parse ne sait pas lire — le champ était donc toujours absent.
  it('publie une date ISO issue de publishedAt', () => {
    expect(buildBlogPostingSchema(post(), 'fr', '/x').datePublished).toBe(
      '2026-06-05T12:18:31.585Z',
    );
  });

  it('omet datePublished quand publishedAt manque', () => {
    const s = buildBlogPostingSchema(
      post({ publishedAt: undefined }),
      'fr',
      '/x',
    );
    expect(s.datePublished).toBeUndefined();
  });

  // Régression : une couverture vidéo était émise comme `image`.
  it('omet image quand la couverture est une vidéo', () => {
    const s = buildBlogPostingSchema(
      post({
        coverMime: 'video/quicktime',
        coverUrl: 'https://cdn.test/a.mov',
      }),
      'fr',
      '/x',
    );
    expect(s.image).toBeUndefined();
  });

  it('conserve image quand la couverture est bien une image', () => {
    expect(buildBlogPostingSchema(post(), 'fr', '/x').image).toBe(
      'https://cdn.test/cover.jpg',
    );
  });
});

describe('buildBlogSchema', () => {
  it('liste les articles par leur slug', () => {
    const s = buildBlogSchema([post()], 'fr', '/discovery');
    const items = (s.mainEntity as { itemListElement: { url: string }[] })
      .itemListElement;
    expect(items[0].url).toBe(
      'https://e-do.studio/fr/discovery/inside-e-do-studio',
    );
  });

  it('omet la liste quand il n’y a aucun article', () => {
    expect(buildBlogSchema([], 'fr', '/discovery').mainEntity).toBeUndefined();
  });
});

describe('buildLocalBusinessSchema', () => {
  const contact = {
    phone: '+33 1 44 04 11 49',
    email: 'contact@e-do.studio',
    address: {
      street: '69 boulevard Victor Hugo',
      postalCode: '93400',
      city: 'Saint-Ouen',
      country: 'France',
      zip: '93400 Saint-Ouen',
    },
  };

  // Régression : le CMS saisit « France » en toutes lettres, schema.org attend
  // un code ISO 3166-1 alpha-2.
  it('normalise le pays en code ISO', () => {
    const s = buildLocalBusinessSchema({ lang: 'fr', contact } as never);
    expect((s.address as { addressCountry: string }).addressCountry).toBe('FR');
  });

  it('laisse passer un code déjà valide', () => {
    const s = buildLocalBusinessSchema({
      lang: 'fr',
      contact: { ...contact, address: { ...contact.address, country: 'BE' } },
    } as never);
    expect((s.address as { addressCountry: string }).addressCountry).toBe('BE');
  });

  it('ne retient que les réseaux en URL absolue', () => {
    const s = buildLocalBusinessSchema({
      lang: 'fr',
      contact,
      socials: [
        { href: 'https://instagram.com/edostudio' },
        { href: '/relatif' },
        { href: '' },
      ],
    } as never);
    expect(s.sameAs).toEqual(['https://instagram.com/edostudio']);
  });

  it('porte la langue de la page', () => {
    expect(
      buildLocalBusinessSchema({ lang: 'en', contact } as never).inLanguage,
    ).toBe('en-US');
  });

  // Régression silencieuse : le bloc relisait la CHAÎNE D'AFFICHAGE à la regex
  // puis annonçait `[Monday…Friday]` quelle que soit la donnée. Un studio ouvert
  // du mardi au samedi déclarait donc à Google des horaires du lundi au vendredi,
  // et rien dans l'app ne montrait l'erreur.
  it('déclare les jours que la donnée porte, pas lundi–vendredi', () => {
    const s = buildLocalBusinessSchema({
      lang: 'fr',
      contact,
      hours: {
        rows: [
          {
            days: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            label: { fr: 'mar — sam', en: 'Tue — Sat' },
            value: { fr: '10:00 — 18:00', en: '10:00 — 18:00' },
            kind: 'hours',
            opens: '10:00',
            closes: '18:00',
          },
        ],
      },
    } as never);
    expect(s.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '18:00',
      },
    ]);
  });

  it('ne déclare pas les jours fermés ou sur rendez-vous', () => {
    const s = buildLocalBusinessSchema({
      lang: 'fr',
      contact,
      hours: {
        rows: [
          {
            days: ['saturday', 'sunday'],
            label: { fr: 'sam — dim', en: 'Sat — Sun' },
            value: { fr: 'Sur rendez-vous', en: 'By appointment' },
            kind: 'status',
          },
        ],
      },
    } as never);
    expect(s.openingHoursSpecification).toBeUndefined();
  });
});

describe('buildPageBreadcrumb', () => {
  it('préfixe toujours par l’accueil et numérote les positions', () => {
    const s = buildPageBreadcrumb('fr', [
      { name: 'Galerie', pathname: '/galerie' },
    ]);
    const items = s.itemListElement as {
      position: number;
      name: string;
      item: string;
    }[];
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ position: 1, name: 'Accueil' });
    expect(items[0].item).toBe('https://e-do.studio/fr');
    expect(items[1]).toMatchObject({ position: 2, name: 'Galerie' });
  });

  it('traduit le maillon d’accueil', () => {
    const s = buildPageBreadcrumb('en', []);
    expect((s.itemListElement as { name: string }[])[0].name).toBe('Home');
  });
});

describe('buildWebSiteSchema', () => {
  it('porte un @id stable, partagé par toutes les pages', () => {
    expect(buildWebSiteSchema('fr')['@id']).toBe(
      buildWebSiteSchema('en')['@id'],
    );
  });
});

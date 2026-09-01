import { describe, expect, it } from 'vitest';
import type { DiscoveryPost } from '../types';
import { filterByCategory, selectPosts } from './select-posts';

const post = (id: number, cat: string, featured = false): DiscoveryPost => ({
  id,
  slug: `post-${id}`,
  cat,
  tone: 'mono',
  tag: { fr: cat, en: cat },
  title: { fr: `Titre ${id}`, en: `Title ${id}` },
  sub: { fr: '', en: '' },
  body: { fr: '', en: '' },
  date: { fr: '', en: '' },
  author: 'E-Do',
  featured,
});

describe('selectPosts', () => {
  it('met le dernier backstage à la une', () => {
    const posts = [post(1, 'tips'), post(2, 'backstage'), post(3, 'backstage')];
    expect(selectPosts(posts).headline?.id).toBe(2);
  });

  it("retombe sur l'épinglé quand aucun backstage n'existe", () => {
    const posts = [post(1, 'tips'), post(2, 'clients', true)];
    expect(selectPosts(posts).headline?.id).toBe(2);
  });

  it('retombe sur le plus récent quand rien ne se distingue', () => {
    const posts = [post(1, 'tips'), post(2, 'clients')];
    expect(selectPosts(posts).headline?.id).toBe(1);
  });

  // L'invariant de la page : la une et la liste partitionnent les articles,
  // donc aucun ne peut paraître deux fois à l'écran.
  it('ne montre jamais deux fois le même article', () => {
    const posts = [post(1, 'tips'), post(2, 'backstage'), post(3, 'clients')];
    const { headline, rest } = selectPosts(posts);
    expect(rest).toHaveLength(posts.length - 1);
    expect(rest).not.toContain(headline);
    expect(new Set([headline, ...rest]).size).toBe(posts.length);
  });

  it('remonte les épinglés en tête de liste, ordre stable à l’intérieur', () => {
    const posts = [
      post(1, 'backstage'),
      post(2, 'tips'),
      post(3, 'clients', true),
      post(4, 'tips'),
      post(5, 'tendances', true),
    ];
    expect(selectPosts(posts).rest.map((p) => p.id)).toEqual([3, 5, 2, 4]);
  });

  it('ne mute pas le tableau reçu', () => {
    const posts = [post(1, 'tips'), post(2, 'clients', true)];
    const snapshot = posts.map((p) => p.id);
    selectPosts(posts);
    expect(posts.map((p) => p.id)).toEqual(snapshot);
  });

  it('rend une une nulle et une liste vide sans article', () => {
    expect(selectPosts([])).toEqual({ headline: null, rest: [] });
  });

  it("ne laisse rien dans la liste quand il n'y a qu'un article", () => {
    const { headline, rest } = selectPosts([post(1, 'tips')]);
    expect(headline?.id).toBe(1);
    expect(rest).toEqual([]);
  });
});

describe('filterByCategory', () => {
  const posts = [post(1, 'tips'), post(2, 'clients'), post(3, 'tips')];

  it('rend tout sur « all »', () => {
    expect(filterByCategory(posts, 'all')).toEqual(posts);
  });

  it('ne garde que la catégorie demandée', () => {
    expect(filterByCategory(posts, 'tips').map((p) => p.id)).toEqual([1, 3]);
  });

  it('rend une liste vide sur une catégorie sans article', () => {
    expect(filterByCategory(posts, 'backstage')).toEqual([]);
  });
});

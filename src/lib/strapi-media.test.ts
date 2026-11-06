import { describe, expect, it } from 'vitest';
import { mediaListToItems } from './strapi';

const image = (name: string) => ({
  url: `https://cms.e-do.studio/uploads/${name}.jpg`,
  mime: 'image/jpeg',
});
const video = (name: string) => ({
  url: `https://cms.e-do.studio/uploads/${name}.mp4`,
  mime: 'video/mp4',
});

describe('mediaListToItems', () => {
  it('place les vidéos avant les images quel que soit l’ordre de saisie', () => {
    const items = mediaListToItems([
      image('a'),
      video('v1'),
      image('b'),
      video('v2'),
      image('c'),
    ]);
    expect(items.map((m) => m.url.split('/').pop())).toEqual([
      'v1.mp4',
      'v2.mp4',
      'a.jpg',
      'b.jpg',
      'c.jpg',
    ]);
  });

  it('laisse l’ordre intact sans vidéo', () => {
    const items = mediaListToItems([image('a'), image('b')]);
    expect(items.map((m) => m.kind)).toEqual(['image', 'image']);
    expect(items[0].url).toContain('a.jpg');
  });

  it('renvoie une liste vide sans média', () => {
    expect(mediaListToItems(undefined)).toEqual([]);
  });
});

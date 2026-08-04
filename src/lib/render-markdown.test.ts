import { describe, expect, it } from 'vitest';
import { renderInlineMarkdown, renderMarkdown } from './render-markdown';

describe('renderMarkdown — blocs', () => {
  it('rend les titres du plus spécifique au plus général', () => {
    expect(renderMarkdown('### Trois')).toContain('<h3>Trois</h3>');
    expect(renderMarkdown('## Deux')).toContain('<h2>Deux</h2>');
    expect(renderMarkdown('# Un')).toContain('<h1>Un</h1>');
  });

  it('rend gras, italique et code inline', () => {
    expect(renderMarkdown('**gras**')).toContain('<strong>gras</strong>');
    expect(renderMarkdown('*ital*')).toContain('<em>ital</em>');
    expect(renderMarkdown('`code`')).toContain('<code>code</code>');
  });

  it('rend citations, séparateurs et listes', () => {
    expect(renderMarkdown('> cité')).toContain(
      '<blockquote><p>cité</p></blockquote>',
    );
    expect(renderMarkdown('---')).toContain('<hr />');
    expect(renderMarkdown('- item')).toContain('<li>item</li>');
  });

  it('ouvre les liens dans un nouvel onglet avec rel de sécurité', () => {
    const html = renderMarkdown('[E-Do](https://e-do.studio)');
    expect(html).toContain('href="https://e-do.studio"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});

describe('renderMarkdown — médias', () => {
  it('rend une image en <figure> avec chargement paresseux', () => {
    const html = renderMarkdown('![Une légende](https://cdn.test/a.jpg)');
    expect(html).toContain('<figure class="edo-fig">');
    expect(html).toContain('src="https://cdn.test/a.jpg"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('<figcaption>Une légende</figcaption>');
  });

  it("n'affiche pas un nom de fichier comme légende", () => {
    // Strapi pré-remplit l'alt avec le nom du fichier — il ne doit pas fuiter.
    const html = renderMarkdown('![photo-produit.jpg](https://cdn.test/a.jpg)');
    expect(html).not.toContain('<figcaption>');
  });

  it('promeut un lien vers une vidéo en lecteur <video>', () => {
    const html = renderMarkdown('[making-of.mov](https://cdn.test/v.mov)');
    expect(html).toContain('<video');
    expect(html).toContain('src="https://cdn.test/v.mov"');
    expect(html).not.toContain('<a href="https://cdn.test/v.mov"');
  });

  it('tolère une URL signée à paramètres sur une vidéo', () => {
    const html = renderMarkdown(
      '[clip.mp4](https://cdn.test/v.mp4?sig=abc123)',
    );
    expect(html).toContain('<video');
  });

  it('reconnaît les extensions vidéo sans tenir compte de la casse', () => {
    expect(renderMarkdown('[a.MOV](https://cdn.test/v.MOV)')).toContain(
      '<video',
    );
  });
});

describe('renderInlineMarkdown', () => {
  it('rend les marques inline sans envelopper dans un bloc', () => {
    const html = renderInlineMarkdown('**gras** et *ital*');
    expect(html).toContain('<strong>gras</strong>');
    expect(html).toContain('<em>ital</em>');
    expect(html).not.toContain('<p>');
  });

  it('laisse le texte nu intact', () => {
    expect(renderInlineMarkdown('juste du texte')).toBe('juste du texte');
  });
});

// Ces cas documentent le comportement ACTUEL, qui est vulnérable : le
// contenu CMS est interpolé dans du HTML sans échappement, et la sortie part
// dans dangerouslySetInnerHTML (discovery-post-page.tsx, discovery/tiles.tsx).
// Le durcissement fait partie du lot sécurité encore en attente ; ces tests
// échoueront alors, ce qui est le signal recherché.
describe('échappement (dette connue)', () => {
  it("n'échappe pas les guillemets d'une URL d'image", () => {
    const html = renderMarkdown(
      '![x](https://cdn.test/a.jpg" onerror="alert(1))',
    );
    expect(html).toContain('onerror=');
  });

  it("n'interdit pas le schéma javascript: dans un lien", () => {
    const html = renderMarkdown('[clic](javascript:alert(1))');
    expect(html).toContain('javascript:');
  });
});

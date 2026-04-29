import React from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { DiscoveryCover } from './discovery-cover';
import { useEscapeKey } from './hooks';
import { ArticleMeta, ArrowIcon } from './shared';

interface ArticleOverlayProps {
  post: DiscoveryPost;
  lang: Lang;
  onClose: () => void;
}

export const ArticleOverlay: React.FC<ArticleOverlayProps> = ({ post, lang, onClose }) => {
  useEscapeKey(onClose);

  return (
    <div className="fixed inset-0 z-50 grid grid-rows-page gap-px overflow-hidden bg-black">
      <div className="row-start-1 flex gap-px bg-black">
        <button onClick={onClose} className="flex flex-none cursor-pointer items-center gap-2.5 border-0 bg-white px-4 text-foreground transition-colors hover:bg-muted md:px-cell-lg">
          <span className="inline-block rotate-180"><ArrowIcon width="14" height="14" /></span>
          <span className="hidden font-mono text-caption uppercase tracking-label text-foreground sm:inline">
            {lang === 'fr' ? 'Retour journal' : 'Back to journal'}
          </span>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3.5 bg-white px-4 md:px-6">
          <span className="edo-cell-label text-primary">{post.tag[lang]}</span>
          <span className="truncate font-mono text-label tracking-ui text-muted-foreground">
            {post.read} · {post.author} · {post.date[lang]}
          </span>
        </div>
        <button onClick={onClose} className="flex basis-header-sm cursor-pointer items-center justify-center border-0 bg-white transition-colors hover:bg-muted">
          <span className="text-lg font-light text-foreground">×</span>
        </button>
      </div>

      <div className="row-start-2 grid min-h-0 grid-cols-1 gap-px overflow-y-auto bg-black md:grid-cols-overlay md:overflow-hidden">
        <div className="relative min-h-64 bg-black md:min-h-0">
          <DiscoveryCover tone={post.tone} seed={post.id + 1} />
        </div>
        <article className="flex min-h-0 flex-col gap-5 overflow-y-auto bg-white px-6 py-8 md:px-12 md:py-10">
          <ArticleMeta post={post} lang={lang} />
          <h1 className="m-0 text-balance text-hero font-light leading-none tracking-display text-foreground">
            {post.title[lang]}
          </h1>
          <p className="m-0 text-pretty text-base font-normal leading-copy text-foreground">
            {post.sub[lang]}
          </p>
          <p className="m-0 text-pretty text-sm leading-relaxed text-muted-foreground">
            {lang === 'fr'
              ? 'L\u2019article complet sera publié ici. Pour l\u2019instant, on tient le résumé et la photographie de couverture. La grille du journal reste fluide : les rubriques se filtrent depuis la page d\u2019accueil du journal, et chaque article peut être ouvert en plein écran sans casser la navigation principale.'
              : 'The full article will be published here. For now, we keep the abstract and the cover image. The journal grid stays fluid: sections are filtered from the journal home, and each piece can open full-screen without breaking the main navigation.'}
          </p>
          <footer className="mt-auto flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-label uppercase tracking-code text-muted-foreground">
              {post.author} · {post.date[lang]}
            </span>
            <button onClick={onClose} className="h-10 cursor-pointer border-0 bg-foreground px-cell-lg font-mono text-caption uppercase tracking-label text-white transition-all hover:brightness-110">
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
};

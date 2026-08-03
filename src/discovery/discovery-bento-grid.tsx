import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from '@tanstack/react-router';
import type { Lang } from '../types';
import type { DiscoveryCategory, DiscoveryPost } from '../types';
import { MobileAssistantFab } from '../ui/mobile-assistant-fab';

const AssistantChat = lazy(() => import('../assistant-chat'));
import { ArticleCard, ArticleEmptyCard } from './article-card';
import { MorePostsCard } from './more-posts-card';
import { BookCtaTile, NewsletterCard, SplitArticleCard, SplitArticleEmptyCard } from './tiles';

// Stable reference so the memos below don't re-run on every loading render.
const EMPTY_POSTS: DiscoveryPost[] = [];
const EMPTY_CATS: DiscoveryCategory[] = [];

interface DiscoveryBentoGridProps {
  lang: Lang;
  goto: (screen: string) => void;
}

export const DiscoveryBentoGrid: React.FC<DiscoveryBentoGridProps> = ({ lang, goto }) => {
  const [cat, setCat] = useState('all');
  const navigate = useNavigate();
  const { posts, categories } = useLoaderData({ from: '/$lang/discovery/' });
  const allPosts = posts ?? EMPTY_POSTS;
  const cats = categories ?? EMPTY_CATS;

  const openPost = (post: DiscoveryPost) =>
    navigate({ to: '/$lang/discovery/$slug', params: { lang, slug: post.slug } });

  // Left column is fixed to the latest Backstage article.
  const backstagePost = useMemo(
    () => allPosts.find(p => p.cat === 'backstage') ?? null,
    [allPosts]
  );
  // Middle column, top = the pinned article (Strapi `featured` flag).
  const pinnedPost = useMemo(
    () => allPosts.find(p => p.featured && p !== backstagePost) ?? null,
    [allPosts, backstagePost]
  );
  // Middle column, bottom = the most recent article not already surfaced.
  const latestPost = useMemo(
    () => allPosts.find(p => p !== backstagePost && p !== pinnedPost) ?? null,
    [allPosts, backstagePost, pinnedPost]
  );
  // "Plus d'articles" = the rest — every post not already surfaced above,
  // so each article appears exactly once on the page.
  const morePosts = useMemo(
    () => allPosts.filter(p => p !== backstagePost && p !== pinnedPost && p !== latestPost),
    [allPosts, backstagePost, pinnedPost, latestPost]
  );

  return (
    <>
      {/* Grid grouped by nature: content on top (featured + split articles,
          archive list), tools on the bottom row (newsletter, book, chat). */}
      <main className="row-start-3 grid grid-cols-1 edo-hairline md:min-h-0 md:grid-cols-4 md:overflow-y-auto lg:grid-cols-8 lg:grid-rows-[repeat(5,minmax(0,1fr))_84px] lg:overflow-hidden">
        {backstagePost ? (
          <ArticleCard
            post={backstagePost}
            lang={lang}
            onOpen={() => openPost(backstagePost)}
            headline
            badge={3}
            className="order-1 md:col-span-2 lg:col-start-1 lg:col-span-3 lg:row-start-1 lg:row-span-5 lg:order-none"
          />
        ) : (
          <ArticleEmptyCard
            lang={lang}
            headline
            badge={3}
            className="order-1 md:col-span-2 lg:col-start-1 lg:col-span-3 lg:row-start-1 lg:row-span-5 lg:order-none"
          />
        )}

        {/* Middle column split in two equal halves: pinned (top) + latest (bottom). */}
        <div className="order-6 flex flex-col gap-hairline bg-[var(--border)] md:col-span-2 lg:col-start-4 lg:col-span-3 lg:row-start-1 lg:row-span-5 lg:order-none lg:min-h-0">
          {pinnedPost ? (
            <SplitArticleCard
              post={pinnedPost}
              lang={lang}
              onOpen={() => openPost(pinnedPost)}
              className="flex-1 lg:min-h-0"
            />
          ) : (
            <SplitArticleEmptyCard lang={lang} className="flex-1 lg:min-h-0" />
          )}
          {latestPost ? (
            <SplitArticleCard
              post={latestPost}
              lang={lang}
              onOpen={() => openPost(latestPost)}
              className="flex-1 lg:min-h-0"
            />
          ) : (
            <SplitArticleEmptyCard lang={lang} className="flex-1 lg:min-h-0" />
          )}
        </div>

        <MorePostsCard
          posts={morePosts}
          cats={cats}
          lang={lang}
          onOpen={openPost}
          cat={cat}
          setCat={setCat}
          badge={2}
          className="md:col-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-1 lg:row-span-3 lg:order-none"
        />

        <NewsletterCard
          lang={lang}
          badge={10}
          className="md:col-span-2 lg:col-start-1 lg:col-span-3 lg:row-start-6 lg:row-span-1 lg:order-none"
        />

        <BookCtaTile
          lang={lang}
          goto={goto}
          className="order-7 md:col-span-2 lg:col-start-4 lg:col-span-3 lg:row-start-6 lg:row-span-1 lg:h-full lg:order-none"
        />

        {/* Inline AssistantChat: shown md+ where it fits inside the bento.
            On mobile the tile would push the rest of the page down, so it
            is replaced by a floating button (see MobileAssistantFab below). */}
        <Suspense
          fallback={
            <div
              aria-hidden
              className="hidden md:flex order-8 min-h-88 bg-white md:col-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-4 lg:row-span-3 lg:order-none lg:min-h-0"
            />
          }
        >
          <AssistantChat
            lang={lang}
            className="hidden md:flex order-8 min-h-88 md:col-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-4 lg:row-span-3 lg:order-none lg:min-h-0"
          />
        </Suspense>
      </main>

      <MobileAssistantFab lang={lang} />
    </>
  );
};

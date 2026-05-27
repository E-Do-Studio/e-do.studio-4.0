import React, { lazy, Suspense, useMemo, useState } from 'react';
import type { Lang } from '../types';
import type { DiscoveryPost } from '../types';
import { MobileAssistantFab } from '../ui';

const AssistantChat = lazy(() => import('../assistant-chat'));
import { ArticleCard, ArticleEmptyCard } from './article-card';
import { ArticleOverlay } from './article-overlay';
import { useDiscoveryPosts } from '../lib/use-strapi';
import { MorePostsCard } from './more-posts-card';
import { BookBackstageStack, NewsletterCard, QuoteTile, SplitArticleCard, SplitArticleEmptyCard, VisualTile } from './tiles';

interface DiscoveryBentoGridProps {
  lang: Lang;
  goto: (screen: string) => void;
}

export const DiscoveryBentoGrid: React.FC<DiscoveryBentoGridProps> = ({ lang, goto }) => {
  const [cat, setCat] = useState('all');
  const [openPost, setOpenPost] = useState<DiscoveryPost | null>(null);
  const { data: posts } = useDiscoveryPosts();
  const allPosts = posts ?? [];

  const featuredPost = useMemo(
    () => allPosts.find(p => p.featured) ?? allPosts[0] ?? null,
    [allPosts]
  );
  const splitPost = useMemo(
    () => allPosts.find(p => p !== featuredPost && !p.featured) ?? allPosts[3] ?? null,
    [allPosts, featuredPost]
  );
  // "Plus d'articles" is a browse-the-rest list. Keep the split article in it
  // so the section isn't empty when there are only a couple of posts — same
  // post showing up in the split tile AND in the list is the standard blog
  // pattern (hero + archive list both reference the latest).
  const morePosts = useMemo(
    () => allPosts.filter(p => p !== featuredPost),
    [allPosts, featuredPost]
  );

  return (
    <>
      <main className="row-start-3 grid grid-cols-1 edo-hairline md:min-h-0 md:grid-cols-4 md:overflow-y-auto lg:grid-cols-8 lg:grid-rows-discovery-bento lg:overflow-hidden">
        <VisualTile
          tone="dark"
          seed={5}
          label="Live"
          badge={1}
          className="order-3 md:col-span-2 lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:row-span-2 lg:order-none"
        />

        <MorePostsCard
          posts={morePosts}
          lang={lang}
          onOpen={setOpenPost}
          cat={cat}
          setCat={setCat}
          badge={2}
          className="md:col-span-2 lg:col-start-3 lg:col-span-2 lg:row-start-1 lg:row-span-4 lg:order-none"
        />

        {featuredPost ? (
          <ArticleCard
            post={featuredPost}
            lang={lang}
            onOpen={() => setOpenPost(featuredPost)}
            headline
            badge={3}
            className="order-1 md:col-span-4 lg:col-start-5 lg:col-span-4 lg:row-start-1 lg:row-span-3 lg:order-none"
          />
        ) : (
          <ArticleEmptyCard
            lang={lang}
            headline
            badge={3}
            className="order-1 md:col-span-4 lg:col-start-5 lg:col-span-4 lg:row-start-1 lg:row-span-3 lg:order-none"
          />
        )}

        <QuoteTile
          lang={lang}
          className="md:col-span-2 lg:col-start-1 lg:col-span-2 lg:row-start-3 lg:row-span-1 lg:order-none"
        />

        <NewsletterCard
          lang={lang}
          badge={10}
          className="md:col-span-2 lg:col-start-1 lg:col-span-2 lg:row-start-4 lg:row-span-1 lg:order-none"
        />

        {splitPost ? (
          <SplitArticleCard
            post={splitPost}
            lang={lang}
            onOpen={() => setOpenPost(splitPost)}
            badge={6}
            className="md:col-span-4 lg:col-start-1 lg:col-span-4 lg:row-start-5 lg:row-span-2 lg:order-none"
          />
        ) : (
          <SplitArticleEmptyCard
            lang={lang}
            badge={6}
            className="md:col-span-4 lg:col-start-1 lg:col-span-4 lg:row-start-5 lg:row-span-2 lg:order-none"
          />
        )}

        <BookBackstageStack
          lang={lang}
          goto={goto}
          className="md:col-span-2 lg:col-start-5 lg:col-span-2 lg:row-start-4 lg:row-span-3 lg:order-none"
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

      {openPost && <ArticleOverlay post={openPost} lang={lang} onClose={() => setOpenPost(null)} />}
    </>
  );
};

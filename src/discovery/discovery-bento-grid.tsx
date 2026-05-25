import React, { lazy, Suspense, useMemo, useState } from 'react';
import type { Lang } from '../types';
import type { DiscoveryPost } from '../types';

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
  const morePosts = useMemo(
    () => allPosts.filter(p => p !== featuredPost && p !== splitPost),
    [allPosts, featuredPost, splitPost]
  );

  return (
    <>
      <main className="row-start-2 grid grid-cols-1 gap-px bg-edo-pure-black md:min-h-0 md:grid-cols-4 md:overflow-y-auto lg:grid-cols-8 lg:grid-rows-discovery-bento lg:overflow-hidden">
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

        <Suspense
          fallback={
            <div
              aria-hidden
              className="order-8 min-h-88 bg-white md:col-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-4 lg:row-span-3 lg:order-none lg:min-h-0"
            />
          }
        >
          <AssistantChat
            lang={lang}
            className="order-8 min-h-88 md:col-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-4 lg:row-span-3 lg:order-none lg:min-h-0"
          />
        </Suspense>
      </main>

      {openPost && <ArticleOverlay post={openPost} lang={lang} onClose={() => setOpenPost(null)} />}
    </>
  );
};

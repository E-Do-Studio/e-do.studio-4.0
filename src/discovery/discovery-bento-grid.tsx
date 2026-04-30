import React, { useMemo, useState } from 'react';
import type { Lang } from '../types';
import type { DiscoveryPost } from '../types';
import { AssistantChat } from '../assistant-chat';
import { ArticleCard } from './article-card';
import { ArticleOverlay } from './article-overlay';
import { DISCOVERY_FIXED_POST_IDS, DISCOVERY_POSTS } from './data';
import { MorePostsCard } from './more-posts-card';
import { BookBackstageStack, NewsletterCard, QuoteTile, SplitArticleCard, VisualTile } from './tiles';

interface DiscoveryBentoGridProps {
  lang: Lang;
  goto: (screen: string) => void;
}

export const DiscoveryBentoGrid: React.FC<DiscoveryBentoGridProps> = ({ lang, goto }) => {
  const [cat, setCat] = useState('all');
  const [openPost, setOpenPost] = useState<DiscoveryPost | null>(null);

  const fixedPosts = useMemo(
    () => DISCOVERY_FIXED_POST_IDS.map((id) => DISCOVERY_POSTS.find((post) => post.id === id)).filter(Boolean) as DiscoveryPost[],
    []
  );
  const [featuredPost, , , splitPost] = fixedPosts;
  const morePosts = useMemo(
    () => DISCOVERY_POSTS.filter((post) => !fixedPosts.some((fixedPost) => fixedPost.id === post.id)),
    [fixedPosts]
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

        {featuredPost && (
          <ArticleCard
            post={featuredPost}
            lang={lang}
            onOpen={() => setOpenPost(featuredPost)}
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

        {splitPost && (
          <SplitArticleCard
            post={splitPost}
            lang={lang}
            onOpen={() => setOpenPost(splitPost)}
            badge={6}
            className="md:col-span-4 lg:col-start-1 lg:col-span-4 lg:row-start-5 lg:row-span-2 lg:order-none"
          />
        )}

        <BookBackstageStack
          lang={lang}
          goto={goto}
          className="md:col-span-2 lg:col-start-5 lg:col-span-2 lg:row-start-4 lg:row-span-3 lg:order-none"
        />

        <AssistantChat
          lang={lang}
          className="order-8 min-h-88 md:col-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-4 lg:row-span-3 lg:order-none lg:min-h-0"
        />
      </main>

      {openPost && <ArticleOverlay post={openPost} lang={lang} onClose={() => setOpenPost(null)} />}
    </>
  );
};

import { useState, useEffect } from 'react';
import {
  fetchPlateaux,
  fetchMachines,
  fetchPostProdTypes,
  fetchDiscoveryPosts,
  fetchDiscoveryPost,
  fetchDiscoveryCategories,
  fetchSocialLinks,
  fetchContact,
  fetchStudioHours,
  fetchAnnouncement,
  fetchSiteDefaults,
  fetchGalleryProjects,
  fetchGalleryCategories,
  fetchTeamMembers,
  fetchSiteBusinessInfo,
  fetchLegalDocuments,
  fetchLegalSectionsByDocument,
  fetchHomeHero,
  type PlateauSpec,
  type PPCat,
  type GalleryProject,
  type GalleryCategory,
  type ContactInfo,
  type StudioHours,
  type SiteDefaults,
  type TeamMember,
  type SiteBusinessInfo,
  type LegalDocumentMeta,
  type LegalSectionsByDocument,
  type HomeHero,
} from './strapi';
import type { MachineInfo, DiscoveryPost, DiscoveryCategory, SocialLink, Bilingual } from '../types';
import { isPreviewActive } from './preview-mode';

type AsyncState<T> = { data: T | null; loading: boolean; error: Error | null };

// SWR-style cache: on first render after a refresh we synchronously
// rehydrate from sessionStorage so cells render with data on first paint
// instead of flashing empty for a network round-trip. The fetcher still
// runs in the background to revalidate (stale-while-revalidate).
const SWR_PREFIX = 'edo-strapi-swr:';
const SWR_TTL = 5 * 60 * 1000;

function readSWR<T>(key: string): T | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SWR_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; ts: number };
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > SWR_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSWR<T>(key: string, data: T): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SWR_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Quota or disabled storage: drop silently, in-memory cache still works.
  }
}

function useAsync<T>(fetcher: () => Promise<T>, swrKey?: string): AsyncState<T> {
  const canHydrate = !!swrKey && !isPreviewActive();
  const [state, setState] = useState<AsyncState<T>>(() => {
    if (canHydrate) {
      const cached = readSWR<T>(swrKey!);
      if (cached !== null) return { data: cached, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then(data => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
        if (canHydrate) writeSWR(swrKey!, data);
      })
      .catch(error => {
        if (cancelled) return;
        // Keep any cached data on error so the UI doesn't flip to empty.
        setState(prev => ({ data: prev.data, loading: false, error }));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

// Same SWR contract as useAsync but the effect re-fires when `deps` change,
// e.g. when the route slug switches between articles.
function useAsyncWithKey<T>(fetcher: () => Promise<T>, swrKey: string | undefined, deps: ReadonlyArray<unknown>): AsyncState<T> {
  const canHydrate = !!swrKey && !isPreviewActive();
  const [state, setState] = useState<AsyncState<T>>(() => {
    if (canHydrate) {
      const cached = readSWR<T>(swrKey!);
      if (cached !== null) return { data: cached, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });
  useEffect(() => {
    let cancelled = false;
    if (canHydrate) {
      const cached = readSWR<T>(swrKey!);
      if (cached !== null) setState({ data: cached, loading: false, error: null });
      else setState(prev => ({ data: prev.data, loading: true, error: null }));
    } else {
      setState(prev => ({ data: prev.data, loading: true, error: null }));
    }
    fetcher()
      .then(data => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
        if (canHydrate) writeSWR(swrKey!, data);
      })
      .catch(error => {
        if (cancelled) return;
        setState(prev => ({ data: prev.data, loading: false, error }));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function usePlateaux() {
  return useAsync<Record<string, PlateauSpec>>(fetchPlateaux, 'plateaux');
}

export function useMachines() {
  return useAsync<MachineInfo[]>(fetchMachines, 'machines');
}

export function usePostProdTypes() {
  return useAsync<PPCat[]>(fetchPostProdTypes, 'postProdTypes');
}

export function useDiscoveryPosts() {
  return useAsync<DiscoveryPost[]>(fetchDiscoveryPosts, 'discoveryPosts');
}

export function useDiscoveryPost(slug: string | undefined) {
  // Per-slug SWR key so cached posts don't bleed across navigation.
  return useAsyncWithKey<DiscoveryPost | null>(
    () => (slug ? fetchDiscoveryPost(slug) : Promise.resolve(null)),
    slug ? `discoveryPost:${slug}` : undefined,
    [slug],
  );
}

export function useDiscoveryCategories() {
  return useAsync<DiscoveryCategory[]>(fetchDiscoveryCategories, 'discoveryCategories');
}

export function useSocialLinks() {
  return useAsync<SocialLink[]>(fetchSocialLinks, 'socialLinks');
}

export function useContact() {
  return useAsync<ContactInfo>(fetchContact, 'contact');
}

export function useStudioHours() {
  return useAsync<StudioHours>(fetchStudioHours, 'studioHours');
}

export function useAnnouncement() {
  return useAsync<Bilingual>(fetchAnnouncement, 'announcement');
}

export function useSiteDefaults() {
  return useAsync<SiteDefaults>(fetchSiteDefaults, 'siteDefaults');
}

export function useGalleryProjects() {
  return useAsync<GalleryProject[]>(fetchGalleryProjects, 'galleryProjects');
}

export function useGalleryCategories() {
  return useAsync<GalleryCategory[]>(fetchGalleryCategories, 'galleryCategories');
}

export function useTeamMembers() {
  return useAsync<TeamMember[]>(fetchTeamMembers, 'teamMembers');
}

export function useSiteBusinessInfo() {
  return useAsync<SiteBusinessInfo>(fetchSiteBusinessInfo, 'siteBusinessInfo');
}

export function useLegalDocuments() {
  return useAsync<LegalDocumentMeta[]>(fetchLegalDocuments, 'legalDocuments');
}

export function useLegalSections() {
  return useAsync<LegalSectionsByDocument>(fetchLegalSectionsByDocument, 'legalSections');
}

export function useHomeHero() {
  return useAsync<HomeHero | null>(fetchHomeHero, 'homeHero');
}

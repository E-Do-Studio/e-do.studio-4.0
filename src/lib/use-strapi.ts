import { useState, useEffect } from 'react';
import {
  fetchPlateaux,
  fetchMachines,
  fetchPostProdTypes,
  fetchDiscoveryPosts,
  fetchDiscoveryCategories,
  fetchSocialLinks,
  fetchBrands,
  fetchContact,
  fetchStudioHours,
  type PlateauSpec,
  type PPCat,
} from './strapi';
import type { MachineInfo, DiscoveryPost, DiscoveryCategory, SocialLink, Bilingual } from '../types';

type AsyncState<T> = { data: T | null; loading: boolean; error: Error | null };

function useAsync<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch(error => { if (!cancelled) setState({ data: null, loading: false, error }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}

export function usePlateaux() {
  return useAsync<Record<string, PlateauSpec>>(fetchPlateaux);
}

export function useMachines() {
  return useAsync<MachineInfo[]>(fetchMachines);
}

export function usePostProdTypes() {
  return useAsync<PPCat[]>(fetchPostProdTypes);
}

export function useDiscoveryPosts() {
  return useAsync<DiscoveryPost[]>(fetchDiscoveryPosts);
}

export function useDiscoveryCategories() {
  return useAsync<DiscoveryCategory[]>(fetchDiscoveryCategories);
}

export function useSocialLinks() {
  return useAsync<SocialLink[]>(fetchSocialLinks);
}

export function useBrands() {
  return useAsync<string[]>(fetchBrands);
}

export function useContact() {
  return useAsync<{
    phone: string;
    phoneHref: string;
    email: string;
    emailHref: string;
    address: { street: string; zip: string };
    etouch: string;
  }>(fetchContact);
}

export function useStudioHours() {
  return useAsync<Bilingual>(fetchStudioHours);
}

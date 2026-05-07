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
  fetchSiteDefaults,
  fetchGalleryProjects,
  fetchGalleryCategories,
  fetchTeamMembers,
  fetchContactSubjects,
  type PlateauSpec,
  type PPCat,
  type GalleryProject,
  type GalleryCategory,
  type ContactInfo,
  type StudioHours,
  type SiteDefaults,
  type TeamMember,
  type ContactSubject,
} from './strapi';
import type { MachineInfo, DiscoveryPost, DiscoveryCategory, SocialLink } from '../types';

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
  return useAsync<ContactInfo>(fetchContact);
}

export function useStudioHours() {
  return useAsync<StudioHours>(fetchStudioHours);
}

export function useSiteDefaults() {
  return useAsync<SiteDefaults>(fetchSiteDefaults);
}

export function useGalleryProjects() {
  return useAsync<GalleryProject[]>(fetchGalleryProjects);
}

export function useGalleryCategories() {
  return useAsync<GalleryCategory[]>(fetchGalleryCategories);
}

export function useTeamMembers() {
  return useAsync<TeamMember[]>(fetchTeamMembers);
}

export function useContactSubjects() {
  return useAsync<ContactSubject[]>(fetchContactSubjects);
}

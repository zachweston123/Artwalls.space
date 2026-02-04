import { apiGet, apiPost } from './api';

export type ArtworkSummary = {
  id: string;
  artistId?: string;
  title?: string;
  imageUrl?: string | null;
  priceCents?: number | null;
  status?: string;
  archivedAt?: string | null;
};

export type SetItem = {
  id: string;
  setId: string;
  artworkId: string;
  sortOrder: number;
  artwork?: ArtworkSummary;
};

export type CuratedSetStatus = 'draft' | 'published' | 'archived';

export type CuratedSet = {
  id: string;
  artistId: string;
  title: string;
  description?: string | null;
  tags?: string[];
  status: CuratedSetStatus;
  needsAttention?: boolean;
   visibility?: 'public' | 'private';
   heroImageUrl?: string | null;
  items?: SetItem[];
  itemCount?: number;
};

export type SetLimitInfo = {
  tier: string;
  isActive: boolean;
  hasProOverride?: boolean;
  maxSets: number;
  activeCount?: number;
};

export type PublishedSetFilters = {
  search?: string;
  tags?: string[];
};

export async function fetchMySets(): Promise<{ sets: CuratedSet[]; limit?: SetLimitInfo }> {
  return apiGet('/api/curated-sets');
}

export async function createCuratedSet(body: { title: string; description?: string; tags?: string[] }) {
  return apiPost<{ set: CuratedSet; limit?: SetLimitInfo }>('/api/curated-sets', body);
}

export async function updateCuratedSet(id: string, body: Partial<Pick<CuratedSet, 'title' | 'description' | 'tags' | 'status'>>) {
  return apiPost<{ set: CuratedSet }>(`/api/curated-sets/${encodeURIComponent(id)}`, body);
}

export async function publishCuratedSet(id: string) {
  return apiPost<{ set: CuratedSet; limit?: SetLimitInfo }>(`/api/curated-sets/${encodeURIComponent(id)}/publish`, {});
}

export async function archiveCuratedSet(id: string) {
  return apiPost<{ set: CuratedSet }>(`/api/curated-sets/${encodeURIComponent(id)}/archive`, {});
}

export async function addSetArtwork(setId: string, artworkId: string, sortOrder?: number) {
  return apiPost<{ item: SetItem; set: CuratedSet }>(
    `/api/curated-sets/${encodeURIComponent(setId)}/add-item`,
    { artworkId, sortOrder }
  );
}

export async function removeSetArtwork(setId: string, artworkId: string) {
  return apiPost<{ set: CuratedSet }>(
    `/api/curated-sets/${encodeURIComponent(setId)}/remove-item`,
    { artworkId }
  );
}

export async function reorderSetItems(setId: string, items: Array<{ id: string; sortOrder: number }>) {
  return apiPost<{ set: CuratedSet }>(
    `/api/curated-sets/${encodeURIComponent(setId)}/reorder`,
    { items }
  );
}

export async function listPublishedSets(filters: PublishedSetFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  const qs = params.toString();
  return apiGet<{ sets: CuratedSet[] }>(`/api/curated-sets/published${qs ? `?${qs}` : ''}`);
}

export async function getPublicSet(setId: string) {
  return apiGet<{ set: CuratedSet }>(`/api/curated-sets/${encodeURIComponent(setId)}/public`);
}

export async function selectCuratedSet(setId: string, status: 'selected' | 'removed' = 'selected') {
  return apiPost<{ selection: any; set: CuratedSet }>(
    `/api/curated-sets/${encodeURIComponent(setId)}/select`,
    { status }
  );
}

export async function listVenueSetSelections() {
  return apiGet<{ selections: any[] }>(`/api/venue/curated-set-selections`);
}

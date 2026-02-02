import { useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles, Tag, LayoutList, AlertTriangle, CheckCircle2, Loader2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import type { User } from '../../App';
import { entitlementsFor } from '../../lib/entitlements';
import { resolveArtistSubscription } from '../../lib/subscription';
import { apiGet } from '../../lib/api';
import {
  fetchMySets,
  createCuratedSet,
  updateCuratedSet,
  publishCuratedSet,
  archiveCuratedSet,
  addSetArtwork,
  removeSetArtwork,
  reorderSetItems,
  type CuratedSet,
  type SetItem,
} from '../../lib/curatedSets';
import { supabase } from '../../lib/supabase';

interface CuratedSetsProps {
  user: User;
  onNavigate?: (page: string, params?: any) => void;
}

type ArtistPlan = { tier: 'free' | 'starter' | 'growth' | 'pro'; status: string; isActive: boolean };

export function CuratedSets({ user, onNavigate }: CuratedSetsProps) {
  const [sets, setSets] = useState<CuratedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ArtistPlan>({ tier: 'free', status: 'inactive', isActive: false });
  const [limit, setLimit] = useState<{ maxSets: number; activeCount: number }>({ maxSets: 0, activeCount: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTags, setNewTags] = useState('');
  const [availableArtworks, setAvailableArtworks] = useState<ArtworkSummary[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<Record<string, string>>({});
  const [editingFields, setEditingFields] = useState<Record<string, { title: string; description: string; tags: string }>>({});

  const ent = useMemo(() => entitlementsFor(plan.tier, plan.isActive), [plan]);
  const canCreate = ent.curatedSets > 0 && limit.activeCount < limit.maxSets;
  const atLimit = ent.curatedSets === 0 || limit.activeCount >= limit.maxSets;

  useEffect(() => {
    let mounted = true;
    async function loadPlan() {
      try {
        const me = await apiGet<any>('/api/profile/me');
        const resolved = resolveArtistSubscription(me?.profile || {});
        if (!mounted) return;
        setPlan({ tier: resolved.tier, status: resolved.status, isActive: resolved.status === 'active' });
      } catch {
        const { data } = await supabase
          .from('artists')
          .select('subscription_tier, subscription_status, pro_until')
          .eq('id', user.id)
          .single();
        if (!data) return;
        const resolved = resolveArtistSubscription(data);
        if (!mounted) return;
        setPlan({ tier: resolved.tier, status: resolved.status, isActive: resolved.status === 'active' });
      }
    }
    loadPlan();
    return () => { mounted = false; };
  }, [user.id]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMySets();
      setSets(res.sets || []);
      if (res.limit) {
        setLimit({ maxSets: res.limit.maxSets ?? ent.curatedSets, activeCount: res.limit.activeCount ?? 0 });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    let mounted = true;
    async function loadArtworks() {
      try {
        const resp = await apiGet<{ artworks: ArtworkSummary[] }>(`/api/artworks?artistId=${user.id}`);
        if (!mounted) return;
        const available = (resp.artworks || []).filter((a) => !a.archivedAt && ['available', 'active', 'published'].includes(String(a.status || '').toLowerCase()));
        setAvailableArtworks(available);
      } catch {
        if (!mounted) return;
        setAvailableArtworks([]);
      }
    }
    loadArtworks();
    return () => { mounted = false; };
  }, [user.id]);

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);
      if (!newTitle.trim()) {
        setError('Add a title for your curated set');
        return;
      }
      const body = {
        title: newTitle.trim().slice(0, 60),
        description: newDescription.trim() ? newDescription.trim().slice(0, 240) : undefined,
        tags: newTags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
      };
      const res = await createCuratedSet(body);
      setSets([res.set, ...sets]);
      setLimit({ maxSets: res?.limit?.maxSets ?? limit.maxSets, activeCount: res?.limit?.activeCount ?? limit.activeCount + 1 });
      setNewTitle('');
      setNewDescription('');
      setNewTags('');
    } catch (err: any) {
      setError(err?.message || 'Unable to create set');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (setId: string) => {
    try {
      setSaving(true);
      const res = await publishCuratedSet(setId);
      setSets((prev) => prev.map((s) => (s.id === setId ? res.set : s)));
      setLimit({ maxSets: res?.limit?.maxSets ?? limit.maxSets, activeCount: res?.limit?.activeCount ?? limit.activeCount });
    } catch (err: any) {
      setError(err?.message || 'Unable to publish set');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (setId: string) => {
    try {
      setSaving(true);
      const res = await archiveCuratedSet(setId);
      setSets((prev) => prev.map((s) => (s.id === setId ? res.set : s)));
      setLimit((prev) => ({ ...prev, activeCount: Math.max(0, (prev.activeCount || 1) - 1) }));
    } catch (err: any) {
      setError(err?.message || 'Unable to archive set');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (setId: string, patch: Partial<CuratedSet>) => {
    try {
      setSaving(true);
      const res = await updateCuratedSet(setId, patch);
      setSets((prev) => prev.map((s) => (s.id === setId ? res.set : s)));
    } catch (err: any) {
      setError(err?.message || 'Unable to update set');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async (setId: string) => {
    const target = sets.find((s) => s.id === setId);
    const draft = editingFields[setId] || {
      title: target?.title || '',
      description: target?.description || '',
      tags: (target?.tags || []).join(', '),
    };
    await handleUpdate(setId, {
      title: draft.title.slice(0, 60),
      description: draft.description.slice(0, 240),
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
    });
  };

  const handleAddArtwork = async (setId: string) => {
    const artworkId = selectedArtwork[setId];
    if (!artworkId) return;
    try {
      setSaving(true);
      const res = await addSetArtwork(setId, artworkId);
      setSets((prev) => prev.map((s) => (s.id === setId ? res.set : s)));
      setSelectedArtwork((prev) => ({ ...prev, [setId]: '' }));
    } catch (err: any) {
      setError(err?.message || 'Unable to add artwork');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveArtwork = async (setId: string, artworkId: string) => {
    try {
      setSaving(true);
      const res = await removeSetArtwork(setId, artworkId);
      setSets((prev) => prev.map((s) => (s.id === setId ? res.set : s)));
    } catch (err: any) {
      setError(err?.message || 'Unable to remove artwork');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (setId: string, itemId: string, direction: 'up' | 'down') => {
    const target = sets.find((s) => s.id === setId);
    if (!target?.items?.length) return;
    const sorted = [...target.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((i) => i.id === itemId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const reordered = sorted.map((item, index) => ({ id: item.id, sortOrder: index + 1 }));
    try {
      setSaving(true);
      const res = await reorderSetItems(setId, reordered);
      setSets((prev) => prev.map((s) => (s.id === setId ? res.set : s)));
    } catch (err: any) {
      setError(err?.message || 'Unable to reorder items');
    } finally {
      setSaving(false);
    }
  };

  const renderCard = (set: CuratedSet) => {
    const items = (set.items || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const availableItems = items.filter((i) => ['available', 'active', 'published'].includes(String(i.artwork?.status || '').toLowerCase()) && !i.artwork?.archivedAt);
    const count = availableItems.length || set.itemCount || 0;
    const canPublish = count >= 3 && count <= 6 && set.status !== 'published' && !atLimit;
    const statusBadge = (() => {
      const base = 'px-2 py-1 text-xs rounded-full border';
      if (set.status === 'published') return <span className={`${base} border-[var(--green)] text-[var(--green)] bg-[var(--green-muted)]`}>Published</span>;
      if (set.status === 'archived') return <span className={`${base} border-[var(--border)] text-[var(--text-muted)]`}>Archived</span>;
      return <span className={`${base} border-[var(--border)] text-[var(--text-muted)]`}>Draft</span>;
    })();

    const editDraft = editingFields[set.id] || { title: set.title, description: set.description || '', tags: (set.tags || []).join(', ') };
    const availableForSet = availableArtworks.filter((a) => !items.some((i) => i.artworkId === a.id));

    return (
      <div key={set.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-1)] flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-col gap-2">
              <input
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                value={editDraft.title}
                maxLength={60}
                onChange={(e) => setEditingFields((prev) => ({ ...prev, [set.id]: { ...editDraft, title: e.target.value } }))}
              />
              <textarea
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                value={editDraft.description}
                maxLength={240}
                onChange={(e) => setEditingFields((prev) => ({ ...prev, [set.id]: { ...editDraft, description: e.target.value } }))}
                placeholder="Describe the vibe for venues"
              />
              <input
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                value={editDraft.tags}
                onChange={(e) => setEditingFields((prev) => ({ ...prev, [set.id]: { ...editDraft, tags: e.target.value } }))}
                placeholder="Tags (comma separated: cafe,bright,minimal)"
              />
              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] w-fit"
                onClick={() => handleSaveDetails(set.id)}
                disabled={saving}
              >
                <Save className="w-4 h-4" /> Save details
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-[var(--text-muted)]">
              {(set.tags || []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]"><Tag className="w-3 h-3" /> {tag}</span>
              ))}
              {set.tags?.length === 0 && <span className="text-[var(--text-muted)] text-xs">Add tags to target venues.</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {statusBadge}
            {set.needsAttention && (
              <span className="flex items-center gap-1 text-[var(--warning)] text-xs"><AlertTriangle className="w-4 h-4" /> Needs attention</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <LayoutList className="w-4 h-4" />
          <span>{count} / 3–6 artworks</span>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {availableItems.slice(0, 6).map((i) => (
            <div key={i.id} className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--surface-2)] border border-[var(--border)]">
              {i.artwork?.imageUrl ? (
                <img src={i.artwork.imageUrl} alt={i.artwork.title || 'Artwork'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">No image</div>
              )}
            </div>
          ))}
          {availableItems.length === 0 && <div className="text-xs text-[var(--text-muted)]">Add artworks to show a preview.</div>}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            className="px-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)]"
            onClick={() => onNavigate?.('artist-artworks')}
          >
            Add artworks
          </button>
          <button
            className="px-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)]"
            onClick={() => handleUpdate(set.id, { status: 'draft' })}
          >
            Save draft
          </button>
          {set.status !== 'archived' && (
            <button
              className="px-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)]"
              onClick={() => handleArchive(set.id)}
            >
              Archive
            </button>
          )}
          {canPublish && (
            <button
              className="px-3 py-2 text-sm rounded-lg bg-[var(--green)] text-[var(--accent-contrast)] hover:opacity-90"
              onClick={() => handlePublish(set.id)}
            >
              Publish
            </button>
          )}
          {set.status === 'published' && (
            <span className="inline-flex items-center gap-1 text-[var(--green)] text-xs"><CheckCircle2 className="w-4 h-4" /> Live to venues</span>
          )}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] ml-auto">
            <LayoutList className="w-3 h-3" /> {count} / 3–6 artworks
          </div>
        </div>

        <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--surface-2)] space-y-3">
          <div className="text-sm font-medium text-[var(--text)]">Manage artworks</div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
              value={selectedArtwork[set.id] || ''}
              onChange={(e) => setSelectedArtwork((prev) => ({ ...prev, [set.id]: e.target.value }))}
            >
              <option value="">Select artwork to add</option>
              {availableForSet.map((a) => (
                <option key={a.id} value={a.id}>{a.title || 'Untitled'} {a.priceCents ? `($${(a.priceCents / 100).toFixed(0)})` : ''}</option>
              ))}
            </select>
            <button
              className="px-3 py-2 text-sm rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] disabled:opacity-60"
              onClick={() => handleAddArtwork(set.id)}
              disabled={saving || !selectedArtwork[set.id]}
            >
              Add to set
            </button>
          </div>

          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((i, index) => (
                <div key={i.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-[var(--surface-2)] border border-[var(--border)]">
                    {i.artwork?.imageUrl ? <img src={i.artwork.imageUrl} alt={i.artwork?.title || 'Artwork'} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-xs">No image</div>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-[var(--text)] font-medium">{i.artwork?.title || 'Untitled'}</div>
                    <div className="text-xs text-[var(--text-muted)]">Position {index + 1}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] disabled:opacity-50"
                      onClick={() => handleReorder(set.id, i.id, 'up')}
                      disabled={saving || index === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] disabled:opacity-50"
                      onClick={() => handleReorder(set.id, i.id, 'down')}
                      disabled={saving || index === items.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] text-[var(--danger)]"
                      onClick={() => handleRemoveArtwork(set.id, i.artworkId)}
                      disabled={saving}
                      aria-label="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">No artworks in this set yet. Add 3–6 pieces to publish.</div>
          )}
        </div>
      </div>
    );
  };

  const renderEmpty = () => {
    const upgradeCta = atLimit
      ? {
          label: 'Upgrade to unlock curated sets',
          onClick: () => onNavigate?.('plans-pricing'),
        }
      : null;

    return (
      <EmptyState
        title="Create a Curated Set (3–6 artworks)"
        description="Help venues pick a cohesive wall fast — curated by you."
        icon={<Sparkles className="w-6 h-6" />}
        primaryAction={{ label: atLimit ? 'View plans' : 'Create set', onClick: atLimit ? () => onNavigate?.('plans-pricing') : handleCreate }}
        secondaryAction={upgradeCta || { label: 'Learn more', onClick: () => onNavigate?.('why-artwalls-venue') }}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading curated sets…
      </div>
    );
  }

  if (!sets.length) {
    return renderEmpty();
  }

  const used = limit.activeCount;
  const max = limit.maxSets || ent.curatedSets;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-[var(--text)]">Curated Sets</h2>
          <p className="text-sm text-[var(--text-muted)]">Artists do the curating—venues pick a ready-to-hang wall in minutes.</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Sets used: {used} / {max} · Plan: {plan.tier}{plan.isActive ? '' : ' (inactive)'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${atLimit ? 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]' : 'bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)]'}`}
            disabled={atLimit}
            onClick={handleCreate}
          >
            <Plus className="w-4 h-4" /> New Set
          </button>
          <button
            className="px-3 py-2 rounded-lg text-sm border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]"
            onClick={() => onNavigate?.('plans-pricing')}
          >
            View plans
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        <div className="text-sm text-[var(--text-muted)]">Create a set (3–6 artworks). Titles up to 60 characters, descriptions up to 240.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={60}
            placeholder="Set title"
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
          />
          <input
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
          />
        </div>
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          maxLength={240}
          placeholder="Describe the mood or wall story"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="px-4 py-2 rounded-lg text-sm bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] disabled:opacity-60"
            onClick={handleCreate}
            disabled={saving || atLimit}
          >
            Create set
          </button>
          {atLimit && <span className="text-xs text-[var(--text-muted)]">Upgrade to unlock more sets.</span>}
          {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sets.map((set) => renderCard(set))}
      </div>
    </div>
  );
}

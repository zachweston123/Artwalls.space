import { useState, useEffect } from 'react';
import { Palette, Check, X, Edit2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Predefined style options venues can pick from ────────────────────────────
export const ART_STYLE_OPTIONS = [
  'Abstract',
  'Contemporary',
  'Photography',
  'Mixed Media',
  'Impressionist',
  'Minimalist',
  'Pop Art',
  'Street Art',
  'Watercolor',
  'Oil Painting',
  'Digital Art',
  'Sculpture',
  'Textile Art',
  'Printmaking',
  'Illustration',
  'Realism',
  'Landscape',
  'Portraiture',
  'Botanical',
  'Geometric',
] as const;

// ── Props ────────────────────────────────────────────────────────────────────

interface VenueArtGuidelinesProps {
  /** The venue's UUID (owner). Null = not loaded yet. */
  venueId: string | null;
  /** Can the current viewer edit? (true = venue owner on their own profile) */
  editable?: boolean;
  /** Visual variant: "card" for the profile page, "section" for public view */
  variant?: 'card' | 'section';
}

// ── Component ────────────────────────────────────────────────────────────────

export function VenueArtGuidelines({
  venueId,
  editable = false,
  variant = 'card',
}: VenueArtGuidelinesProps) {
  const [artGuidelines, setArtGuidelines] = useState('');
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draftGuidelines, setDraftGuidelines] = useState('');
  const [draftStyles, setDraftStyles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ── Load from Supabase ───────────────────────────────────────────────────
  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('art_guidelines, preferred_styles')
          .eq('id', venueId)
          .single();

        if (cancelled) return;
        if (error) {
          // Columns may not exist yet — gracefully degrade
          console.warn('Failed to load art guidelines:', error.message);
          setLoaded(true);
          return;
        }

        setArtGuidelines(data?.art_guidelines || '');
        setPreferredStyles(data?.preferred_styles || []);
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [venueId]);

  // ── Realtime subscription so edits appear immediately in other tabs ──────
  useEffect(() => {
    if (!venueId) return;

    const channel = supabase
      .channel(`venue-guidelines-${venueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venues', filter: `id=eq.${venueId}` },
        (payload) => {
          const v: any = payload.new;
          if (v?.art_guidelines !== undefined) setArtGuidelines(v.art_guidelines || '');
          if (v?.preferred_styles !== undefined) setPreferredStyles(v.preferred_styles || []);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [venueId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const startEditing = () => {
    setDraftGuidelines(artGuidelines);
    setDraftStyles([...preferredStyles]);
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftGuidelines('');
    setDraftStyles([]);
    setSaveError(null);
  };

  const toggleStyle = (style: string) => {
    setDraftStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style],
    );
  };

  const handleSave = async () => {
    if (!venueId) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const { error } = await supabase
        .from('venues')
        .update({
          art_guidelines: draftGuidelines.trim() || null,
          preferred_styles: draftStyles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId);

      if (error) throw error;

      setArtGuidelines(draftGuidelines.trim());
      setPreferredStyles([...draftStyles]);
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save guidelines.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────

  const hasGuidelines = artGuidelines.trim().length > 0 || preferredStyles.length > 0;

  // ── Render helpers ───────────────────────────────────────────────────────

  /** Read-only display of the saved guidelines */
  const renderDisplay = () => (
    <>
      {/* Preferred Styles Tags */}
      {preferredStyles.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-[var(--text-muted)] mb-2">Preferred styles</p>
          <div className="flex flex-wrap gap-2">
            {preferredStyles.map((style) => (
              <span
                key={style}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]"
              >
                <Palette className="w-3 h-3" />
                {style}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Free-form guidelines */}
      {artGuidelines.trim() ? (
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-1">What we're looking for</p>
          <p className="text-[var(--text)] leading-relaxed whitespace-pre-line">
            {artGuidelines}
          </p>
        </div>
      ) : !preferredStyles.length && editable ? (
        <p className="text-sm text-[var(--text-muted)] italic">
          No guidelines set yet. Describe what kind of art you'd love to display!
        </p>
      ) : null}
    </>
  );

  /** Editing form */
  const renderEditor = () => (
    <div className="space-y-5">
      {/* Preferred Styles Picker */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Preferred Art Styles
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Select the styles that best match your venue's aesthetic. Artists will see these when browsing.
        </p>
        <div className="flex flex-wrap gap-2">
          {ART_STYLE_OPTIONS.map((style) => {
            const selected = draftStyles.includes(style);
            return (
              <button
                key={style}
                type="button"
                onClick={() => toggleStyle(style)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selected
                    ? 'bg-[var(--green)] text-[var(--accent-contrast)] border-[var(--green)]'
                    : 'bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)] hover:border-[var(--green)] hover:text-[var(--green)]'
                }`}
              >
                {style}
              </button>
            );
          })}
        </div>
      </div>

      {/* Free-form Guidelines */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Describe What You're Looking For
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Tell artists about your ideal artwork — size, theme, color palette, vibe, or anything else that matters to your space.
        </p>
        <textarea
          value={draftGuidelines}
          onChange={(e) => setDraftGuidelines(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="Example: We're a modern coffee shop looking for vibrant, medium-to-large abstract pieces. We prefer warm color palettes that complement our exposed-brick interior. Family-friendly content only. Maximum piece size: 48×36 inches."
          className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)] placeholder:text-[var(--text-muted)]"
          autoFocus
        />
        <p className="text-xs text-[var(--text-muted)] mt-1 text-right">
          {draftGuidelines.length}/1000 characters
        </p>
      </div>

      {saveError && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">
          {saveError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={cancelEditing}
          disabled={isSaving}
          className="px-4 py-2 text-sm bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors flex items-center gap-1.5 disabled:opacity-60"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 text-sm bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-60"
        >
          <Check className="w-3.5 h-3.5" />
          {isSaving ? 'Saving…' : 'Save Guidelines'}
        </button>
      </div>
    </div>
  );

  // ── Don't render anything for non-owners if there are no guidelines ──────
  if (!editable && !hasGuidelines && loaded) return null;

  // ── Main render ──────────────────────────────────────────────────────────

  if (variant === 'section') {
    // Lighter section style for public/artist-facing views
    return (
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--green)]" />
          <h2 className="text-xl">Artwork Preferences</h2>
        </div>
        {renderDisplay()}
      </div>
    );
  }

  // Card variant for venue owner profile page
  return (
    <div className="border-t border-[var(--border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Artwork Guidelines</h3>
        {editable && !isEditing && (
          <button
            onClick={startEditing}
            className="text-xs text-[var(--blue)] hover:underline flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            {hasGuidelines ? 'Edit' : 'Set Up'}
          </button>
        )}
      </div>

      {isEditing ? renderEditor() : renderDisplay()}

      {/* CTA for venues that haven't set guidelines yet */}
      {editable && !isEditing && !hasGuidelines && (
        <button
          onClick={startEditing}
          className="w-full mt-3 text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]"
        >
          <p className="text-[var(--text)] mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--green)]" />
            Set Up Your Art Preferences
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Help artists understand exactly what kind of artwork you're looking for
          </p>
        </button>
      )}
    </div>
  );
}

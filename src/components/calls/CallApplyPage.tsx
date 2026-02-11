import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadCallApplicationImage } from '../../lib/storage';

interface CallData {
  title: string;
  description?: string;
  submission_fee_cents?: number;
  submission_deadline?: string;
}

interface ArtworkItem {
  id: string;
  title: string;
  primary_image_url?: string;
  price?: number;
}

interface CallApplyPageProps {
  callId: string;
}

export function CallApplyPage({ callId }: CallApplyPageProps) {
  const [call, setCall] = useState<CallData | null>(null);
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [statement, setStatement] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        setError('Please sign in as an artist to apply.');
        return;
      }
      const callRes = await apiGet<{ call: CallData }>(`/api/calls/${callId}`);
      setCall(callRes.call);
      const arts = await apiGet<{ artworks?: ArtworkItem[] }>(`/api/artworks?artistId=${encodeURIComponent(userId)}`);
      setArtworks(arts?.artworks || []);
    })();
  }, [callId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const uploads = await Promise.all(Array.from(files).map((f) => uploadCallApplicationImage(callId, f)));
    setImages((prev) => [...prev, ...uploads]);
  };

  const submit = async () => {
    try {
      setError(null);
      const res = await apiPost<{ url?: string }>(`/api/calls/${callId}/apply`, {
        statement,
        portfolioUrl,
        selectedArtworkIds: selected,
        additionalImageUrls: images,
      });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        setError(null);
        setStatement('');
        setSelected([]);
        setImages([]);
        // Show success inline instead of alert
        setError('✅ Application submitted successfully!');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit application');
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl font-bold mb-2 text-[var(--text)]">Apply to Show</h1>
      <p className="text-[var(--text-muted)] mb-4">{call?.title || 'Call for Art'}</p>
      {error && <p className="text-sm text-[var(--danger)] mb-4">{error}</p>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-2">Select artworks (up to 5)</label>
          <div className="grid grid-cols-2 gap-3">
            {artworks.map((art) => (
              <button
                key={art.id}
                onClick={() => setSelected((prev) => prev.includes(art.id) ? prev.filter((id) => id !== art.id) : prev.length < 5 ? [...prev, art.id] : prev)}
                className={`border rounded-lg p-2 text-left ${selected.includes(art.id) ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
              >
                <div className="text-sm">{art.title}</div>
                <div className="text-xs text-[var(--text-muted)]">${art.price}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2">Statement (optional)</label>
          <textarea className="w-full px-3 py-2 rounded-lg border" rows={3} value={statement} onChange={(e) => setStatement(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-2">Portfolio URL (optional)</label>
          <input className="w-full px-3 py-2 rounded-lg border" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-2">Additional images (optional)</label>
          <input type="file" multiple accept="image/*" onChange={(e) => handleUpload(e.target.files)} />
          {images.length > 0 && <p className="text-xs text-[var(--text-muted)] mt-1">{images.length} uploaded</p>}
        </div>

        <button className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]" onClick={submit}>
          Submit application
        </button>
      </div>
    </div>
  );
}

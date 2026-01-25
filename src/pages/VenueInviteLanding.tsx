import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { CheckCircle, Mail, MapPin, ExternalLink, AlertCircle } from 'lucide-react';

interface InviteData {
  id: string;
  token: string;
  venueName: string;
  venueAddress?: string | null;
  websiteUrl?: string | null;
  googleMapsUrl?: string | null;
  status: 'DRAFT' | 'SENT' | 'CLICKED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  placeId: string;
}

interface ArtistProfile {
  id: string;
  name: string;
  bio?: string | null;
  portfolio_url?: string | null;
  profile_photo_url?: string | null;
}

interface ArtworkPreview {
  id: string;
  title: string;
  imageUrl?: string | null;
  price?: number | null;
}

export default function VenueInviteLanding() {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [artworks, setArtworks] = useState<ArtworkPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionEmail, setQuestionEmail] = useState('');
  const [questionMessage, setQuestionMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await apiGet<{ invite: InviteData; artist: ArtistProfile; artworks: ArtworkPreview[] }>(
          `/api/venue-invites/token/${token}`
        );
        if (!mounted) return;
        setInvite(resp.invite);
        setArtist(resp.artist);
        setArtworks(resp.artworks || []);
        await apiPost(`/api/venue-invites/token/${token}/open`, {});
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Invite not found');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (token) load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!invite) return;
    try {
      const resp = await apiPost<{ invite: InviteData }>(`/api/venue-invites/token/${token}/accept`, {});
      setInvite(resp.invite);
      localStorage.setItem('venueInvitePrefill', JSON.stringify({
        name: invite.venueName,
        address: invite.venueAddress,
        website: invite.websiteUrl,
        googleMapsUrl: invite.googleMapsUrl,
        placeId: invite.placeId,
      }));
      setNotice('Thanks! Your invite is accepted. Continue to create or claim your venue profile.');
    } catch (err: any) {
      setError(err?.message || 'Unable to accept invite');
    }
  };

  const handleDecline = async () => {
    try {
      const resp = await apiPost<{ invite: InviteData }>(`/api/venue-invites/token/${token}/decline`, {});
      setInvite(resp.invite);
      setNotice('Thanks for letting us know. We won’t send further reminders.');
    } catch (err: any) {
      setError(err?.message || 'Unable to decline invite');
    }
  };

  const handleQuestion = async () => {
    if (questionMessage.trim().length < 10) return;
    try {
      await apiPost(`/api/venue-invites/token/${token}/question`, {
        message: questionMessage,
        email: questionEmail || null,
      });
      setQuestionMessage('');
      setQuestionEmail('');
      setQuestionOpen(false);
      setNotice('Message sent. The artist will follow up soon.');
    } catch (err: any) {
      setError(err?.message || 'Unable to send question');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Loading invite...</div>;
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-[var(--warning)] mx-auto mb-3" />
          <p className="text-[var(--text)]">{error || 'Invite not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {notice && (
          <div className="mb-6 bg-[var(--green-muted)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--green)] flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {notice}
          </div>
        )}

        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{invite.venueName}</h1>
              {invite.venueAddress && (
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {invite.venueAddress}
                </p>
              )}
              {invite.websiteUrl && (
                <a
                  href={invite.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--blue)] inline-flex items-center gap-1 mt-2"
                >
                  Visit website <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="flex gap-3">
              {invite.status !== 'ACCEPTED' && (
                <button
                  onClick={handleAccept}
                  className="px-5 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg font-semibold"
                >
                  Accept invite
                </button>
              )}
              {invite.status !== 'DECLINED' && (
                <button
                  onClick={handleDecline}
                  className="px-5 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg font-semibold"
                >
                  Not interested
                </button>
              )}
              <button
                onClick={() => setQuestionOpen(true)}
                className="px-5 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg font-semibold"
              >
                Ask a question
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Meet {artist?.name || 'the artist'}</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {artist?.bio || 'Local artist specializing in bold, modern pieces.'}
            </p>
            {artist?.portfolio_url && (
              <a
                href={artist.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--blue)] inline-flex items-center gap-2"
              >
                View portfolio <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {artworks.map((art) => (
                <div key={art.id} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg overflow-hidden">
                  <div className="h-32 bg-[var(--surface-3)]">
                    {art.imageUrl ? (
                      <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">Artwork</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">{art.title}</p>
                    {art.price != null && <p className="text-xs text-[var(--text-muted)]">${art.price}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Why venues love Artwalls</h3>
            <ul className="text-sm text-[var(--text-muted)] space-y-3">
              <li>• Easy rotating art from local creators</li>
              <li>• No inventory risk — we handle artist coordination</li>
              <li>• Optional commission on sales</li>
              <li>• Attract new guests with fresh local work</li>
            </ul>
            <div className="mt-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Mail className="w-4 h-4" />
              Questions? Reach out below.
            </div>
          </div>
        </div>

        {invite.status === 'ACCEPTED' && (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">Continue setup</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Create or claim your venue profile to get started. We prefilled the basics for you.
            </p>
            <a
              href="/#/venue-setup"
              className="px-5 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg font-semibold inline-flex"
            >
              Continue to setup
            </a>
          </div>
        )}
      </div>

      {questionOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Ask a question</h2>
            <input
              value={questionEmail}
              onChange={(e) => setQuestionEmail(e.target.value)}
              placeholder="Your email (optional)"
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm mb-3"
            />
            <textarea
              value={questionMessage}
              onChange={(e) => setQuestionMessage(e.target.value)}
              placeholder="What would you like to know?"
              className="w-full min-h-[120px] px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setQuestionOpen(false)}
                className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleQuestion}
                className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

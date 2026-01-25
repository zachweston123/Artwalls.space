import { useEffect, useMemo, useState } from 'react';
import { Mail, Send, Copy, MapPin, ExternalLink, AlertCircle, CheckCircle, Clock, Link2 } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { VenuePlacesSearch, VenuePlaceDetails } from '../shared/VenuePlacesSearch';

interface ArtistVenueInvitesProps {
  artistId: string;
  onNavigate: (page: string) => void;
}

type InviteStatus = 'DRAFT' | 'SENT' | 'CLICKED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

interface VenueInvite {
  id: string;
  token: string;
  placeId: string;
  venueName: string;
  venueAddress?: string | null;
  googleMapsUrl?: string | null;
  websiteUrl?: string | null;
  phone?: string | null;
  venueEmail?: string | null;
  personalLine?: string | null;
  subject?: string | null;
  bodyTemplateVersion?: string | null;
  status: InviteStatus;
  sentAt?: string | null;
  firstClickedAt?: string | null;
  clickCount?: number | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  createdAt?: string | null;
}

interface ArtistProfile {
  id: string;
  name: string;
  city_primary?: string | null;
  portfolio_url?: string | null;
  bio?: string | null;
}

interface ArtworkPreview {
  id: string;
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
}

const DEFAULT_SUBJECT = (venueName: string) => `Artwalls invite for ${venueName}`;
const DEFAULT_TEMPLATE = `Hi {VENUE_NAME} team,\n\n{PERSONAL_LINE}\n\nI'm {ARTIST_NAME}, a local artist in {CITY}. I'd love to share a rotating selection of my work at {VENUE_NAME}. You can view my portfolio here: {ARTIST_PORTFOLIO_URL}.\n\nFeatured pieces: {FEATURED_ARTWORKS}\n\nIf you're open to it, here’s a quick link to learn more and accept: {INVITE_LINK}\n\nThanks,\n{ARTIST_NAME}`;

export function ArtistVenueInvites({ artistId, onNavigate }: ArtistVenueInvitesProps) {
  const [invites, setInvites] = useState<VenueInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [featuredArtworks, setFeaturedArtworks] = useState<ArtworkPreview[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeInvite, setActiveInvite] = useState<VenueInvite | null>(null);
  const [personalLine, setPersonalLine] = useState('');
  const [venueEmail, setVenueEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [inviteResp, profileResp] = await Promise.all([
          apiGet<{ invites: VenueInvite[] }>('/api/venue-invites'),
          apiGet<{ role: string; profile: ArtistProfile }>('/api/profile/me'),
        ]);
        if (!mounted) return;
        setInvites(inviteResp.invites || []);
        setArtistProfile(profileResp.profile || null);

        try {
          const artResp = await apiGet<{ artworks: ArtworkPreview[] }>(`/api/artworks?artistId=${artistId}`);
          if (mounted) setFeaturedArtworks((artResp.artworks || []).slice(0, 3));
        } catch {
          if (mounted) setFeaturedArtworks([]);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load invites');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [artistId]);

  const openInviteModal = (invite: VenueInvite) => {
    setActiveInvite(invite);
    setPersonalLine(invite.personalLine || '');
    setVenueEmail(invite.venueEmail || '');
    setSubject(invite.subject || DEFAULT_SUBJECT(invite.venueName));
    setBodyTemplate(DEFAULT_TEMPLATE);
    setIsModalOpen(true);
  };

  const handlePlaceSelect = async (place: VenuePlaceDetails) => {
    setError(null);
    try {
      const resp = await apiPost<{ invite: VenueInvite }>('/api/venue-invites', {
        placeId: place.placeId,
        venueName: place.displayName,
        venueAddress: place.formattedAddress,
        googleMapsUrl: place.googleMapsUri,
        websiteUrl: place.websiteUri,
        phone: place.nationalPhoneNumber,
      });
      const invite = resp.invite;
      setInvites((prev) => [invite, ...prev]);
      openInviteModal(invite);
    } catch (err: any) {
      setError(err?.message || 'Unable to create invite draft');
    }
  };

  const inviteLink = useMemo(() => {
    if (!activeInvite) return '';
    return `${window.location.origin}/v/invite/${activeInvite.token}`;
  }, [activeInvite]);

  const variableValues = useMemo(() => {
    return {
      VENUE_NAME: activeInvite?.venueName || 'Venue',
      ARTIST_NAME: artistProfile?.name || 'Artist',
      CITY: artistProfile?.city_primary || 'your city',
      ARTIST_PORTFOLIO_URL: artistProfile?.portfolio_url || 'https://artwalls.space',
      FEATURED_ARTWORKS:
        featuredArtworks.length > 0
          ? featuredArtworks.map((a) => a.title).join(', ')
          : 'selected works from my portfolio',
      INVITE_LINK: inviteLink,
      PERSONAL_LINE: personalLine.trim(),
    };
  }, [activeInvite, artistProfile, featuredArtworks, inviteLink, personalLine]);

  const renderedMessage = useMemo(() => {
    let output = bodyTemplate;
    Object.entries(variableValues).forEach(([key, value]) => {
      output = output.replaceAll(`{${key}}`, value || '');
    });
    return output;
  }, [bodyTemplate, variableValues]);

  const canSend = personalLine.trim().length >= 12 && !!activeInvite;
  const emailValid = !venueEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(venueEmail);

  const handleSend = async (method: 'mailto' | 'copy') => {
    if (!activeInvite || !canSend || !emailValid) return;
    setSending(true);
    try {
      const updated = await apiPost<{ invite: VenueInvite }>(`/api/venue-invites/${activeInvite.id}/send`, {
        personalLine,
        venueEmail: venueEmail || null,
        subject,
        bodyTemplateVersion: 'v1',
        sendMethod: method,
      });
      setInvites((prev) => prev.map((i) => (i.id === updated.invite.id ? updated.invite : i)));
      setActiveInvite(updated.invite);

      if (method === 'mailto') {
        const mailtoTo = venueEmail ? encodeURIComponent(venueEmail) : '';
        const mailtoSubject = encodeURIComponent(subject);
        const mailtoBody = encodeURIComponent(renderedMessage);
        const mailto = `mailto:${mailtoTo}?subject=${mailtoSubject}&body=${mailtoBody}`;
        window.location.href = mailto;
      } else {
        await navigator.clipboard.writeText(renderedMessage);
        setToast('Invite ready. Once they click your link, you’ll see it here.');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const statusStyles: Record<InviteStatus, string> = {
    DRAFT: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
    SENT: 'bg-[color:color-mix(in_srgb,var(--blue)_15%,transparent)] text-[var(--blue)]',
    CLICKED: 'bg-[color:color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]',
    ACCEPTED: 'bg-[var(--green-muted)] text-[var(--green)]',
    DECLINED: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
    EXPIRED: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Invite a venue</h1>
        <p className="text-[var(--text-muted)]">
          Discover venues and send a warm, personal intro from your own email.
        </p>
      </div>

      {toast && (
        <div className="mb-4 bg-[var(--green-muted)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--green)] flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-[color:color-mix(in_srgb,var(--warning)_15%,transparent)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--warning)] flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
          <Mail className="w-4 h-4" />
          Make it personal—venues reply more when it’s clearly from you.
        </div>
        <VenuePlacesSearch onPlaceSelect={handlePlaceSelect} />
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your invites</h2>
          <button
            onClick={() => onNavigate('artist-dashboard')}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Back to dashboard
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-[var(--text-muted)]">Loading invites...</div>
        ) : invites.length === 0 ? (
          <div className="py-10 text-center text-[var(--text-muted)]">No invites yet. Start with a venue search above.</div>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="border border-[var(--border)] rounded-lg p-4 bg-[var(--surface-2)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{invite.venueName}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[invite.status]}`}>
                        {invite.status}
                      </span>
                    </div>
                    {invite.venueAddress && (
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {invite.venueAddress}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(invite.status === 'DRAFT' || invite.status === 'SENT') && (
                      <button
                        onClick={() => openInviteModal(invite)}
                        className="px-3 py-1.5 text-xs bg-[var(--blue)] text-[var(--on-blue)] rounded-lg"
                      >
                        {invite.status === 'DRAFT' ? 'Finish invite' : 'View message'}
                      </button>
                    )}
                    {invite.status === 'CLICKED' && (
                      <button
                        onClick={() => openInviteModal(invite)}
                        className="px-3 py-1.5 text-xs bg-[var(--surface-3)] text-[var(--text)] rounded-lg border border-[var(--border)]"
                      >
                        Nudge
                      </button>
                    )}
                    {invite.websiteUrl && (
                      <a
                        href={invite.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs bg-[var(--surface-3)] text-[var(--text)] rounded-lg border border-[var(--border)] inline-flex items-center gap-1"
                      >
                        Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-xs text-[var(--text-muted)] flex flex-wrap gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {invite.sentAt ? `Sent ${new Date(invite.sentAt).toLocaleDateString()}` : 'Draft'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {invite.clickCount || 0} clicks
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && activeInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--surface-1)] border-b border-[var(--border)] p-6 flex items-center justify-between">
              <h2 className="text-2xl">Invite {activeInvite.venueName}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Personal line</label>
                <textarea
                  value={personalLine}
                  onChange={(e) => setPersonalLine(e.target.value)}
                  placeholder="e.g., I love the atmosphere at your venue and think our rotating local art would feel right at home."
                  className="w-full min-h-[80px] px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">Make it personal—venues reply more when it’s clearly from you.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Venue email (optional)</label>
                <input
                  value={venueEmail}
                  onChange={(e) => setVenueEmail(e.target.value)}
                  placeholder="contact@venue.com"
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm"
                />
                {!venueEmail && (
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Google Places doesn’t provide emails. If you know the best contact email, add it here—otherwise copy the message and use their contact form.
                  </p>
                )}
                {!venueEmail && activeInvite.websiteUrl && (
                  <a
                    href={activeInvite.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--blue)] inline-flex items-center gap-1 mt-2"
                  >
                    Send via website contact form <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!emailValid && <p className="text-xs text-[var(--warning)] mt-1">Enter a valid email address.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Message template</label>
                <textarea
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full min-h-[160px] px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {['{VENUE_NAME}','{ARTIST_NAME}','{CITY}','{ARTIST_PORTFOLIO_URL}','{FEATURED_ARTWORKS}','{INVITE_LINK}','{PERSONAL_LINE}'].map((token) => (
                    <button
                      key={token}
                      onClick={() => setBodyTemplate((prev) => prev + ` ${token}`)}
                      className="px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-full text-[var(--text-muted)]"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Live preview</label>
                <div className="whitespace-pre-line text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4">
                  {renderedMessage}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled={!canSend || !emailValid || sending}
                  onClick={() => handleSend('mailto')}
                  className="flex-1 px-4 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send from my email
                </button>
                <button
                  disabled={!canSend || sending}
                  onClick={() => handleSend('copy')}
                  className="flex-1 px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Clock, Calendar, Check, X, QrCode, Download, Eye, EyeOff, Copy, Mail, ArrowUpRight } from 'lucide-react';
import { mockApplications } from '../../data/mockData';
import type { Application } from '../../data/mockData';
import { TimeSlotPicker } from '../scheduling/TimeSlotPicker';
import { DurationBadge } from '../scheduling/DisplayDurationSelector';
import { DisplayDurationSelector } from '../scheduling/DisplayDurationSelector';
import { createVenueBooking, API_BASE } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { PageHeroHeader } from '../PageHeroHeader';

interface ApplicationsAndInvitationsProps {
  userRole: 'artist' | 'venue';
  onBack: () => void;
  defaultTab?: 'applications' | 'approved';
}

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  status: 'active';
  venue_id: string;
  venue_name: string;
  install_time_option?: 'quick' | 'standard' | 'flexible';
  created_at: string;
}

interface ArtistInvite {
  id: string;
  venueName: string;
  venueLocation: string;
  venuePhoto: string;
  message: string;
  requestedDuration: number;
  wallspaceName?: string;
  wallspaceSize?: string;
  receivedAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export function ApplicationsAndInvitations({ userRole, onBack, defaultTab = 'applications' }: ApplicationsAndInvitationsProps) {
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [approvedArtworks, setApprovedArtworks] = useState<Artwork[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const mappedDefaultTab: 'pipeline' | 'active' = defaultTab === 'approved' ? 'active' : 'pipeline';
  const [artistTab, setArtistTab] = useState<'pipeline' | 'active'>(mappedDefaultTab);
  const [pipelineFilter, setPipelineFilter] = useState<'needs-action' | 'all' | 'applications' | 'invitations'>('needs-action');
  const [invites, setInvites] = useState<ArtistInvite[]>([
    {
      id: 'invite-oakroom',
      venueName: 'Oakroom Collective',
      venueLocation: 'Downtown | 215 Market St.',
      venuePhoto: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=640&q=80',
      message: 'We are hosting a spring tasting series and would love to feature your botanicals collection on our feature wall through May.',
      requestedDuration: 60,
      wallspaceName: 'Atrium Feature Wall',
      wallspaceSize: '12ft x 8ft',
      receivedAt: new Date().toISOString(),
      status: 'pending',
    },
    {
      id: 'invite-greenhouse',
      venueName: 'Greenhouse Cafe',
      venueLocation: 'Mission | 134 Valencia St.',
      venuePhoto: 'https://images.unsplash.com/photo-1529429617124-aee711fa0ca3?auto=format&fit=crop&w=640&q=80',
      message: 'Thanks for sharing your portfolio last quarter! We have an opening for June-July and think your abstract series would be a fit.',
      requestedDuration: 45,
      receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      status: 'accepted',
    },
  ]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [scheduledInstalls, setScheduledInstalls] = useState<{ [key: string]: { label: string; bookingId: string; links?: { ics: string; google: string } } }>({});
  const [qrStates, setQrStates] = useState<{ [key: string]: boolean }>({});
  const [copyStates, setCopyStates] = useState<{ [key: string]: boolean }>({});
  const [approvalData, setApprovalData] = useState<{
    wallspace: string;
    duration: 30 | 90 | 180;
    startDate: Date;
    installTimeOption: 'quick' | 'standard' | 'flexible';
  }>({
    wallspace: 'Main Wall',
    duration: 90,
    startDate: new Date(),
    installTimeOption: 'standard',
  });

  // Load approved artworks for artist
  useEffect(() => {
    if (userRole === 'artist') {
      fetchApprovedArtworks();
    }
  }, [userRole]);

  const fetchApprovedArtworks = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) return;

      const { data, error } = await supabase
        .from('artworks')
        .select(`
          id,
          title,
          image_url,
          status,
          venue_id,
          install_time_option,
          created_at,
          venues(name)
        `)
        .eq('artist_id', user.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        venue_name: item.venues?.name || 'Unknown Venue',
      }));

      setApprovedArtworks(formatted);
    } catch (error) {
      console.error('Failed to fetch approved artworks:', error);
    }
  };

  const toggleQrVisibility = (id: string) => {
    setQrStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyQrUrl = (id: string) => {
    const qrUrl = `${API_BASE}/api/artworks/${id}/qrcode.svg`;
    navigator.clipboard.writeText(qrUrl);
    setCopyStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const downloadQrCode = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/artworks/${id}/qrcode.png`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${id}.png`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert(`Failed to download QR code: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handleInviteResponse = (inviteId: string, status: 'accepted' | 'declined') => {
    setInvites(prev => prev.map(invite =>
      invite.id === inviteId ? { ...invite, status } : invite
    ));
  };

  const formatRelativeDate = (iso: string) => {
    if (!iso) return 'Recently';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const dayMs = 1000 * 60 * 60 * 24;

    if (diffMs < dayMs) return 'Today';
    if (diffMs < dayMs * 2) return 'Yesterday';
    if (diffMs < dayMs * 7) return `${Math.floor(diffMs / dayMs)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredApplications = applications.filter(
    app => filter === 'all' || app.status === filter
  );

  const pipelineItems = [...invites.map(invite => ({
    id: invite.id,
    kind: 'invite' as const,
    status: invite.status,
    sortDate: new Date(invite.receivedAt).getTime(),
    needsAction: invite.status === 'pending',
    invite,
  })),
  ...applications.map(application => ({
    id: application.id,
    kind: 'application' as const,
    status: application.status,
    sortDate: new Date(application.appliedDate).getTime(),
    needsAction: application.status === 'pending',
    application,
  }))].sort((a, b) => b.sortDate - a.sortDate);

  const filteredPipelineItems = pipelineItems.filter(item => {
    if (pipelineFilter === 'needs-action') return item.needsAction;
    if (pipelineFilter === 'applications') return item.kind === 'application';
    if (pipelineFilter === 'invitations') return item.kind === 'invite';
    return true;
  });

  const pipelineNeedsActionCount = pipelineItems.filter(item => item.needsAction).length;
  const pipelineInviteCount = invites.length;
  const pipelineApplicationCount = applications.length;
  const pipelineFilterOptions: Array<{ key: typeof pipelineFilter; label: string; count: number }> = [
    { key: 'needs-action', label: 'Needs action', count: pipelineNeedsActionCount },
    { key: 'all', label: 'All items', count: pipelineItems.length },
    { key: 'applications', label: 'Applications', count: pipelineApplicationCount },
    { key: 'invitations', label: 'Invitations', count: pipelineInviteCount },
  ];

  // Artist actions
  const handleScheduleInstall = (app: Application) => {
    setSelectedApp(app);
    setShowSchedulePicker(true);
  };

  const handleTimeConfirm = async (timeIso: string) => {
    if (!selectedApp) return;
    try {
      const { booking, links } = await createVenueBooking(selectedApp.venueId, { artworkId: selectedApp.artworkId, type: 'install', startAt: timeIso });
      const d = new Date(timeIso);
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      const label = `${day} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      setScheduledInstalls({ ...scheduledInstalls, [selectedApp.id]: { label, bookingId: booking.id, links } });
    } catch (e) {
      // noop: in real app show toast
    } finally {
      setShowSchedulePicker(false);
      setSelectedApp(null);
    }
  };

  // Venue actions
  const handleApprove = (id: string) => {
    const app = applications.find(a => a.id === id);
    if (app) {
      setSelectedApp(app);
      setShowApprovalModal(true);
      setApprovalData({
        wallspace: 'Main Wall',
        duration: 90,
        startDate: new Date(),
        installTimeOption: 'standard',
      });
    }
  };

  const confirmApproval = () => {
    if (!selectedApp) return;
    
    setApplications(applications.map(app =>
      app.id === selectedApplication.id 
        ? { ...app, status: 'approved' as const, approvedDuration: approvalData.duration, approvedDate: new Date().toISOString() } 
        : app
    ));
    
    setShowApprovalModal(false);
    setSelectedApplication(null);
  };

  const handleReject = (id: string) => {
    setApplications(applications.map(app =>
      app.id === id ? { ...app, status: 'rejected' as const } : app
    ));
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    if (userRole === 'artist') {
      const styles = {
        pending: {
          bg: 'bg-[var(--surface-2)] border border-[var(--border)]',
          text: 'text-[var(--warning)]',
          label: 'Pending',
        },
        approved: { bg: 'bg-[var(--green-muted)]', text: 'text-[var(--green)]', label: 'Approved' },
        rejected: {
          bg: 'bg-[var(--surface-2)] border border-[var(--border)]',
          text: 'text-[var(--danger)]',
          label: 'Rejected',
        },
      };
      const style = styles[status as keyof typeof styles];
      return (
        <span className={`px-3 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      );
    } else {
      const styles = {
        pending: { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--warning)]', icon: Clock },
        approved: { bg: 'bg-[var(--green-muted)]', text: 'text-[var(--green)]', icon: Check },
        rejected: { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--danger)]', icon: X },
      };
      const style = styles[status as keyof typeof styles];
      const Icon = style.icon;
      return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
          <Icon className="w-3 h-3" />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  const selectedApplication = selectedApp;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">

      {userRole === 'artist' ? (
        <>
          <PageHeroHeader
            title="My Artwalls Pipeline"
            subtitle={`${pipelineNeedsActionCount} ${pipelineNeedsActionCount === 1 ? 'item needs' : 'items need'} your attention - ${pipelineApplicationCount} applications - ${pipelineInviteCount} invitations`}
            onBack={onBack}
          />

          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setArtistTab('pipeline')}
              className={`px-4 py-2 rounded-full border transition-colors ${
                artistTab === 'pipeline'
                  ? 'bg-[var(--surface-1)] border-[var(--blue)] text-[var(--blue)] shadow-sm'
                  : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setArtistTab('active')}
              className={`px-4 py-2 rounded-full border transition-colors ${
                artistTab === 'active'
                  ? 'bg-[var(--surface-1)] border-[var(--green)] text-[var(--green)] shadow-sm'
                  : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Active displays & QR
            </button>
          </div>

          {artistTab === 'pipeline' ? (
            <>
              <div className="mb-6">
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-2">Keep momentum</div>
                    <h2 className="text-xl text-[var(--text)] mb-1">Bring in new venues and respond to invites</h2>
                    <p className="text-sm text-[var(--text-muted)]">Follow up with venues that reach out and keep your applications moving.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.hash = '#/find-venues';
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] transition-colors"
                  >
                    Explore venues
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {pipelineFilterOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => setPipelineFilter(option.key)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${
                      pipelineFilter === option.key
                        ? 'bg-[var(--blue-muted)] text-[var(--blue)] border-[var(--blue)]'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                ))}
              </div>

              {filteredPipelineItems.length > 0 ? (
                <div className="space-y-5">
                  {filteredPipelineItems.map(item => {
                    const isInvite = item.kind === 'invite';
                    const invite = item.invite;
                    const application = item.application;
                    const imageUrl = isInvite ? invite?.venuePhoto : application?.artworkImage;
                    const title = isInvite ? invite?.venueName : application?.artworkTitle;
                    const subtitle = isInvite ? invite?.venueLocation : application?.venueName;
                    const timestamp = isInvite ? invite?.receivedAt || '' : application?.appliedDate || '';
                    const statusBadge = isInvite && invite
                      ? (() => {
                          const map = {
                            pending: 'bg-[var(--surface-2)] text-[var(--warning)] border border-[var(--border)]',
                            accepted: 'bg-[var(--green-muted)] text-[var(--green)]',
                            declined: 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]',
                          } as const;
                          const labelMap = {
                            pending: 'Pending response',
                            accepted: 'Accepted',
                            declined: 'Declined',
                          } as const;
                          return <span className={`px-3 py-1 rounded-full text-xs ${map[invite.status]}`}>{labelMap[invite.status]}</span>;
                        })()
                      : getStatusBadge(application?.status || 'pending');

                    return (
                      <div key={item.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                        <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                          <div className="relative h-48 md:h-full bg-[var(--surface-2)]">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={title || (isInvite ? 'Venue invitation' : 'Artwork application')}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)]">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="p-6 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                    isInvite
                                      ? 'bg-[var(--surface-2)] text-[var(--blue)] border-[var(--border)]'
                                      : 'bg-[var(--surface-2)] text-[var(--green)] border-[var(--border)]'
                                  }`}>
                                    {isInvite ? 'Invitation' : 'Application'}
                                  </span>
                                  <span className="text-xs text-[var(--text-muted)]">{formatRelativeDate(timestamp)}</span>
                                </div>
                                <h3 className="text-lg text-[var(--text)] mb-1">{title}</h3>
                                {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
                              </div>
                              <div>{statusBadge}</div>
                            </div>

                            {isInvite && invite ? (
                              <>
                                {invite.message && (
                                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{invite.message}</p>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {invite.wallspaceName && (
                                    <span className="px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
                                      {invite.wallspaceName}{invite.wallspaceSize ? ` - ${invite.wallspaceSize}` : ''}
                                    </span>
                                  )}
                                  <span className="px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
                                    {invite.requestedDuration} day display
                                  </span>
                                </div>
                                {invite.status === 'pending' ? (
                                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                                    <button
                                      onClick={() => handleInviteResponse(invite.id, 'declined')}
                                      className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors text-sm"
                                    >
                                      Decline
                                    </button>
                                    <button
                                      onClick={() => handleInviteResponse(invite.id, 'accepted')}
                                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] transition-colors text-sm"
                                    >
                                      Accept & start application
                                    </button>
                                  </div>
                                ) : invite.status === 'accepted' ? (
                                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)]">
                                    Invitation accepted. Add artwork from the Venues tab to complete your submission.
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-muted)]">
                                    You declined this invitation. It will stay here for reference.
                                  </div>
                                )}
                              </>
                            ) : application ? (
                              <>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                  <Calendar className="w-4 h-4" />
                                  Applied {new Date(application.appliedDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>

                                {application.status === 'approved' && (
                                  <div className="rounded-lg border border-[var(--border)] bg-[var(--green-muted)] px-4 py-4 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="text-sm font-medium text-[var(--text)]">Display term</span>
                                      {(application as any).approvedDuration && (
                                        <DurationBadge duration={(application as any).approvedDuration} size="md" />
                                      )}
                                    </div>
                                    {!scheduledInstalls[application.id] ? (
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <button
                                          onClick={() => handleScheduleInstall(application)}
                                          className="w-full sm:w-auto px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors text-sm"
                                        >
                                          Schedule install
                                        </button>
                                        <p className="text-xs text-[var(--text)] max-w-sm">
                                          Choose a time from the venue's availability so they can prepare to host your work.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-2 text-sm text-[var(--text)]">
                                        <strong>{scheduledInstalls[application.id].label}</strong>
                                        <p className="text-xs text-[var(--text)]">
                                          Calendar links:
                                          {scheduledInstalls[application.id].links?.google && (
                                            <>
                                              {' '}<a className="text-[var(--blue)] hover:underline" href={scheduledInstalls[application.id].links?.google}>Google</a>
                                            </>
                                          )}
                                          {scheduledInstalls[application.id].links?.ics && (
                                            <>
                                              {' '}
                                              |{' '}
                                              <a className="text-[var(--blue)] hover:underline" href={scheduledInstalls[application.id].links?.ics}>ICS</a>
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {application.status === 'pending' && (
                                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-muted)]">
                                    The venue is reviewing your submission. We'll email you as soon as they respond.
                                  </div>
                                )}

                                {application.status === 'rejected' && (
                                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-muted)]">
                                    This wall is full right now. Reapply later or explore other venues nearby.
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                    <Mail className="w-7 h-7 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="text-xl text-[var(--text)]">Nothing in your pipeline yet</h3>
                  <p className="text-[var(--text-muted)] max-w-md mx-auto">
                    Apply to venues in the marketplace or share your invite link to start receiving invitations.
                  </p>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.hash = '#/find-venues';
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] transition-colors"
                  >
                    Discover venues
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showSchedulePicker && selectedApp && (
                <TimeSlotPicker
                  onConfirm={handleTimeConfirm}
                  onCancel={() => setShowSchedulePicker(false)}
                />
              )}
            </>
          ) : (
            <>
              {approvedArtworks.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                  <p className="text-[var(--text-muted)]">No approved artworks yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {approvedArtworks.map((artwork) => (
                    <div
                      key={artwork.id}
                      className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="h-48 bg-[var(--surface-2)] overflow-hidden">
                        <img
                          src={artwork.image_url}
                          alt={artwork.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <h3 className="text-lg mb-1 text-[var(--text)]">{artwork.title}</h3>
                          <p className="text-sm text-[var(--text-muted)]">{artwork.venue_name}</p>
                        </div>

                        {artwork.install_time_option && (
                          <div className="text-sm">
                            <span className="text-[var(--text-muted)]">Install option:</span>
                            <span className="ml-2 px-2 py-1 bg-[var(--surface-2)] rounded text-[var(--text)]">
                              {artwork.install_time_option === 'quick' ? 'Quick (1-2 hours)' :
                               artwork.install_time_option === 'standard' ? 'Standard (half day)' :
                               'Flexible (full day)'}
                            </span>
                          </div>
                        )}

                        <div className="bg-[var(--surface-2)] rounded-lg p-4 border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-5 h-5 text-[var(--text)]" />
                              <span className="font-medium text-[var(--text)]">QR Code</span>
                            </div>
                            <button
                              onClick={() => toggleQrVisibility(artwork.id)}
                              className="p-2 hover:bg-[var(--surface-3)] rounded transition-colors"
                              title={qrStates[artwork.id] ? 'Hide QR code' : 'Show QR code'}
                              aria-label={qrStates[artwork.id] ? 'Hide QR code' : 'Show QR code'}
                            >
                              {qrStates[artwork.id] ? (
                                <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                              ) : (
                                <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                              )}
                            </button>
                          </div>

                          {qrStates[artwork.id] && (
                            <div className="mb-4 p-4 bg-white rounded-lg text-center">
                              <img
                                src={`${API_BASE}/api/artworks/${artwork.id}/qrcode.svg`}
                                alt="QR Code"
                                className="w-40 h-40 mx-auto"
                              />
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => copyQrUrl(artwork.id)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded hover:bg-[var(--blue-hover)] transition-colors text-sm"
                            >
                              <Copy className="w-4 h-4" />
                              {copyStates[artwork.id] ? 'Copied!' : 'Copy QR URL'}
                            </button>
                            <button
                              onClick={() => downloadQrCode(artwork.id)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--surface-3)] hover:bg-[var(--surface-2)] rounded transition-colors text-sm text-[var(--text)]"
                            >
                              <Download className="w-4 h-4" />
                              Download QR Code
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        // ========== VENUE VIEW: Artist Applications ==========
        <>
          <PageHeroHeader
            title="Applications & Invitations"
            subtitle={`${pendingCount} pending application${pendingCount !== 1 ? 's' : ''} to review`}
            onBack={onBack}
            actions={
              <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'pending'
                    ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'approved'
                    ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'rejected'
                    ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
                }`}
              >
                Rejected
              </button>
            </div>
            }
          />

          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <div
                key={application.id}
                className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] hover:shadow-md transition-shadow"
              >
                <div className="flex gap-6">
                  <div className="w-48 h-48 bg-[var(--surface-2)] rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={application.artworkImage}
                      alt={application.artworkTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl mb-1 text-[var(--text)]">{application.artworkTitle}</h3>
                        <p className="text-sm text-[var(--text-muted)]">by {application.artistName}</p>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>

                    <div className="space-y-2 mb-6 text-sm text-[var(--text-muted)]">
                      <p>
                        <strong>Dimensions:</strong> {application.artworkDimensions}
                      </p>
                      <p>
                        <strong>Medium:</strong> {application.artworkMedium}
                      </p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Applied {new Date(application.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    {/* Approval Info */}
                    {application.status === 'approved' && (
                      <div className="bg-[var(--green-muted)] rounded-lg p-4 mb-6 border border-[var(--border)]">
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm text-[var(--text)] mb-2">Approved for Display</h4>
                            <div className="space-y-1 text-sm">
                              <p>
                                <strong>Duration:</strong> <DurationBadge duration={(application as any).approvedDuration} size="sm" />
                              </p>
                              <p>
                                <strong>Wall Space:</strong> {(application as any).approvedWallspace}
                              </p>
                              <p>
                                <strong>Start Date:</strong> {new Date((application as any).approvedDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {application.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(application.id)}
                          className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(application.id)}
                          className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Approval Modal */}
          {showApprovalModal && selectedApplication && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[var(--surface-1)] rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl mb-6 text-[var(--text)]">Approve Application</h2>

                <div className="space-y-6">
                  {/* Wall Space Selection */}
                  <div>
                    <label className="block text-sm mb-2 text-[var(--text)]">
                      <strong>Select Wall Space</strong>
                    </label>
                    <select
                      value={approvalData.wallspace}
                      onChange={(e) => setApprovalData({ ...approvalData, wallspace: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                    >
                      <option>Main Wall</option>
                      <option>Side Gallery</option>
                      <option>Entry Display</option>
                    </select>
                  </div>

                  {/* Duration Selection */}
                  <div>
                    <label className="block text-sm mb-3 text-[var(--text)]">
                      <strong>Display Duration</strong>
                    </label>
                    <DisplayDurationSelector
                      selectedDuration={approvalData.duration}
                      onSelect={(duration) => setApprovalData({ ...approvalData, duration })}
                    />
                  </div>

                  {/* Install Time Options */}
                  <div>
                    <label className="block text-sm mb-3 text-[var(--text)]">
                      <strong>Installation Schedule</strong>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['quick', 'standard', 'flexible'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setApprovalData({ ...approvalData, installTimeOption: option as any })}
                          className={`p-3 rounded-lg border transition-colors ${
                            approvalData.installTimeOption === option
                              ? 'border-[var(--green)] bg-[var(--green-muted)]'
                              : 'border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                          }`}
                        >
                          <div className="text-sm text-[var(--text)]">{option.charAt(0).toUpperCase() + option.slice(1)}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6">
                    <button
                      onClick={confirmApproval}
                      className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Confirm Approval
                    </button>
                    <button
                      onClick={() => setShowApprovalModal(false)}
                      className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

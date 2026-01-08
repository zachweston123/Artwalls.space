import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, MapPin, Check, X, QrCode, Download, Eye, EyeOff, Copy } from 'lucide-react';
import { mockApplications } from '../../data/mockData';
import type { Application } from '../../data/mockData';
import { TimeSlotPicker } from '../scheduling/TimeSlotPicker';
import { InstallRules } from '../scheduling/InstallRules';
import { DurationBadge } from '../scheduling/DisplayDurationSelector';
import { DisplayDurationSelector } from '../scheduling/DisplayDurationSelector';
import { createVenueBooking } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface ApplicationsAndInvitationsProps {
  userRole: 'artist' | 'venue';
  onBack: () => void;
  defaultTab?: 'applications' | 'approved';
}

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  approval_status: 'approved';
  venue_id: string;
  venue_name: string;
  install_time_option?: 'quick' | 'standard' | 'flexible';
  created_at: string;
}

export function ApplicationsAndInvitations({ userRole, onBack, defaultTab = 'applications' }: ApplicationsAndInvitationsProps) {
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [approvedArtworks, setApprovedArtworks] = useState<Artwork[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [activeTab, setActiveTab] = useState<'applications' | 'approved'>(defaultTab);
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
          approval_status,
          venue_id,
          install_time_option,
          created_at,
          venues(name)
        `)
        .eq('artist_id', user.user.id)
        .eq('approval_status', 'approved')
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
    const qrUrl = `${window.location.origin}/api/artworks/${id}/qrcode.svg`;
    navigator.clipboard.writeText(qrUrl);
    setCopyStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const downloadQrCode = async (id: string) => {
    try {
      const response = await fetch(`/api/artworks/${id}/qrcode.png`);
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

  const filteredApplications = applications.filter(
    app => filter === 'all' || app.status === filter
  );

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
  const approvedCount = applications.filter(a => a.status === 'approved').length;

  const selectedApplication = selectedApp;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        ← Back
      </button>

      {userRole === 'artist' ? (
        // ========== ARTIST VIEW: My Applications ==========
        <>
          <div className="mb-8">
            <h1 className="text-3xl mb-4">My Applications</h1>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-[var(--border)]">
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-4 py-3 font-medium transition-colors ${
                  activeTab === 'applications'
                    ? 'text-[var(--green)] border-b-2 border-[var(--green)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Applications ({pendingCount + approvedCount})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-3 font-medium transition-colors ${
                  activeTab === 'approved'
                    ? 'text-[var(--green)] border-b-2 border-[var(--green)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Approved & QR ({approvedArtworks.length})
              </button>
            </div>
          </div>

          {activeTab === 'applications' && (
            <>
              <p className="text-[var(--text-muted)] mb-6">
                {pendingCount} pending • {approvedCount} approved
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredApplications.map((application) => (
                  <div
                    key={application.id}
                    className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="h-48 bg-[var(--surface-2)] overflow-hidden">
                      <img
                        src={application.artworkImage}
                        alt={application.artworkTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg mb-1 text-[var(--text)]">{application.artworkTitle}</h3>
                          <p className="text-sm text-[var(--text-muted)]">{application.venueName}</p>
                        </div>
                        {getStatusBadge(application.status)}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4">
                        <Calendar className="w-4 h-4" />
                        Applied {new Date(application.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>

                      {/* Approved - Schedule Install Flow */}
                      {application.status === 'approved' && (
                        <div>
                          {(application as any).approvedDuration && (
                            <div className="mb-4 p-4 bg-[var(--green-muted)] rounded-lg border border-[var(--border)]">
                              <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className="text-sm text-[var(--text)]">Display term:</span>
                                <DurationBadge duration={(application as any).approvedDuration} size="md" />
                              </div>
                              <p className="text-xs text-[var(--text)]">
                                You'll rotate or pick up the artwork during the venue's weekly window after the end date.
                              </p>
                            </div>
                          )}

                          {!scheduledInstalls[application.id] ? (
                            <div className="bg-[var(--green-muted)] rounded-lg p-4 mb-4 border border-[var(--border)]">
                              <div className="flex items-start gap-3 mb-3">
                                <CheckCircle className="w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="text-sm text-[var(--text)] mb-1">Application Approved!</h4>
                                  <p className="text-xs text-[var(--text)]">Use the picker to see available times.</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleScheduleInstall(application)}
                                className="w-full px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors text-sm"
                              >
                                Choose an Install Time
                              </button>
                            </div>
                          ) : (
                            <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-4 border border-[var(--border)]">
                              <div className="flex items-start gap-3 mb-3">
                                <Clock className="w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="text-sm text-[var(--text)] mb-1">Install Scheduled</h4>
                                  <p className="text-[var(--text)]"><strong>{scheduledInstalls[application.id].label}</strong></p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pending - Awaiting Approval */}
                      {application.status === 'pending' && (
                        <div className="bg-[var(--surface-2)] rounded-lg p-4">
                          <p className="text-sm text-[var(--text-muted)]">
                            The venue is reviewing your application. You'll be notified when they make a decision.
                          </p>
                        </div>
                      )}

                      {/* Rejected */}
                      {application.status === 'rejected' && (
                        <div className="bg-[var(--surface-2)] rounded-lg p-4 border border-[var(--border)]">
                          <div className="flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm text-[var(--text)] mb-1">Application Not Selected</h4>
                              <p className="text-xs text-[var(--text-muted)]">
                                The venue chose other artworks for this wall space. You can apply again!
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredApplications.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[var(--text-muted)]">No applications yet</p>
                </div>
              )}

              {/* Time Picker Modal */}
              {showSchedulePicker && selectedApp && (
                <TimeSlotPicker
                  onConfirm={handleTimeConfirm}
                  onCancel={() => setShowSchedulePicker(false)}
                />
              )}
            </>
          )}

          {activeTab === 'approved' && (
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
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-lg mb-1 text-[var(--text)]">{artwork.title}</h3>
                          <p className="text-sm text-[var(--text-muted)]">{artwork.venue_name}</p>
                        </div>

                        {artwork.install_time_option && (
                          <div className="mb-4 text-sm">
                            <span className="text-[var(--text-muted)]">Install option:</span>
                            <span className="ml-2 px-2 py-1 bg-[var(--surface-2)] rounded text-[var(--text)]">
                              {artwork.install_time_option === 'quick' ? 'Quick (1-2 hours)' :
                               artwork.install_time_option === 'standard' ? 'Standard (half day)' :
                               'Flexible (full day)'}
                            </span>
                          </div>
                        )}

                        {/* QR Code Section */}
                        <div className="bg-[var(--surface-2)] rounded-lg p-4 border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-5 h-5 text-[var(--text)]" />
                              <span className="font-medium text-[var(--text)]">QR Code</span>
                            </div>
                            <button
                              onClick={() => toggleQrVisibility(artwork.id)}
                              className="p-2 hover:bg-[var(--surface-3)] rounded transition-colors"
                              title={qrStates[artwork.id] ? 'Hide QR' : 'Show QR'}
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
                                src={`/api/artworks/${artwork.id}/qrcode.svg`}
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl mb-2 text-[var(--text)]">Applications & Invitations</h1>
              <p className="text-[var(--text-muted)]">
                {pendingCount} pending application{pendingCount !== 1 ? 's' : ''} to review
              </p>
            </div>
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
          </div>

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

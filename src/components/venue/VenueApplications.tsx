import { useState } from 'react';
import { Check, X, Clock, Calendar, MapPin } from 'lucide-react';
import { mockApplications } from '../../data/mockData';
import type { Application } from '../../data/mockData';
import { DisplayDurationSelector } from '../scheduling/DisplayDurationSelector';

export function VenueApplications() {
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [approvalData, setApprovalData] = useState<{
    wallspace: string;
    duration: 30 | 90 | 180;
    startDate: Date;
  }>({
    wallspace: 'Main Wall',
    duration: 90,
    startDate: new Date(),
  });

  const filteredApplications = applications.filter(
    app => filter === 'all' || app.status === filter
  );

  const handleApprove = (id: string) => {
    const app = applications.find(a => a.id === id);
    if (app) {
      setSelectedApplication(app);
      setShowApprovalModal(true);
      // Reset approval data
      setApprovalData({
        wallspace: 'Main Wall',
        duration: 90,
        startDate: new Date(),
      });
    }
  };

  const confirmApproval = () => {
    if (!selectedApplication) return;
    
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

  const getStatusBadge = (status: string) => {
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
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-[var(--text)]">Artist Applications</h1>
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
                    <p className="text-[var(--text-muted)]">by {application.artistName}</p>
                  </div>
                  {getStatusBadge(application.status)}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span className="text-[var(--text-muted)]">Applied:</span>
                    {new Date(application.appliedDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {application.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(application.id)}
                      className="flex items-center gap-2 px-6 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Approve Application
                    </button>
                    <button
                      onClick={() => handleReject(application.id)}
                      className="flex items-center gap-2 px-6 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                )}

                {application.status === 'approved' && (
                  <div className="p-4 bg-[var(--green-muted)] rounded-lg border border-[var(--border)]">
                    <p className="text-sm text-[var(--text)] mb-2">
                      Application approved. Artist will schedule installation during your weekly window.
                    </p>
                    {(application as any).approvedDuration && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Display term: <strong>{(application as any).approvedDuration} days</strong>
                      </p>
                    )}
                  </div>
                )}

                {application.status === 'rejected' && (
                  <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <p className="text-sm text-[var(--text-muted)]">This application was declined.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredApplications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No applications</h3>
          <p className="text-[var(--text-muted)]">
            {filter === 'all'
              ? "You don't have any applications yet"
              : `No ${filter} applications`}
          </p>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--surface-1)] border-b border-[var(--border)] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl mb-1 text-[var(--text)]">Approve Application</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {selectedApplication.artworkTitle} by {selectedApplication.artistName}
                  </p>
                </div>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Artwork Preview */}
              <div className="flex gap-4 p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <div className="w-24 h-24 bg-[var(--surface-1)] rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={selectedApplication.artworkImage}
                    alt={selectedApplication.artworkTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base mb-1 text-[var(--text)]">{selectedApplication.artworkTitle}</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-2">by {selectedApplication.artistName}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Applied: {new Date(selectedApplication.appliedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Wallspace Selection */}
              <div>
                <label className="block text-sm mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Wall Space <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  value={approvalData.wallspace}
                  onChange={(e) => setApprovalData({ ...approvalData, wallspace: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  <option value="Main Wall">Main Wall</option>
                  <option value="Back Wall">Back Wall</option>
                  <option value="Hallway Wall">Hallway Wall</option>
                  <option value="Private Dining">Private Dining</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={approvalData.startDate.toISOString().split('T')[0]}
                  onChange={(e) => setApprovalData({ ...approvalData, startDate: new Date(e.target.value) })}
                  className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Artist will schedule installation during your next install window after this date
                </p>
              </div>

              {/* Display Duration Selector */}
              <DisplayDurationSelector
                value={approvalData.duration}
                onChange={(duration) => setApprovalData({ ...approvalData, duration })}
                startDate={approvalData.startDate}
                showEndDate={true}
                helpText="Pickup/rotation happens during your weekly install/pickup window after the end date."
              />
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-[var(--surface-1)] border-t border-[var(--border)] p-6 flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-6 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproval}
                className="flex-1 px-6 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors"
              >
                Approve & Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
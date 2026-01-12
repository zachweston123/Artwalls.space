/**
 * Admin Venue Approval UI
 * Admin panel for reviewing and approving/rejecting venue setups
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase-client';
import '../styles/admin-approvals.css';

interface PendingVenue {
  id: string;
  name: string;
  city: string;
  photos: string[];
  categories: string[];
  setup_completed_at: string;
  status: string;
  user_email?: string;
}

interface VenueDetails {
  id: string;
  name: string;
  city: string;
  address: string;
  website?: string;
  instagram?: string;
  photos: string[];
  wall_type: string;
  display_spots: number;
  categories: string[];
  status: string;
  created_at: string;
  setup_completed_at: string;
}

interface ApprovalAction {
  id: string;
  action: string;
  reason?: string;
  notes?: string;
  created_at: string;
  admin_email?: string;
}

// ============================================================================
// AdminVenueApprovals - Main approval queue view
// ============================================================================

const AdminVenueApprovals: React.FC = () => {
  const navigate = useNavigate();
  const [pendingVenues, setPendingVenues] = useState<PendingVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalStats, setApprovalStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    loadPendingVenues();
    loadApprovalStats();
  }, []);

  const loadPendingVenues = async () => {
    try {
      // TODO: Call API endpoint GET /api/admin/venues/pending
      // const response = await fetch('/api/admin/venues/pending');
      // const data = await response.json();
      // setPendingVenues(data.data);
      
      // For now, using empty state
      setPendingVenues([]);
    } catch (error) {
      console.error('Error loading pending venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovalStats = async () => {
    try {
      // TODO: Call API endpoint GET /api/admin/approvals/stats
      setApprovalStats({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading approval queue...</div>;
  }

  return (
    <div className="admin-approvals">
      <div className="approval-header">
        <h1>Venue Setup Approvals</h1>
        <p>Review and approve new venue setups</p>
      </div>

      {/* Stats */}
      <div className="approval-stats">
        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value">{approvalStats.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{approvalStats.approved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value">{approvalStats.rejected}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Venues</div>
          <div className="stat-value">{approvalStats.total}</div>
        </div>
      </div>

      {/* Queue */}
      {pendingVenues.length === 0 ? (
        <div className="empty-state">
          <p>📭 All venues approved! Great work!</p>
          <button className="btn btn-secondary" onClick={loadPendingVenues}>
            Refresh
          </button>
        </div>
      ) : (
        <div className="approval-queue">
          <h2>Pending Approvals ({pendingVenues.length})</h2>
          <div className="venue-list">
            {pendingVenues.map(venue => (
              <div key={venue.id} className="venue-card">
                <div className="venue-header">
                  <h3>{venue.name}</h3>
                  <span className="venue-city">📍 {venue.city}</span>
                </div>
                
                {venue.photos.length > 0 && (
                  <div className="venue-photos">
                    {venue.photos.slice(0, 3).map((photo, idx) => (
                      <img key={idx} src={photo} alt={`${venue.name} ${idx + 1}`} />
                    ))}
                  </div>
                )}

                <div className="venue-details">
                  <p>Categories: {venue.categories.join(', ')}</p>
                  <p>Submitted: {new Date(venue.setup_completed_at).toLocaleDateString()}</p>
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/admin/approvals/${venue.id}`)}
                >
                  Review Details →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// AdminVenueApprovalDetail - Detailed approval review page
// ============================================================================

const AdminVenueApprovalDetail: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  
  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (venueId) {
      loadVenueDetails();
    }
  }, [venueId]);

  const loadVenueDetails = async () => {
    try {
      // TODO: Call API endpoint GET /api/admin/venues/:id/details
      // const response = await fetch(`/api/admin/venues/${venueId}/details`);
      // const data = await response.json();
      // setVenue(data.venue);
      // setApprovalHistory(data.approvals);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading venue details:', error);
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!venueId) return;
    
    setProcessing(true);
    try {
      // TODO: Call API endpoint POST /api/admin/venues/:id/approve
      // const response = await fetch(`/api/admin/venues/${venueId}/approve`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ notes: '' })
      // });
      
      // On success:
      navigate('/admin/approvals');
    } catch (error) {
      console.error('Error approving venue:', error);
      alert('Failed to approve venue');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!venueId || !rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      // TODO: Call API endpoint POST /api/admin/venues/:id/reject
      // const response = await fetch(`/api/admin/venues/${venueId}/reject`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     reason: rejectReason,
      //     notes: rejectNotes 
      //   })
      // });
      
      // On success:
      navigate('/admin/approvals');
    } catch (error) {
      console.error('Error rejecting venue:', error);
      alert('Failed to reject venue');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="approval-detail-loading">Loading venue details...</div>;
  }

  if (!venue) {
    return (
      <div className="approval-detail-error">
        <h2>Venue not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/admin/approvals')}>
          Back to queue
        </button>
      </div>
    );
  }

  return (
    <div className="admin-approval-detail">
      {/* Header */}
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/admin/approvals')}>
          ← Back to Queue
        </button>
        <h1>{venue.name}</h1>
        <p className="venue-location">📍 {venue.city}</p>
      </div>

      {/* Two Column Layout */}
      <div className="detail-container">
        {/* Left: Venue Info */}
        <div className="detail-column detail-info">
          <section>
            <h2>Venue Information</h2>
            <div className="info-group">
              <label>Address</label>
              <p>{venue.address}</p>
            </div>
            {venue.website && (
              <div className="info-group">
                <label>Website</label>
                <a href={venue.website} target="_blank" rel="noopener noreferrer">
                  {venue.website}
                </a>
              </div>
            )}
            {venue.instagram && (
              <div className="info-group">
                <label>Instagram</label>
                <a href={`https://instagram.com/${venue.instagram}`} target="_blank" rel="noopener noreferrer">
                  {venue.instagram}
                </a>
              </div>
            )}
          </section>

          {/* Wall Config */}
          <section>
            <h2>Wall Configuration</h2>
            <div className="info-group">
              <label>Wall Type</label>
              <p>{venue.wall_type}</p>
            </div>
            <div className="info-group">
              <label>Display Spots</label>
              <p>{venue.display_spots}</p>
            </div>
          </section>

          {/* Categories */}
          <section>
            <h2>Art Categories</h2>
            <div className="category-tags">
              {venue.categories.map(cat => (
                <span key={cat} className="category-tag">{cat}</span>
              ))}
            </div>
          </section>

          {/* Photos */}
          {venue.photos.length > 0 && (
            <section>
              <h2>Venue Photos</h2>
              <div className="photo-gallery">
                {venue.photos.map((photo, idx) => (
                  <img key={idx} src={photo} alt={`${venue.name} ${idx + 1}`} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: Approval Actions */}
        <div className="detail-column detail-actions">
          <section className="approval-section">
            <h2>Approval Actions</h2>
            <p className="submitted-date">
              Submitted: {new Date(venue.setup_completed_at).toLocaleDateString()}
            </p>

            {/* Approve Button */}
            <button 
              className="btn btn-success btn-large"
              onClick={handleApprove}
              disabled={processing}
            >
              ✓ Approve Venue
            </button>

            {/* Reject Button */}
            <button 
              className="btn btn-danger btn-large"
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={processing}
            >
              ✕ Reject Venue
            </button>

            {/* Reject Form */}
            {showRejectForm && (
              <div className="reject-form">
                <label>Reason for Rejection</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select a reason...</option>
                  <option value="incomplete">Incomplete Setup</option>
                  <option value="poor_photos">Poor Quality Photos</option>
                  <option value="invalid_info">Invalid Information</option>
                  <option value="other">Other</option>
                </select>

                <label>Additional Notes (optional)</label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Detailed feedback for the venue..."
                  className="form-input"
                  rows={4}
                />

                <div className="form-actions">
                  <button 
                    className="btn btn-danger"
                    onClick={handleReject}
                    disabled={processing || !rejectReason}
                  >
                    {processing ? 'Processing...' : 'Send Rejection'}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason('');
                      setRejectNotes('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Approval History */}
          {approvalHistory.length > 0 && (
            <section>
              <h2>Approval History</h2>
              <div className="history-list">
                {approvalHistory.map(action => (
                  <div key={action.id} className="history-item">
                    <div className={`action-badge action-${action.action}`}>
                      {action.action === 'approve' ? '✓' : '✕'}
                    </div>
                    <div className="action-details">
                      <p className="action-type">
                        {action.action === 'approve' ? 'Approved' : 'Rejected'}
                      </p>
                      {action.reason && (
                        <p className="action-reason">{action.reason}</p>
                      )}
                      {action.notes && (
                        <p className="action-notes">{action.notes}</p>
                      )}
                      <p className="action-date">
                        {new Date(action.created_at).toLocaleDateString()}
                        {action.admin_email && ` by ${action.admin_email}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export { AdminVenueApprovals, AdminVenueApprovalDetail };
export default AdminVenueApprovals;

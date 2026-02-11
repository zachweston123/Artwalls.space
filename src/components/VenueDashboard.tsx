/**
 * VenueDashboard - Enhanced with Setup Health Checklist
 * Main dashboard view for venue partners showing setup progress and key metrics
 */

import React, { useState, useEffect } from 'react';
// react-router-dom removed — this app uses custom SPA routing
import SetupHealthChecklist from './SetupHealthChecklist';
import VenuePartnerKitEmbedded from './VenuePartnerKitEmbedded';
import { useVenueData } from '../hooks/useVenueData';
import { apiGet } from '../lib/api';
import '../styles/venue-dashboard.css';

interface DashboardTab {
  id: string;
  label: string;
  icon: string;
}

interface DashboardMetrics {
  totalArtworks: number;
  activeArtists: number;
  monthlyRevenue: number;
  completionPercentage: number;
}

const VenueDashboard: React.FC = () => {
  const navigate = (path: string) => { window.location.href = path; };
  const { venue, loading } = useVenueData();
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalArtworks: 0,
    activeArtists: 0,
    monthlyRevenue: 0,
    completionPercentage: 0
  });
  const [showSetupChecklist, setShowSetupChecklist] = useState(false);

  const dashboardTabs: DashboardTab[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'setup', label: 'Setup Progress', icon: '⚙️' },
    { id: 'partner-kit', label: 'Success Guide', icon: '📚' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  // Load dashboard metrics
  useEffect(() => {
    if (venue?.id) {
      loadMetrics();
    }
  }, [venue?.id]);

  const loadMetrics = async () => {
    if (!venue?.id) return;
    try {
      const resp = await apiGet<{ metrics: DashboardMetrics }>(`/api/venues/${venue.id}/metrics`);
      setMetrics(resp.metrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
      const fallbackCompletion = venue?.status === 'live'
        ? 100
        : venue?.status === 'approved'
        ? 85
        : venue?.status === 'pending_review'
        ? 75
        : 50;
      setMetrics((prev) => ({ ...prev, completionPercentage: fallbackCompletion }));
    }
  };

  const handleStartSetup = () => {
    navigate('/venue/setup');
  };

  const handleResumeSetup = () => {
    navigate('/venue/setup');
  };

  const handleViewPartnerKit = () => {
    setActiveTab('partner-kit');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="dashboard-error">
        <h2>Venue Not Found</h2>
        <p>We couldn't load your venue information.</p>
      </div>
    );
  }

  // Render different content based on venue status
  const isSetupComplete = venue.status === 'live' || venue.status === 'approved';
  const isSetupPending = venue.status === 'pending_review';
  const isSetupIncomplete = venue.status === 'draft';

  return (
    <div className="venue-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {venue.name}!</h1>
          <p className="venue-location">📍 {venue.city}</p>
        </div>
        <div className="header-status">
          <span className={`status-badge status-${venue.status}`}>
            {venue.status === 'live' && '🟢 Live'}
            {venue.status === 'approved' && '✅ Approved'}
            {venue.status === 'pending_review' && '⏳ Pending Review'}
            {venue.status === 'draft' && '📝 Setup in Progress'}
            {venue.status === 'paused' && '⏸️ Paused'}
          </span>
        </div>
      </div>

      {/* Status-specific alerts */}
      {isSetupIncomplete && (
        <div className="alert alert-info">
          <div className="alert-content">
            <h3>🚀 Complete Your Setup</h3>
            <p>Get your venue live in just 5 minutes! We'll guide you through each step.</p>
            <button className="btn btn-primary" onClick={handleResumeSetup}>
              {venue.photos && venue.photos.length > 0 ? 'Resume Setup' : 'Start Setup'}
            </button>
          </div>
        </div>
      )}

      {isSetupPending && (
        <div className="alert alert-warning">
          <div className="alert-content">
            <h3>⏳ Your Setup is Under Review</h3>
            <p>We're reviewing your venue information. You'll be notified when it's approved!</p>
            <button className="btn btn-secondary" onClick={() => setShowSetupChecklist(true)}>
              View Your Setup
            </button>
          </div>
        </div>
      )}

      {isSetupComplete && (
        <div className="alert alert-success">
          <div className="alert-content">
            <h3>🎉 Your Setup is Complete!</h3>
            <p>Your venue is now live. Check out the Venue Success Guide for tips to maximize sales.</p>
            <button className="btn btn-secondary" onClick={handleViewPartnerKit}>
              View Success Guide
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        {dashboardTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2>Dashboard Overview</h2>
            
            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Setup Completion</div>
                <div className="metric-value">{metrics.completionPercentage}%</div>
                <div className="metric-bar">
                  <div 
                    className="metric-bar-fill" 
                    style={{ width: `${metrics.completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Total Artworks</div>
                <div className="metric-value">{metrics.totalArtworks}</div>
                <p className="metric-note">Coming Soon</p>
              </div>

              <div className="metric-card">
                <div className="metric-label">Active Artists</div>
                <div className="metric-value">{metrics.activeArtists}</div>
                <p className="metric-note">Coming Soon</p>
              </div>

              <div className="metric-card">
                <div className="metric-label">Monthly Revenue</div>
                <div className="metric-value">${metrics.monthlyRevenue.toFixed(2)}</div>
                <p className="metric-note">Coming Soon</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-grid">
                {isSetupIncomplete && (
                  <button className="action-button" onClick={handleResumeSetup}>
                    <span className="action-icon">⚙️</span>
                    <span className="action-label">Complete Setup</span>
                  </button>
                )}
                
                <button className="action-button" onClick={handleViewPartnerKit}>
                  <span className="action-icon">📚</span>
                  <span className="action-label">Success Guide</span>
                </button>

                <button 
                  className="action-button"
                  onClick={() => navigate('/venue/settings')}
                >
                  <span className="action-icon">⚙️</span>
                  <span className="action-label">Settings</span>
                </button>

                <button 
                  className="action-button"
                  onClick={() => window.location.href = 'mailto:support@artwalls.space'}
                >
                  <span className="action-icon">💬</span>
                  <span className="action-label">Contact Support</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Setup Progress Tab */}
        {activeTab === 'setup' && (
          <div className="tab-content">
            <h2>Setup Progress</h2>
            <SetupHealthChecklist 
              venueId={venue.id}
              onNavigateToWizard={handleResumeSetup}
            />
          </div>
        )}

        {/* Partner Kit Tab */}
        {activeTab === 'partner-kit' && (
          <div className="tab-content">
            <VenuePartnerKitEmbedded venueId={venue.id} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <h2>Venue Settings</h2>
            <p className="placeholder-text">Coming soon: Customize your venue settings</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/venue/settings')}
            >
              Go to Settings
            </button>
          </div>
        )}
      </div>

      {/* Modal: Setup Checklist for pending review */}
      {showSetupChecklist && isSetupPending && (
        <div className="modal-overlay" onClick={() => setShowSetupChecklist(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowSetupChecklist(false)}
            >
              ✕
            </button>
            <h2>Your Setup Summary</h2>
            <SetupHealthChecklist 
              venueId={venue.id}
              readOnly={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueDashboard;

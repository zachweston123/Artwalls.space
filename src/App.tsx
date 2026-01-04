import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { apiPost } from './lib/api';
import { Navigation } from './components/Navigation';
import { MobileSidebar } from './components/MobileSidebar';
import { Login } from './components/Login';
import { ArtistDashboard } from './components/artist/ArtistDashboard';
import { ArtistArtworks } from './components/artist/ArtistArtworks';
import { ArtistVenues } from './components/artist/ArtistVenues';
import { ArtistApplicationsWithScheduling } from './components/artist/ArtistApplicationsWithScheduling';
import { ArtistSales } from './components/artist/ArtistSales';
import { ArtistProfile } from './components/artist/ArtistProfile';
import { VenueDashboard } from './components/venue/VenueDashboard';
import { VenueWalls } from './components/venue/VenueWalls';
import { VenueApplications } from './components/venue/VenueApplications';
import { VenueCurrentArtWithScheduling } from './components/venue/VenueCurrentArtWithScheduling';
import { VenueSales } from './components/venue/VenueSales';
import { VenueSettings } from './components/venue/VenueSettings';
import { VenueSettingsWithEmptyState } from './components/venue/VenueSettingsWithEmptyState';
import { VenueProfile } from './components/venue/VenueProfile';
import { VenueProfileView } from './components/venue/VenueProfileView';
import { VenueWallsPublic } from './components/venue/VenueWallsPublic';
import { FindArtists } from './components/venue/FindArtists';
import { FindVenues } from './components/artist/FindVenues';
import { NotificationsList } from './components/notifications/NotificationsList';
import { PoliciesLanding } from './components/legal/PoliciesLanding';
import { ArtistAgreement } from './components/legal/ArtistAgreement';
import { VenueAgreement } from './components/legal/VenueAgreement';
import { AgreementBanner } from './components/legal/AgreementBanner';
import { Footer } from './components/Footer';
import { PricingPage } from './components/pricing/PricingPage';
import { PurchasePage } from './components/PurchasePage';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminAccessDenied } from './components/admin/AdminAccessDenied';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminUserDetail } from './components/admin/AdminUserDetail';
import { AdminAnnouncements } from './components/admin/AdminAnnouncements';
import { AdminPromoCodes } from './components/admin/AdminPromoCodes';
import { AdminActivityLog } from './components/admin/AdminActivityLog';
import { AdminPasswordPrompt } from './components/admin/AdminPasswordPrompt';
import { StripePaymentSetup } from './components/admin/StripePaymentSetup';

export type UserRole = 'artist' | 'venue' | 'admin' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPasswordVerified, setAdminPasswordVerified] = useState(false);
  const [pendingAdminAccess, setPendingAdminAccess] = useState(false);

  const userFromSupabase = (supaUser: any): User | null => {
    if (!supaUser?.id) return null;
    const role = (supaUser.user_metadata?.role as UserRole) || null;
    if (role !== 'artist' && role !== 'venue') return null;
    return {
      id: supaUser.id,
      name:
        (supaUser.user_metadata?.name as string | undefined) ||
        (role === 'artist' ? 'Artist' : 'Venue'),
      email: (supaUser.email as string | undefined) || '',
      role,
    };
  };

  // Restore auth session and keep UI in sync across refreshes/tabs
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const nextUser = userFromSupabase(data.session?.user);
      if (nextUser) {
        setCurrentUser(nextUser);
        setCurrentPage(nextUser.role === 'artist' ? 'artist-dashboard' : 'venue-dashboard');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = userFromSupabase(session?.user);
      setCurrentUser(nextUser);
      setCurrentPage(nextUser ? (nextUser.role === 'artist' ? 'artist-dashboard' : 'venue-dashboard') : 'login');
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Listen for keyboard shortcut to access admin login (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+A (Windows/Linux) or Cmd+Shift+A (Mac)
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isKeyA = e.key === 'A' || e.key === 'a';
      
      if (isCtrlOrCmd && isShift && isKeyA) {
        e.preventDefault();
        if (!currentUser) {
          setShowAdminPasswordPrompt(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const handleLogin = (user: User) => {
    // If trying to login as admin, require password verification
    if (user.role === 'admin') {
      if (!adminPasswordVerified) {
        setPendingAdminAccess(true);
        setShowAdminPasswordPrompt(true);
        return;
      }
      // Password verified, proceed
      setCurrentUser(user);
      setCurrentPage('admin-dashboard');
      setAdminPasswordVerified(false);
      setPendingAdminAccess(false);
    } else {
      // Non-admin login, proceed normally
      setCurrentUser(user);
      setCurrentPage(user.role === 'artist' ? 'artist-dashboard' : 'venue-dashboard');
    }
  };

  // Ensure the user has a corresponding DB record immediately (discoverable in searches)
  useEffect(() => {
    async function syncProfile() {
      try {
        if (!currentUser) return;
        if (currentUser.role === 'artist') {
          await apiPost('/api/artists', { artistId: currentUser.id, email: currentUser.email, name: currentUser.name });
        } else if (currentUser.role === 'venue') {
          await apiPost('/api/venues', { venueId: currentUser.id, email: currentUser.email, name: currentUser.name });
        }
      } catch {}
    }
    syncProfile();
  }, [currentUser]);

  const handleAdminPasswordVerified = () => {
    setShowAdminPasswordPrompt(false);
    setAdminPasswordVerified(true);
    setCurrentUser({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@artwalls.com',
      role: 'admin'
    });
    setCurrentPage('admin-dashboard');
    setPendingAdminAccess(false);
  };

  const handleCancelAdminPassword = () => {
    setShowAdminPasswordPrompt(false);
    setAdminPasswordVerified(false);
    setPendingAdminAccess(false);
  };

  const handleLogout = async () => {
    if (currentUser?.role === 'admin') {
      setCurrentUser(null);
      setCurrentPage('login');
      return;
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page.startsWith('purchase-')) {
      window.location.hash = `#/purchase-${page.split('-')[1]}`;
    } else if (window.location.hash) {
      // Clear hash for non-purchase pages
      window.location.hash = '';
    }
  };

  // Initialize from URL hash (QR deep link) and keep in sync
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#/purchase-')) {
        const id = hash.replace('#/purchase-', '');
        if (id) setCurrentPage(`purchase-${id}`);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Check if this is a purchase page (QR code flow)
  if (currentPage.startsWith('purchase-')) {
    const artworkId = currentPage.split('-')[1];
    return <PurchasePage artworkId={artworkId} onBack={() => setCurrentPage('login')} />;
  }

  if (!currentUser) {
    return (
      <div>
        <Login onLogin={handleLogin} />
        {/* Password Prompt Modal */}
        {showAdminPasswordPrompt && (
          <AdminPasswordPrompt
            onVerify={handleAdminPasswordVerified}
            onCancel={handleCancelAdminPassword}
          />
        )}
        {/* Demo link to simulate QR code scan */}
        <div className="fixed bottom-6 right-6 bg-[var(--surface-2)] rounded-lg shadow-lg p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)] mb-2">Demo QR Purchase Page:</p>
          <button
            onClick={() => setCurrentPage('purchase-1')}
            className="text-sm text-[var(--accent)] hover:underline mb-2 block"
          >
            View Customer Purchase Page
          </button>
        </div>
      </div>
    );
  }

  // Admin Console Layout (different from main app)
  if (currentUser.role === 'admin') {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar currentPage={currentPage} onNavigate={handleNavigate} />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-8 overflow-y-auto">
            {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
            {currentPage === 'admin-users' && (
              <AdminUsers onViewUser={(userId) => handleNavigate('admin-user-detail')} />
            )}
            {currentPage === 'admin-user-detail' && (
              <AdminUserDetail userId="1" onBack={() => handleNavigate('admin-users')} />
            )}
            {currentPage === 'admin-announcements' && (
              <AdminAnnouncements onCreateAnnouncement={() => {/* TODO: Open modal */}} />
            )}
            {currentPage === 'admin-promo-codes' && (
              <AdminPromoCodes onCreatePromoCode={() => {/* TODO: Open modal */}} />
            )}
            {currentPage === 'admin-stripe-payments' && <StripePaymentSetup onNavigate={handleNavigate} />}
            {currentPage === 'admin-activity-log' && <AdminActivityLog />}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation 
        user={currentUser} 
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        currentPage={currentPage}
        onMenuClick={() => setIsSidebarOpen(true)}
      />
      
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={currentUser}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        currentPage={currentPage}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Background is controlled by system dark mode preference set on html/body */}
        {/* Agreement Banner */}
        {!hasAcceptedAgreement && 
         !['policies', 'artist-agreement', 'venue-agreement'].includes(currentPage) && (
          <AgreementBanner 
            role={currentUser.role as 'artist' | 'venue'} 
            onNavigate={handleNavigate}
          />
        )}

        {/* Legal Pages (available to both roles) */}
        {currentPage === 'policies' && <PoliciesLanding onNavigate={handleNavigate} />}
        {currentPage === 'plans-pricing' && <PricingPage onNavigate={handleNavigate} currentPlan="free" />}
        {currentPage === 'artist-agreement' && (
          <ArtistAgreement 
            onNavigate={handleNavigate}
            onAccept={() => setHasAcceptedAgreement(true)}
            hasAccepted={hasAcceptedAgreement}
          />
        )}
        {currentPage === 'venue-agreement' && (
          <VenueAgreement 
            onNavigate={handleNavigate}
            onAccept={() => setHasAcceptedAgreement(true)}
            hasAccepted={hasAcceptedAgreement}
          />
        )}

        {currentUser.role === 'artist' && (
          <>
            {currentPage === 'artist-dashboard' && <ArtistDashboard onNavigate={handleNavigate} user={currentUser} />}
            {currentPage === 'artist-artworks' && <ArtistArtworks user={currentUser} />}
            {currentPage === 'artist-venues' && (
              <FindVenues 
                onViewVenue={(venueId) => {
                  setSelectedVenueId(venueId);
                  handleNavigate('venue-view-profile');
                }} 
                onViewWallspaces={(venueId) => {
                  setSelectedVenueId(venueId);
                  handleNavigate('venue-view-wallspaces');
                }} 
              />
            )}
            {currentPage === 'venue-view-profile' && (
              <VenueProfileView 
                isOwnProfile={false}
                venueId={selectedVenueId || undefined}
                onViewWallspaces={() => handleNavigate('venue-view-wallspaces')}
                onNavigate={handleNavigate}
                currentUser={currentUser}
              />
            )}
            {currentPage === 'venue-view-wallspaces' && (
              <VenueWallsPublic venueId={selectedVenueId || undefined} onBack={() => handleNavigate('artist-venues')} />
            )}
            {currentPage === 'artist-applications' && <ArtistApplicationsWithScheduling />}
            {currentPage === 'artist-sales' && <ArtistSales />}
            {currentPage === 'artist-profile' && <ArtistProfile onNavigate={handleNavigate} />}
            {currentPage === 'artist-notifications' && <NotificationsList />}
          </>
        )}
        
        {currentUser.role === 'venue' && (
          <>
            {currentPage === 'venue-dashboard' && <VenueDashboard onNavigate={handleNavigate} user={currentUser} />}
            {currentPage === 'venue-walls' && <VenueWalls />}
            {currentPage === 'venue-applications' && <VenueApplications />}
            {currentPage === 'venue-current' && <VenueCurrentArtWithScheduling />}
            {currentPage === 'venue-sales' && <VenueSales />}
            {currentPage === 'venue-settings' && <VenueSettingsWithEmptyState />}
            {currentPage === 'venue-profile' && <VenueProfile onNavigate={handleNavigate} />}
            {currentPage === 'venue-find-artists' && (
              <FindArtists
                onViewProfile={(artistId) => handleNavigate('artist-profile')}
                onInviteArtist={(artistId) => {/* TODO: implement invite flow */}}
              />
            )}
            {currentPage === 'venue-notifications' && <NotificationsList />}
          </>
        )}
        
        {currentUser.role === 'admin' && (
          <>
            {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
            {currentPage === 'admin-users' && (
              <AdminUsers onViewUser={(userId: string) => handleNavigate('admin-user-detail', { userId })} />
            )}
            {currentPage === 'admin-user-detail' && <AdminUserDetail onNavigate={handleNavigate} />}
            {currentPage === 'admin-announcements' && <AdminAnnouncements onNavigate={handleNavigate} />}
            {currentPage === 'admin-promo-codes' && <AdminPromoCodes onNavigate={handleNavigate} />}
            {currentPage === 'admin-stripe-payments' && <StripePaymentSetup onNavigate={handleNavigate} />}
            {currentPage === 'admin-activity-log' && <AdminActivityLog onNavigate={handleNavigate} />}
          </>
        )}
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
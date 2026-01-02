import { useState, useEffect } from 'react';
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
import { FindArtists } from './components/venue/FindArtists';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPasswordVerified, setAdminPasswordVerified] = useState(false);
  const [pendingAdminAccess, setPendingAdminAccess] = useState(false);

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

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

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
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Demo QR Purchase Page:</p>
          <button
            onClick={() => setCurrentPage('purchase-1')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline mb-2 block"
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
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8\">"
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
            {currentPage === 'artist-venues' && <ArtistVenues />}
            {currentPage === 'artist-applications' && <ArtistApplicationsWithScheduling />}
            {currentPage === 'artist-sales' && <ArtistSales />}
            {currentPage === 'artist-profile' && <ArtistProfile onNavigate={handleNavigate} />}
            {currentPage === 'artist-notifications' && <NotificationsList />}
          </>
        )}
        
        {currentUser.role === 'venue' && (
          <>
            {currentPage === 'venue-dashboard' && <VenueDashboard onNavigate={handleNavigate} />}
            {currentPage === 'venue-walls' && <VenueWalls />}
            {currentPage === 'venue-applications' && <VenueApplications />}
            {currentPage === 'venue-current' && <VenueCurrentArtWithScheduling />}
            {currentPage === 'venue-sales' && <VenueSales />}
            {currentPage === 'venue-settings' && <VenueSettingsWithEmptyState />}
            {currentPage === 'venue-profile' && <VenueProfile onNavigate={handleNavigate} />}
            {currentPage === 'venue-find-artists' && <FindArtists onViewArtist={(artistId) => handleNavigate('artist-profile')} />}
            {currentPage === 'venue-notifications' && <NotificationsList />}
          </>
        )}
        
        {currentUser.role === 'admin' && (
          <>
            {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
            {currentPage === 'admin-users' && <AdminUsers onNavigate={handleNavigate} />}
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
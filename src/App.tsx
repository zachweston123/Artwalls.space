import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { apiPost } from './lib/api';
import { Navigation } from './components/Navigation';
import { MobileSidebar } from './components/MobileSidebar';
import { Login } from './components/Login';
import { ArtistDashboard } from './components/artist/ArtistDashboard';
import { ArtistArtworks } from './components/artist/ArtistArtworks';
import { ArtistVenues } from './components/artist/ArtistVenues';

import { ArtistSales } from './components/artist/ArtistSales';
import { ArtistProfile } from './components/artist/ArtistProfile';
import { ArtistProfileView } from './components/artist/ArtistProfileView';
import { PasswordSecurity } from './components/artist/PasswordSecurity';
import { NotificationPreferences } from './components/artist/NotificationPreferences';
import { ArtistInvites } from './components/artist/ArtistInvites';
import { VenueDashboard } from './components/venue/VenueDashboard';
import { VenueWalls } from './components/venue/VenueWalls';
import { VenueCurrentArtWithScheduling } from './components/venue/VenueCurrentArtWithScheduling';
import { VenueSales } from './components/venue/VenueSales';
import { VenueSettings } from './components/venue/VenueSettings';
import { VenueSettingsWithEmptyState } from './components/venue/VenueSettingsWithEmptyState';
import { VenueProfile } from './components/venue/VenueProfile';
import { VenueProfileView } from './components/venue/VenueProfileView';
import { VenuePasswordSecurity } from './components/venue/VenuePasswordSecurity';
import { VenueNotificationPreferences } from './components/venue/VenueNotificationPreferences';
import { VenueWallsPublic } from './components/venue/VenueWallsPublic';
import { FindArtists } from './components/venue/FindArtists';
import { VenueProfilePage } from './components/venue/VenueProfilePage';
import { FindArtHub } from './components/venue/FindArtHub';
import { VenuePartnerKitEmbedded } from './components/venue/VenuePartnerKitEmbedded';
import { VenueSetupWizard } from './components/venue/VenueSetupWizard';
import { VenueHostingPolicy } from './components/venue/VenueHostingPolicy';
import { VenueApplication } from './components/venue/VenueApplication';
import { VenueDashboardModule } from './components/venue/VenueDashboardModule';
import { ReferralProgram } from './components/venue/ReferralProgram';
import { ApplicationsAndInvitations } from './components/shared/ApplicationsAndInvitations';
import { FindVenues } from './components/artist/FindVenues';
import { NotificationsList } from './components/notifications/NotificationsList';
import { WhyArtwalls } from './components/WhyArtwalls';
import { PoliciesLanding } from './components/legal/PoliciesLanding';
import { ArtistAgreement } from './components/legal/ArtistAgreement';
import { VenueAgreement } from './components/legal/VenueAgreement';
import { AgreementBanner } from './components/legal/AgreementBanner';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import { Footer } from './components/Footer';
import { PricingPage } from './components/pricing/PricingPage';
import { PurchasePage } from './components/PurchasePage';
import { ProfileCompletion } from './components/ProfileCompletion';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminAccessDenied } from './components/admin/AdminAccessDenied';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminUserDetail } from './components/admin/AdminUserDetail';
import { AdminAnnouncements } from './components/admin/AdminAnnouncements';
import { AdminPromoCodes } from './components/admin/AdminPromoCodes';
import { AdminActivityLog } from './components/admin/AdminActivityLog';
import { AdminInvites } from './components/admin/AdminInvites';
import { AdminSales as AdminSalesPage } from './components/admin/AdminSales';
import { AdminCurrentDisplays } from './components/admin/AdminCurrentDisplays';
import { AdminSupport } from './components/admin/AdminSupport';
import { AdminPasswordPrompt } from './components/admin/AdminPasswordPrompt';
import { StripePaymentSetup } from './components/admin/StripePaymentSetup';
import { SupportInbox } from './components/admin/SupportInbox';
import { SupportMessageDetail } from './components/admin/SupportMessageDetail';

export type UserRole = 'artist' | 'venue' | 'admin' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>(() => {
    // Try to restore page from localStorage, default to 'login'
    return localStorage.getItem('currentPage') || 'login';
  });
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPasswordVerified, setAdminPasswordVerified] = useState(false);
  const [pendingAdminAccess, setPendingAdminAccess] = useState(false);
  const [showGoogleRoleSelection, setShowGoogleRoleSelection] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);

  const userFromSupabase = (supaUser: any): User | null => {
    if (!supaUser?.id) return null;
    const role = (supaUser.user_metadata?.role as UserRole) || null;
    if (role !== 'artist' && role !== 'venue' && role !== 'admin') return null;
    return {
      id: supaUser.id,
      name:
        (supaUser.user_metadata?.name as string | undefined) ||
        (role === 'artist' ? 'Artist' : role === 'venue' ? 'Venue' : 'Admin'),
      email: (supaUser.email as string | undefined) || '',
      role,
    };
  };

  // Persist currentPage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Restore auth session and keep UI in sync across refreshes/tabs
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const nextUser = userFromSupabase(data.session?.user);
      if (nextUser) {
        setCurrentUser(nextUser);
        // Restore from localStorage if available, otherwise use dashboard
        const storedPage = localStorage.getItem('currentPage');
        if (storedPage && storedPage !== 'login') {
          // Keep the stored page if user is logged in
          setCurrentPage(storedPage);
        } else {
          // Set to appropriate dashboard if no stored page
          setCurrentPage(nextUser.role === 'artist' ? 'artist-dashboard' : 'venue-dashboard');
        }
      } else {
        setCurrentPage('login');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle OAuth sign-up - need role selection
      if (event === 'SIGNED_IN' && session?.user) {
        const userRole = (session.user.user_metadata?.role as UserRole) || null;
        
        // If user has no role, they likely just signed up with Google
        if (!userRole) {
          setGoogleUser(session.user);
          setShowGoogleRoleSelection(true);
          return;
        }
      }
      
      const nextUser = userFromSupabase(session?.user);
      setCurrentUser(nextUser);
      // Only reset page for logout; preserve all other pages during auth updates
      setCurrentPage((prevPage) => {
        if (!nextUser) {
          localStorage.removeItem('currentPage');
          return 'login';
        }
        // Keep current page if user is still logged in
        return prevPage;
      });
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Update favicon based on user role
  useEffect(() => {
    if (!currentUser) {
      // Default icon when not signed in
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.setAttribute('data-icon', 'default');
      }
    } else if (currentUser.role === 'artist') {
      // Blue palette icon for artists
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.setAttribute('data-icon', 'artist');
      }
    } else if (currentUser.role === 'venue') {
      // Green store icon for venues
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.setAttribute('data-icon', 'venue');
      }
    }
  }, [currentUser?.role]);

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

  // Role-based page access control - redirect unauthorized users
  useEffect(() => {
    if (!currentUser) return;

    const artistOnlyPages = ['artist-venues'];
    const venueOnlyPages = ['find-art', 'venue-find-artists'];

    // If artist tries to access venue-only pages, redirect to artist dashboard
    if (currentUser.role === 'artist' && venueOnlyPages.includes(currentPage)) {
      setCurrentPage('artist-dashboard');
      return;
    }

    // If venue tries to access artist-only pages, redirect to venue dashboard
    if (currentUser.role === 'venue' && artistOnlyPages.includes(currentPage)) {
      setCurrentPage('venue-dashboard');
      return;
    }
  }, [currentUser, currentPage]);

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

  const handleGoogleRoleSelection = async (role: UserRole) => {
    if (!googleUser || !role) return;
    
    try {
      // Update user metadata with selected role
      const { error } = await supabase.auth.updateUser({
        data: {
          role,
          name: googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User',
        },
      });

      if (error) throw error;

      // Provision profile
      try {
        await apiPost('/api/profile/provision', {});
      } catch (e) {
        console.warn('Profile provision failed', e);
      }

      // Update local state
      const user: User = {
        id: googleUser.id,
        name: googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User',
        email: googleUser.email || '',
        role,
      };

      // Check if phone number is missing from metadata
      const hasPhone = googleUser.user_metadata?.phone;
      
      if (!hasPhone) {
        // Show profile completion to collect phone number
        setShowProfileCompletion(true);
        setGoogleUser(googleUser); // Keep googleUser for profile completion
      } else {
        // Phone exists, proceed directly to dashboard
        setCurrentUser(user);
        setCurrentPage(role === 'artist' ? 'artist-dashboard' : 'venue-dashboard');
        setShowGoogleRoleSelection(false);
        setGoogleUser(null);
      }
    } catch (err: any) {
      console.error('Failed to set user role:', err);
    }
  };

  const handleProfileCompletionSubmit = async (phoneNumber: string) => {
    if (!googleUser) return;

    try {
      setShowProfileCompletion(false);
      
      // Update user metadata with phone number
      const { error } = await supabase.auth.updateUser({
        data: {
          ...googleUser.user_metadata,
          phone: phoneNumber,
        },
      });

      if (error) throw error;

      // Also provision the profile with phone number
      try {
        await apiPost('/api/profile/provision', { phoneNumber });
      } catch (e) {
        console.warn('Profile provision with phone failed', e);
      }

      // Now proceed to dashboard
      const role = googleUser.user_metadata?.role as UserRole;
      const user: User = {
        id: googleUser.id,
        name: googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User',
        email: googleUser.email || '',
        role,
      };

      setCurrentUser(user);
      setCurrentPage(role === 'artist' ? 'artist-dashboard' : 'venue-dashboard');
      setShowGoogleRoleSelection(false);
      setGoogleUser(null);
      setPendingPhoneNumber(null);
    } catch (err: any) {
      console.error('Failed to save phone number:', err);
      setShowProfileCompletion(true); // Show form again on error
    }
  };

  const handleProfileCompletionSkip = async () => {
    if (!googleUser) return;

    try {
      setShowProfileCompletion(false);
      
      // Proceed without phone number
      const role = googleUser.user_metadata?.role as UserRole;
      const user: User = {
        id: googleUser.id,
        name: googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User',
        email: googleUser.email || '',
        role,
      };

      setCurrentUser(user);
      setCurrentPage(role === 'artist' ? 'artist-dashboard' : 'venue-dashboard');
      setShowGoogleRoleSelection(false);
      setGoogleUser(null);
      setPendingPhoneNumber(null);
    } catch (err: any) {
      console.error('Failed to skip profile completion:', err);
    }
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

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    if (params?.userId) setSelectedArtistId(params.userId);
    if (params?.venueId) setSelectedVenueId(params.venueId);
    if (params?.artistId) setSelectedArtistId(params.artistId);
    
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
        const raw = hash.replace('#/purchase-', '');
        const pureId = raw.includes('?') ? raw.split('?')[0] : raw;
        if (pureId) setCurrentPage(`purchase-${pureId}`);
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
    // Profile Completion - Full Page
    if (showProfileCompletion && googleUser) {
      return (
        <ProfileCompletion
          email={googleUser.email || ''}
          userName={googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User'}
          onComplete={handleProfileCompletionSubmit}
          onSkip={handleProfileCompletionSkip}
        />
      );
    }

    // Google Role Selection - Full Page
    if (showGoogleRoleSelection && googleUser) {
      return (
        <div className="min-h-svh bg-gradient-to-br from-[var(--bg)] via-[var(--surface)] to-[var(--bg)] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl">
            {/* Background decorative elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 left-10 w-72 h-72 bg-[var(--blue)]/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-72 h-72 bg-[var(--green)]/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-[var(--text)] mb-4">Welcome to Artwalls!</h1>
                <p className="text-xl text-[var(--text-muted)]">Tell us about yourself to get started</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
                {/* Artist Card */}
                <button
                  onClick={() => handleGoogleRoleSelection('artist')}
                  className="group bg-[var(--blue-muted)] rounded-2xl p-8 border-2 border-[var(--blue)] hover:brightness-95 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--blue)] mb-2">I'm an Artist</h2>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        Create a beautiful portfolio, reach galleries and venues, and sell your artwork directly to collectors.
                      </p>
                    </div>
                    <div className="mt-4 px-4 py-2 bg-[var(--blue)]/20 rounded-lg">
                      <p className="text-xs font-semibold text-[var(--blue)]">Get Started</p>
                    </div>
                  </div>
                </button>

                {/* Venue Card */}
                <button
                  onClick={() => handleGoogleRoleSelection('venue')}
                  className="group bg-[var(--green-muted)] rounded-2xl p-8 border-2 border-[var(--green)] hover:brightness-95 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--green)] mb-2">I'm a Venue</h2>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        Display rotating artworks in your space, support local artists, and grow your venue's unique character.
                      </p>
                    </div>
                    <div className="mt-4 px-4 py-2 bg-[var(--green)]/20 rounded-lg">
                      <p className="text-xs font-semibold text-[var(--green)]">Get Started</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="text-center mt-12 space-y-3">
                <button
                  onClick={() => {
                    setShowGoogleRoleSelection(false);
                    setGoogleUser(null);
                    setCurrentPage('login');
                  }}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition"
                >
                  ← Back to login
                </button>
                <p className="text-xs text-[var(--text-muted)]">You can change your role later in settings</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <Login onLogin={handleLogin} onNavigate={handleNavigate} />
        {/* Password Prompt Modal */}
        {showAdminPasswordPrompt && (
          <AdminPasswordPrompt
            onVerify={handleAdminPasswordVerified}
            onCancel={handleCancelAdminPassword}
          />
        )}
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
              <AdminAnnouncements onCreateAnnouncement={() => alert('Create Announcement feature coming soon')} />
            )}
            {currentPage === 'admin-promo-codes' && (
              <AdminPromoCodes onCreatePromoCode={() => alert('Create Promo Code feature coming soon')} />
            )}
            {currentPage === 'admin-stripe-payments' && <StripePaymentSetup onNavigate={handleNavigate} />}
            {currentPage === 'admin-activity-log' && <AdminActivityLog />}
            {currentPage === 'admin-support-messages' && (
              <SupportInbox onSelectMessage={(messageId) => {
                setSelectedMessageId(messageId);
                handleNavigate('admin-support-message-detail');
              }} />
            )}
            {currentPage === 'admin-support-message-detail' && selectedMessageId && (
              <SupportMessageDetail
                messageId={selectedMessageId}
                onBack={() => handleNavigate('admin-support-messages')}
              />
            )}
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
        {currentPage === 'privacy-policy' && <PrivacyPolicy onNavigate={handleNavigate} />}
        {currentPage === 'terms-of-service' && <TermsOfService onNavigate={handleNavigate} />}
        {currentPage === 'plans-pricing' && <PricingPage onNavigate={handleNavigate} currentPlan="free" />}
        {currentPage === 'why-artwalls-artist' && (
          <WhyArtwalls userRole="artist" onNavigate={handleNavigate} onBack={() => handleNavigate('login')} />
        )}
        {currentPage === 'why-artwalls-venue' && (
          <WhyArtwalls userRole="venue" onNavigate={handleNavigate} onBack={() => handleNavigate('login')} />
        )}

        {/* Venue Growth & Exposure Pages */}
        {currentPage === 'venues-hosting-policy' && <VenueHostingPolicy onNavigate={handleNavigate} />}
        {currentPage === 'venues-apply' && <VenueApplication onNavigate={handleNavigate} />}
        {currentPage === 'venue-profile' && selectedVenueId && (
          <VenueProfilePage venueSlug={selectedVenueId} onNavigate={handleNavigate} />
        )}
        {currentPage === 'referral-program' && <ReferralProgram onNavigate={handleNavigate} />}

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
            {currentPage === 'artist-approved' && <ApplicationsAndInvitations userRole="artist" defaultTab="approved" onBack={() => handleNavigate('artist-dashboard')} />}
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
            {currentPage === 'artist-applications' && <ApplicationsAndInvitations userRole="artist" onBack={() => handleNavigate('artist-profile')} />}
            {currentPage === 'artist-invites' && (
              <ArtistInvites 
                onApply={(inviteId) => handleNavigate('artist-applications')}
                onDecline={(inviteId) => {
                  if (confirm('Are you sure you want to decline this invitation?')) {
                    console.log('Declined invite:', inviteId);
                    // TODO: API call to decline invite
                  }
                }}
                onNavigate={handleNavigate}
              />
            )}
            {currentPage === 'artist-sales' && <ArtistSales user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'artist-profile' && <ArtistProfile onNavigate={handleNavigate} />}
            {currentPage === 'artist-password-security' && <PasswordSecurity onBack={() => handleNavigate('artist-profile')} />}
            {currentPage === 'artist-notifications' && <NotificationPreferences onBack={() => handleNavigate('artist-profile')} />}
            {currentPage === 'artist-notifications-legacy' && <NotificationsList />}
          </>
        )}
        
        {currentUser.role === 'venue' && (
          <>
            {currentPage === 'venue-dashboard' && <VenueDashboard onNavigate={handleNavigate} user={currentUser} />}
            {currentPage === 'venue-setup' && <VenueSetupWizard onNavigate={handleNavigate} onComplete={() => handleNavigate('venue-dashboard')} />}
            {currentPage === 'venue-partner-kit' && <VenuePartnerKitEmbedded onNavigate={handleNavigate} />}
            {currentPage === 'venue-walls' && <VenueWalls />}
            {currentPage === 'venue-applications' && <ApplicationsAndInvitations userRole="venue" onBack={() => handleNavigate('venue-dashboard')} />}
            {currentPage === 'venue-current' && <VenueCurrentArtWithScheduling />}
            {currentPage === 'venue-sales' && <VenueSales />}
            {currentPage === 'venue-settings' && <VenueSettingsWithEmptyState />}
            {currentPage === 'venue-profile' && <VenueProfile onNavigate={handleNavigate} />}
            {currentPage === 'venue-password-security' && <VenuePasswordSecurity onBack={() => handleNavigate('venue-profile')} />}
            {currentPage === 'venue-notifications' && <VenueNotificationPreferences onBack={() => handleNavigate('venue-profile')} />}
            {currentPage === 'find-art' && <FindArtHub onNavigate={handleNavigate} />}
            {currentPage === 'venue-find-artists' && (
              <FindArtists
                onViewProfile={(artistId) => {
                  setSelectedArtistId(artistId);
                  handleNavigate('artist-view-profile');
                }}
                onInviteArtist={(artistId) => {
                  alert('Invite sent! The artist will receive a notification.');
                  console.log('Invited artist:', artistId);
                  // TODO: API call to send invitation
                }}
              />
            )}
            {currentPage === 'artist-view-profile' && selectedArtistId && (
              <ArtistProfileView
                artistId={selectedArtistId}
                isOwnProfile={false}
                currentUser={currentUser}
                onInviteToApply={() => {
                  alert('Invitation sent! The artist will be notified.');
                  // TODO: API call to send invitation to apply
                }}
              />
            )}
          </>
        )}
        
        {currentUser.role === 'admin' && (
          <>
            {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
            {currentPage === 'admin-users' && (
              <AdminUsers onViewUser={(userId: string) => handleNavigate('admin-user-detail', { userId })} />
            )}
            {currentPage === 'admin-user-detail' && <AdminUserDetail onNavigate={handleNavigate} />}
            {currentPage === 'admin-announcements' && <AdminAnnouncements onCreateAnnouncement={() => alert('Create Announcement feature coming soon')} />}
            {currentPage === 'admin-promo-codes' && <AdminPromoCodes onCreatePromoCode={() => alert('Create Promo Code feature coming soon')} />}
            {currentPage === 'admin-stripe-payments' && <StripePaymentSetup onNavigate={handleNavigate} />}
            {currentPage === 'admin-activity-log' && <AdminActivityLog />}
            {currentPage === 'admin-invites' && <AdminInvites />}
            {currentPage === 'admin-sales' && <AdminSalesPage />}
            {currentPage === 'admin-current-displays' && <AdminCurrentDisplays />}
            {currentPage === 'admin-support' && <AdminSupport />}
          </>
        )}
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
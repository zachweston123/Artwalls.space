import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { apiPost } from './lib/api';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Navigation } from './components/Navigation';
import { MobileSidebar } from './components/MobileSidebar';
import { Login } from './components/Login';
import { Footer } from './components/Footer';
import { AgreementBanner } from './components/legal/AgreementBanner';
import { ProfileCompletion } from './components/ProfileCompletion';
import { AriaLiveRegion } from './components/AriaLiveRegion';

// ─── Lazy-loaded route components ─────────────────────────────────────────────
// Each chunk is only downloaded when the corresponding page is first visited.

// Artist
const ArtistDashboard = lazy(() => import('./components/artist/ArtistDashboard').then(m => ({ default: m.ArtistDashboard })));
const ArtistArtworks = lazy(() => import('./components/artist/ArtistArtworks').then(m => ({ default: m.ArtistArtworks })));
const ArtistSales = lazy(() => import('./components/artist/ArtistSales').then(m => ({ default: m.ArtistSales })));
const ArtistProfile = lazy(() => import('./components/artist/ArtistProfile').then(m => ({ default: m.ArtistProfile })));
const ArtistProfileView = lazy(() => import('./components/artist/ArtistProfileView').then(m => ({ default: m.ArtistProfileView })));
const PasswordSecurity = lazy(() => import('./components/artist/PasswordSecurity').then(m => ({ default: m.PasswordSecurity })));
const NotificationPreferences = lazy(() => import('./components/artist/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
const ArtistInvites = lazy(() => import('./components/artist/ArtistInvites').then(m => ({ default: m.ArtistInvites })));
const ArtistInviteVenue = lazy(() => import('./components/artist/ArtistInviteVenue').then(m => ({ default: m.ArtistInviteVenue })));
const ArtistReferrals = lazy(() => import('./components/artist/ArtistReferrals').then(m => ({ default: m.ArtistReferrals })));
const ArtistAnalytics = lazy(() => import('./components/artist/ArtistAnalytics').then(m => ({ default: m.ArtistAnalytics })));
const ArtistOnboardingWizard = lazy(() => import('./components/onboarding/ArtistOnboardingWizard').then(m => ({ default: m.ArtistOnboardingWizard })));
const CuratedSets = lazy(() => import('./components/artist/CuratedSets').then(m => ({ default: m.CuratedSets })));
const FindVenues = lazy(() => import('./components/artist/FindVenues').then(m => ({ default: m.FindVenues })));

// Venue
const VenueDashboard = lazy(() => import('./components/venue/VenueDashboard').then(m => ({ default: m.VenueDashboard })));
const VenueWalls = lazy(() => import('./components/venue/VenueWalls').then(m => ({ default: m.VenueWalls })));
const VenueCurrentArtWithScheduling = lazy(() => import('./components/venue/VenueCurrentArtWithScheduling').then(m => ({ default: m.VenueCurrentArtWithScheduling })));
const VenueSales = lazy(() => import('./components/venue/VenueSales').then(m => ({ default: m.VenueSales })));
const VenueSettingsWithEmptyState = lazy(() => import('./components/venue/VenueSettingsWithEmptyState').then(m => ({ default: m.VenueSettingsWithEmptyState })));
const VenueProfile = lazy(() => import('./components/venue/VenueProfile').then(m => ({ default: m.VenueProfile })));
const VenueProfileView = lazy(() => import('./components/venue/VenueProfileView').then(m => ({ default: m.VenueProfileView })));
const VenuePasswordSecurity = lazy(() => import('./components/venue/VenuePasswordSecurity').then(m => ({ default: m.VenuePasswordSecurity })));
const VenueNotificationPreferences = lazy(() => import('./components/venue/VenueNotificationPreferences').then(m => ({ default: m.VenueNotificationPreferences })));
const VenueWallsPublic = lazy(() => import('./components/venue/VenueWallsPublic').then(m => ({ default: m.VenueWallsPublic })));
const FindArtists = lazy(() => import('./components/venue/FindArtists').then(m => ({ default: m.FindArtists })));
const VenueProfilePage = lazy(() => import('./components/venue/VenueProfilePage').then(m => ({ default: m.VenueProfilePage })));
const FindArtHub = lazy(() => import('./components/venue/FindArtHub').then(m => ({ default: m.FindArtHub })));
const CuratedSetsMarketplace = lazy(() => import('./components/venue/CuratedSetsMarketplace').then(m => ({ default: m.CuratedSetsMarketplace })));
const VenuePartnerKitEmbedded = lazy(() => import('./components/venue/VenuePartnerKitEmbedded').then(m => ({ default: m.VenuePartnerKitEmbedded })));
const VenueSetupWizard = lazy(() => import('./components/venue/VenueSetupWizard').then(m => ({ default: m.VenueSetupWizard })));
const VenueHostingPolicy = lazy(() => import('./components/venue/VenueHostingPolicy').then(m => ({ default: m.VenueHostingPolicy })));
const VenueApplication = lazy(() => import('./components/venue/VenueApplication').then(m => ({ default: m.VenueApplication })));
const ReferralProgram = lazy(() => import('./components/venue/ReferralProgram').then(m => ({ default: m.ReferralProgram })));
const VenueCalls = lazy(() => import('./components/venue/VenueCalls').then(m => ({ default: m.VenueCalls })));
const VenueCallDetail = lazy(() => import('./components/venue/VenueCallDetail').then(m => ({ default: m.VenueCallDetail })));
const VenueAnalytics = lazy(() => import('./components/venue/VenueAnalytics').then(m => ({ default: m.VenueAnalytics })));
const VenueWallStats = lazy(() => import('./components/venue/VenueWallStats').then(m => ({ default: m.VenueWallStats })));
const VenuePerformance = lazy(() => import('./components/venue/VenuePerformance').then(m => ({ default: m.VenuePerformance })));
const VenueStatement = lazy(() => import('./components/venue/VenueStatement').then(m => ({ default: m.VenueStatement })));

// Shared
const ApplicationsAndInvitations = lazy(() => import('./components/shared/ApplicationsAndInvitations').then(m => ({ default: m.ApplicationsAndInvitations })));
const NotificationsList = lazy(() => import('./components/notifications/NotificationsList').then(m => ({ default: m.NotificationsList })));
const RoleMismatchPage = lazy(() => import('./components/shared/RoleMismatchPage').then(m => ({ default: m.RoleMismatchPage })));
const Settings = lazy(() => import('./components/settings/Settings').then(m => ({ default: m.Settings })));

// Pages
const WhyArtwallsArtistsPage = lazy(() => import('./pages/WhyArtwallsArtists').then(m => ({ default: m.WhyArtwallsArtistsPage })));
const VenuesLandingPage = lazy(() => import('./pages/VenuesLanding').then(m => ({ default: m.VenuesLandingPage })));
const PublicArtistProfilePage = lazy(() => import('./pages/public/PublicArtistProfilePage').then(m => ({ default: m.PublicArtistProfilePage })));
const PublicArtistPage = lazy(() => import('./pages/PublicArtistPage').then(m => ({ default: m.PublicArtistPage })));
const PublicArtistSetPage = lazy(() => import('./pages/PublicArtistSetPage').then(m => ({ default: m.PublicArtistSetPage })));
const PublicVenuePage = lazy(() => import('./pages/PublicVenuePage').then(m => ({ default: m.PublicVenuePage })));
const FindCitySelector = lazy(() => import('./pages/FindCitySelector').then(m => ({ default: m.FindCitySelector })));
const CityVenueMap = lazy(() => import('./pages/CityVenueMap').then(m => ({ default: m.CityVenueMap })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VenueInviteLanding = lazy(() => import('./pages/VenueInviteLanding'));
const VenueSignup = lazy(() => import('./pages/VenueSignup'));
const PurchasePage = lazy(() => import('./components/PurchasePage').then(m => ({ default: m.PurchasePage })));

// Legal
const PoliciesLanding = lazy(() => import('./components/legal/PoliciesLanding').then(m => ({ default: m.PoliciesLanding })));
const ArtistAgreement = lazy(() => import('./components/legal/ArtistAgreement').then(m => ({ default: m.ArtistAgreement })));
const VenueAgreement = lazy(() => import('./components/legal/VenueAgreement').then(m => ({ default: m.VenueAgreement })));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./components/legal/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PricingPage = lazy(() => import('./components/pricing/PricingPage').then(m => ({ default: m.PricingPage })));

// Calls
const CallPublicPage = lazy(() => import('./components/calls/CallPublicPage').then(m => ({ default: m.CallPublicPage })));
const CallApplyPage = lazy(() => import('./components/calls/CallApplyPage').then(m => ({ default: m.CallApplyPage })));

// Admin
const AdminSidebar = lazy(() => import('./components/admin/AdminSidebar').then(m => ({ default: m.AdminSidebar })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminWallProductivity = lazy(() => import('./components/admin/AdminWallProductivity').then(m => ({ default: m.AdminWallProductivity })));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminUserDetail = lazy(() => import('./components/admin/AdminUserDetail').then(m => ({ default: m.AdminUserDetail })));
const AdminAnnouncements = lazy(() => import('./components/admin/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })));
const AdminPromoCodes = lazy(() => import('./components/admin/AdminPromoCodes').then(m => ({ default: m.AdminPromoCodes })));
const AdminActivityLog = lazy(() => import('./components/admin/AdminActivityLog').then(m => ({ default: m.AdminActivityLog })));
const AdminInvites = lazy(() => import('./components/admin/AdminInvites').then(m => ({ default: m.AdminInvites })));
const AdminReferrals = lazy(() => import('./components/admin/AdminReferrals').then(m => ({ default: m.AdminReferrals })));
const AdminSalesPage = lazy(() => import('./components/admin/AdminSales').then(m => ({ default: m.AdminSales })));
const AdminCurrentDisplays = lazy(() => import('./components/admin/AdminCurrentDisplays').then(m => ({ default: m.AdminCurrentDisplays })));
const AdminSupport = lazy(() => import('./components/admin/AdminSupport').then(m => ({ default: m.AdminSupport })));
const StripePaymentSetup = lazy(() => import('./components/admin/StripePaymentSetup').then(m => ({ default: m.StripePaymentSetup })));
const SupportInbox = lazy(() => import('./components/admin/SupportInbox').then(m => ({ default: m.SupportInbox })));
const SupportMessageDetail = lazy(() => import('./components/admin/SupportMessageDetail').then(m => ({ default: m.SupportMessageDetail })));

// Suspense loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--blue)]" />
  </div>
);

export type UserRole = 'artist' | 'venue' | 'admin' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export default function App() {
  const normalizePage = (page: string) => (page === 'venue-profile-edit' ? 'venue-profile' : page);

  // Helper: check if a page belongs to the admin console
  const isAdminPage = (page: string) => page.startsWith('admin-');
  // Helper: given a role, return the default dashboard page
  const defaultDashboardForRole = (role: UserRole) =>
    role === 'admin' ? 'admin-dashboard'
    : role === 'venue' ? 'venue-dashboard'
    : 'artist-dashboard';

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>(() => {
    // Try to restore page from localStorage, default to 'login'
    return normalizePage(localStorage.getItem('currentPage') || 'login');
  });
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [publicArtistSlugOrId, setPublicArtistSlugOrId] = useState<string | null>(null);
  const [publicArtistUid, setPublicArtistUid] = useState<string | null>(null);
  const [publicArtistView, setPublicArtistView] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState<boolean | null>(null);
  const [showGoogleRoleSelection, setShowGoogleRoleSelection] = useState(false);
  const [googleUser, setGoogleUser] = useState<SupabaseUser | null>(null);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [artistOnboarding, setArtistOnboarding] = useState<{ completed: boolean; step: number | null } | null>(null);
  const [roleMismatch, setRoleMismatch] = useState<{ current: 'artist' | 'venue'; required: 'artist' | 'venue' } | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [artistSubscriptionTier, setArtistSubscriptionTier] = useState<'free' | 'starter' | 'growth' | 'pro'>('free');

  const ARTIST_ONBOARDING_SNOOZE_KEY = 'artistOnboardingSkipUntil';

  const marketingPages = new Set(['why-artwalls-artist', 'why-artwalls-venue', 'venues']);
  const legalPages = new Set(['privacy-policy', 'terms-of-service', 'policies', 'artist-agreement', 'venue-agreement']);

  const getPageFromPath = (path: string) => {
    const normalized = path.toLowerCase();
    if (normalized === '/why-artwalls' || normalized === '/why-artwalls/artists') return 'why-artwalls-artist';
    if (normalized === '/venues' || normalized === '/venue/login' || normalized === '/why-artwalls/venues') return 'venues';
    if (normalized === '/onboarding/artist') return 'artist-onboarding';
    if (normalized === '/privacy-policy') return 'privacy-policy';
    if (normalized === '/terms-of-service') return 'terms-of-service';
    if (normalized === '/policies') return 'policies';
    if (normalized === '/artist-agreement') return 'artist-agreement';
    if (normalized === '/venue-agreement') return 'venue-agreement';
    return null;
  };

  const getPathFromPage = (page: string) => {
    if (page === 'why-artwalls-artist') return '/why-artwalls';
    if (page === 'why-artwalls-venue' || page === 'venues') return '/venues';
    if (page === 'artist-onboarding') return '/onboarding/artist';
    if (page === 'privacy-policy') return '/privacy-policy';
    if (page === 'terms-of-service') return '/terms-of-service';
    if (page === 'policies') return '/policies';
    if (page === 'artist-agreement') return '/artist-agreement';
    if (page === 'venue-agreement') return '/venue-agreement';
    return null;
  };

  // Sync /artists/ URL paths into SPA state for authenticated users.
  // This handles direct links, page refresh, and browser back/forward.
  // Placed before early-return route overrides to avoid hooks-order violations.
  useEffect(() => {
    if (!currentUser) return;
    if (typeof window === 'undefined') return;
    if (!window.location.pathname.startsWith('/artists/')) return;
    const parts = window.location.pathname.split('/').filter(Boolean);
    const slugOrId = parts[1] || '';
    const isSetDetail = parts[2] === 'sets' && !!parts[3];
    const targetPage = isSetDetail ? 'public-artist-set' : 'public-artist-profile';
    if (publicArtistSlugOrId !== slugOrId || currentPage !== targetPage) {
      const urlParams = new URLSearchParams(window.location.search);
      setPublicArtistSlugOrId(slugOrId);
      setPublicArtistUid(urlParams.get('uid') || null);
      setPublicArtistView(urlParams.get('view') || null);
      setCurrentPage(targetPage);
    }
  }, [currentUser, currentPage, publicArtistSlugOrId]);

  // Route overrides are now handled after all hooks (see bottom of component)
  // to avoid React hooks ordering violations.

  // SECURITY: Admin role is determined server-side via user_metadata.role
  // which is set by the Worker's /api/admin/verify endpoint.
  // DO NOT hardcode admin emails in frontend code.

  const userFromSupabase = (supaUser: SupabaseUser | null | undefined): User | null => {
    if (!supaUser?.id) return null;
    const rawRole = (supaUser.user_metadata?.role as string | undefined | null);
    // Trust user_metadata.role which is set by the backend (Worker sets it
    // via supabaseAdmin.auth.admin.updateUserById during /api/admin/verify).
    // Default to 'artist' when role metadata is missing (e.g. Google OAuth sign-up).
    const role: UserRole = (rawRole === 'venue' || rawRole === 'admin') ? rawRole : 'artist';
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

  // ─── Global scroll-to-top on page change ──────────────────────────────────
  // When the "page" (currentPage) changes, scroll to the top so every internal
  // navigation behaves like a traditional page load.  We use `behavior: 'auto'`
  // (instant) so the user isn't waiting for a smooth scroll while new content
  // is already rendered.  Hash-only changes within the purchase QR flow do NOT
  // change currentPage, so they are unaffected.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
          // If the user is admin but the stored page isn't an admin page,
          // redirect to admin-dashboard (prevents blank content area).
          if (nextUser.role === 'admin' && !isAdminPage(storedPage)) {
            setCurrentPage('admin-dashboard');
          } else {
            setCurrentPage(normalizePage(storedPage));
          }
        } else {
          // Set to appropriate dashboard if no stored page
          setCurrentPage(defaultDashboardForRole(nextUser.role));
        }
      } else {
        const pageFromPath = getPageFromPath(window.location.pathname);
        setCurrentPage(normalizePage(pageFromPath || 'login'));
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
          const pageFromPath = getPageFromPath(window.location.pathname);
          return normalizePage(pageFromPath || 'login');
        }
        // If user is admin but current page isn't an admin page, redirect
        if (nextUser.role === 'admin' && !isAdminPage(prevPage)) {
          return 'admin-dashboard';
        }
        // Keep current page if user is still logged in
        return normalizePage(prevPage);
      });
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Check if user has accepted the agreement
  useEffect(() => {
    async function checkAgreementStatus() {
      if (!currentUser) return;
      
      // Admin doesn't need to accept agreements
      if (currentUser.role === 'admin') {
        setHasAcceptedAgreement(true);
        return;
      }

      const table = currentUser.role === 'artist' ? 'artists' : 'venues';
      
      const { data, error } = await supabase
        .from(table)
        .select('agreement_accepted_at')
        .eq('id', currentUser.id)
        .single();
        
      if (!error && data?.agreement_accepted_at) {
        setHasAcceptedAgreement(true);
      } else {
        setHasAcceptedAgreement(false);
      }
    }
    
    checkAgreementStatus();
  }, [currentUser]);

  // Fetch the artist's subscription tier from Supabase
  useEffect(() => {
    let mounted = true;
    async function fetchSubscriptionTier() {
      if (!currentUser || currentUser.role !== 'artist') {
        if (mounted) setArtistSubscriptionTier('free');
        return;
      }

      // Detect if user just returned from Stripe Checkout (webhook race condition).
      // The redirect lands on /#/artist-dashboard?sub=success but the webhook may
      // not have processed yet — poll a few times with back-off.
      const hash = window.location.hash || '';
      const hashQuery = hash.split('?')[1] || '';
      const isSubSuccess = new URLSearchParams(hashQuery).get('sub') === 'success';
      const maxAttempts = isSubSuccess ? 5 : 1;
      const delayMs = [0, 1500, 3000, 4000, 5000]; // back-off delays

      for (let attempt = 0; attempt < maxAttempts && mounted; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, delayMs[attempt] ?? 3000));
          if (!mounted) return;
        }
        try {
          const { data, error } = await supabase
            .from('artists')
            .select('subscription_tier')
            .eq('id', currentUser.id)
            .single();
          if (!error && data?.subscription_tier && mounted) {
            const tier = data.subscription_tier as string;
            if (tier === 'starter' || tier === 'growth' || tier === 'pro') {
              setArtistSubscriptionTier(tier);
              return; // paid tier confirmed, stop polling
            } else {
              setArtistSubscriptionTier('free');
            }
          }
        } catch {
          // Silently fall back to 'free'
        }
      }
    }
    fetchSubscriptionTier();
    return () => { mounted = false; };
  }, [currentUser]);

  const getArtistOnboardingSnoozeUntil = () => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ARTIST_ONBOARDING_SNOOZE_KEY);
    if (!raw) return null;
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? ts : null;
  };

  const isArtistOnboardingSnoozed = () => {
    const until = getArtistOnboardingSnoozeUntil();
    return until !== null && until > Date.now();
  };

  const snoozeArtistOnboarding = () => {
    if (typeof window === 'undefined') return;
    const until = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    localStorage.setItem(ARTIST_ONBOARDING_SNOOZE_KEY, until);
  };

  const _clearArtistOnboardingSnooze = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ARTIST_ONBOARDING_SNOOZE_KEY);
  };

  useEffect(() => {
    let isActive = true;
    async function loadArtistOnboarding() {
      if (!currentUser || currentUser.role !== 'artist') {
        if (isActive) setArtistOnboarding(null);
        return;
      }

      const { data, error } = await supabase
        .from('artists')
        .select('onboarding_completed,onboarding_step')
        .eq('id', currentUser.id)
        .single();

      if (!isActive) return;
      if (error) {
        console.warn('Failed to load onboarding status', error);
        return;
      }

      setArtistOnboarding({
        completed: !!data?.onboarding_completed,
        step: data?.onboarding_step ?? 1,
      });
    }

    loadArtistOnboarding();
    return () => {
      isActive = false;
    };
  }, [currentUser]);

  // Fetch unread notification count for nav badge
  useEffect(() => {
    let isMounted = true;
    async function fetchUnread() {
      if (!currentUser) { setUnreadNotificationCount(0); return; }
      try {
        const { notifications } = await (await import('./lib/api')).getMyNotifications(currentUser.id, currentUser.role || '');
        if (!isMounted) return;
        setUnreadNotificationCount((notifications || []).filter(n => !n.isRead).length);
      } catch {
        if (isMounted) setUnreadNotificationCount(0);
      }
    }
    fetchUnread();
    return () => { isMounted = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'artist') return;
    if (!artistOnboarding || artistOnboarding.completed) return;
    if (isArtistOnboardingSnoozed()) return;
    if (currentPage === 'artist-onboarding') return;

    setCurrentPage('artist-onboarding');
    const path = getPathFromPage('artist-onboarding');
    if (path && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, [artistOnboarding, currentUser, currentPage]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'artist' && (currentPage === 'venues' || currentPage === 'why-artwalls-venue')) {
      setCurrentPage('why-artwalls-artist');
    }
    if (currentUser.role === 'venue' && currentPage === 'why-artwalls-artist') {
      setCurrentPage('venues');
    }
  }, [currentUser, currentPage]);

  const handleAgreementAccept = async () => {
    if (!currentUser) return;
    
    // Optimistic update
    setHasAcceptedAgreement(true);

    const table = currentUser.role === 'artist' ? 'artists' : 'venues';
    
    try {
      const { error } = await supabase
        .from(table)
        .update({ agreement_accepted_at: new Date().toISOString() })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error recording agreement acceptance:', error);
        // Revert on error
        setHasAcceptedAgreement(false);
      }
    } catch (err) {
      console.error('Error recording agreement acceptance:', err);
      setHasAcceptedAgreement(false);
    }
  };

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

  const handleLogin = (user: User) => {
    // Trust the role determined by Login.tsx (which reads user_metadata.role set
    // by the Worker).  No client-side admin email list.
    const effectiveUser: User = user;
    setCurrentUser(effectiveUser);
    setCurrentPage(defaultDashboardForRole(effectiveUser.role));
  };

  // Venue signup early return moved below all hooks (see render section)

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

  // Role-based page access control — show friendly mismatch page
  useEffect(() => {
    if (!currentUser) return;
    setRoleMismatch(null); // Reset on every page change

    const artistOnlyPages = ['artist-venues', 'artist-artworks', 'artist-sales', 'artist-profile', 'artist-curated-sets', 'artist-analytics'];
    const venueOnlyPages = ['find-art', 'venue-find-artists', 'venue-walls', 'venue-current', 'venue-calls'];

    if (currentUser.role === 'artist' && venueOnlyPages.includes(currentPage)) {
      setRoleMismatch({ current: 'artist', required: 'venue' });
      return;
    }

    if (currentUser.role === 'venue' && artistOnlyPages.includes(currentPage)) {
      setRoleMismatch({ current: 'venue', required: 'artist' });
      return;
    }
  }, [currentUser, currentPage]);

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

      // Update local state — trust server-assigned role in user_metadata
      const effectiveRole: UserRole = (googleUser.user_metadata?.role as string) === 'admin' ? 'admin' : role;
      const user: User = {
        id: googleUser.id,
        name: googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User',
        email: googleUser.email || '',
        role: effectiveRole,
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
        setCurrentPage(defaultDashboardForRole(effectiveRole));
        setShowGoogleRoleSelection(false);
        setGoogleUser(null);
      }
    } catch (err: unknown) {
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

      // Now proceed to dashboard — trust server-assigned admin role
      const rawRole = googleUser.user_metadata?.role as UserRole;
      const effectiveRole: UserRole = rawRole === 'admin' ? 'admin' : rawRole;
      const user: User = {
        id: googleUser.id,
        name: googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User',
        email: googleUser.email || '',
        role: effectiveRole,
      };

      setCurrentUser(user);
      setCurrentPage(defaultDashboardForRole(effectiveRole));
      setShowGoogleRoleSelection(false);
      setGoogleUser(null);
      setPendingPhoneNumber(null);
    } catch (err: unknown) {
      console.error('Failed to save phone number:', err);
      setShowProfileCompletion(true); // Show form again on error
    }
  };

  const handleProfileCompletionSkip = async () => {
    if (!googleUser) return;

    try {
      setShowProfileCompletion(false);
      
      // Proceed without phone number — trust server-assigned admin role
      const rawRole = googleUser.user_metadata?.role as UserRole;
      const effectiveRole: UserRole = rawRole === 'admin' ? 'admin' : rawRole;
      const user: User = {
        id: googleUser.id,
        name: googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'User',
        email: googleUser.email || '',
        role: effectiveRole,
      };

      setCurrentUser(user);
      setCurrentPage(defaultDashboardForRole(effectiveRole));
      setShowGoogleRoleSelection(false);
      setGoogleUser(null);
      setPendingPhoneNumber(null);
    } catch (err: unknown) {
      console.error('Failed to skip profile completion:', err);
    }
  };

  const handleLogout = async () => {
    const isAdmin = currentUser?.role === 'admin';
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('currentPage');
        if (isAdmin) {
          localStorage.removeItem('adminPassword');
          sessionStorage.removeItem('adminPassword');
          sessionStorage.removeItem('adminSessionToken');
        }
      } catch {}
    }
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out failed', err);
    }
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page: string, params?: { userId?: string; venueId?: string; artistId?: string; callId?: string; artistSlugOrId?: string }) => {
    // Handle /p/artist/ navigation — full page load to the public profile
    if (page.startsWith('/p/artist/')) {
      window.location.href = page;
      return;
    }

    // Handle URL-based navigation
    if (page.startsWith('/artists/')) {
      const url = new URL(page, window.location.origin);
      const parts = url.pathname.split('/').filter(Boolean);
      const slugOrId = parts[1] || '';
      const isSetDetail = parts[2] === 'sets' && !!parts[3];

      setPublicArtistSlugOrId(slugOrId);
      setPublicArtistUid(url.searchParams.get('uid'));
      setPublicArtistView(url.searchParams.get('view'));
      setCurrentPage(isSetDetail ? 'public-artist-set' : 'public-artist-profile');
      window.history.pushState({}, '', page); // Keep URL for deep linking
      return;
    }

    const nextPage = normalizePage(page);

    // When navigating away from /artists/ paths, clear the URL so the
    // useEffect sync-from-URL doesn't fight the navigation.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/artists/')) {
      window.history.replaceState({}, '', '/');
    }

    // Block venue users from accessing artist-only pages
    if (nextPage === 'plans-pricing' && currentUser?.role === 'venue') {
      setCurrentPage('venue-dashboard');
      return;
    }

    setCurrentPage(nextPage);
    if (params?.userId) setSelectedArtistId(params.userId);
    if (params?.venueId) setSelectedVenueId(params.venueId);
    if (params?.artistId) setSelectedArtistId(params.artistId);
    if (params?.callId) setSelectedCallId(params.callId);
    if (params?.artistSlugOrId) setPublicArtistSlugOrId(params.artistSlugOrId);

    const nextPath = getPathFromPage(nextPage);
    if (nextPath) {
      window.history.pushState({}, '', nextPath);
    } else if (getPageFromPath(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }

    if (nextPage.startsWith('purchase-')) {
      const artworkId = nextPage.replace(/^purchase-/, '');
      window.location.hash = `#/purchase-${artworkId}`;
    } else if (window.location.hash) {
      // Clear hash for non-purchase pages
      window.location.hash = '';
    }
  };

  useEffect(() => {
    const syncPath = () => {
      const page = getPageFromPath(window.location.pathname);
      if (page) setCurrentPage(page);
    };
    syncPath();
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  // Initialize from URL hash (QR deep link / Stripe return) and keep in sync
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#/purchase-')) {
        const raw = hash.replace('#/purchase-', '');
        const pureId = raw.includes('?') ? raw.split('?')[0] : raw;
        if (pureId) setCurrentPage(`purchase-${pureId}`);
      } else if (hash.startsWith('#/artist-dashboard')) {
        // Handle Stripe Checkout return: /#/artist-dashboard?sub=success|cancel
        setCurrentPage('artist-dashboard');
      } else if (hash.startsWith('#/venue-dashboard')) {
        // Handle Stripe Connect return: /#/venue-dashboard?stripe=return|refresh
        setCurrentPage('venue-dashboard');
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Route overrides — placed AFTER all hooks to satisfy Rules of Hooks
  // ═══════════════════════════════════════════════════════════════════════════

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // Direct-route override for email verification page
  if (pathname === '/verify-email') {
    return <Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>;
  }

  // Direct-route override for password reset page
  if (pathname === '/reset-password') {
    return (
      <Suspense fallback={<PageLoader />}>
      <ResetPassword 
        onSuccess={() => {
          setCurrentPage('login');
          window.history.pushState({}, '', '/');
        }}
        onBackToLogin={() => {
          setCurrentPage('login');
          window.history.pushState({}, '', '/');
        }}
      />
      </Suspense>
    );
  }

  // Direct-route override for venue invite landing page
  if (pathname.startsWith('/v/invite/')) {
    return <Suspense fallback={<PageLoader />}><VenueInviteLanding /></Suspense>;
  }

  // Direct-route override for calls pages
  if (pathname.startsWith('/calls/')) {
    const parts = pathname.split('/').filter(Boolean);
    const callId = parts[1] || '';
    const isApply = parts[2] === 'apply';
    return <Suspense fallback={<PageLoader />}>{isApply ? <CallApplyPage callId={callId} /> : <CallPublicPage callId={callId} />}</Suspense>;
  }

  // /p/artist/:slug — guaranteed-public artist profile
  if (pathname.startsWith('/p/artist/')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[2] || '';
    if (slug) {
      return <Suspense fallback={<PageLoader />}><PublicArtistProfilePage slug={slug} /></Suspense>;
    }
  }

  // /artists/:slugOrId — public artist pages (unauthenticated)
  if (pathname.startsWith('/artists/') && !currentUser) {
    const parts = pathname.split('/').filter(Boolean);
    const slugOrId = parts[1] || '';
    const isSetDetail = parts[2] === 'sets' && !!parts[3];

    if (isSetDetail) {
      const setId = parts[3];
      return <Suspense fallback={<PageLoader />}><PublicArtistSetPage slugOrId={slugOrId} setId={setId} /></Suspense>;
    }
    return (
      <div className="min-h-screen">
        <Navigation
          user={null}
          onNavigate={handleNavigate}
          onLogout={() => {}}
          currentPage="public-artist-profile"
        />
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <Suspense fallback={<PageLoader />}>
          <PublicArtistPage slugOrId={slugOrId} onNavigate={handleNavigate} />
          </Suspense>
        </main>
        <Footer onNavigate={handleNavigate} />
      </div>
    );
  }

  // /venues/:venueId — public venue page
  if (pathname.startsWith('/venues/')) {
    const parts = pathname.split('/').filter(Boolean);
    const venueId = parts[1] || '';
    return <Suspense fallback={<PageLoader />}><PublicVenuePage venueId={venueId} /></Suspense>;
  }

  // /find — city selector (public venue map entry point)
  if (pathname === '/find' || pathname === '/find/') {
    return <Suspense fallback={<PageLoader />}><FindCitySelector onNavigate={handleNavigate} /></Suspense>;
  }

  // /find/:citySlug — city venue map (map + list split view)
  if (pathname.startsWith('/find/')) {
    const parts = pathname.split('/').filter(Boolean);
    const citySlug = parts[1] || '';
    if (citySlug) {
      return <Suspense fallback={<PageLoader />}><CityVenueMap citySlug={citySlug} /></Suspense>;
    }
  }

  // /venue/signup — venue signup page
  if (pathname.startsWith('/venue/signup')) {
    return <Suspense fallback={<PageLoader />}><VenueSignup onLogin={handleLogin} onNavigate={handleNavigate} /></Suspense>;
  }

  // Check if this is a purchase page (QR code flow)
  if (currentPage.startsWith('purchase-')) {
    const artworkId = currentPage.replace(/^purchase-/, '');
    return <Suspense fallback={<PageLoader />}><PurchasePage artworkId={artworkId} onBack={() => setCurrentPage('login')} onNavigate={handleNavigate} /></Suspense>;
  }

  if (!currentUser) {
    const isMarketingPage = marketingPages.has(currentPage);
    const isLegalPage = legalPages.has(currentPage);

    if (isMarketingPage) {
      const showArtistsPage = currentPage === 'why-artwalls-artist';
      const showVenuesPage = currentPage === 'venues' || currentPage === 'why-artwalls-venue';

      return (
        <div className="min-h-screen">
          <Navigation
            user={null}
            onNavigate={handleNavigate}
            onLogout={() => {}}
            currentPage={currentPage}
          />

          <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <Suspense fallback={<PageLoader />}>
            {showArtistsPage && <WhyArtwallsArtistsPage onNavigate={handleNavigate} viewerRole={null} />}
            {showVenuesPage && (
              <VenuesLandingPage onNavigate={handleNavigate} onLogin={handleLogin} viewerRole={null} />
            )}
            </Suspense>
          </main>
          <Footer onNavigate={handleNavigate} />
        </div>
      );
    }

    // Legal pages — accessible without authentication (required for Google OAuth consent)
    if (isLegalPage) {
      return (
        <div className="min-h-screen flex flex-col">
          <Navigation
            user={null}
            onNavigate={handleNavigate}
            onLogout={() => {}}
            currentPage={currentPage}
          />

          <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
            <Suspense fallback={<PageLoader />}>
              {currentPage === 'policies' && <PoliciesLanding onNavigate={handleNavigate} />}
              {currentPage === 'privacy-policy' && <PrivacyPolicy onNavigate={handleNavigate} />}
              {currentPage === 'terms-of-service' && <TermsOfService onNavigate={handleNavigate} />}
              {currentPage === 'artist-agreement' && <ArtistAgreement onNavigate={handleNavigate} />}
              {currentPage === 'venue-agreement' && <VenueAgreement onNavigate={handleNavigate} />}
            </Suspense>
          </main>
          <Footer onNavigate={handleNavigate} />
        </div>
      );
    }

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
                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-4">Welcome to Artwalls!</h1>
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
      <div className="min-h-screen flex flex-col bg-[var(--bg)]">
        <div className="flex-1">
          {currentPage === 'forgot-password' ? (
            <Suspense fallback={<PageLoader />}><ForgotPassword onBack={() => setCurrentPage('login')} /></Suspense>
          ) : (
            <Login onLogin={handleLogin} onNavigate={handleNavigate} />
          )}
        </div>
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
            <p className="text-center sm:text-left">© 2026 Artwalls. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a
                href="/privacy-policy"
                onClick={(e) => { e.preventDefault(); handleNavigate('privacy-policy'); }}
                className="hover:text-[var(--text)] transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                onClick={(e) => { e.preventDefault(); handleNavigate('terms-of-service'); }}
                className="hover:text-[var(--text)] transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/policies"
                onClick={(e) => { e.preventDefault(); handleNavigate('policies'); }}
                className="hover:text-[var(--text)] transition-colors"
              >
                Policies
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Console Layout (different from main app)
  if (currentUser.role === 'admin') {
    return (
      <Suspense fallback={<PageLoader />}>
      <div className="flex min-h-screen">
        <AdminSidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          userName={currentUser.name}
          userEmail={currentUser.email}
        />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-8 overflow-y-auto">
            {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
            {currentPage === 'admin-wall-productivity' && <AdminWallProductivity onNavigate={handleNavigate} />}
            {currentPage === 'admin-users' && (
              <AdminUsers onViewUser={(_userId) => handleNavigate('admin-user-detail')} />
            )}
            {currentPage === 'admin-user-detail' && (
              <AdminUserDetail userId="1" onBack={() => handleNavigate('admin-users')} />
            )}
            {currentPage === 'admin-announcements' && <AdminAnnouncements />}
            {currentPage === 'admin-promo-codes' && (
              <AdminPromoCodes />
            )}
            {currentPage === 'admin-stripe-payments' && <StripePaymentSetup onNavigate={handleNavigate} />}
            {currentPage === 'admin-activity-log' && <AdminActivityLog />}
            {currentPage === 'admin-invites' && <AdminInvites />}
            {currentPage === 'admin-referrals' && <AdminReferrals />}
            {currentPage === 'admin-sales' && <AdminSalesPage />}
            {currentPage === 'admin-current-displays' && <AdminCurrentDisplays />}
            {currentPage === 'admin-support' && <AdminSupport />}
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
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
    <AriaLiveRegion />
    <div className="min-h-screen">
      <Navigation 
        user={currentUser} 
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        currentPage={currentPage}
        onMenuClick={() => setIsSidebarOpen(true)}
        unreadCount={unreadNotificationCount}
      />
      
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={currentUser}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        currentPage={currentPage}
      />
      
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Background is controlled by system dark mode preference set on html/body */}
        {/* Agreement Banner */}
        {hasAcceptedAgreement === false && 
         !['policies', 'artist-agreement', 'venue-agreement'].includes(currentPage) && (
          <AgreementBanner 
            role={currentUser.role as 'artist' | 'venue'} 
            onNavigate={handleNavigate}
          />
        )}

        <Suspense fallback={<PageLoader />}>

        {/* Legal Pages (available to both roles) */}
        {currentPage === 'policies' && <PoliciesLanding onNavigate={handleNavigate} />}
        {currentPage === 'privacy-policy' && <PrivacyPolicy onNavigate={handleNavigate} />}
        {currentPage === 'terms-of-service' && <TermsOfService onNavigate={handleNavigate} />}
        {currentPage === 'plans-pricing' && currentUser.role === 'artist' && (
          <PricingPage onNavigate={handleNavigate} currentPlan={artistSubscriptionTier} />
        )}
        {currentPage === 'why-artwalls-artist' && (
          <WhyArtwallsArtistsPage onNavigate={handleNavigate} viewerRole={currentUser.role} />
        )}
        {(currentPage === 'why-artwalls-venue' || currentPage === 'venues') && (
          <VenuesLandingPage onNavigate={handleNavigate} viewerRole={currentUser.role} />
        )}

        {/* Venue Growth & Exposure Pages */}
        {currentPage === 'venues-hosting-policy' && <VenueHostingPolicy onNavigate={handleNavigate} />}
        {currentPage === 'venues-apply' && <VenueApplication onNavigate={handleNavigate} />}
        {currentPage === 'venue-profile' && selectedVenueId && (
          <VenueProfilePage venueSlug={selectedVenueId} onNavigate={handleNavigate} />
        )}
        {currentPage === 'referral-program' && <ReferralProgram onNavigate={handleNavigate} />}

        {/* Public artist profile (rendered inside app shell for authenticated users) */}
        {currentPage === 'public-artist-profile' && publicArtistSlugOrId && (
          <PublicArtistPage slugOrId={publicArtistSlugOrId} uid={publicArtistUid} viewMode={publicArtistView} onNavigate={handleNavigate} />
        )}

        {currentPage === 'artist-agreement' && (
          <ArtistAgreement 
            onNavigate={handleNavigate}
            onAccept={() => handleAgreementAccept()}
            hasAccepted={!!hasAcceptedAgreement}
          />
        )}
        {currentPage === 'venue-agreement' && (
          <VenueAgreement 
            onNavigate={handleNavigate}
            onAccept={() => handleAgreementAccept()}
            hasAccepted={!!hasAcceptedAgreement}
          />
        )}

        {/* Role mismatch — friendly redirect page */}
        {roleMismatch && (
          <RoleMismatchPage
            currentRole={roleMismatch.current}
            requiredRole={roleMismatch.required}
            onNavigate={handleNavigate}
          />
        )}

        {currentUser.role === 'artist' && (
          <>
            {currentPage === 'artist-onboarding' && <ArtistOnboardingWizard user={currentUser} onComplete={() => { setArtistOnboarding({ completed: true, step: null }); handleNavigate('artist-dashboard'); }} onSkip={() => { snoozeArtistOnboarding(); handleNavigate('artist-dashboard'); }} />}
            {currentPage === 'artist-dashboard' && <ArtistDashboard onNavigate={handleNavigate} user={currentUser} />}
            {currentPage === 'artist-artworks' && <ArtistArtworks user={currentUser} />}
            {currentPage === 'artist-curated-sets' && <CuratedSets user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'artist-analytics' && <ArtistAnalytics user={currentUser} />}
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
                onDecline={async (inviteId) => {
                  if (confirm('Are you sure you want to decline this invitation?')) {
                    try {
                      await apiPost(`/api/venue-invites/token/${inviteId}/decline`, {});
                    } catch {
                      // Fallback to direct Supabase update
                      const { supabase } = await import('./lib/supabase');
                      await supabase.from('venue_invites').update({ status: 'DECLINED', declined_at: new Date().toISOString() }).eq('id', inviteId);
                    }
                  }
                }}
                onNavigate={handleNavigate}
                artistId={currentUser.id}
              />
            )}
            {currentPage === 'artist-invite-venue' && <ArtistInviteVenue onNavigate={handleNavigate} />}
            {currentPage === 'artist-referrals' && <ArtistReferrals />}
            {currentPage === 'artist-sales' && <ArtistSales user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'artist-profile' && <ArtistProfile onNavigate={handleNavigate} />}
            {currentPage === 'artist-password-security' && <PasswordSecurity onBack={() => handleNavigate('artist-profile')} />}
            {currentPage === 'artist-notifications' && <NotificationPreferences onBack={() => handleNavigate('artist-profile')} />}
            {currentPage === 'artist-notifications-center' && <NotificationsList user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'artist-notifications-legacy' && <NotificationsList user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'artist-settings' && <Settings onNavigate={handleNavigate} />}
          </>
        )}
        
        {currentUser.role === 'venue' && (
          <>
            {currentPage === 'venue-dashboard' && <VenueDashboard onNavigate={handleNavigate} user={currentUser} hasAcceptedAgreement={hasAcceptedAgreement} />}
            {currentPage === 'venue-setup' && <VenueSetupWizard onNavigate={handleNavigate} onComplete={() => handleNavigate('venue-dashboard')} />}
            {currentPage === 'venue-partner-kit' && <VenuePartnerKitEmbedded onNavigate={handleNavigate} />}
            {currentPage === 'venue-walls' && <VenueWalls />}
            {currentPage === 'venue-calls' && <VenueCalls user={currentUser} onViewCall={(callId) => handleNavigate('venue-call-detail', { callId })} />}
            {currentPage === 'venue-call-detail' && selectedCallId && <VenueCallDetail callId={selectedCallId} onBack={() => handleNavigate('venue-calls')} />}
            {currentPage === 'venue-applications' && <ApplicationsAndInvitations userRole="venue" onBack={() => handleNavigate('venue-dashboard')} />}
            {currentPage === 'venue-current' && <VenueCurrentArtWithScheduling />}
            {currentPage === 'venue-sales' && <VenueSales user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'venue-analytics' && <VenueAnalytics user={currentUser} />}
            {currentPage === 'venue-wall-stats' && <VenueWallStats user={currentUser} />}
            {currentPage === 'venue-performance' && <VenuePerformance user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'venue-statement' && <VenueStatement user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'venue-settings' && <VenueSettingsWithEmptyState />}
            {currentPage === 'venue-profile' && <VenueProfile onNavigate={handleNavigate} />}
            {currentPage === 'venue-password-security' && <VenuePasswordSecurity onBack={() => handleNavigate('venue-profile')} />}
            {currentPage === 'venue-notifications' && <VenueNotificationPreferences onBack={() => handleNavigate('venue-profile')} />}
            {currentPage === 'venue-notifications-center' && <NotificationsList user={currentUser} onNavigate={handleNavigate} />}
            {currentPage === 'find-art' && <FindArtHub onNavigate={handleNavigate} />}
            {currentPage === 'venue-curated-sets' && <CuratedSetsMarketplace onNavigate={handleNavigate} />}
            {currentPage === 'venue-find-artists' && (
              <FindArtists
                onViewProfile={(artistId) => {
                  setSelectedArtistId(artistId);
                  handleNavigate('artist-view-profile');
                }}
                onInviteArtist={(artistId) => {
                  setSelectedArtistId(artistId);
                  handleNavigate('artist-view-profile');
                }}
              />
            )}
            {currentPage === 'artist-view-profile' && selectedArtistId && (
              <ArtistProfileView
                artistId={selectedArtistId}
                isOwnProfile={false}
                currentUser={currentUser}
                onInviteToApply={async () => {
                  try {
                    await apiPost('/api/support/messages', {
                      email: currentUser.email || 'venue@artwalls.space',
                      message: `Venue invite-to-apply: venue ${currentUser.id} wants to invite artist ${selectedArtistId} to display.`,
                      roleContext: 'venue',
                      pageSource: 'artist-view-profile',
                    });
                    alert('Invitation sent! The artist will be notified.');
                  } catch {
                    alert('Unable to send invitation right now. Please try again.');
                  }
                }}
              />
            )}
          </>
        )}
        
        {currentUser.role === 'admin' && (
          <>
            {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
            {currentPage === 'admin-wall-productivity' && <AdminWallProductivity onNavigate={handleNavigate} />}
            {currentPage === 'admin-users' && (
              <AdminUsers onViewUser={(userId: string) => handleNavigate('admin-user-detail', { userId })} />
            )}
            {currentPage === 'admin-user-detail' && <AdminUserDetail onNavigate={handleNavigate} />}
            {currentPage === 'admin-announcements' && <AdminAnnouncements />}
            {currentPage === 'admin-promo-codes' && <AdminPromoCodes />}
            {currentPage === 'admin-stripe-payments' && <StripePaymentSetup onNavigate={handleNavigate} />}
            {currentPage === 'admin-activity-log' && <AdminActivityLog />}
            {currentPage === 'admin-invites' && <AdminInvites />}
            {currentPage === 'admin-referrals' && <AdminReferrals />}
            {currentPage === 'admin-sales' && <AdminSalesPage />}
            {currentPage === 'admin-current-displays' && <AdminCurrentDisplays />}
            {currentPage === 'admin-support' && <AdminSupport />}
          </>
        )}
        </Suspense>
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
    </ErrorBoundary>
  );
}
import { useState, useEffect, Suspense } from 'react';
import { supabase } from './lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { apiPost } from './lib/api';
import { trackAnalyticsEvent, setAnalyticsContext } from './lib/analytics';
import { StructuredData, siteSchemas } from './components/StructuredData';
import { SEO } from './components/SEO';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Navigation } from './components/Navigation';
import { MobileSidebar } from './components/MobileSidebar';
import { Login } from './components/Login';
import { Footer } from './components/Footer';
import { AgreementBanner } from './components/legal/AgreementBanner';
import { ProfileCompletion } from './components/ProfileCompletion';
import { AriaLiveRegion } from './components/AriaLiveRegion';
import { PublicLayout } from './components/layout/PublicLayout';

// ─── Lazy-loaded route components ─────────────────────────────────────────────
// Centralised in src/routes/lazyPages.ts; App.tsx only imports what it renders directly.
import {
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
  AuthCallback,
  VenueInviteLanding,
  VenueSignup,
  PurchasePage,
  WhyArtwallsArtistsPage,
  VenuesLandingPage,
  PublicArtistProfilePage,
  PublicArtistPage,
  PublicArtistSetPage,
  PublicVenuePage,
  FindCitySelector,
  CityVenueMap,
  PoliciesLanding,
  ArtistAgreement,
  VenueAgreement,
  PrivacyPolicy,
  TermsOfService,
  PricingPage,
  CallPublicPage,
  CallApplyPage,
  CallsBrowsePage,
  VenueHostingPolicy,
  VenueApplication,
  VenueProfilePage,
  ReferralProgram,
  RoleMismatchPage,
} from './routes/lazyPages';
import { ArtistPages } from './routes/ArtistPages';
import { VenuePages } from './routes/VenuePages';
import { AdminConsole } from './routes/AdminConsole';

// Suspense loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--blue)]" />
  </div>
);

// Re-export types so existing consumers (Login, MobileSidebar, etc.) can still
// import { User, UserRole } from '../App' without changes.
import type { UserRole, User } from './types/app';
export type { UserRole, User };

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

  // ─── Analytics: CWV + page views + context sync ───────────────────────────
  useEffect(() => {
    // Initialize Core Web Vitals collection once on mount
    import('./lib/analytics/cwv').then(m => m.initCoreWebVitals()).catch(() => {});
  }, []);

  useEffect(() => {
    // Sync analytics context whenever role or page changes
    setAnalyticsContext({ userRole: currentUser?.role ?? null, route: currentPage });
  }, [currentUser?.role, currentPage]);

  useEffect(() => {
    // Track page view on every SPA navigation (skip the initial 'login' page)
    if (currentPage && currentPage !== 'login') {
      trackAnalyticsEvent('page_view', {
        page: currentPage,
        path: window.location.pathname + window.location.hash,
      });
    }
    // Fire landing_view for marketing/entry pages with UTM params
    const landingPages = new Set(['login', 'why-artwalls-artist', 'why-artwalls-venue', 'venues', 'pricing']);
    if (landingPages.has(currentPage)) {
      const params = new URLSearchParams(window.location.search);
      trackAnalyticsEvent('landing_view', {
        entryPath: window.location.pathname,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
      });
    }
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
      if (import.meta.env?.DEV) {
        console.log('[Auth] onAuthStateChange:', event, session?.user?.id, 'role:', session?.user?.user_metadata?.role);
      }

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
      // Only reset page for logout; preserve all other pages during auth updates.
      // Skip page changes while on /auth/callback — the AuthCallback component
      // handles its own routing after processing the OAuth tokens.
      setCurrentPage((prevPage) => {
        if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
          return prevPage; // Let AuthCallback handle routing
        }
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

    // Check for a pending deep-link redirect (e.g. from the Founding Story CTAs).
    const pendingRedirect = localStorage.getItem('pendingRedirect');
    if (pendingRedirect) {
      localStorage.removeItem('pendingRedirect');
      setCurrentPage(pendingRedirect);
    } else {
      setCurrentPage(defaultDashboardForRole(effectiveUser.role));
    }
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

      // ─── Funnel analytics (Google OAuth role selection) ────────────────
      trackAnalyticsEvent('role_selected', { role: role || 'artist', source: 'google_oauth' });
      trackAnalyticsEvent('auth_complete', {
        action: 'signup',
        method: 'google',
        role: effectiveRole || 'artist',
      });

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

  // Direct-route override for OAuth callback page.
  // MUST be before the !currentUser guard — the session doesn't exist yet
  // when Google redirects back; this page establishes it.
  if (pathname === '/auth/callback') {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthCallback
          onAuth={() => {
            // Session is now established. Re-read it and route to dashboard.
            // The onAuthStateChange listener will also fire, but we do an
            // explicit read here to ensure we don't race.
            supabase.auth.getSession().then(({ data }) => {
              const user = userFromSupabase(data.session?.user);
              if (user) {
                setCurrentUser(user);
                setCurrentPage(defaultDashboardForRole(user.role));
              } else {
                // User signed in via Google but has no role yet —
                // onAuthStateChange will show the role selection modal.
                setCurrentPage('login');
              }
            });
          }}
          onNavigate={handleNavigate}
        />
      </Suspense>
    );
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

  // /calls — public browse page for all open calls
  if (pathname === '/calls' || pathname === '/calls/') {
    return <Suspense fallback={<PageLoader />}><CallsBrowsePage /></Suspense>;
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

  // /artist/:handle — clean public artist URL (alias for /p/artist/:handle)
  if (pathname.startsWith('/artist/') && !pathname.startsWith('/artists/')) {
    const parts = pathname.split('/').filter(Boolean);
    const handle = parts[1] || '';
    if (handle) {
      return <Suspense fallback={<PageLoader />}><PublicArtistProfilePage slug={handle} /></Suspense>;
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
    return (
      <PublicLayout onNavigate={handleNavigate} currentPage="find-art">
        <Suspense fallback={<PageLoader />}><FindCitySelector onNavigate={handleNavigate} /></Suspense>
      </PublicLayout>
    );
  }

  // /find/:citySlug — city venue map (map + list split view)
  if (pathname.startsWith('/find/')) {
    const parts = pathname.split('/').filter(Boolean);
    const citySlug = parts[1] || '';
    if (citySlug) {
      return (
        <PublicLayout onNavigate={handleNavigate} currentPage="find-art" hideFooter>
          <Suspense fallback={<PageLoader />}><CityVenueMap citySlug={citySlug} /></Suspense>
        </PublicLayout>
      );
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
      const legalMeta: Record<string, { title: string; desc: string }> = {
        'policies': { title: 'Policies — Artwalls', desc: 'Review Artwalls policies including privacy, terms of service, and agreements for artists and venues.' },
        'privacy-policy': { title: 'Privacy Policy — Artwalls', desc: 'Learn how Artwalls collects, uses, and protects your personal information.' },
        'terms-of-service': { title: 'Terms of Service — Artwalls', desc: 'Read the terms governing your use of the Artwalls platform.' },
        'artist-agreement': { title: 'Artist Agreement — Artwalls', desc: 'The agreement between artists and Artwalls for displaying and selling artwork.' },
        'venue-agreement': { title: 'Venue Agreement — Artwalls', desc: 'The agreement between venues and Artwalls for hosting artwork.' },
      };
      const meta = legalMeta[currentPage] || { title: 'Artwalls', desc: '' };
      return (
        <div className="min-h-screen flex flex-col">
          <SEO
            title={meta.title}
            description={meta.desc}
            ogUrl={`https://artwalls.space/${currentPage}`}
            canonical={`https://artwalls.space/${currentPage}`}
          />
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
      <PublicLayout onNavigate={handleNavigate} currentPage="login" hideNav hideFooter={false}>
        <StructuredData data={siteSchemas()} />
        <SEO
          title="Artwalls — Art on Every Wall"
          description="Artwalls connects artists with venues to display and sell artwork on real walls. Find wall space, manage displays, and grow your art business."
          ogUrl="https://artwalls.space"
          canonical="https://artwalls.space/"
          twitterCard="summary_large_image"
          ogImage="https://artwalls.space/og-image.png"
        />
        {currentPage === 'forgot-password' ? (
          <Suspense fallback={<PageLoader />}><ForgotPassword onBack={() => setCurrentPage('login')} /></Suspense>
        ) : (
          <Login onLogin={handleLogin} onNavigate={handleNavigate} />
        )}
      </PublicLayout>
    );
  }

  // Admin Console Layout (different from main app)
  if (currentUser.role === 'admin') {
    return (
      <AdminConsole
        currentPage={currentPage}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        selectedMessageId={selectedMessageId}
        setSelectedMessageId={setSelectedMessageId}
      />
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
          <ArtistPages
            currentPage={currentPage}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            selectedVenueId={selectedVenueId}
            setSelectedVenueId={setSelectedVenueId}
            artistOnboarding={artistOnboarding}
            setArtistOnboarding={setArtistOnboarding}
            snoozeArtistOnboarding={snoozeArtistOnboarding}
          />
        )}
        
        {currentUser.role === 'venue' && (
          <VenuePages
            currentPage={currentPage}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            selectedCallId={selectedCallId}
            selectedArtistId={selectedArtistId}
            setSelectedArtistId={setSelectedArtistId}
            hasAcceptedAgreement={hasAcceptedAgreement}
          />
        )}
        
        </Suspense>
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
    </ErrorBoundary>
  );
}
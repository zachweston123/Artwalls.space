/**
 * Centralized lazy-loaded component registry.
 *
 * Every page-level component is imported here via React.lazy().
 * Route modules (ArtistPages, VenuePages, AdminConsole) and App.tsx
 * import from this single barrel so that chunk splitting stays
 * consistent and there's one place to audit all lazy boundaries.
 */
import { lazy } from 'react';

// ─── Artist ────────────────────────────────────────────────────────────────────
export const ArtistDashboard = lazy(() => import('../components/artist/ArtistDashboard').then(m => ({ default: m.ArtistDashboard })));
export const ArtistArtworks = lazy(() => import('../components/artist/ArtistArtworks').then(m => ({ default: m.ArtistArtworks })));
export const ArtistSales = lazy(() => import('../components/artist/ArtistSales').then(m => ({ default: m.ArtistSales })));
export const ArtistProfile = lazy(() => import('../components/artist/ArtistProfile').then(m => ({ default: m.ArtistProfile })));
export const ArtistProfileView = lazy(() => import('../components/artist/ArtistProfileView').then(m => ({ default: m.ArtistProfileView })));
export const PasswordSecurity = lazy(() => import('../components/artist/PasswordSecurity').then(m => ({ default: m.PasswordSecurity })));
export const NotificationPreferences = lazy(() => import('../components/artist/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
export const ArtistInvites = lazy(() => import('../components/artist/ArtistInvites').then(m => ({ default: m.ArtistInvites })));
export const ArtistInviteVenue = lazy(() => import('../components/artist/ArtistInviteVenue').then(m => ({ default: m.ArtistInviteVenue })));
export const ArtistReferrals = lazy(() => import('../components/artist/ArtistReferrals').then(m => ({ default: m.ArtistReferrals })));
export const ArtistAnalytics = lazy(() => import('../components/artist/ArtistAnalytics').then(m => ({ default: m.ArtistAnalytics })));
export const ArtistOnboardingWizard = lazy(() => import('../components/onboarding/ArtistOnboardingWizard').then(m => ({ default: m.ArtistOnboardingWizard })));
export const CuratedSets = lazy(() => import('../components/artist/CuratedSets').then(m => ({ default: m.CuratedSets })));
export const FindVenues = lazy(() => import('../components/artist/FindVenues').then(m => ({ default: m.FindVenues })));

// ─── Venue ─────────────────────────────────────────────────────────────────────
export const VenueDashboard = lazy(() => import('../components/venue/VenueDashboard').then(m => ({ default: m.VenueDashboard })));
export const VenueWalls = lazy(() => import('../components/venue/VenueWalls').then(m => ({ default: m.VenueWalls })));
export const VenueCurrentArtWithScheduling = lazy(() => import('../components/venue/VenueCurrentArtWithScheduling').then(m => ({ default: m.VenueCurrentArtWithScheduling })));
export const VenueSales = lazy(() => import('../components/venue/VenueSales').then(m => ({ default: m.VenueSales })));
export const VenueSettingsWithEmptyState = lazy(() => import('../components/venue/VenueSettingsWithEmptyState').then(m => ({ default: m.VenueSettingsWithEmptyState })));
export const VenueProfile = lazy(() => import('../components/venue/VenueProfile').then(m => ({ default: m.VenueProfile })));
export const VenueProfileView = lazy(() => import('../components/venue/VenueProfileView').then(m => ({ default: m.VenueProfileView })));
export const VenuePasswordSecurity = lazy(() => import('../components/venue/VenuePasswordSecurity').then(m => ({ default: m.VenuePasswordSecurity })));
export const VenueNotificationPreferences = lazy(() => import('../components/venue/VenueNotificationPreferences').then(m => ({ default: m.VenueNotificationPreferences })));
export const VenueWallsPublic = lazy(() => import('../components/venue/VenueWallsPublic').then(m => ({ default: m.VenueWallsPublic })));
export const FindArtists = lazy(() => import('../components/venue/FindArtists').then(m => ({ default: m.FindArtists })));
export const VenueProfilePage = lazy(() => import('../components/venue/VenueProfilePage').then(m => ({ default: m.VenueProfilePage })));
export const FindArtHub = lazy(() => import('../components/venue/FindArtHub').then(m => ({ default: m.FindArtHub })));
export const CuratedSetsMarketplace = lazy(() => import('../components/venue/CuratedSetsMarketplace').then(m => ({ default: m.CuratedSetsMarketplace })));
export const VenuePartnerKitEmbedded = lazy(() => import('../components/venue/VenuePartnerKitEmbedded').then(m => ({ default: m.VenuePartnerKitEmbedded })));
export const VenueSetupWizard = lazy(() => import('../components/venue/VenueSetupWizard').then(m => ({ default: m.VenueSetupWizard })));
export const VenueHostingPolicy = lazy(() => import('../components/venue/VenueHostingPolicy').then(m => ({ default: m.VenueHostingPolicy })));
export const VenueApplication = lazy(() => import('../components/venue/VenueApplication').then(m => ({ default: m.VenueApplication })));
export const ReferralProgram = lazy(() => import('../components/venue/ReferralProgram').then(m => ({ default: m.ReferralProgram })));
export const VenueCalls = lazy(() => import('../components/venue/VenueCalls').then(m => ({ default: m.VenueCalls })));
export const VenueCallDetail = lazy(() => import('../components/venue/VenueCallDetail').then(m => ({ default: m.VenueCallDetail })));
export const VenueAnalytics = lazy(() => import('../components/venue/VenueAnalytics').then(m => ({ default: m.VenueAnalytics })));
export const VenueWallStats = lazy(() => import('../components/venue/VenueWallStats').then(m => ({ default: m.VenueWallStats })));
export const VenuePerformance = lazy(() => import('../components/venue/VenuePerformance').then(m => ({ default: m.VenuePerformance })));
export const VenueStatement = lazy(() => import('../components/venue/VenueStatement').then(m => ({ default: m.VenueStatement })));

// ─── Shared ────────────────────────────────────────────────────────────────────
export const ApplicationsAndInvitations = lazy(() => import('../components/shared/ApplicationsAndInvitations').then(m => ({ default: m.ApplicationsAndInvitations })));
export const NotificationsList = lazy(() => import('../components/notifications/NotificationsList').then(m => ({ default: m.NotificationsList })));
export const RoleMismatchPage = lazy(() => import('../components/shared/RoleMismatchPage').then(m => ({ default: m.RoleMismatchPage })));
export const Settings = lazy(() => import('../components/settings/Settings').then(m => ({ default: m.Settings })));

// ─── Pages ─────────────────────────────────────────────────────────────────────
export const WhyArtwallsArtistsPage = lazy(() => import('../pages/WhyArtwallsArtists').then(m => ({ default: m.WhyArtwallsArtistsPage })));
export const VenuesLandingPage = lazy(() => import('../pages/VenuesLanding').then(m => ({ default: m.VenuesLandingPage })));
export const PublicArtistProfilePage = lazy(() => import('../pages/public/PublicArtistProfilePage').then(m => ({ default: m.PublicArtistProfilePage })));
export const PublicArtistPage = lazy(() => import('../pages/PublicArtistPage').then(m => ({ default: m.PublicArtistPage })));
export const PublicArtistSetPage = lazy(() => import('../pages/PublicArtistSetPage').then(m => ({ default: m.PublicArtistSetPage })));
export const PublicVenuePage = lazy(() => import('../pages/PublicVenuePage').then(m => ({ default: m.PublicVenuePage })));
export const FindCitySelector = lazy(() => import('../pages/FindCitySelector').then(m => ({ default: m.FindCitySelector })));
export const CityVenueMap = lazy(() => import('../pages/CityVenueMap').then(m => ({ default: m.CityVenueMap })));
export const ForgotPassword = lazy(() => import('../pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
export const ResetPassword = lazy(() => import('../pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
export const VerifyEmail = lazy(() => import('../pages/VerifyEmail'));
export const VenueInviteLanding = lazy(() => import('../pages/VenueInviteLanding'));
export const VenueSignup = lazy(() => import('../pages/VenueSignup'));
export const PurchasePage = lazy(() => import('../components/PurchasePage').then(m => ({ default: m.PurchasePage })));

// ─── Legal ─────────────────────────────────────────────────────────────────────
export const PoliciesLanding = lazy(() => import('../components/legal/PoliciesLanding').then(m => ({ default: m.PoliciesLanding })));
export const ArtistAgreement = lazy(() => import('../components/legal/ArtistAgreement').then(m => ({ default: m.ArtistAgreement })));
export const VenueAgreement = lazy(() => import('../components/legal/VenueAgreement').then(m => ({ default: m.VenueAgreement })));
export const PrivacyPolicy = lazy(() => import('../components/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
export const TermsOfService = lazy(() => import('../components/legal/TermsOfService').then(m => ({ default: m.TermsOfService })));
export const PricingPage = lazy(() => import('../components/pricing/PricingPage').then(m => ({ default: m.PricingPage })));

// ─── Calls ─────────────────────────────────────────────────────────────────────
export const CallPublicPage = lazy(() => import('../components/calls/CallPublicPage').then(m => ({ default: m.CallPublicPage })));
export const CallApplyPage = lazy(() => import('../components/calls/CallApplyPage').then(m => ({ default: m.CallApplyPage })));

// ─── Admin ─────────────────────────────────────────────────────────────────────
export const AdminSidebar = lazy(() => import('../components/admin/AdminSidebar').then(m => ({ default: m.AdminSidebar })));
export const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
export const AdminWallProductivity = lazy(() => import('../components/admin/AdminWallProductivity').then(m => ({ default: m.AdminWallProductivity })));
export const AdminUsers = lazy(() => import('../components/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
export const AdminUserDetail = lazy(() => import('../components/admin/AdminUserDetail').then(m => ({ default: m.AdminUserDetail })));
export const AdminAnnouncements = lazy(() => import('../components/admin/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })));
export const AdminPromoCodes = lazy(() => import('../components/admin/AdminPromoCodes').then(m => ({ default: m.AdminPromoCodes })));
export const AdminActivityLog = lazy(() => import('../components/admin/AdminActivityLog').then(m => ({ default: m.AdminActivityLog })));
export const AdminInvites = lazy(() => import('../components/admin/AdminInvites').then(m => ({ default: m.AdminInvites })));
export const AdminReferrals = lazy(() => import('../components/admin/AdminReferrals').then(m => ({ default: m.AdminReferrals })));
export const AdminSalesPage = lazy(() => import('../components/admin/AdminSales').then(m => ({ default: m.AdminSales })));
export const AdminCurrentDisplays = lazy(() => import('../components/admin/AdminCurrentDisplays').then(m => ({ default: m.AdminCurrentDisplays })));
export const AdminSupport = lazy(() => import('../components/admin/AdminSupport').then(m => ({ default: m.AdminSupport })));
export const StripePaymentSetup = lazy(() => import('../components/admin/StripePaymentSetup').then(m => ({ default: m.StripePaymentSetup })));
export const SupportInbox = lazy(() => import('../components/admin/SupportInbox').then(m => ({ default: m.SupportInbox })));
export const SupportMessageDetail = lazy(() => import('../components/admin/SupportMessageDetail').then(m => ({ default: m.SupportMessageDetail })));

/**
 * Login.tsx — Artwalls public landing + auth form.
 *
 * Theme-congruent: ONE page background (--bg) everywhere. Visual separation
 * comes from elevated card surfaces (--surface-1 + border + shadow-sm), not
 * alternating section backgrounds. Section wrappers are purely for spacing
 * (py rhythm) and never set a bg colour. Works identically in light & dark.
 */

import { useState, useEffect } from 'react';
import { Palette, Store, MapPin, Image, DollarSign, Users, Star, Shield, ChevronRight } from 'lucide-react';
import { SEO } from './SEO';
import { FreshnessProof } from './shared/FreshnessProof';
import { FoundingStorySection } from './FoundingStorySection';
import type { User, UserRole } from '../App';
import { trackAnalyticsEvent } from '../lib/analytics';
import { Section } from './public/Section';
import { Container } from './public/Container';

// Google OAuth icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.461,2.268,15.365,1.25,12.545,1.25 c-6.134,0-11.104,4.971-11.104,11.105c0,6.135,4.97,11.104,11.104,11.104c6.134,0,11.104-4.969,11.104-11.104 c0-0.378-0.025-0.75-0.076-1.122H12.545z"/>
  </svg>
);

interface LoginProps {
  onLogin: (user: User) => void;
  onNavigate?: (page: string) => void;
  defaultRole?: UserRole;
  lockRole?: boolean;
  referralToken?: string;
}

export function Login({ onLogin, onNavigate, defaultRole, lockRole = false, referralToken }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole ?? null);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (defaultRole && !selectedRole) {
      setSelectedRole(defaultRole);
    }
  }, [defaultRole, selectedRole]);

  useEffect(() => {
    if (referralToken && typeof window !== 'undefined') {
      localStorage.setItem('venueReferralToken', referralToken);
    }
  }, [referralToken]);

  // Load pre-filled data from user metadata on component mount
  useEffect(() => {
    const loadPrefillData = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          const user = data.session.user;
          // Pre-fill email and phone from user metadata if available
          if (user.email) {
            setEmail(user.email);
          }
          if (user.user_metadata?.phone) {
            setPhone(user.user_metadata.phone);
          }
          if (user.user_metadata?.name) {
            setName(user.user_metadata.name);
          }
        }
      } catch (error) {
        // Silently fail, this is optional enhancement
        console.debug('Failed to load prefill data', error);
      }
    };

    loadPrefillData();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!selectedRole) return;

    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in failed.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const safeName = name.trim();

      if (isSignup) {
        const phoneTrim = phone.trim();
        if (!phoneTrim) {
          setErrorMessage('Phone number is required.');
          setIsLoading(false);
          return;
        }

        const trimmedEmail = email.trim();
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              role: selectedRole,
              name: safeName || null,
              phone: phoneTrim,
            },
            emailRedirectTo: `${window.location.origin}/verify-email`,
          },
        });

        if (error) throw error;

        let infoCopy: string | null = null;
        try {
          const { apiPost } = await import('../lib/api');
          const verifyResult = await apiPost('/api/auth/send-verification', { email: trimmedEmail });
          if (verifyResult?.emailSkipped && verifyResult?.verificationUrl) {
            infoCopy = `Account created. Email delivery is not configured; copy this link to verify: ${verifyResult.verificationUrl}`;
          } else if (verifyResult?.emailSent) {
            infoCopy = 'Account created. Check your inbox for the Artwalls verification email.';
          }
        } catch (verifyErr) {
          console.warn('Custom verification email failed', verifyErr);
        }

        if (!data.session) {
          setInfoMessage(infoCopy || 'Account created. Check your email to confirm, then sign in.');
          setIsSignup(false);
          setPassword('');
          return;
        }

        const supaUser = data.user;
        if (!supaUser) throw new Error('Sign up succeeded but no user returned.');

        try {
          const { apiPost } = await import('../lib/api');
          const storedReferral = typeof window !== 'undefined' ? localStorage.getItem('venueReferralToken') : null;
          const token = referralToken || storedReferral;
          await apiPost('/api/profile/provision', { phoneNumber: phoneTrim, referralToken: token || null });
        } catch (e) {
          console.warn('Profile provision failed', e);
        }

        // ─── Funnel analytics (signup success) ────────────────────────────
        trackAnalyticsEvent('role_selected', { role: selectedRole || 'artist', source: 'signup_form' });
        trackAnalyticsEvent('auth_complete', {
          action: 'signup',
          method: 'email',
          role: (supaUser.user_metadata?.role as string) || selectedRole || 'artist',
        });

        onLogin({
          id: supaUser.id,
          name: (supaUser.user_metadata?.name as string | undefined) || safeName || 'User',
          email: supaUser.email || trimmedEmail,
          role: (supaUser.user_metadata?.role as UserRole) || selectedRole,
        });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign in succeeded but no user returned.');

      const currentRole = (data.user.user_metadata?.role as UserRole) || null;

      // Admin role is determined server-side: the Worker's /api/admin/verify
      // endpoint sets user_metadata.role = 'admin' via supabaseAdmin.  We trust
      // that stored value here — no hardcoded email list in client code.
      const isAdminEmail = (data.user.user_metadata?.role as string) === 'admin';

      // Determine effective role: admin email overrides everything
      const effectiveRole: UserRole = isAdminEmail
        ? 'admin'
        : (currentRole === 'admin' ? 'admin' : (selectedRole || currentRole || 'artist'));

      // If the user selected a role and it differs/missing, backfill metadata.
      // BUT never overwrite admin role, and skip for admin-email users.
      if (!isAdminEmail && currentRole !== 'admin' && selectedRole && selectedRole !== currentRole) {
        await supabase.auth.updateUser({
          data: {
            role: selectedRole,
            name: safeName || (data.user.user_metadata?.name as string | undefined) || null,
          },
        });
      }

      // Provision a profile in Supabase (artist/venue)
      try {
        const { apiPost } = await import('../lib/api');
        const storedReferral = typeof window !== 'undefined' ? localStorage.getItem('venueReferralToken') : null;
        const token = referralToken || storedReferral;
        await apiPost('/api/profile/provision', { referralToken: token || null });
      } catch (e) {
        console.warn('Profile provision failed', e);
      }

      // ─── Funnel analytics ──────────────────────────────────────────────
      trackAnalyticsEvent('role_selected', { role: selectedRole || 'artist', source: 'signup_form' });
      trackAnalyticsEvent('auth_complete', {
        action: isSignup ? 'signup' : 'login',
        method: 'email',
        role: effectiveRole || selectedRole || 'artist',
      });

      onLogin({
        id: data.user.id,
        name:
          safeName ||
          (data.user.user_metadata?.name as string | undefined) ||
          (effectiveRole === 'admin' ? 'Admin' : selectedRole === 'artist' ? 'Artist' : 'Venue'),
        email: data.user.email || email.trim(),
        role: effectiveRole,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }

  };

  if (!selectedRole) {
    return (
      <div className="min-h-svh bg-[var(--bg)]">
        <SEO
          title="Artwalls — Art on Every Wall"
          description="Artwalls connects local artists with cafés, restaurants, and venues to display, rotate, and sell artwork on real walls. Find wall space near you."
          ogTitle="Artwalls — Art on Every Wall"
          ogDescription="Connect artists with venues to display and sell artwork. Find wall space, manage displays, and grow your art business."
          ogUrl="https://artwalls.space"
          canonical="https://artwalls.space/"
        />

        {/* ── Hero ────────────────────────────────────────────── */}
        <Section size="hero">
          <Container>
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text)] font-display tracking-tight leading-tight">
                Art on Every Wall
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-prose mx-auto">
                The easiest way for artists to get placed in real venues&nbsp;— and for venues to host art without the hassle.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                <a
                  href="/find"
                  onClick={(e) => { e.preventDefault(); onNavigate?.('find-art'); window.location.href = '/find'; }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--blue)] text-[var(--on-blue)] font-medium hover:bg-[var(--blue-hover)] transition-colors text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                >
                  <MapPin className="w-5 h-5" />
                  Explore Art Near You
                </a>
                <button
                  onClick={() => onNavigate?.('login')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] font-medium hover:bg-[var(--surface-2)] transition-colors text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                >
                  Log In
                </button>
              </div>
              <button
                onClick={() => onNavigate?.('why-artwalls-artist')}
                className="mt-5 inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-md outline-none"
              >
                Learn more <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Container>
        </Section>

        {/* ── Choose Your Path ───────────────────────────────── */}
        <Section>
          <Container size="narrow">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] text-center mb-3 font-display tracking-tight leading-tight">
              Choose Your Path
            </h2>
            <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-md mx-auto text-center mb-10 leading-relaxed">
              Whether you make art or host it — you can be live in under 10&nbsp;minutes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Artist card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRole('artist')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRole('artist'); } }}
                className="group bg-[var(--surface-1)] rounded-2xl p-6 md:p-8 border border-[var(--border)] shadow-sm hover:border-[var(--blue)] hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--blue-muted)] flex items-center justify-center">
                    <Palette className="w-7 h-7 text-[var(--blue)]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-[var(--blue)] font-display leading-tight">Get Placed in Venues</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      Publish your work, apply to local venues, and sell directly to buyers.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-[var(--blue)] text-[var(--on-blue)] text-sm font-medium group-hover:bg-[var(--blue-hover)] transition-colors">
                    Continue as Artist — Free
                  </span>
                </div>
                <ul className="mt-6 pt-5 border-t border-[var(--border)] space-y-3 text-sm text-[var(--text-muted)]">
                  <li className="flex items-start gap-3"><MapPin className="w-4 h-4 text-[var(--blue)] shrink-0 mt-0.5" />Get placed on real walls in cafés, restaurants, and offices</li>
                  <li className="flex items-start gap-3"><DollarSign className="w-4 h-4 text-[var(--blue)] shrink-0 mt-0.5" />Sell via QR codes — take home up to 85% per sale</li>
                  <li className="flex items-start gap-3"><Image className="w-4 h-4 text-[var(--blue)] shrink-0 mt-0.5" />Build a portfolio visible to venues and collectors</li>
                </ul>
                <a
                  href="/why-artwalls"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate?.('why-artwalls-artist'); }}
                  className="mt-4 block text-xs text-[var(--text-muted)] hover:text-[var(--blue)] text-center transition-colors"
                >
                  Learn more →
                </a>
              </div>

              {/* Venue card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRole('venue')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRole('venue'); } }}
                className="group bg-[var(--surface-1)] rounded-2xl p-6 md:p-8 border border-[var(--border)] shadow-sm hover:border-[var(--green)] hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--green-muted)] flex items-center justify-center">
                    <Store className="w-7 h-7 text-[var(--green)]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-[var(--green)] font-display leading-tight">Host Art Effortlessly</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      List your walls, receive artist applications, and earn a commission on every sale.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-[var(--green)] text-[var(--accent-contrast)] text-sm font-medium group-hover:brightness-95 transition-all">
                    Continue as Venue — Free Forever
                  </span>
                </div>
                <ul className="mt-6 pt-5 border-t border-[var(--border)] space-y-3 text-sm text-[var(--text-muted)]">
                  <li className="flex items-start gap-3"><Image className="w-4 h-4 text-[var(--green)] shrink-0 mt-0.5" />Transform blank walls into rotating art galleries</li>
                  <li className="flex items-start gap-3"><DollarSign className="w-4 h-4 text-[var(--green)] shrink-0 mt-0.5" />Earn a commission on every artwork sold from your walls</li>
                  <li className="flex items-start gap-3"><Shield className="w-4 h-4 text-[var(--green)] shrink-0 mt-0.5" />Scheduling, install support, and damage protection included</li>
                </ul>
                <a
                  href="/venues"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate?.('why-artwalls-venue'); }}
                  className="mt-4 block text-xs text-[var(--text-muted)] hover:text-[var(--green)] text-center transition-colors"
                >
                  Learn more →
                </a>
              </div>
            </div>
          </Container>
        </Section>

        {/* ── Founding Story + First-Win CTAs ─────────────────── */}
        <FoundingStorySection
          onSelectRole={(role) => setSelectedRole(role)}
          onNavigate={onNavigate}
          isLoggedIn={false}
        />

        {/* ── Getting Started (onboarding steps) ─────────────── */}
        <Section>
          <Container size="narrow">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] text-center mb-3 font-display tracking-tight leading-tight">
              Getting Started
            </h2>
            <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-md mx-auto text-center mb-10 leading-relaxed">
              From sign-up to your first placement in three steps.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Artist path */}
              <div className="bg-[var(--surface-1)] rounded-2xl p-6 md:p-8 border border-[var(--border)] shadow-sm">
                <h3 className="text-base font-semibold text-[var(--blue)] mb-6 flex items-center gap-2 font-display">
                  <Palette className="w-5 h-5" /> For Artists
                </h3>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Create your profile', desc: 'Add your bio, city, and art style in 2 minutes.' },
                    { step: '2', title: 'Publish your first artwork', desc: 'Upload a photo, set a price — it\'s now discoverable.' },
                    { step: '3', title: 'Apply to a venue or call', desc: 'Browse open calls or apply directly. Get placed.' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-[var(--blue-muted)] text-[var(--blue)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.step}</span>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-[var(--text)] leading-snug">{s.title}</p>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Venue path */}
              <div className="bg-[var(--surface-1)] rounded-2xl p-6 md:p-8 border border-[var(--border)] shadow-sm">
                <h3 className="text-base font-semibold text-[var(--green)] mb-6 flex items-center gap-2 font-display">
                  <Store className="w-5 h-5" /> For Venues
                </h3>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Create your venue', desc: 'Add your space, hours, and vibe in 2 minutes.' },
                    { step: '2', title: 'Add a wall space', desc: 'Describe one wall — dimensions, location, lighting.' },
                    { step: '3', title: 'Post a call for art', desc: 'Artists apply to you. Pick the best fit.' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-[var(--green-muted)] text-[var(--green)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.step}</span>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-[var(--text)] leading-snug">{s.title}</p>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* ── Value Props ─────────────────────────────────────── */}
        <Section>
          <Container>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
              {/* Artists column */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--blue)] mb-6 font-display flex items-center gap-2">
                  <Palette className="w-5 h-5" /> For Artists
                </h3>
                <ul className="space-y-5 text-sm text-[var(--text-muted)] leading-relaxed">
                  {[
                    { icon: <Image className="w-4 h-4 text-[var(--blue)]" />, text: 'Build a professional portfolio visible to venues and collectors' },
                    { icon: <MapPin className="w-4 h-4 text-[var(--blue)]" />, text: 'Get your art on real walls in cafés, offices, and restaurants' },
                    { icon: <DollarSign className="w-4 h-4 text-[var(--blue)]" />, text: 'Sell directly via QR codes — take home up to 85% per sale' },
                    { icon: <Star className="w-4 h-4 text-[var(--blue)]" />, text: 'Gain exposure, build your reputation, and grow your career' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-[var(--blue-muted)] flex items-center justify-center">{item.icon}</span>
                      <span className="pt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Venues column */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--green)] mb-6 font-display flex items-center gap-2">
                  <Store className="w-5 h-5" /> For Venues
                </h3>
                <ul className="space-y-5 text-sm text-[var(--text-muted)] leading-relaxed">
                  {[
                    { icon: <Image className="w-4 h-4 text-[var(--green)]" />, text: 'Transform blank walls into rotating art galleries — for free' },
                    { icon: <Users className="w-4 h-4 text-[var(--green)]" />, text: 'Attract art-loving customers and increase foot traffic' },
                    { icon: <DollarSign className="w-4 h-4 text-[var(--green)]" />, text: 'Earn a commission on every artwork sold from your walls' },
                    { icon: <Shield className="w-4 h-4 text-[var(--green)]" />, text: 'Full scheduling, install/deinstall support, and damage protection' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-[var(--green-muted)] flex items-center justify-center">{item.icon}</span>
                      <span className="pt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </Section>

        {/* ── Freshness Proof ─────────────────────────────────── */}
        <div className="pb-8 md:pb-12">
          <FreshnessProof modules={['venues', 'artists']} limit={4} heading="Growing every week" />
        </div>
      </div>
    );
  }

  const ringClass = selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]';
  const inputClass = `w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:ring-2 ${ringClass} transition-shadow text-sm`;

  return (
    <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            {selectedRole === 'artist' ? (
              <Palette className="w-8 h-8 text-[var(--blue)]" />
            ) : (
              <Store className="w-8 h-8 text-[var(--green)]" />
            )}
            <h1 className="text-3xl font-bold text-[var(--text)] font-display tracking-tight">Artwalls</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {isSignup ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[var(--surface-1)] rounded-2xl p-7 sm:p-8 border border-[var(--border)] shadow-sm">
          <div
            className={
              "inline-flex px-3 py-1 rounded-full text-xs font-medium mb-6 border " +
              (selectedRole === 'artist'
                ? 'bg-[var(--blue-muted)] border-[var(--blue)] text-[var(--blue)]'
                : 'bg-[var(--green-muted)] border-[var(--green)] text-[var(--green)]')
            }
          >
            {selectedRole === 'artist' ? 'Artist Account' : 'Venue Account'}
          </div>

          {(errorMessage || infoMessage) && (
            <div
              id="login-feedback"
              className={
                'mb-5 rounded-xl border px-4 py-3 text-sm ' +
                (errorMessage
                  ? 'bg-[var(--surface-1)] border-[var(--danger)]/30 text-[var(--danger)]'
                  : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text)]')
              }
              role={errorMessage ? 'alert' : 'status'}
            >
              {errorMessage || infoMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="signup-name" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                  {selectedRole === 'artist' ? 'Artist Name' : 'Venue Name'}
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder={selectedRole === 'artist' ? 'Your name' : 'Your venue name'}
                />
              </div>
            )}

            {isSignup && (
              <div>
                <label htmlFor="signup-phone" className="block text-sm font-medium text-[var(--text)] mb-1.5">Phone Number</label>
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. +15551234567"
                  aria-describedby="phone-hint"
                />
                <p id="phone-hint" className="text-xs text-[var(--text-muted)] mt-1.5">We'll send sale notifications to this number.</p>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
                aria-describedby={errorMessage ? 'login-feedback' : undefined}
                aria-invalid={!!errorMessage || undefined}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                aria-describedby={errorMessage ? 'login-feedback' : undefined}
                aria-invalid={!!errorMessage || undefined}
              />
              {!isSignup && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => onNavigate?.('forgot-password')}
                    className="text-xs text-[var(--blue)] hover:text-[var(--blue-hover)] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={
                "w-full py-3 rounded-xl font-medium text-sm hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2 " +
                (selectedRole === 'artist'
                  ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                  : 'bg-[var(--green)] text-[var(--accent-contrast)]')
              }
            >
              {isLoading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[var(--surface-1)] text-[var(--text-muted)]">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm font-medium hover:bg-[var(--surface-1)] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              {isLoading ? 'Connecting…' : 'Sign in with Google'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {!lockRole && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setSelectedRole(null)}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          )}

          <div className="mt-3 text-center">
            <button
              onClick={() => onNavigate?.(selectedRole === 'artist' ? 'why-artwalls-artist' : 'why-artwalls-venue')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Why Artwalls? →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
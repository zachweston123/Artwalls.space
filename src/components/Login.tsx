import { useState, useEffect } from 'react';
import { Palette, Store, MapPin, Image, DollarSign, Users, Star, Shield } from 'lucide-react';
import { SEO } from './SEO';
import type { User, UserRole } from '../App';
import { trackAnalyticsEvent } from '../lib/analytics';

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

        {/* ── Hero Section ────────────────────────────────────── */}
        <section className="px-6 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text)] mb-4 font-display tracking-tight">
              Art on Every Wall
            </h1>
            <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
              Artwalls connects local artists with cafés, restaurants, and venues to display and sell artwork on real walls. Sign in with Google or email to get started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/find"
                onClick={(e) => { e.preventDefault(); onNavigate?.('find-art'); window.location.href = '/find'; }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--blue)] text-[var(--on-blue)] font-medium hover:bg-[var(--blue-hover)] transition-colors text-sm sm:text-base"
              >
                <MapPin className="w-5 h-5" />
                Explore Art Near You
              </a>
            </div>
          </div>
        </section>

        {/* ── Role Selection CTA ──────────────────────────────── */}
        <section className="px-6 pb-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] text-center mb-2 font-display tracking-tight">
              Get Started
            </h2>
            <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-md mx-auto text-center mb-8">
              Are you an artist looking for wall space, or a venue ready to host art?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
              <button
                onClick={() => setSelectedRole('artist')}
                className="group bg-[var(--blue-muted)] rounded-2xl p-6 sm:p-8 border-2 border-[var(--blue)] hover:brightness-95 transition-all active:scale-[0.98] text-left"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--blue)]/10 flex items-center justify-center">
                    <Palette className="w-7 h-7 sm:w-8 sm:h-8 text-[var(--blue)]" />
                  </div>
                  <div>
                    <h3 className="text-xl mb-1 sm:mb-2 text-[var(--blue)] font-semibold">I'm an Artist</h3>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                      Build a beautiful portfolio, get your art into local venues, and sell your work directly to buyers.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] text-sm font-medium">
                    Sign Up as Artist
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.('why-artwalls-artist');
                  }}
                  className="mt-3 text-xs text-[var(--blue)] hover:underline w-full text-center"
                >
                  Learn more →
                </button>
              </button>

              <button
                onClick={() => setSelectedRole('venue')}
                className="group bg-[var(--green-muted)] rounded-2xl p-6 sm:p-8 border-2 border-[var(--green)] hover:brightness-95 transition-all active:scale-[0.98] text-left"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center">
                    <Store className="w-7 h-7 sm:w-8 sm:h-8 text-[var(--green)]" />
                  </div>
                  <div>
                    <h3 className="text-xl mb-1 sm:mb-2 text-[var(--green)] font-semibold">I'm a Venue</h3>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                      Host rotating local art, support your community's artists, and make your space truly stand out.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--accent-contrast)] text-sm font-medium">
                    Sign Up as Venue
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.('why-artwalls-venue');
                  }}
                  className="mt-3 text-xs text-[var(--green)] hover:underline w-full text-center"
                >
                  Learn more →
                </button>
              </button>
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────────── */}
        <section className="px-6 py-12 sm:py-16 bg-[var(--surface-1)] border-y border-[var(--border)]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] text-center mb-10 font-display tracking-tight">
              How Artwalls Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                { icon: <Image className="w-6 h-6" />, title: 'Upload Your Art', desc: 'Artists create a portfolio with photos, pricing, and dimensions. Venues list their available wall spaces.' },
                { icon: <Users className="w-6 h-6" />, title: 'Match & Display', desc: 'Artists apply to venues or receive invitations. Once approved, artwork goes up on real walls in your city.' },
                { icon: <DollarSign className="w-6 h-6" />, title: 'Sell & Earn', desc: 'Visitors buy artwork via QR codes. Artists keep the majority of each sale; venues earn a commission for hosting.' },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-3 p-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--blue-muted)] flex items-center justify-center text-[var(--blue)]">
                    {step.icon}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text)] font-display">{step.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Value Props ─────────────────────────────────────── */}
        <section className="px-6 py-12 sm:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
              {/* Artists column */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--blue)] mb-4 font-display flex items-center gap-2">
                  <Palette className="w-5 h-5" /> For Artists
                </h3>
                <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                  {[
                    { icon: <Image className="w-4 h-4 text-[var(--blue)]" />, text: 'Build a professional portfolio visible to venues and collectors' },
                    { icon: <MapPin className="w-4 h-4 text-[var(--blue)]" />, text: 'Get your art on real walls in cafés, offices, and restaurants' },
                    { icon: <DollarSign className="w-4 h-4 text-[var(--blue)]" />, text: 'Sell directly via QR codes — keep 85%+ of every sale' },
                    { icon: <Star className="w-4 h-4 text-[var(--blue)]" />, text: 'Gain exposure, build your reputation, and grow your career' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0">{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Venues column */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--green)] mb-4 font-display flex items-center gap-2">
                  <Store className="w-5 h-5" /> For Venues
                </h3>
                <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                  {[
                    { icon: <Image className="w-4 h-4 text-[var(--green)]" />, text: 'Transform blank walls into rotating art galleries — for free' },
                    { icon: <Users className="w-4 h-4 text-[var(--green)]" />, text: 'Attract art-loving customers and increase foot traffic' },
                    { icon: <DollarSign className="w-4 h-4 text-[var(--green)]" />, text: 'Earn a commission on every artwork sold from your walls' },
                    { icon: <Shield className="w-4 h-4 text-[var(--green)]" />, text: 'Full scheduling, install/deinstall support, and damage protection' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0">{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            {selectedRole === 'artist' ? (
              <Palette className="w-8 h-8 text-[var(--blue)]" />
            ) : (
              <Store className="w-8 h-8 text-[var(--green)]" />
            )}
            <h1 className="text-3xl font-semibold text-[var(--text)]">Artwalls</h1>
          </div>
          <p className="text-[var(--text-muted)]">
            {isSignup ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <div className="bg-[var(--surface-1)] rounded-2xl p-8 border border-[var(--border)]">
          <div
            className={
              "inline-flex px-3 py-1 rounded-full text-sm mb-6 border " +
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
                'mb-4 rounded-lg border px-4 py-3 text-sm ' +
                (errorMessage
                  ? 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--danger)]'
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
                <label htmlFor="signup-name" className="block text-sm text-[var(--text-muted)] mb-1">
                  {selectedRole === 'artist' ? 'Artist Name' : 'Venue Name'}
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={
                    "w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 " +
                    (selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]')
                  }
                  placeholder={selectedRole === 'artist' ? 'Your name' : 'Your venue name'}
                />
              </div>
            )}

            {isSignup && (
              <div>
                <label htmlFor="signup-phone" className="block text-sm text-[var(--text-muted)] mb-1">Phone Number</label>
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={
                    "w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 " +
                    (selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]')
                  }
                  placeholder="e.g. +15551234567"
                  aria-describedby="phone-hint"
                />
                <p id="phone-hint" className="text-xs text-[var(--text-muted)] mt-1">We'll send sale notifications to this number.</p>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm text-[var(--text-muted)] mb-1">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={
                  "w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 " +
                  (selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]')
                }
                placeholder="your@email.com"
                aria-describedby={errorMessage ? 'login-feedback' : undefined}
                aria-invalid={!!errorMessage || undefined}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm text-[var(--text-muted)] mb-1">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={
                  "w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 " +
                  (selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]')
                }
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
                "w-full py-3 rounded-lg hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed " +
                (selectedRole === 'artist'
                  ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                  : 'bg-[var(--green)] text-[var(--accent-contrast)]')
              }
            >
              {isLoading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[var(--surface-1)] text-[var(--text-muted)]">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              {isLoading ? 'Connecting…' : 'Sign in with Google'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {!lockRole && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setSelectedRole(null)}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                ← Back to Login
              </button>
            </div>
          )}

          <div className="mt-3 text-center">
            <button
              onClick={() => onNavigate?.(selectedRole === 'artist' ? 'why-artwalls-artist' : 'why-artwalls-venue')}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Why Artwalls? →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
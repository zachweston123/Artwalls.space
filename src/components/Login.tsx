import { useState, useEffect } from 'react';
import { Palette, Store } from 'lucide-react';
import type { User, UserRole } from '../App';

// Google OAuth icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.461,2.268,15.365,1.25,12.545,1.25 c-6.134,0-11.104,4.971-11.104,11.105c0,6.135,4.97,11.104,11.104,11.104c6.134,0,11.104-4.969,11.104-11.104 c0-0.378-0.025-0.75-0.076-1.122H12.545z"/>
  </svg>
);

interface LoginProps {
  onLogin: (user: User) => void;
  onNavigate?: (page: string) => void;
}

export function Login({ onLogin, onNavigate }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          redirectTo: `${window.location.origin}/auth/v1/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
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
        try {
          const { apiPost } = await import('../lib/api');
          const payload = {
            email: email.trim(),
            password,
            role: selectedRole,
            name: safeName || null,
            phone: phoneTrim,
          };
          const result = await apiPost('/api/auth/signup', payload);
          if (result?.emailSkipped && result?.verificationUrl) {
            setInfoMessage(`Account created. Email delivery is not configured; copy this link to verify: ${result.verificationUrl}`);
          } else {
            setInfoMessage(result?.message || 'Account created. Check your email to confirm, then sign in.');
          }
          setIsSignup(false);
          setPassword('');
        } catch (signupErr: any) {
          setErrorMessage(signupErr?.message || 'Account creation failed.');
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign in succeeded but no user returned.');

      const currentRole = (data.user.user_metadata?.role as UserRole) || null;

      // If the user selected a role and it differs/missing, backfill metadata.
      // BUT if the user is already an admin, do not overwrite their role with 'artist'/'venue'
      if (currentRole !== 'admin' && selectedRole && selectedRole !== currentRole) {
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
        await apiPost('/api/profile/provision', {});
      } catch (e) {
        console.warn('Profile provision failed', e);
      }

      onLogin({
        id: data.user.id,
        name:
          safeName ||
          (data.user.user_metadata?.name as string | undefined) ||
          (currentRole === 'admin' ? 'Admin' : selectedRole === 'artist' ? 'Artist' : 'Venue'),
        email: data.user.email || email.trim(),
        role: currentRole === 'admin' ? 'admin' : (selectedRole || currentRole),
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }

  };

  if (!selectedRole) {
    return (
      <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl mb-3 text-[var(--text)] font-bold">Welcome to Artwalls</h1>
            <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-md mx-auto">
              Connecting local artists with venues to display and sell physical artworks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            <button
              onClick={() => setSelectedRole('artist')}
              className="group bg-[var(--blue-muted)] rounded-2xl p-6 sm:p-8 border-2 border-[var(--blue)] hover:brightness-95 transition-all active:scale-[0.98]"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center">
                  <Palette className="w-7 h-7 sm:w-8 sm:h-8 text-[var(--blue)]" />
                </div>
                <div>
                  <h2 className="text-xl mb-1 sm:mb-2 text-[var(--blue)] font-bold">I'm an Artist</h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                    Share and sell your artwork at local venues and manage your portfolio
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('why-artwalls-artist');
                    }}
                    className="mt-3 text-xs text-[var(--blue)] hover:underline"
                  >
                    Learn more →
                  </button>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole('venue')}
              className="group bg-[var(--green-muted)] rounded-2xl p-6 sm:p-8 border-2 border-[var(--green)] hover:brightness-95 transition-all active:scale-[0.98]"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center">
                  <Store className="w-7 h-7 sm:w-8 sm:h-8 text-[var(--green)]" />
                </div>
                <div>
                  <h2 className="text-xl mb-1 sm:mb-2 text-[var(--green)] font-bold">I'm a Venue</h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                    Support local artists by displaying rotating artworks and earn 15% commission
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('why-artwalls-venue');
                    }}
                    className="mt-3 text-xs text-[var(--green)] hover:underline"
                  >
                    Learn more →
                  </button>
                </div>
              </div>
            </button>
          </div>
        </div>
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
            <h1 className="text-3xl text-[var(--text)]">Artwalls</h1>
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
                <label className="block text-sm text-[var(--text-muted)] mb-1">
                  {selectedRole === 'artist' ? 'Artist Name' : 'Venue Name'}
                </label>
                <input
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
                <label className="block text-sm text-[var(--text-muted)] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={
                    "w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 " +
                    (selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]')
                  }
                  placeholder="e.g. +15551234567"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">We’ll send sale notifications to this number.</p>
              </div>
            )}

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={
                  "w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 " +
                  (selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]')
                }
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={
                  "w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 " +
                  (selectedRole === 'artist' ? 'focus:ring-[var(--focus)]' : 'focus:ring-[var(--green)]')
                }
                placeholder="••••••••"
              />
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
                <span className="px-2 bg-[var(--surface)] text-[var(--text-muted)]">Or continue with</span>
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

          <div className="mt-4 text-center">
            <button
              onClick={() => setSelectedRole(null)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ← Choose different role
            </button>
          </div>

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
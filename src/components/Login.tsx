import { useState } from 'react';
import { Palette, Store } from 'lucide-react';
import type { User, UserRole } from '../App';

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role: selectedRole,
              name: safeName || null,
            },
          },
        });

        if (error) throw error;

        // If email confirmations are enabled, there may be no session.
        if (!data.session) {
          setInfoMessage('Account created. Check your email to confirm, then sign in.');
          setIsSignup(false);
          return;
        }

        const supaUser = data.user;
        if (!supaUser) throw new Error('Sign up succeeded but no user returned.');

        onLogin({
          id: supaUser.id,
          name: (supaUser.user_metadata?.name as string | undefined) || safeName || 'User',
          email: supaUser.email || email.trim(),
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

      // If the user selected a role and it differs/missing, backfill metadata.
      if (selectedRole && selectedRole !== currentRole) {
        await supabase.auth.updateUser({
          data: {
            role: selectedRole,
            name: safeName || (data.user.user_metadata?.name as string | undefined) || null,
          },
        });
      }

      onLogin({
        id: data.user.id,
        name:
          safeName ||
          (data.user.user_metadata?.name as string | undefined) ||
          (selectedRole === 'artist' ? 'Artist' : 'Venue'),
        email: data.user.email || email.trim(),
        role: selectedRole || currentRole,
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
          <div className="text-center mb-12">
            <h1 className="text-4xl mb-3 text-[var(--text)]">Welcome to Artwalls</h1>
            <p className="text-[var(--text-muted)]">
              Connecting local artists with venues to display and sell physical artworks
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              onClick={() => setSelectedRole('artist')}
              className="group bg-[var(--blue-muted)] rounded-2xl p-8 border-2 border-[var(--blue)] hover:brightness-95 transition"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center group-hover:bg-[var(--blue)] transition-colors">
                  <Palette className="w-8 h-8 text-[var(--blue)] group-hover:text-[var(--on-blue)] transition-colors" />
                </div>
                <div>
                  <h2 className="text-xl mb-2 text-[var(--blue)]">I'm an Artist</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Share and sell your artwork at local venues
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole('venue')}
              className="group bg-[var(--green-muted)] rounded-2xl p-8 border-2 border-[var(--green)] hover:brightness-95 transition"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center group-hover:bg-[var(--green)] transition-colors">
                  <Store className="w-8 h-8 text-[var(--green)] group-hover:text-[var(--accent-contrast)] transition-colors" />
                </div>
                <div>
                  <h2 className="text-xl mb-2 text-[var(--green)]">I'm a Venue</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Support local artists by displaying rotating artworks and earn 10% commission on sales
                  </p>
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
        </div>
      </div>
    </div>
  );
}
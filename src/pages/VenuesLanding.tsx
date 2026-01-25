import { useState } from 'react';
import { Store } from 'lucide-react';
import { SEO } from '../components/SEO';
import type { User, UserRole } from '../App';

interface VenuesLandingPageProps {
  onNavigate?: (page: string) => void;
  onLogin?: (user: User) => void;
}

export function VenuesLandingPage({ onNavigate, onLogin }: VenuesLandingPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign in succeeded but no user returned.');

      const currentRole = (data.user.user_metadata?.role as UserRole) || null;

      if (currentRole !== 'venue') {
        await supabase.auth.updateUser({
          data: {
            role: 'venue',
            name: (data.user.user_metadata?.name as string | undefined) || null,
          },
        });
      }

      try {
        const { apiPost } = await import('../lib/api');
        await apiPost('/api/profile/provision', {});
      } catch (e) {
        console.warn('Profile provision failed', e);
      }

      onLogin?.({
        id: data.user.id,
        name: (data.user.user_metadata?.name as string | undefined) || 'Venue',
        email: data.user.email || email.trim(),
        role: 'venue',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.signInWithOAuth({
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

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <SEO
        title="Artwalls for Venues"
        description="Artwalls makes it easy to host rotating local art without turning your business into a gallery."
      />

      {/* Hero */}
      <section className="py-12 sm:py-20 px-4 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-8 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[var(--text)]">
                Make your space look better. Support local artists. Keep it organized.
              </h1>
              <p className="text-lg sm:text-xl text-[var(--text-muted)] mb-8">
                Artwalls makes it easy to host rotating local art without turning your business into a gallery.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => document.getElementById('venue-login')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3 rounded-lg bg-[var(--green)] text-[var(--accent-contrast)] font-semibold hover:brightness-95 transition"
                >
                  Log In
                </button>
                <button
                  onClick={() => onNavigate?.('login')}
                  className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                >
                  Create Venue Account
                </button>
              </div>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--green-muted)] flex items-center justify-center">
                  <Store className="w-5 h-5 text-[var(--green)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Welcome back.</p>
                  <h2 className="text-xl font-semibold text-[var(--text)]">Venue login</h2>
                </div>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Log in to review artists, manage your wall, and track current displays.
              </p>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                New here? <button onClick={() => onNavigate?.('login')} className="text-[var(--green)] hover:underline">Create a venue account</button> in ~2 minutes.
              </p>
              <form id="venue-login" onSubmit={handleSubmit} className="space-y-4">
                {(errorMessage || infoMessage) && (
                  <div
                    className={
                      'rounded-lg border px-4 py-3 text-sm ' +
                      (errorMessage
                        ? 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--danger)]'
                        : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text)]')
                    }
                    role={errorMessage ? 'alert' : 'status'}
                  >
                    {errorMessage || infoMessage}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-[var(--green)] text-[var(--accent-contrast)] hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Please wait…' : 'Log In'}
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
                  <span className="text-sm">Sign in with Google</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Old way vs Artwalls */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-[var(--text)]">Why venues use Artwalls (instead of random artist DMs)</h2>
          <p className="text-[var(--text-muted)] mb-6">Because the “old way” is chaotic:</p>
          <ul className="list-disc pl-6 space-y-3 text-[var(--text-muted)] mb-8">
            <li>constant messages from artists (hard to vet fast)</li>
            <li>unclear install/rotation expectations</li>
            <li>no standard way to show pricing or sell pieces</li>
            <li>awkward commission convos</li>
          </ul>

          <h3 className="text-xl font-semibold mb-4 text-[var(--text)]">Artwalls gives you a clean process:</h3>
          <ul className="list-disc pl-6 space-y-3 text-[var(--text-muted)]">
            <li>Browse artist profiles + artwork previews (sizes/prices/style upfront)</li>
            <li>Accept applications or invites (you stay in control)</li>
            <li>Track what’s on your wall (placements + rotation dates)</li>
            <li>QR labels for guests (people can scan and learn/buy without bothering staff)</li>
            <li>Optional commission setup (simple + transparent)</li>
            <li>A consistent system so it’s easy to keep art fresh</li>
          </ul>
        </div>
      </section>

      {/* What's in it for my venue */}
      <section className="py-12 sm:py-16 px-4 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[var(--text)]">What’s in it for my venue?</h2>
          <ul className="list-disc pl-6 space-y-3 text-[var(--text-muted)]">
            <li>Your space looks more unique (people literally talk about the walls)</li>
            <li>You support local community (customers love that)</li>
            <li>Optional revenue through commission when pieces sell</li>
            <li>Minimal staff involvement (it shouldn’t slow your day down)</li>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-[var(--text)]">How it works</h2>
          <ol className="space-y-4 text-[var(--text-muted)]">
            <li><span className="font-semibold text-[var(--text)]">1)</span> Create a venue profile + add wall details</li>
            <li><span className="font-semibold text-[var(--text)]">2)</span> Review artists / accept invites</li>
            <li><span className="font-semibold text-[var(--text)]">3)</span> Approve a display + schedule install/rotation</li>
            <li><span className="font-semibold text-[var(--text)]">4)</span> Put up QR labels and let guests explore</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MailCheck, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';

type ViewState = 'verifying' | 'success' | 'already' | 'error' | 'needs-signin';

function parseHashTokens(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const type = params.get('type');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, type };
}

export default function VerifyEmail() {
  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };
  const [view, setView] = useState<ViewState>('verifying');
  const [message, setMessage] = useState('Verifying your email…');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const headline = useMemo(() => {
    if (view === 'success') return "You're verified.";
    if (view === 'already') return 'All set — your email is already verified.';
    if (view === 'needs-signin') return 'Confirmed — now sign in to continue.';
    if (view === 'error') return "That link doesn't look right.";
    return 'Verifying your email…';
  }, [view]);

  useEffect(() => {
    let isMounted = true;

    async function finalize() {
      setView('verifying');
      setMessage('Verifying your email…');

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const hashTokens = parseHashTokens(window.location.hash || '');

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (hashTokens) {
          const { error } = await supabase.auth.setSession({
            access_token: hashTokens.access_token,
            refresh_token: hashTokens.refresh_token,
          });
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const supaUser = data.user;
        if (supaUser?.email) {
          setEmail(supaUser.email);
        }

        if (supaUser?.email_confirmed_at) {
          setView(code || hashTokens ? 'success' : 'already');
          setMessage('Welcome to Artwalls — where local artists meet local venues.');
          return;
        }

        if (!supaUser) {
          setView('needs-signin');
          setMessage('Email confirmed. Please sign in to continue.');
          return;
        }

        setView('success');
        setMessage('Welcome to Artwalls — where local artists meet local venues.');
      } catch (err) {
        console.error('Email verification failed', err);
        if (!isMounted) return;
        setView('error');
        setMessage('This link is invalid or expired. You can request a new one below.');
      }
    }

    finalize();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter an email to resend.');
      return;
    }

    setIsResending(true);
    try {
      const { apiPost } = await import('../lib/api');
      const result = await apiPost('/api/auth/send-verification', { email: email.trim() });
      if (result?.emailSkipped && result?.verificationUrl) {
        toast(`Email sending is not configured. Copy this link to verify: ${result.verificationUrl}`);
      } else {
        toast.success('Verification email sent. Check your inbox.');
      }
    } catch (err: any) {
      console.warn('Custom verification resend failed, falling back to Supabase', err);
      try {
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
        if (error) throw error;
        toast.success('Verification email sent. Check your inbox.');
      } catch (fallbackErr: any) {
        console.error('Resend failed', fallbackErr);
        toast.error(fallbackErr?.message || 'Unable to resend right now.');
      }
    } finally {
      setIsResending(false);
    }
  }

  const primaryCta = (
    <Button
      size="lg"
      onClick={() => navigate('/artist-dashboard')}
      className="w-full sm:w-auto"
    >
      Go to dashboard
    </Button>
  );

  const secondaryCta = (
    <Button
      size="lg"
      variant="outline"
      onClick={() => navigate('/')}
      className="w-full sm:w-auto"
    >
      Browse art
    </Button>
  );

  const signInLink = (
    <button
      className="text-sm text-[var(--blue)] hover:underline"
      onClick={() => navigate('/login')}
      type="button"
    >
      Sign in
    </button>
  );

  const renderIcon = () => {
    if (view === 'verifying') {
      return (
        <div className="h-14 w-14 rounded-full border-2 border-[var(--border)] border-t-[var(--blue)] animate-spin" aria-hidden />
      );
    }
    if (view === 'success') {
      return (
        <div className="h-14 w-14 rounded-full bg-[var(--green-muted)] text-[var(--green)] flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8" />
        </div>
      );
    }
    if (view === 'already') {
      return (
        <div className="h-14 w-14 rounded-full bg-[var(--blue-muted)] text-[var(--blue)] flex items-center justify-center">
          <MailCheck className="h-8 w-8" />
        </div>
      );
    }
    return (
      <div className="h-14 w-14 rounded-full bg-[var(--danger-bg,#fef2f2)] text-[var(--danger,#ef4444)] flex items-center justify-center">
        <AlertCircle className="h-8 w-8" />
      </div>
    );
  };

  return (
    <div
      className="min-h-svh flex items-center justify-center px-4 py-12"
      style={{
        background:
          'radial-gradient(circle at 20% 20%, rgba(47,107,255,0.08), transparent 40%), radial-gradient(circle at 80% 10%, rgba(34,197,94,0.08), transparent 35%), radial-gradient(circle at 50% 80%, rgba(79,70,229,0.08), transparent 35%), var(--bg)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none backdrop-blur-[2px]" aria-hidden />
      <Card className={cn('relative w-full max-w-xl overflow-hidden border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] shadow-xl/50')}>
        <div className="absolute -left-24 top-0 h-48 w-48 rounded-full bg-[var(--blue-muted)] blur-3xl opacity-50" aria-hidden />
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-[var(--green-muted)] blur-3xl opacity-50" aria-hidden />

        <CardHeader className="relative space-y-4">
          <div className="flex items-center gap-4">
            {renderIcon()}
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">{headline}</CardTitle>
              <CardDescription className="text-base text-[var(--text-muted)]">{message}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-6">
          <div className="sr-only" aria-live="polite">
            {headline} — {message}
          </div>

          {(view === 'success' || view === 'already' || view === 'needs-signin') && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {primaryCta}
              {secondaryCta}
              {view === 'needs-signin' && signInLink}
            </div>
          )}

          {view === 'verifying' && (
            <div className="text-[var(--text-muted)]">Hang tight while we confirm your link.</div>
          )}

          {view === 'error' && (
            <div className="space-y-4">
              <p className="text-[var(--text-muted)]">
                This link is invalid or expired. You can request a fresh verification email below.
              </p>
              <form onSubmit={handleResend} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text)]" htmlFor="email">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-[var(--surface-1)]"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="submit" size="lg" disabled={isResending} className="w-full sm:w-auto">
                    {isResending ? (
                      <span className="flex items-center gap-2">
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      'Resend verification email'
                    )}
                  </Button>
                  {secondaryCta}
                  {signInLink}
                </div>
              </form>
            </div>
          )}

          {view !== 'error' && (
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-muted)]">
              <span>Need help?</span>
              <a className="font-medium text-[var(--blue)] hover:underline" href="mailto:support@artwalls.space">
                Contact support
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

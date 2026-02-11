import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://api.artwalls.space';

export default function StripeOnboardingReturn() {
  const searchParams = new URLSearchParams(window.location.search);
  const [status, setStatus] = useState<'checking' | 'success' | 'pending' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const role = searchParams.get('role') as 'artist' | 'venue' | null;

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      if (!role || !['artist', 'venue'].includes(role)) {
        setStatus('error');
        setMessage('Invalid role parameter');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('error');
        setMessage('Not authenticated');
        return;
      }

      const userId = session.user.id;
      const idParam = role === 'artist' ? 'artistId' : 'venueId';
      const response = await fetch(`${API_BASE}/api/stripe/connect/${role}/status?${idParam}=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();

      if ((data.payoutsEnabled || data.payouts_enabled) && (data.chargesEnabled || data.charges_enabled)) {
        setStatus('success');
        setMessage('Your payouts are now enabled! You\'ll receive automatic transfers when sales are made.');
      } else if (data.detailsSubmitted || data.details_submitted) {
        setStatus('pending');
        setMessage('Your information is being verified. This usually takes a few minutes.');
      } else {
        setStatus('pending');
        setMessage('Additional information is required. Please complete your Stripe onboarding.');
      }

      setTimeout(() => {
        window.location.href = role === 'artist' ? '/' : '/';
      }, 3000);
    } catch (err) {
      console.error('Failed to check status', err);
      setStatus('error');
      setMessage('Failed to verify your status. Please try again.');
    }
  }

  const getIcon = () => {
    if (status === 'checking') {
      return (
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      );
    }
    if (status === 'success') {
      return (
        <div className="rounded-full h-16 w-16 bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (status === 'pending') {
      return (
        <div className="rounded-full h-16 w-16 bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
          <svg className="h-10 w-10 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    return (
      <div className="rounded-full h-16 w-16 bg-red-100 dark:bg-red-900 flex items-center justify-center">
        <svg className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  };

  const getTitle = () => {
    if (status === 'checking') return 'Checking your status...';
    if (status === 'success') return 'Payouts Enabled!';
    if (status === 'pending') return 'Verification in Progress';
    return 'Something went wrong';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {getIcon()}
          <h1 className="text-3xl font-bold text-[var(--text)]">
            {getTitle()}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {message}
          </p>
          {status !== 'checking' && (
            <button
              onClick={() => { window.location.href = '/'; }}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

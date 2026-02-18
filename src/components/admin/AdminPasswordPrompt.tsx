import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiPost } from '../../lib/api';

interface AdminPasswordPromptProps {
  onVerify: () => void;
  onCancel: () => void;
}

export function AdminPasswordPrompt({ onVerify, onCancel }: AdminPasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use the authenticated API wrapper — attaches Supabase JWT automatically
      const response = await apiPost<{ ok: boolean }>('/api/admin/verify', { password });
      
      if (response.ok) {
        try {
          // Store a session token, not the raw password. Token expires when tab closes.
          const token = btoa(`admin:${Date.now()}:${Math.random().toString(36).slice(2)}`);
          sessionStorage.setItem('adminSessionToken', token);
          // Clear any legacy raw password storage
          localStorage.removeItem('adminPassword');
        } catch {}
        setPassword('');
        setIsLoading(false);
        onVerify();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
        setIsLoading(false);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Unauthorized') || msg.includes('AUTH_REQUIRED')) {
        setError('Please log in first to access admin features.');
      } else if (msg.includes('Forbidden') || msg.includes('ADMIN_REQUIRED')) {
        setError("Access denied\n\nYou don't have admin access. Contact the site owner to be added to the admin list.");
        setBootstrapAvailable(true);
      } else {
        setError('Verification failed. Please try again.');
      }
      setPassword('');
      setIsLoading(false);
    }
  };

  const handleBootstrap = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await apiPost<{ ok: boolean; message?: string; email?: string }>('/api/admin/bootstrap', {});
      if (response.ok) {
        setBootstrapSuccess(true);
        setError('');
        setBootstrapAvailable(false);
      } else {
        setError('Bootstrap failed — an admin may already exist.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('403') || msg.includes('refused')) {
        setError('An admin already exists. Ask them to add you.');
      } else {
        setError(msg || 'Bootstrap request failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Admin Access</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {bootstrapSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">✅ You are now an admin!</p>
              <p className="text-xs text-green-600 mt-1">Log out and back in, then re-enter your admin password.</p>
            </div>
          )}

          {bootstrapAvailable && !bootstrapSuccess && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <p className="text-xs text-blue-700">
                <strong>First-time setup?</strong> If no admin has been configured yet, you can promote yourself:
              </p>
              <button
                type="button"
                onClick={handleBootstrap}
                disabled={isLoading}
                className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {isLoading ? 'Setting up…' : 'Make me the first admin'}
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

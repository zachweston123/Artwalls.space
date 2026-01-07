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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiPost<{ ok: boolean }>('/api/admin/verify', { password });
      
      if (response.ok) {
        try {
          localStorage.setItem('adminPassword', password);
        } catch {}
        setPassword('');
        setIsLoading(false);
        onVerify();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setPassword('');
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
      <div className="bg-[var(--surface-2)] rounded-xl shadow-2xl max-w-md w-full border border-[var(--border)]">
        {/* Header */}
        <div className="p-8 border-b border-[var(--border)]">
          <div className="w-12 h-12 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-[var(--text)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Admin Access</h1>
          <p className="text-[var(--text-muted)] mt-2">
            Enter your admin password to proceed
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          {/* Password Input */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              Admin Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter admin password"
                autoFocus
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 border border-[var(--border)] rounded-lg bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-[var(--border)] rounded-lg text-[var(--text)] bg-transparent hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="flex-1 px-4 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {/* Helper text */}
          <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
            Press ESC to cancel
          </p>
        </form>
      </div>
    </div>
  );
}

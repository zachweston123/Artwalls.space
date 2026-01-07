import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PasswordSecurityProps {
  onBack: () => void;
}

export function PasswordSecurity({ onBack }: PasswordSecurityProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required' });
      return;
    }
    if (!newPassword) {
      setMessage({ type: 'error', text: 'New password is required' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'New password must be different from current password' });
      return;
    }

    setLoading(true);
    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl mb-1">Password & Security</h1>
          <p className="text-[var(--text-muted)]">Manage your password and security settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Change Password Card */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-[var(--blue)]" />
              </div>
              <div>
                <h2 className="text-2xl mb-1">Change Password</h2>
                <p className="text-sm text-[var(--text-muted)]">Update your password to keep your account secure</p>
              </div>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                  message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                    {message.text}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">At least 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Security Tips Card */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg mb-4">Security Tips</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--blue)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-[var(--blue)]">✓</span>
                </div>
                <div>
                  <p className="text-sm text-[var(--text)] font-medium">Use a strong password</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Mix uppercase, lowercase, numbers, and symbols</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--blue)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-[var(--blue)]">✓</span>
                </div>
                <div>
                  <p className="text-sm text-[var(--text)] font-medium">Don't share your password</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">We'll never ask for your password via email or message</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--blue)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-[var(--blue)]">✓</span>
                </div>
                <div>
                  <p className="text-sm text-[var(--text)] font-medium">Change password regularly</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Update your password every few months</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--blue)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-[var(--blue)]">✓</span>
                </div>
                <div>
                  <p className="text-sm text-[var(--text)] font-medium">Use unique passwords</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Don't reuse passwords across different websites</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="text-sm text-[var(--text-muted)]">Account Status</span>
                <span className="text-sm font-medium text-green-500">Active</span>
              </div>
              <div className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Last password change</p>
                <p className="text-sm text-[var(--text)]">Never</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg mb-4">Help & Support</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 text-sm text-[var(--blue)] hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                Forgot your password?
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-[var(--blue)] hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                Contact support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

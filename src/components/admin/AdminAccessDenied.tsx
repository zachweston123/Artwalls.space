import { ShieldAlert, LogIn, Home } from 'lucide-react';

interface AdminAccessDeniedProps {
  type: 'not-signed-in' | 'not-authorized';
  onSignIn?: () => void;
  onReturnToApp?: () => void;
}

export function AdminAccessDenied({ type, onSignIn, onReturnToApp }: AdminAccessDeniedProps) {
  if (type === 'not-signed-in') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-neutral-400" />
          </div>
          <h1 className="text-3xl mb-3">Admin Access Required</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mb-8">
            Please sign in to access the Admin Console. This area is restricted to authorized staff members only.
          </p>
          <button
            onClick={onSignIn}
            className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-3xl mb-3">Access Denied</h1>
        <p className="text-neutral-600 dark:text-neutral-300 mb-8">
          You don't have admin access. This area is restricted to authorized Artwalls staff members only.
        </p>
        <button
          onClick={onReturnToApp}
          className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Return to App
        </button>
      </div>
    </div>
  );
}

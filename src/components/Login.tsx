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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    // Mock login - create user
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || (selectedRole === 'artist' ? 'Demo Artist' : 'Demo Venue'),
      email: email || `demo@${selectedRole}.com`,
      role: selectedRole,
    };

    onLogin(user);
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl mb-3">Welcome to Artwalls</h1>
            <p className="text-neutral-600">
              Connecting local artists with venues to display and sell physical artworks
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              onClick={() => setSelectedRole('artist')}
              className="group bg-white dark:bg-neutral-800 rounded-2xl p-8 border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:bg-blue-500 dark:group-hover:bg-blue-500 transition-colors">
                  <Palette className="w-8 h-8 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h2 className="text-xl mb-2 text-neutral-900 dark:text-neutral-50">I'm an Artist</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Share and sell your artwork at local venues
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole('venue')}
              className="group bg-white dark:bg-neutral-800 rounded-2xl p-8 border-2 border-neutral-200 dark:border-neutral-700 hover:border-green-500 dark:hover:border-green-400 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center group-hover:bg-green-500 dark:group-hover:bg-green-500 transition-colors">
                  <Store className="w-8 h-8 text-green-600 dark:text-green-400 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h2 className="text-xl mb-2 text-neutral-900 dark:text-neutral-50">I'm a Venue</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            {selectedRole === 'artist' ? (
              <Palette className="w-8 h-8 text-blue-600" />
            ) : (
              <Store className="w-8 h-8 text-green-600" />
            )}
            <h1 className="text-3xl text-neutral-900 dark:text-neutral-50">Artwalls</h1>
          </div>
          <p className="text-neutral-600 dark:text-neutral-300">
            {isSignup ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className={`inline-flex px-3 py-1 rounded-full text-sm mb-6 ${
            selectedRole === 'artist' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}>
            {selectedRole === 'artist' ? 'Artist Account' : 'Venue Account'}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-1">
                  {selectedRole === 'artist' ? 'Artist Name' : 'Venue Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder={selectedRole === 'artist' ? 'Your name' : 'Your venue name'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-lg text-white transition-colors ${
                selectedRole === 'artist'
                  ? 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400'
                  : 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-400'
              }`}
            >
              {isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setSelectedRole(null)}
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              ← Choose different role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
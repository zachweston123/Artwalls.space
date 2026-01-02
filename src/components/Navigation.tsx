import { Palette, Store, LogOut, Menu, Bell } from 'lucide-react';
import type { User } from '../App';

interface NavigationProps {
  user: User;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  onMenuClick?: () => void;
  unreadCount?: number;
}

export function Navigation({ user, onNavigate, onLogout, currentPage, onMenuClick, unreadCount = 2 }: NavigationProps) {
  const isArtist = user.role === 'artist';
  const accentColor = isArtist ? 'blue' : 'green';

  const artistLinks = [
    { id: 'artist-dashboard', label: 'Dashboard' },
    { id: 'artist-artworks', label: 'My Artworks' },
    { id: 'artist-venues', label: 'Available Venues' },
    { id: 'artist-sales', label: 'Sales & Earnings' },
  ];

  const venueLinks = [
    { id: 'venue-dashboard', label: 'Dashboard' },
    { id: 'venue-walls', label: 'My Wall Spaces' },
    { id: 'venue-applications', label: 'Artist Applications' },
    { id: 'venue-current', label: 'Current Artwork' },
    { id: 'venue-sales', label: 'Sales' },
  ];

  const links = isArtist ? artistLinks : venueLinks;

  return (
    <nav className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-900 dark:text-neutral-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              {isArtist ? (
                <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <Store className="w-6 h-6 text-green-600 dark:text-green-400" />
              )}
              <span className="text-xl tracking-tight text-neutral-900 dark:text-neutral-50">Artwalls</span>
            </div>
            
            {/* Desktop Navigation - Hidden on Mobile */}
            <div className="hidden lg:flex gap-1">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === link.id
                      ? isArtist
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button
              onClick={() => onNavigate(user.role === 'artist' ? 'artist-notifications' : 'venue-notifications')}
              className="relative p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className={`absolute top-1 right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center ${
                  isArtist ? 'bg-blue-600 dark:bg-blue-500' : 'bg-green-600 dark:bg-green-500'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Role Badge - Mobile Only */}
            <div className={`lg:hidden px-3 py-1 rounded-full text-xs ${
              isArtist ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              {user.role === 'artist' ? 'Artist' : 'Venue'}
            </div>

            {/* Desktop User Info */}
            <div className="hidden lg:block text-right">
              <div className="text-sm text-neutral-900 dark:text-neutral-100">{user.name}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-500 capitalize">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="hidden lg:block p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
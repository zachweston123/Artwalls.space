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

  const artistLinks = [
    { id: 'artist-dashboard', label: 'Dashboard' },
    { id: 'artist-artworks', label: 'My Artworks' },
    { id: 'artist-venues', label: 'Find Venues' },
    { id: 'artist-sales', label: 'Sales & Earnings' },
  ];

  const venueLinks = [
    { id: 'venue-dashboard', label: 'Dashboard' },
    { id: 'venue-walls', label: 'My Walls' },
    { id: 'venue-applications', label: 'Applications' },
    { id: 'venue-find-artists', label: 'Find Artists' },
    { id: 'venue-current', label: 'Current Art' },
    { id: 'venue-sales', label: 'Sales' },
  ];

  const links = isArtist ? artistLinks : venueLinks;

  return (
    <nav className="bg-[var(--surface-2)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text)]"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              {isArtist ? (
                <Palette className="w-6 h-6 text-[var(--accent)]" />
              ) : (
                <Store className="w-6 h-6 text-[var(--accent)]" />
              )}
              <span className="text-xl tracking-tight text-[var(--text)]">Artwalls</span>
            </div>
            
            {/* Desktop Navigation - Hidden on Mobile */}
            <div className="hidden lg:flex gap-1">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === link.id
                      ? 'bg-[var(--surface-3)] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
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
              className="relative p-2 text-[var(--text-muted)] hover:bg-[var(--surface-3)] rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-[var(--accent-contrast)] text-xs rounded-full flex items-center justify-center bg-[var(--accent)]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Role Badge - Mobile Only */}
            <div className="lg:hidden px-3 py-1 rounded-full text-xs bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]">
              {user.role === 'artist' ? 'Artist' : 'Venue'}
            </div>

            {/* Desktop User Info */}
            <div className="hidden lg:block text-right">
              <div className="text-sm text-[var(--text)]">{user.name}</div>
                <div className="text-xs text-[var(--text-muted)] capitalize">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="hidden lg:block p-2 text-[var(--text-muted)] hover:bg-[var(--surface-3)] rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
import { X, Palette, Store, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import type { User } from '../App';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
}

export function MobileSidebar({ isOpen, onClose, user, onNavigate, onLogout, currentPage }: MobileSidebarProps) {
  const isArtist = user.role === 'artist';

  const artistLinks = [
    { id: 'artist-dashboard', label: 'Dashboard' },
    { id: 'artist-artworks', label: 'My Artworks' },
    { id: 'artist-venues', label: 'Find Venues' },
    { id: 'artist-applications', label: 'Applications' },
    { id: 'artist-sales', label: 'Sales & Earnings' },
    { id: 'artist-notifications', label: 'Notifications' },
    { id: 'artist-profile', label: 'Profile' },
    { id: 'plans-pricing', label: 'Plans & Pricing' },
    { id: 'policies', label: 'Policies & Agreements' },
  ];

  const venueLinks = [
    { id: 'venue-dashboard', label: 'Dashboard' },
    { id: 'venue-walls', label: 'My Walls' },
    { id: 'venue-applications', label: 'Applications' },
    { id: 'venue-find-artists', label: 'Find Artists' },
    { id: 'venue-current', label: 'Current Art' },
    { id: 'venue-sales', label: 'Sales' },
    { id: 'venue-settings', label: 'Settings' },
    { id: 'venue-notifications', label: 'Notifications' },
    { id: 'venue-profile', label: 'My Venue' },
    { id: 'policies', label: 'Policies & Agreements' },
  ];

  const links = isArtist ? artistLinks : venueLinks;

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-72 bg-[var(--surface-2)] border-r border-[var(--border)] shadow-xl z-50 lg:hidden overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            {isArtist ? (
              <Palette className="w-6 h-6 text-[var(--accent)]" />
            ) : (
              <Store className="w-6 h-6 text-[var(--accent)]" />
            )}
            <span className="text-xl tracking-tight text-[var(--text)]">Artwalls</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="text-lg mb-1 text-[var(--text)]">{user.name}</div>
          <div className="inline-flex px-3 py-1 rounded-full text-sm bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]">
            {user.role === 'artist' ? 'Artist' : 'Venue'}
          </div>
        </div>

        {/* Theme */}
        <div className="p-6 border-b border-[var(--border)]">
          <ThemeToggle variant="button" />
        </div>

                {/* Navigation Links */}
        <nav className="p-4">
          <div className="space-y-1">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavigate(link.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentPage === link.id
                    ? 'bg-[var(--surface-3)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
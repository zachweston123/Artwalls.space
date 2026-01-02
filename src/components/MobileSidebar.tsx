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
    { id: 'artist-venues', label: 'Available Venues' },
    { id: 'artist-applications', label: 'Applications' },
    { id: 'artist-sales', label: 'Sales & Earnings' },
    { id: 'artist-notifications', label: 'Notifications' },
    { id: 'artist-profile', label: 'Profile' },
    { id: 'plans-pricing', label: 'Plans & Pricing' },
    { id: 'policies', label: 'Policies & Agreements' },
  ];

  const venueLinks = [
    { id: 'venue-dashboard', label: 'Dashboard' },
    { id: 'venue-walls', label: 'My Wall Spaces' },
    { id: 'venue-applications', label: 'Artist Applications' },
    { id: 'venue-current', label: 'Current Artwork' },
    { id: 'venue-sales', label: 'Sales' },
    { id: 'venue-settings', label: 'Settings' },
    { id: 'venue-notifications', label: 'Notifications' },
    { id: 'venue-profile', label: 'Profile' },
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
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-neutral-800 shadow-xl z-50 lg:hidden overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            {isArtist ? (
              <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <Store className="w-6 h-6 text-green-600 dark:text-green-400" />
            )}
            <span className="text-xl tracking-tight text-neutral-900 dark:text-neutral-50">Artwalls</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors text-neutral-900 dark:text-neutral-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-neutral-200">
          <div className="text-lg mb-1 text-neutral-900 dark:text-neutral-50">{user.name}</div>
          <div className={`inline-flex px-3 py-1 rounded-full text-sm ${
            isArtist ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
            {user.role === 'artist' ? 'Artist' : 'Venue'}
          </div>
        </div>

        {/* Theme */}
        <div className="p-6 border-b border-neutral-200">
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
                    ? isArtist
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
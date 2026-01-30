import { X, Palette, Store, LogOut, LayoutDashboard, Image, Search, Send, FileText, Bell, User, CreditCard, Shield, Mail, ShoppingCart, Frame, Users, BookOpen, Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import type { User as UserType } from '../App';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
}

export function MobileSidebar({ isOpen, onClose, user, onNavigate, onLogout, currentPage }: MobileSidebarProps) {
  const isArtist = user.role === 'artist';
  const activePage = currentPage === 'artist-settings' || currentPage === 'venue-settings' ? 'settings' : currentPage;

  const artistLinks = [
    { id: 'artist-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'artist-artworks', label: 'My Artworks', icon: Image },
    { id: 'artist-venues', label: 'Find Venues', icon: Search },
    { id: 'artist-applications', label: 'Applications', icon: Send },
    { id: 'artist-invites', label: 'Invitations', icon: Mail },
    { id: 'artist-invite-venue', label: 'Invite a Venue', icon: Mail },
    { id: 'artist-referrals', label: 'Referrals', icon: FileText },
    { id: 'artist-sales', label: 'Sales & Earnings', icon: ShoppingCart },
    { id: 'artist-notifications', label: 'Notifications', icon: Bell },
    { id: 'artist-profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'plans-pricing', label: 'Plans & Pricing', icon: CreditCard },
    { id: 'policies', label: 'Policies & Agreements', icon: Shield },
  ];

  const venueLinks = [
    { id: 'venue-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'venue-profile', label: 'My Venue', icon: Store },
    { id: 'venue-walls', label: 'My Walls', icon: Frame },
    { id: 'venue-applications', label: 'Applications', icon: Send },
    { id: 'venue-find-artists', label: 'Find Artists', icon: Users },
    { id: 'venue-current', label: 'Current Art', icon: Image },
    { id: 'venue-sales', label: 'Sales', icon: ShoppingCart },
    { id: 'venue-partner-kit', label: 'Success Guide', icon: BookOpen },
    { id: 'venue-notifications', label: 'Notifications', icon: Bell },
    { id: 'policies', label: 'Policies & Agreements', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
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
              <Palette className="w-6 h-6 text-[var(--blue)]" />
            ) : (
              <Store className="w-6 h-6 text-[var(--green)]" />
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
        <nav className="p-4 pb-24">
          <div className="space-y-1">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavigate(link.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activePage === link.id
                    ? 'bg-[var(--surface-3)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
                }`}
              >
                <link.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{link.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
import { useEffect, useRef, useState } from 'react';
import { Palette, Store, LogOut, Menu, Bell, ChevronDown } from 'lucide-react';
import type { User } from '../App';
import { getMyNotifications } from '../lib/api';

interface NavigationProps {
  user: User | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  onMenuClick?: () => void;
  unreadCount?: number;
}

export function Navigation({ user, onNavigate, onLogout, currentPage, onMenuClick, unreadCount = 2 }: NavigationProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message?: string; createdAt: string; isRead?: boolean }>>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const learnRef = useRef<HTMLDivElement>(null);
  const [showLearnMenu, setShowLearnMenu] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (learnRef.current && !learnRef.current.contains(e.target as Node)) {
        setShowLearnMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showNotifications || !user) return;
    let mounted = true;
    setLoadingNotifications(true);
    getMyNotifications()
      .then(({ notifications: items }) => {
        if (!mounted) return;
        setNotifications((items || []).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message || '',
          createdAt: n.createdAt,
          isRead: n.isRead,
        })));
      })
      .catch(() => {
        if (!mounted) return;
        setNotifications([]);
      })
      .finally(() => {
        if (mounted) setLoadingNotifications(false);
      });
    return () => {
      mounted = false;
    };
  }, [showNotifications]);

  if (!user) {
    const learnLinks = [
      { id: 'why-artwalls-artist', label: 'Why Artwalls (Artists)' },
      { id: 'venues', label: 'Why Artwalls (Venues)' },
      { id: 'plans-pricing', label: 'Plans & Pricing' },
    ];

    return (
      <nav className="bg-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Palette className="w-6 h-6 text-[var(--blue)]" />
              <span className="text-xl tracking-tight text-[var(--text)]">Artwalls</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={learnRef}>
                <button
                  onClick={() => setShowLearnMenu((prev) => !prev)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
                >
                  Learn
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showLearnMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl z-50">
                    {learnLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => {
                          setShowLearnMenu(false);
                          onNavigate(link.id);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate('venues')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  currentPage === 'venues'
                    ? 'bg-[var(--surface-3)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                }`}
              >
                Venues
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const isArtist = user.role === 'artist';

  const artistLinks = [
    { id: 'artist-dashboard', label: 'Dashboard' },
    { id: 'artist-profile', label: 'Profile' },
    { id: 'artist-artworks', label: 'My Artworks' },
    { id: 'artist-venues', label: 'Find Venues' },
    { id: 'artist-applications', label: 'Applications' },
    { id: 'artist-invites', label: 'Invitations' },
    { id: 'artist-invite-venue', label: 'Invite a Venue' },
    { id: 'artist-referrals', label: 'Referrals' },
    { id: 'artist-sales', label: 'Sales & Earnings' },
    { id: 'artist-settings', label: 'Settings' },
  ];

  const venueLinks = [
    { id: 'venue-dashboard', label: 'Dashboard' },
    { id: 'venue-profile', label: 'My Venue' },
    { id: 'venue-walls', label: 'My Walls' },
    { id: 'venue-applications', label: 'Applications' },
    { id: 'venue-find-artists', label: 'Find Artists' },
    { id: 'venue-current', label: 'Current Art' },
    { id: 'venue-sales', label: 'Sales' },
    { id: 'venue-partner-kit', label: 'Success Guide' },
  ];

  const links = isArtist ? artistLinks : venueLinks;

  const learnLinks = [
    ...(isArtist
      ? [{ id: 'why-artwalls-artist', label: 'Why Artwalls (Artists)' }]
      : [{ id: 'venues', label: 'Why Artwalls (Venues)' }]),
    { id: 'plans-pricing', label: 'Plans & Pricing' },
  ];

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
                <Palette className="w-6 h-6 text-[var(--blue)]" />
              ) : (
                <Store className="w-6 h-6 text-[var(--green)]" />
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

              <div className="relative" ref={learnRef}>
                <button
                  onClick={() => setShowLearnMenu((prev) => !prev)}
                  className="px-4 py-2 rounded-lg transition-colors text-[var(--text-muted)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
                >
                  Learn
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showLearnMenu && (
                  <div className="absolute left-0 mt-2 w-56 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl z-50">
                    {learnLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => {
                          setShowLearnMenu(false);
                          onNavigate(link.id);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative p-2 text-[var(--text-muted)] hover:bg-[var(--surface-3)] rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 text-[var(--accent-contrast)] text-xs rounded-full flex items-center justify-center bg-[var(--accent)]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <span className="text-sm font-semibold text-[var(--text)]">Notifications</span>
                    <button
                      onClick={() => onNavigate(user.role === 'artist' ? 'artist-notifications' : 'venue-notifications')}
                      className="text-xs text-[var(--blue)] hover:underline"
                    >
                      View all
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifications && (
                      <div className="px-4 py-6 text-xs text-[var(--text-muted)]">Loading notifications...</div>
                    )}
                    {!loadingNotifications && notifications.length === 0 && (
                      <div className="px-4 py-6 text-xs text-[var(--text-muted)]">No notifications yet.</div>
                    )}
                    {!loadingNotifications && notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 border-b border-[var(--border)] last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-[var(--text)]">
                            {n.title}
                            {!n.isRead && <span className="ml-2 inline-block w-2 h-2 bg-[var(--blue)] rounded-full" />}
                          </p>
                          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {n.message && <p className="text-xs text-[var(--text-muted)] mt-1">{n.message}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
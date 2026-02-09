// SETTINGS_PATCH_TEST_NAV
import { useEffect, useRef, useState } from 'react';
import { Palette, Store, LogOut, Menu, Bell, ChevronDown, Grid, BarChart, Compass, Settings as SettingsIcon, Shield, HelpCircle, BookOpen, ChevronRight } from 'lucide-react';
import type { User } from '../App';
import { getMyNotifications, setNotificationReadState } from '../lib/api';

interface NavigationProps {
  user: User | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  onMenuClick?: () => void;
  unreadCount?: number;
}

export function Navigation({ user, onNavigate, onLogout, currentPage, onMenuClick, unreadCount = 0 }: NavigationProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type?: string; title: string; message?: string; createdAt: string; isRead?: boolean; artworkId?: string | null; orderId?: string | null }>>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showNotifications || !user) return;
    let mounted = true;
    setLoadingNotifications(true);
    getMyNotifications(user.id, user.role || '')
      .then(({ notifications: items }) => {
        if (!mounted) return;
        setNotifications((items || []).map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message || '',
          createdAt: n.createdAt,
          isRead: n.isRead,
          artworkId: n.artworkId,
          orderId: n.orderId,
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
  }, [showNotifications, user?.id, user?.role]);

  if (!user) {
    const learnLinks = [
      { id: 'why-artwalls-artist', label: 'For Artists' },
      { id: 'venues', label: 'For Venues' },
      { id: 'plans-pricing', label: 'Plans & Pricing' },
    ];

    return (
      <nav className="bg-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <Palette className="w-6 h-6 text-[var(--blue)]" />
              <span className="text-xl tracking-tight text-[var(--text)]">Artwalls</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpenMenu(openMenu === 'learn' ? null : 'learn')}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
                  aria-expanded={openMenu === 'learn'}
                  aria-haspopup="menu"
                >
                  Learn
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openMenu === 'learn' && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl z-50">
                    {learnLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => {
                          setOpenMenu(null);
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
                onClick={() => onNavigate('plans-pricing')}
                className={`hidden sm:inline-flex px-3 py-2 rounded-lg transition-colors ${
                  currentPage === 'plans-pricing'
                    ? 'bg-[var(--surface-3)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                }`}
              >
                Pricing
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
  const settingsTarget = isArtist ? 'artist-settings' : 'venue-settings';
  const activePage = currentPage === 'artist-settings' || currentPage === 'venue-settings' ? 'settings' : currentPage;

  const manageLinks = isArtist
    ? [
        { id: 'artist-profile', label: 'Profile' },
        { id: 'artist-artworks', label: 'My Artworks' },
        { id: 'artist-curated-sets', label: 'Curated Sets' },
        { id: 'artist-applications', label: 'Applications' },
        { id: 'artist-invites', label: 'Invitations' },
        { id: 'artist-invite-venue', label: 'Invite a Venue' },
      ]
    : [
        { id: 'venue-profile-edit', label: 'Edit Venue Profile' },
        { id: 'venue-find-artists', label: 'Find Artists' },
        { id: 'venue-curated-sets', label: 'Curated Sets' },
        { id: 'venue-walls', label: 'My Walls' },
        { id: 'venue-applications', label: 'Applications' },
        { id: 'venue-current', label: 'Current Art' },
      ];

  const discoverLinks = isArtist
    ? [
        { id: 'artist-venues', label: 'Find Venues' },
      ]
    : [
        { id: 'venue-find-artists', label: 'Find Artists' },
      ];

  const performanceLinks = isArtist
    ? [
        { id: 'artist-sales', label: 'Sales & Earnings' },
        { id: 'artist-analytics', label: 'Analytics' },
      ]
    : [
        { id: 'venue-sales', label: 'Sales' },
        { id: 'venue-analytics', label: 'Analytics' },
        { id: 'venue-wall-stats', label: 'Wall Stats' },
      ];

  const learnLinks = isArtist
    ? [
        { id: 'why-artwalls-artist', label: 'Why Artwalls' },
        { id: 'artist-referrals', label: 'Referrals' },
        { id: 'plans-pricing', label: 'Plans & Pricing' },
      ]
    : [
        { id: 'venues', label: 'Why Artwalls' },
        { id: 'venue-partner-kit', label: 'Success Guide' },
      ];

  const homeTarget = isArtist ? 'artist-dashboard' : 'venue-dashboard';

  const isActiveGroup = (ids: string[]) => ids.includes(activePage);

  const manageActive = isActiveGroup(manageLinks.map((l) => l.id));
  const discoverActive = isActiveGroup(discoverLinks.map((l) => l.id));
  const performanceActive = isActiveGroup(performanceLinks.map((l) => l.id));
  const learnActive = isActiveGroup(learnLinks.map((l) => l.id));
  const userInitial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  const hasUnread = notifications.length
    ? notifications.some((n) => !n.isRead)
    : (unreadCount || 0) > 0;

  const resolveNotificationTarget = (n: { type?: string; artworkId?: string | null }) => {
    if (n.type === 'artwork_sold') return isArtist ? 'artist-sales' : 'venue-sales';
    if (n.type === 'artwork_approved') return 'artist-artworks';
    if (n.type === 'venue_invite' || n.type === 'venue_invite_question') return 'artist-invites';
    return homeTarget;
  };

  const handleNotificationClick = async (n: { id: string; isRead?: boolean; type?: string; artworkId?: string | null }) => {
    const nextState = !n.isRead;
    setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: nextState } : item));
    setShowNotifications(false);
    try {
      await setNotificationReadState(n.id, nextState);
    } catch (err) {
      // If server fails, revert local state to avoid desync
      setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: n.isRead } : item));
      console.error('Failed to update notification read state', err);
    }
    onNavigate(resolveNotificationTarget(n));
  };

  const renderMenu = (menuId: string, label: string, links: { id: string; label: string }[], active: boolean, icon?: JSX.Element) => (
    <div className="relative">
      <button
        onClick={() => setOpenMenu(openMenu === menuId ? null : menuId)}
        className={`px-3 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
          active ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
        }`}
        aria-expanded={openMenu === menuId}
        aria-haspopup="menu"
      >
        {icon}
        <span>{label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {openMenu === menuId && (
        <div className="absolute left-0 mt-2 w-56 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl z-50">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setOpenMenu(null);
                onNavigate(link.id);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                activePage === link.id ? 'text-[var(--text)] bg-[var(--surface-3)]' : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <nav className="bg-[var(--surface-2)] border-b border-[var(--border)]" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text)]"
              aria-label="Open navigation menu"
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
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => onNavigate(homeTarget)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  activePage === homeTarget ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                }`}
              >
                Dashboard
              </button>

              {renderMenu('manage', 'Manage', manageLinks, manageActive, <Grid className="w-4 h-4" />)}
              {renderMenu('discover', 'Discover', discoverLinks, discoverActive, <Compass className="w-4 h-4" />)}
              {renderMenu('performance', 'Performance', performanceLinks, performanceActive, <BarChart className="w-4 h-4" />)}
              {renderMenu('learn', 'Learn', learnLinks, learnActive, <BookOpen className="w-4 h-4" />)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative p-2 text-[var(--text-muted)] hover:bg-[var(--surface-3)] rounded-lg transition-colors"
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--accent)] border border-[var(--surface-1)]" />
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
                    {!loadingNotifications && notifications.map((n) => {
                      const target = resolveNotificationTarget(n);
                      const dateLabel = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-b-0 transition-colors ${n.isRead ? 'bg-[var(--surface-1)]' : 'bg-[var(--surface-2)]'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-[var(--text)] flex items-center gap-2">
                              {n.title}
                              {!n.isRead && <span className="inline-block w-2 h-2 bg-[var(--blue)] rounded-full" aria-label="Unread notification" />}
                            </p>
                            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{dateLabel}</span>
                          </div>
                          {n.message && <p className="text-xs text-[var(--text-muted)] mt-1">{n.message}</p>}
                          <div className="mt-2 flex items-center text-[11px] uppercase tracking-wide text-[var(--blue)]">
                            <span>View</span>
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
                className="flex items-center gap-2 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                aria-haspopup="menu"
                aria-expanded={openMenu === 'user'}
              >
                <span className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm font-semibold">
                  {userInitial}
                </span>
                <div className="hidden xl:flex flex-col items-start leading-tight">
                  <span className="text-sm text-[var(--text)]">{user.name}</span>
                  <span className="text-xs text-[var(--text-muted)] capitalize">{user.role}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              </button>

              {openMenu === 'user' && (
                <div className="absolute right-0 mt-2 w-60 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl z-50">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onNavigate(settingsTarget);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onNavigate('policies');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Policies & Agreements
                  </button>
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      try {
                        window.location.href = 'mailto:support@artwalls.space';
                      } catch {
                        onNavigate('policies');
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Help & Support
                  </button>
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
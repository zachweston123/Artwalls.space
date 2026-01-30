import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Megaphone,
  Tag,
  Activity,
  Shield,
  CreditCard,
  Mail,
  Gift,
  LogOut,
} from 'lucide-react';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export function AdminSidebar({ currentPage, onNavigate, onLogout, userName, userEmail }: AdminSidebarProps) {
  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-sales', label: 'Sales & GMV', icon: ShoppingCart },
    { id: 'admin-stripe-payments', label: 'Stripe Payments', icon: CreditCard },
    { id: 'admin-announcements', label: 'Announcements', icon: Megaphone },
    { id: 'admin-promo-codes', label: 'Promo Codes', icon: Tag },
    { id: 'admin-support-messages', label: 'Support Messages', icon: Mail },
    { id: 'admin-referrals', label: 'Referrals', icon: Gift },
    { id: 'admin-activity-log', label: 'Activity Log', icon: Activity },
    // { id: 'admin-settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 bg-[var(--surface-2)] border-r border-[var(--border)] flex flex-col">
      {/* Admin Badge */}
      <div className="p-6 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--blue)] rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-[var(--on-blue)]" />
          </div>
          <div>
            <h2 className="text-sm text-[var(--text)]">Admin Console</h2>
            <p className="text-xs text-[var(--text-muted)]">Internal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isActive
                  ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-[var(--border)] space-y-3 flex-shrink-0 bg-[var(--surface-2)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center">
            <span className="text-xs text-[var(--text)]">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text)] truncate">{userName || 'Admin User'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{userEmail || 'admin@artwalls.space'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

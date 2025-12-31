import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Megaphone, 
  Tag, 
  Activity, 
  Settings,
  Shield
} from 'lucide-react';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function AdminSidebar({ currentPage, onNavigate }: AdminSidebarProps) {
  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-orders', label: 'Orders & Payments', icon: ShoppingCart },
    { id: 'admin-announcements', label: 'Announcements', icon: Megaphone },
    { id: 'admin-promo-codes', label: 'Promo Codes', icon: Tag },
    { id: 'admin-activity-log', label: 'Activity Log', icon: Activity },
    { id: 'admin-settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
      {/* Admin Badge */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm text-neutral-900">Admin Console</h2>
            <p className="text-xs text-neutral-500">Internal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isActive
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
            <span className="text-xs text-neutral-700">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-900 truncate">Admin User</p>
            <p className="text-xs text-neutral-500">admin@artwalls.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

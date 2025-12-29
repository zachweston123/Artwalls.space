import { Store, Mail, MapPin, Clock, DollarSign, Edit } from 'lucide-react';

interface VenueProfileProps {
  onNavigate: (page: string) => void;
}

export function VenueProfile({ onNavigate }: VenueProfileProps) {
  // Mock data - in production this would come from user state
  const profile = {
    name: 'Brew & Palette Café',
    email: 'contact@brewpalette.com',
    address: '123 Arts District, Portland, OR 97209',
    totalEarnings: 487.50,
    wallSpaces: 3,
    activeDisplays: 2,
    installWindow: {
      day: 'Monday',
      time: '9:00 AM - 11:00 AM',
    },
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Venue Profile</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Manage your venue information and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Store className="w-10 h-10 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <h2 className="text-2xl mb-1 text-neutral-900 dark:text-neutral-50">{profile.name}</h2>
                  <span className="inline-flex px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    Venue Account
                  </span>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400 text-white rounded-lg transition-colors">
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <Mail className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-neutral-500 dark:text-neutral-400 mb-1">Contact Email</label>
                  <p className="text-neutral-900 dark:text-neutral-50">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <MapPin className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-neutral-500 dark:text-neutral-400 mb-1">Venue Address</label>
                  <p className="text-neutral-900 dark:text-neutral-50">{profile.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <Clock className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-neutral-500 dark:text-neutral-400 mb-1">Install Window</label>
                  <p className="text-neutral-900 dark:text-neutral-50">
                    {profile.installWindow.day}s, {profile.installWindow.time}
                  </p>
                  <button 
                    onClick={() => onNavigate('venue-settings')}
                    className="text-sm text-green-600 dark:text-green-400 hover:underline mt-1"
                  >
                    Update schedule
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-50">Wall Space Guidelines</h3>
            <div className="space-y-3">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                  <strong className="text-neutral-900 dark:text-neutral-50">Artwork Requirements:</strong>
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1 list-disc list-inside">
                  <li>Must be gallery-wrapped or framed</li>
                  <li>Professional presentation required</li>
                  <li>Family-friendly content only</li>
                </ul>
              </div>
              <button 
                onClick={() => onNavigate('venue-settings')}
                className="w-full text-left px-4 py-3 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <p className="text-neutral-900 dark:text-neutral-50 mb-1">Manage Guidelines</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Customize your venue's artwork preferences</p>
              </button>
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-50">Account Settings</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                <p className="text-neutral-900 dark:text-neutral-50 mb-1">Password & Security</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Change your password and security settings</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                <p className="text-neutral-900 dark:text-neutral-50 mb-1">Notification Preferences</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage email and push notifications</p>
              </button>
            </div>
          </div>
        </div>

        {/* Earnings & Quick Stats */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-lg text-neutral-900 dark:text-neutral-50">Commission Earnings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Total Commission (10%)</p>
                <p className="text-2xl text-neutral-900 dark:text-neutral-50">${profile.totalEarnings.toFixed(2)}</p>
              </div>
              
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <p className="text-2xl text-neutral-900 dark:text-neutral-50">{profile.wallSpaces}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Wall Spaces</p>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <p className="text-2xl text-green-600 dark:text-green-400">{profile.activeDisplays}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Active</p>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('venue-sales')}
              className="w-full mt-4 px-4 py-2 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
            >
              View Sales Report
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg mb-3 text-neutral-900 dark:text-neutral-50">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('venue-walls')}
                className="w-full text-left px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Manage Wall Spaces
              </button>
              <button 
                onClick={() => onNavigate('venue-applications')}
                className="w-full text-left px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Review Applications
              </button>
              <button 
                onClick={() => onNavigate('venue-current')}
                className="w-full text-left px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Current Artwork
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

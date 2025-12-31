import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, Megaphone } from 'lucide-react';

interface AdminAnnouncementsProps {
  onCreateAnnouncement: () => void;
}

export function AdminAnnouncements({ onCreateAnnouncement }: AdminAnnouncementsProps) {
  const mockAnnouncements = [
    {
      id: '1',
      title: 'New Protection Plan Available',
      audience: 'Artists',
      type: 'Banner',
      status: 'Active',
      startDate: '2024-01-15',
      endDate: '2024-02-15',
      createdBy: 'Admin User',
    },
    {
      id: '2',
      title: 'System Maintenance Scheduled',
      audience: 'All',
      type: 'Notification',
      status: 'Scheduled',
      startDate: '2024-02-01',
      endDate: null,
      createdBy: 'Tech Team',
    },
  ];

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'Artists':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'Venues':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'Scheduled':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
      case 'Expired':
        return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">Announcements</h1>
          <p className="text-neutral-600">
            Manage global and role-targeted announcements
          </p>
        </div>
        <button
          onClick={onCreateAnnouncement}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Announcement
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Title</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Audience</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Type</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Status</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Start Date</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">End Date</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Created By</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {mockAnnouncements.map((announcement) => (
                <tr key={announcement.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm text-neutral-900">{announcement.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getAudienceColor(announcement.audience)}`}>
                      {announcement.audience}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{announcement.type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(announcement.status)}`}>
                      {announcement.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{announcement.startDate}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{announcement.endDate || '—'}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{announcement.createdBy}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {mockAnnouncements.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2">No announcements yet</h3>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">
            Create your first announcement to communicate with users
          </p>
          <button
            onClick={onCreateAnnouncement}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Create Announcement
          </button>
        </div>
      )}
    </div>
  );
}

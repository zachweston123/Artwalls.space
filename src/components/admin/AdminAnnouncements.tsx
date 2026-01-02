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
        return 'bg-[var(--surface-3)] text-[var(--blue)] border border-[var(--border)]';
      case 'Venues':
        return 'bg-[var(--surface-3)] text-[var(--green)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      case 'Scheduled':
        return 'bg-[var(--surface-3)] text-[var(--warning)] border border-[var(--border)]';
      case 'Expired':
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-[var(--text)]">Announcements</h1>
          <p className="text-[var(--text-muted)]">
            Manage global and role-targeted announcements
          </p>
        </div>
        <button
          onClick={onCreateAnnouncement}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Announcement
        </button>
      </div>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Title</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Audience</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Type</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Status</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Start Date</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">End Date</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Created By</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {mockAnnouncements.map((announcement) => (
                <tr key={announcement.id} className="hover:bg-[var(--surface-3)] transition-colors">
                  <td className="px-6 py-4 text-sm text-[var(--text)]">{announcement.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getAudienceColor(announcement.audience)}`}>
                      {announcement.audience}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{announcement.type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(announcement.status)}`}>
                      {announcement.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{announcement.startDate}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{announcement.endDate || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{announcement.createdBy}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-[var(--danger)] hover:brightness-90">
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
        <div className="text-center py-16 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No announcements yet</h3>
          <p className="text-[var(--text-muted)] mb-6">
            Create your first announcement to communicate with users
          </p>
          <button
            onClick={onCreateAnnouncement}
            className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
          >
            Create Announcement
          </button>
        </div>
      )}
    </div>
  );
}

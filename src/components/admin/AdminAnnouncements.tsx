import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, Megaphone } from 'lucide-react';

interface AdminAnnouncementsProps {
  onCreateAnnouncement: () => void;
}

export function AdminAnnouncements({ onCreateAnnouncement }: AdminAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    audience: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string | null;
    createdBy: string;
  }>>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'delete' | null>(null);

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
              {announcements.map((announcement) => (
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
                      <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => { setSelected(announcement); setMode('view'); }}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => { setSelected(announcement); setMode('edit'); }}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-[var(--danger)] hover:brightness-90" onClick={() => { setSelected(announcement); setMode('delete'); }}>
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

      {announcements.length === 0 && (
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

      {selected && mode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl">{mode === 'view' ? 'View Announcement' : mode === 'edit' ? 'Edit Announcement' : 'Delete Announcement'}</h3>
              <button onClick={() => { setSelected(null); setMode(null); }} className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {mode === 'view' && (
              <div className="space-y-2 text-sm">
                <div><strong>Title:</strong> {selected.title}</div>
                <div><strong>Audience:</strong> {selected.audience}</div>
                <div><strong>Type:</strong> {selected.type}</div>
                <div><strong>Status:</strong> {selected.status}</div>
                <div><strong>Start:</strong> {selected.startDate}</div>
                <div><strong>End:</strong> {selected.endDate || '—'}</div>
              </div>
            )}
            {mode === 'edit' && (
              <div className="space-y-3">
                <input defaultValue={selected.title} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)]" />
                <button onClick={() => { setMode(null); }} className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg">Save</button>
              </div>
            )}
            {mode === 'delete' && (
              <div className="space-y-4">
                <p className="text-[var(--text-muted)]">Delete "{selected.title}"?</p>
                <div className="flex gap-3">
                  <button onClick={() => { setSelected(null); setMode(null); }} className="flex-1 px-4 py-2 bg-[var(--surface-2)] rounded-lg">Cancel</button>
                  <button onClick={() => { setAnnouncements(announcements.filter(a => a.id !== selected.id)); setSelected(null); setMode(null); }} className="flex-1 px-4 py-2 bg-[var(--danger)] text-white rounded-lg">Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

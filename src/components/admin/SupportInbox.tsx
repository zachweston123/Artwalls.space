import { useState, useEffect } from 'react';
import { Mail, ChevronRight, Search, Filter } from 'lucide-react';
import { apiGet } from '../../lib/api';

interface SupportMessage {
  id: string;
  email: string;
  message: string;
  roleContext: string;
  pageSource: string;
  status: 'new' | 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface SupportInboxProps {
  onSelectMessage?: (messageId: string) => void;
}

export function SupportInbox({ onSelectMessage }: SupportInboxProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'open' | 'closed'>('new');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchEmail && { searchEmail }),
        ...(searchMessage && { searchMessage }),
      });

      const data = await apiGet<{ messages: SupportMessage[]; total: number }>(`/api/admin/support/messages?${params}`);
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
  }, [statusFilter, searchEmail, searchMessage]);

  useEffect(() => {
    fetchMessages();
  }, [offset, statusFilter, searchEmail, searchMessage]);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      open: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || '';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      artist: 'text-blue-600',
      venue: 'text-green-600',
      other: 'text-gray-600',
    };
    return colors[role] || '';
  };

  const newCount = messages.filter((m) => m.status === 'new').length;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-8 h-8 text-[var(--blue)]" />
          <h1 className="text-3xl font-bold">Support Messages</h1>
        </div>
        <p className="text-[var(--text-muted)]">
          View and manage contact form submissions from the "Why Artwalls" pages.
        </p>
      </div>

      {/* Status Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            statusFilter === 'all'
              ? 'bg-[var(--blue)] text-[var(--on-blue)]'
              : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-1)]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('new')}
          className={`px-4 py-2 rounded-lg font-medium transition relative ${
            statusFilter === 'new'
              ? 'bg-blue-600 text-white'
              : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-1)]'
          }`}
        >
          New {newCount > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2">{newCount}</span>}
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            statusFilter === 'open'
              ? 'bg-yellow-600 text-white'
              : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-1)]'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setStatusFilter('closed')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            statusFilter === 'closed'
              ? 'bg-gray-600 text-white'
              : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-1)]'
          }`}
        >
          Closed
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by message..."
            value={searchMessage}
            onChange={(e) => setSearchMessage(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
          />
        </div>
      </div>

      {/* Messages Table */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
          <Mail className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-muted)]">
            {statusFilter === 'new' && searchEmail === '' && searchMessage === ''
              ? 'No new messages'
              : 'No messages found'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--surface-1)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-[var(--text)]">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-[var(--text)]">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-[var(--text)]">Role</th>
                  <th className="text-left p-4 text-sm font-semibold text-[var(--text)]">Source</th>
                  <th className="text-left p-4 text-sm font-semibold text-[var(--text)]">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-[var(--text)]">Message Preview</th>
                  <th className="text-left p-4 text-sm font-semibold text-[var(--text)]"></th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-1)] transition cursor-pointer"
                    onClick={() => onSelectMessage?.(msg.id)}
                  >
                    <td className="p-4 text-sm text-[var(--text-muted)]">{formatDate(msg.createdAt)}</td>
                    <td className="p-4 text-sm text-[var(--text)] font-medium">{msg.email}</td>
                    <td className="p-4 text-sm">
                      <span className={`capitalize font-medium ${getRoleColor(msg.roleContext)}`}>
                        {msg.roleContext}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">
                      {msg.pageSource === 'why_artwalls_artist'
                        ? '🎨 Artist'
                        : msg.pageSource === 'why_artwalls_venue'
                          ? '🏛️ Venue'
                          : msg.pageSource}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(msg.status)}`}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)] truncate max-w-xs">
                      {msg.message.substring(0, 60)}...
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-[var(--text-muted)]">
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} messages
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-1)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <div className="flex items-center px-4 py-2 text-sm text-[var(--text-muted)]">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-1)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

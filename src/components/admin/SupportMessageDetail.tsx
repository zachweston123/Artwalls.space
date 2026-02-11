import { useState, useEffect } from 'react';
import { ChevronLeft, Mail, Clock, User, MapPin } from 'lucide-react';
import { apiGet, apiPatch } from '../../lib/api';

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

interface SupportMessageDetailProps {
  messageId: string;
  onBack: () => void;
}

export function SupportMessageDetail({ messageId, onBack }: SupportMessageDetailProps) {
  const [message, setMessage] = useState<SupportMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchMessage = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<SupportMessage>(`/api/admin/support/messages/${messageId}`);
        setMessage(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load message');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [messageId]);

  const handleStatusChange = async (newStatus: 'new' | 'open' | 'closed') => {
    if (!message) return;

    setUpdating(true);
    try {
      const updatedMessage = await apiPatch<SupportMessage>(
        `/api/admin/support/messages/${messageId}/status`,
        { status: newStatus },
      );
      setMessage(updatedMessage);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getPageSourceLabel = (source: string) => {
    if (source === 'why_artwalls_artist') return '🎨 Why Artwalls - Artist';
    if (source === 'why_artwalls_venue') return '🏛️ Why Artwalls - Venue';
    return source;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Loading message...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white hover:brightness-95 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Message not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:brightness-95 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold">Support Message</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Message Card */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-8 mb-6">
            <div className="mb-6 pb-6 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-4">From: {message.email}</h2>
              <p className="text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words max-w-2xl">
                {message.message}
              </p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Submitted
                </label>
                <p className="text-sm text-[var(--text)]">{formatDate(message.createdAt)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Last Updated
                </label>
                <p className="text-sm text-[var(--text)]">{formatDate(message.updatedAt)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Role Context
                </label>
                <p className="text-sm text-[var(--text)] capitalize">{message.roleContext}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Page Source
                </label>
                <p className="text-sm text-[var(--text)]">{getPageSourceLabel(message.pageSource)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Status Control */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6 sticky top-8">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-4">Status</h3>

            <div className="space-y-2 mb-6">
              {(['new', 'open', 'closed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 ${
                    message.status === status
                      ? status === 'new'
                        ? 'bg-blue-600 text-white'
                        : status === 'open'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-600 text-white'
                      : 'bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)]'
                  }`}
                >
                  <span className="capitalize">{status}</span>
                  {message.status === status && <span className="ml-2">✓</span>}
                </button>
              ))}
            </div>

            <div
              className={`p-3 rounded-lg text-sm ${
                message.status === 'new'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : message.status === 'open'
                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    : 'bg-gray-50 text-gray-800 border border-gray-200'
              }`}
            >
              <p className="font-medium">Current Status</p>
              <p className="text-xs mt-1 opacity-75">
                {message.status === 'new'
                  ? 'New message - needs attention'
                  : message.status === 'open'
                    ? 'In progress'
                    : 'Resolved'}
              </p>
            </div>

            {/* Contact Option */}
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <a
                href={`mailto:${message.email}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:brightness-95 transition font-medium"
              >
                <Mail className="w-4 h-4" />
                Reply via Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { AlertCircle, Search, Filter, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/api';

interface SupportTicket {
  id: string;
  type: string;
  subject: string;
  description: string;
  userId: string;
  severity: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export function AdminSupport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in-progress' | 'resolved'>('open');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet<SupportTicket[]>('/api/admin/support-tickets');
        if (mounted) setTickets(data || []);
      } catch (e: any) {
        console.error('Failed to load support tickets:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.userId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || ticket.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return 'bg-[var(--danger-muted)] text-[var(--danger)] border-[var(--danger)]';
      case 'high':
        return 'bg-[var(--warning-muted)] text-[var(--warning)] border-[var(--warning)]';
      case 'medium':
        return 'bg-[var(--blue-muted)] text-[var(--blue)] border-[var(--blue)]';
      default:
        return 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-[var(--green)]" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-[var(--blue)]" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'urgent') {
      return <AlertCircle className="w-4 h-4 text-[var(--danger)]" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Support Queue</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {tickets.length} total tickets • {tickets.filter(t => t.severity === 'urgent').length} urgent
          </p>
        </div>
      </div>

      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search tickets by subject, description, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            >
              <option value="all">All Severities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">Loading tickets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[var(--green)]" />
            </div>
            <p className="text-[var(--text-muted)]">
              {tickets.length === 0 ? 'No support tickets found.' : 'No tickets matching your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getStatusIcon(ticket.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityIcon(ticket.severity)}
                          <h3 className="text-sm font-medium text-[var(--text)]">{ticket.subject}</h3>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mb-2 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span>User: {ticket.userId}</span>
                          <span>•</span>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(ticket.severity)}`}>
                          {ticket.severity}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]">
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

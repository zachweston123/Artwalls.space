import { Frame, Search, Filter } from 'lucide-react';
import { useState } from 'react';

export function AdminCurrentDisplays() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Active Displays</h1>
      </div>

      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search active displays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Frame className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-muted)]">No active displays found.</p>
        </div>
      </div>
    </div>
  );
}

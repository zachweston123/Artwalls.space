import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import type { User } from '../../App';
import { PageHeroHeader } from '../PageHeroHeader';
import { Clock } from 'lucide-react';

interface VenueCallsProps {
  user: User;
  onViewCall: (callId: string) => void;
}

export function VenueCalls({ user, onViewCall }: VenueCallsProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        title="Calls for Art"
        subtitle="Create and manage open calls for artists to submit their work."
      />

      <div className="text-center py-16">
        <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-xl mb-2">Coming Soon</h3>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          Open Calls for Art is under active development. Soon you'll be able to create themed calls, set submission deadlines, and manage applications from artists.
        </p>
      </div>
    </div>
  );
}

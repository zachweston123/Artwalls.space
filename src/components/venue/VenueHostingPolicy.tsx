import { AlertCircle } from 'lucide-react';

export function VenueHostingPolicy({ onNavigate }: any) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 px-4 py-16">
        <h1 className="text-4xl font-bold text-[var(--accent-contrast)] mb-4">Hosting Policy</h1>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-[var(--accent)]" />
            Venue Responsibilities
          </h2>
          <ul className="space-y-3 text-[var(--text-muted)]">
            <li>• Provide clean, well-lit wall space</li>
            <li>• Maintain proper climate control</li>
            <li>• Monitor artwork for safety</li>
            <li>• Display with respect to artists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

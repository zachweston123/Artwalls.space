interface VenueHandlingPolicyProps {
  onNavigate: (page: string) => void;
}

export function VenueHandlingPolicy({ onNavigate }: VenueHandlingPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Venue Handling</h1>
      <p className="text-[var(--text-muted)] mb-6">Care and handling expectations for venues.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Display care</h2>
          <p className="text-[var(--text-muted)]">
            Venues are responsible for reasonable care, safe placement, and preventing avoidable damage while on display.
          </p>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Incident reporting</h2>
          <p className="text-[var(--text-muted)]">
            Report any damage or incidents within 24 hours with photos and notes so we can support the artist.
          </p>
        </section>
      </div>

      <button onClick={() => onNavigate('policies')} className="mt-6 text-sm text-[var(--accent)] underline">
        ← Back to Policies
      </button>
    </div>
  );
}

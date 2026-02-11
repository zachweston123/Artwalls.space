interface CancellationsPolicyProps {
  onNavigate: (page: string) => void;
}

export function CancellationsPolicy({ onNavigate }: CancellationsPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Cancellations</h1>
      <p className="text-[var(--text-muted)] mb-6">Cancellation policy for Artwalls purchases.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">All sales are final</h2>
          <p className="text-[var(--text-muted)]">
            Orders cannot be cancelled after purchase. Because artwork is displayed in person at venues, buyers have the opportunity to inspect each piece before purchasing via QR code.
          </p>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Reporting a problem</h2>
          <p className="text-[var(--text-muted)]">
            If you experience an issue after purchase, you may submit a report through Artwalls support. Reports are reviewed on a case-by-case basis, but no cancellation, refund, or return is guaranteed.
          </p>
        </section>
      </div>

      <button onClick={() => onNavigate('policies')} className="mt-6 text-sm text-[var(--accent)] underline">
        ← Back to Policies
      </button>
    </div>
  );
}

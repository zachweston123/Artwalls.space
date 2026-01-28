interface CancellationsPolicyProps {
  onNavigate: (page: string) => void;
}

export function CancellationsPolicy({ onNavigate }: CancellationsPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Cancellations</h1>
      <p className="text-[var(--text-muted)] mb-6">Policies for cancelling orders.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Before fulfillment</h2>
          <p className="text-[var(--text-muted)]">
            Orders can be cancelled within 2 hours if the artwork has not been released or shipped.
          </p>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">After pickup or shipment</h2>
          <p className="text-[var(--text-muted)]">
            Once the artwork is picked up or shipped, cancellations are no longer available. Please report any issues instead.
          </p>
        </section>
      </div>

      <button onClick={() => onNavigate('policies')} className="mt-6 text-sm text-[var(--accent)] underline">
        ← Back to Policies
      </button>
    </div>
  );
}

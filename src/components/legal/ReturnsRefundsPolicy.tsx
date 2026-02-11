interface ReturnsRefundsPolicyProps {
  onNavigate: (page: string) => void;
}

export function ReturnsRefundsPolicy({ onNavigate }: ReturnsRefundsPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">All Sales Final</h1>
      <p className="text-[var(--text-muted)] mb-6">Sales policy for buyers, artists, and venues.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">No returns or refunds</h2>
          <p className="text-[var(--text-muted)]">
            All artwork sales processed through Artwalls are final. We do not offer returns, refunds, or cancellations after purchase. Buyers are encouraged to view artwork in person at the venue before purchasing.
          </p>
        </section>

        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Why all sales are final</h2>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
            <li>Artwork is displayed in-person — buyers can inspect before purchasing via QR code.</li>
            <li>Each piece is unique; returns create logistical challenges for independent artists.</li>
            <li>Final sales protect artists and ensure predictable revenue.</li>
          </ul>
        </section>

        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Reporting an issue</h2>
          <p className="text-[var(--text-muted)]">
            If you experience a problem with your purchase (e.g., damage during pickup or a significant discrepancy from the listing), you may report it through the Artwalls support system. Reports are reviewed on a case-by-case basis, but no refund or return is guaranteed.
          </p>
        </section>
      </div>

      <button
        onClick={() => onNavigate('policies')}
        className="mt-6 text-sm text-[var(--accent)] underline"
      >
        ← Back to Policies
      </button>
    </div>
  );
}

interface ReturnsRefundsPolicyProps {
  onNavigate: (page: string) => void;
}

export function ReturnsRefundsPolicy({ onNavigate }: ReturnsRefundsPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Returns & Refunds</h1>
      <p className="text-[var(--text-muted)] mb-6">Plain-language guidance for buyers, artists, and venues.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">When a return is eligible</h2>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
            <li>Report issues within 3 days of delivery or pickup.</li>
            <li>Provide clear photos of the issue and packaging.</li>
            <li>Artwork must be in original condition unless damaged in transit.</li>
          </ul>
        </section>

        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Who covers return shipping</h2>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
            <li>If damaged in transit, the platform covers return shipping.</li>
            <li>If not as described, the artist covers return shipping.</li>
            <li>If buyer changes their mind, returns are not accepted.</li>
          </ul>
        </section>

        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">What happens after approval</h2>
          <p className="text-[var(--text-muted)]">
            We coordinate the return, and refunds are issued once the artwork is received and verified. Refunds are
            processed to the original payment method within 5–10 business days.
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

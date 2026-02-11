interface DamageInTransitPolicyProps {
  onNavigate: (page: string) => void;
}

export function DamageInTransitPolicy({ onNavigate }: DamageInTransitPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Damage Reporting</h1>
      <p className="text-[var(--text-muted)] mb-6">How to report damage that occurs during pickup or transit.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Report window</h2>
          <p className="text-[var(--text-muted)]">Report damage within 3 days of pickup or delivery. Include photos of the artwork and any packaging.</p>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Evidence required</h2>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
            <li>Front of artwork</li>
            <li>Close-up detail of the damage</li>
            <li>Packaging exterior and interior (if applicable)</li>
          </ul>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">What happens next</h2>
          <p className="text-[var(--text-muted)]">
            All sales are final. Damage reports are reviewed on a case-by-case basis to help coordinate between buyer, artist, and venue. No refund or return is guaranteed. If you have an active Artwork Protection Plan, covered incidents may qualify for reimbursement per the plan terms.
          </p>
        </section>
      </div>

      <button onClick={() => onNavigate('policies')} className="mt-6 text-sm text-[var(--accent)] underline">
        ← Back to Policies
      </button>
    </div>
  );
}

interface DamageInTransitPolicyProps {
  onNavigate: (page: string) => void;
}

export function DamageInTransitPolicy({ onNavigate }: DamageInTransitPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Damage in Transit</h1>
      <p className="text-[var(--text-muted)] mb-6">How we handle shipping-related damage.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Report window</h2>
          <p className="text-[var(--text-muted)]">Report damage within 3 days of delivery with photos of the item and packaging.</p>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Evidence required</h2>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
            <li>Front of artwork</li>
            <li>Detail of the damage</li>
            <li>Packaging exterior and interior</li>
          </ul>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Resolution</h2>
          <p className="text-[var(--text-muted)]">We coordinate a return if needed and issue refunds once the item is received.</p>
        </section>
      </div>

      <button onClick={() => onNavigate('policies')} className="mt-6 text-sm text-[var(--accent)] underline">
        ← Back to Policies
      </button>
    </div>
  );
}

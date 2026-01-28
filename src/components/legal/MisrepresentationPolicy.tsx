interface MisrepresentationPolicyProps {
  onNavigate: (page: string) => void;
}

export function MisrepresentationPolicy({ onNavigate }: MisrepresentationPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Not as Described</h1>
      <p className="text-[var(--text-muted)] mb-6">When the artwork doesn't match the listing.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">What counts</h2>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
            <li>Incorrect dimensions or materials</li>
            <li>Condition issues not disclosed</li>
            <li>Missing edition info or signature details</li>
          </ul>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Evidence required</h2>
          <p className="text-[var(--text-muted)]">Photos and a short description comparing the listing and received artwork.</p>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Responsibility</h2>
          <p className="text-[var(--text-muted)]">If approved, the artist covers return shipping and the refund is issued after receipt.</p>
        </section>
      </div>

      <button onClick={() => onNavigate('policies')} className="mt-6 text-sm text-[var(--accent)] underline">
        ← Back to Policies
      </button>
    </div>
  );
}

interface MisrepresentationPolicyProps {
  onNavigate: (page: string) => void;
}

export function MisrepresentationPolicy({ onNavigate }: MisrepresentationPolicyProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl mb-2">Listing Accuracy Disputes</h1>
      <p className="text-[var(--text-muted)] mb-6">How to report a listing that doesn't match the artwork.</p>

      <div className="space-y-6 text-sm">
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">What to report</h2>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
            <li>Incorrect dimensions or materials vs. listing</li>
            <li>Undisclosed condition issues</li>
            <li>Missing edition or signature information</li>
          </ul>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Evidence required</h2>
          <p className="text-[var(--text-muted)]">Photos and a short description comparing the listing and the actual artwork.</p>
        </section>
        <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg mb-2">Resolution</h2>
          <p className="text-[var(--text-muted)]">
            All sales are final. Listing accuracy disputes are reviewed by Artwalls support. If material misrepresentation is confirmed, the artist's account may face restrictions. No refund or return is guaranteed.
          </p>
        </section>
      </div>

      <button onClick={() => onNavigate('policies')} className="mt-6 text-sm text-[var(--accent)] underline">
        ← Back to Policies
      </button>
    </div>
  );
}

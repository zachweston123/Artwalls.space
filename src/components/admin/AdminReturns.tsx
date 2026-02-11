import { useEffect, useState } from 'react';

/**
 * AdminReturns — DISABLED
 * All sales are final. No returns or refunds are offered.
 * This component is retained as a stub to avoid import errors.
 */
export function AdminReturns() {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)] p-8">
      <h1 className="text-3xl font-bold mb-4 text-[var(--text)]">Returns & Disputes</h1>
      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
        <p className="text-[var(--text-muted)]">
          All sales on Artwalls are final. There are no returns, refunds, or cancellations.
          Buyers can report issues through the Support Messages inbox.
        </p>
      </div>
    </div>
  );
}

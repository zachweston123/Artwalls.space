import { cn } from "./utils";
import type { ReactNode } from "react";

/**
 * StatCard — KPI tile for the artist dashboard.
 *
 * Styled to match the Plans & Pricing page card language:
 * neutral icon treatment, surface-2 background, generous p-6 padding.
 */
interface StatCardProps {
  label: string;
  value: ReactNode;
  subtext?: string;
  icon?: ReactNode;
  /** @deprecated Kept for call-site compat — color is now neutral. */
  color?: "blue" | "green" | "muted";
  onClick?: () => void;
  className?: string;
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  onClick,
  className,
}: StatCardProps) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-left transition-all duration-200",
        onClick &&
          "hover:border-[var(--border-hover)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        className,
      )}
    >
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-[var(--surface-3)] flex items-center justify-center">
          <span className="w-4 h-4 text-[var(--text-muted)]">{icon}</span>
        </div>
      )}
      <div className="text-3xl font-semibold text-[var(--text)] leading-none mt-4">{value}</div>
      <div className="text-sm font-medium text-[var(--text-muted)] mt-2">{label}</div>
      {subtext && <div className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">{subtext}</div>}
    </Comp>
  );
}

export { StatCard };

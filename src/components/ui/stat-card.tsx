import { cn } from "./utils";
import type { ReactNode } from "react";

/**
 * StatCard — KPI tile for the artist dashboard.
 *
 * Styled to match the Plans & Pricing page card language:
 * accent-tinted icon badge, surface-2 background, ring-based hover.
 */

/* KPI accent mapping — colors match the Plans & Pricing design language.
   blue   = Active Artworks     green  = Total Earnings
   violet = Recent Sales        amber  = Pending Applications */
type AccentColor = "blue" | "green" | "violet" | "amber";

const accentStyles: Record<AccentColor, { badge: string; hover: string }> = {
  blue: {
    badge: "bg-[var(--blue-muted)] text-[var(--blue)]",
    hover: "hover:border-[var(--blue)]/50 hover:ring-2 hover:ring-[var(--blue)]/20",
  },
  green: {
    badge: "bg-[var(--green-muted)] text-[var(--green)]",
    hover: "hover:border-[var(--green)]/50 hover:ring-2 hover:ring-[var(--green)]/20",
  },
  violet: {
    badge: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
    hover: "hover:border-[#8b5cf6]/50 hover:ring-2 hover:ring-[#8b5cf6]/20",
  },
  amber: {
    badge: "bg-[var(--warning-muted)] text-[var(--warning)]",
    hover: "hover:border-[var(--warning)]/50 hover:ring-2 hover:ring-[var(--warning)]/20",
  },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  subtext?: string;
  icon?: ReactNode;
  /** Accent color for icon badge and hover ring */
  accent?: AccentColor;
  /** @deprecated Use `accent` instead. Kept for call-site compat. */
  color?: "blue" | "green" | "muted";
  onClick?: () => void;
  className?: string;
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = "blue",
  onClick,
  className,
}: StatCardProps) {
  const Comp = onClick ? "button" : "div";
  const styles = accentStyles[accent];

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl p-5 text-left transition-all duration-200",
        styles.hover,
        onClick &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        className,
      )}
    >
      {icon && (
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", styles.badge)}>
          <span className="w-5 h-5">{icon}</span>
        </div>
      )}
      <div className="text-2xl font-semibold text-[var(--text)] leading-none mt-3">{value}</div>
      <div className="text-sm font-medium text-[var(--text-muted)] mt-1.5">{label}</div>
      {subtext && <div className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">{subtext}</div>}
    </Comp>
  );
}

export { StatCard };
export type { AccentColor };

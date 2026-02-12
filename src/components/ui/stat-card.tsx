import { cn } from "./utils";
import type { ReactNode } from "react";

/**
 * StatCard — KPI tile for the artist dashboard.
 *
 * Styled to match the Plans & Pricing page card language:
 * accent-tinted icon circle, transparent border at rest, ring-based hover.
 */

/* KPI accent mapping — colors match the Plans & Pricing design language.
   blue   = Active Artworks     green  = Total Earnings
   violet = Recent Sales        amber  = Pending Applications */
type AccentColor = "blue" | "green" | "violet" | "amber";

const accentStyles: Record<
  AccentColor,
  { badgeBg: string; iconColor: string; ring: string }
> = {
  blue: {
    badgeBg: "bg-[var(--blue-muted)]",
    iconColor: "text-[var(--blue)]",
    ring: [
      "hover:border-[var(--blue)]/60 hover:ring-2 hover:ring-[var(--blue)]/25",
      "focus-visible:border-[var(--blue)]/60 focus-visible:ring-2 focus-visible:ring-[var(--blue)]/25",
    ].join(" "),
  },
  green: {
    badgeBg: "bg-[var(--green-muted)]",
    iconColor: "text-[var(--green)]",
    ring: [
      "hover:border-[var(--green)]/60 hover:ring-2 hover:ring-[var(--green)]/25",
      "focus-visible:border-[var(--green)]/60 focus-visible:ring-2 focus-visible:ring-[var(--green)]/25",
    ].join(" "),
  },
  violet: {
    badgeBg: "bg-[#8b5cf6]/10",
    iconColor: "text-[#8b5cf6]",
    ring: [
      "hover:border-[#8b5cf6]/60 hover:ring-2 hover:ring-[#8b5cf6]/25",
      "focus-visible:border-[#8b5cf6]/60 focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25",
    ].join(" "),
  },
  amber: {
    badgeBg: "bg-[var(--warning-muted)]",
    iconColor: "text-[var(--warning)]",
    ring: [
      "hover:border-[var(--warning)]/60 hover:ring-2 hover:ring-[var(--warning)]/25",
      "focus-visible:border-[var(--warning)]/60 focus-visible:ring-2 focus-visible:ring-[var(--warning)]/25",
    ].join(" "),
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
  const s = accentStyles[accent];

  return (
    <Comp
      onClick={onClick}
      className={cn(
        /* Base — transparent border reserves space so hover ring causes NO layout shift */
        "group bg-[var(--surface-2)] border border-transparent rounded-xl p-5 shadow-sm",
        "text-left transition-all duration-200 ease-out",
        /* Hover + focus-visible — accent border + ring glow (ring = box-shadow, no shift) */
        s.ring,
        onClick && "cursor-pointer",
        "focus-visible:outline-none",
        className,
      )}
    >
      {/* Icon badge — circle with subtle accent tint, NO bar */}
      {icon && (
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            s.badgeBg,
          )}
        >
          <span className={cn("w-5 h-5", s.iconColor)}>{icon}</span>
        </div>
      )}
      <div className="text-2xl font-semibold text-[var(--text)] leading-none mt-3">
        {value}
      </div>
      <div className="text-sm font-medium text-[var(--text-muted)] mt-1.5">
        {label}
      </div>
      {subtext && (
        <div className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
          {subtext}
        </div>
      )}
    </Comp>
  );
}

export { StatCard };
export type { AccentColor };

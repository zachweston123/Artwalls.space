import { cn } from "./utils";
import type { ReactNode } from "react";

/**
 * StatCard — Consistent KPI tile matching the dashboard stat pattern.
 * Renders: icon → value → label → subtext.
 * Optionally clickable (wraps in <button>).
 */
interface StatCardProps {
  label: string;
  value: ReactNode;
  subtext?: string;
  icon?: ReactNode;
  /** Brand tint for the icon badge — "blue" | "green" | "muted" */
  color?: "blue" | "green" | "muted";
  onClick?: () => void;
  className?: string;
}

const colorMap: Record<string, { badge: string; icon: string; hoverBadge: string }> = {
  blue: {
    badge: "bg-[var(--blue-muted)]",
    icon: "text-[var(--blue)]",
    hoverBadge: "group-hover:bg-[var(--blue)]",
  },
  green: {
    badge: "bg-[var(--green-muted)]",
    icon: "text-[var(--green)]",
    hoverBadge: "group-hover:bg-[var(--green)]",
  },
  muted: {
    badge: "bg-[var(--surface-3)]",
    icon: "text-[var(--text-muted)]",
    hoverBadge: "",
  },
};

function StatCard({
  label,
  value,
  subtext,
  icon,
  color = "blue",
  onClick,
  className,
}: StatCardProps) {
  const colors = colorMap[color] || colorMap.blue;
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-5 py-4 text-left transition-all",
        onClick &&
          "hover:border-[var(--border-hover)] hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-colors",
            colors.badge,
            onClick && colors.hoverBadge,
          )}
        >
          <span className={cn("w-4 h-4", colors.icon)}>{icon}</span>
        </div>
      )}
      <div className="text-xl font-bold text-[var(--text)] leading-none">{value}</div>
      <div className="text-[13px] font-medium text-[var(--text-muted)] leading-normal mt-1.5">{label}</div>
      {subtext && <div className="text-xs text-[var(--text-muted)] leading-normal mt-0.5">{subtext}</div>}
    </Comp>
  );
}

export { StatCard };

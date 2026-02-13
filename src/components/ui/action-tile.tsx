import { cn } from "./utils";
import type { ReactNode } from "react";
import { X, ChevronRight } from "lucide-react";

/**
 * ActionTile — reusable CTA card for "next steps" grids.
 *
 * Used in artist ActionCenter, venue VenueNextActions, and anywhere
 * a list of prioritised action items appears inside a card grid.
 *
 * Design rules:
 * - bg-[var(--surface-1)] with subtle border at rest
 * - flex flex-col for consistent height; footer CTA anchored via mt-auto
 * - Ring-based hover (no border-width change → no layout shift)
 * - focus-visible ring for keyboard accessibility
 * - overflow-hidden to prevent decorative layer bleed
 *
 * When `onDismiss` is provided the shell is a <div> (separate click
 * targets for dismiss & CTA). Otherwise the shell is a <button>
 * that fires `item.onAction` on click anywhere.
 */

type ActionTileAccent = "blue" | "green";

const tileAccent: Record<ActionTileAccent, { ring: string; cta: string }> = {
  blue: {
    ring: "hover:border-[var(--blue)]/60 hover:ring-2 hover:ring-[var(--blue)]/25 focus-visible:border-[var(--blue)]/60 focus-visible:ring-2 focus-visible:ring-[var(--blue)]/25",
    cta: "text-[var(--blue)]",
  },
  green: {
    ring: "hover:border-[var(--green)]/60 hover:ring-2 hover:ring-[var(--green)]/25 focus-visible:border-[var(--green)]/60 focus-visible:ring-2 focus-visible:ring-[var(--green)]/25",
    cta: "text-[var(--green)]",
  },
};

interface ActionTileItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  cta: string;
  onAction: () => void;
  progress?: string;
}

interface ActionTileProps {
  item: ActionTileItem;
  /** Accent for hover ring and CTA link color */
  accent?: ActionTileAccent;
  /** Shows a dismiss button (top-right, appears on hover) */
  onDismiss?: (id: string) => void;
  className?: string;
}

function ActionTile({ item, accent = "blue", onDismiss, className }: ActionTileProps) {
  const a = tileAccent[accent];

  const sharedClasses = cn(
    "relative bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5",
    "group flex flex-col min-h-[148px] overflow-hidden text-left",
    "transition-all duration-200",
    "hover:bg-[var(--surface-3)]/50 hover:shadow-sm",
    a.ring,
    "focus-visible:outline-none",
    className,
  );

  const inner = (
    <>
      {/* Dismiss button — top-right, appears on hover (only when dismissable) */}
      {onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(item.id);
          }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
          aria-label={`Dismiss ${item.title}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Header row: icon + title/meta */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-muted)]">
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text)] leading-snug truncate">
              {item.title}
            </p>
            {item.progress && (
              <span className="text-xs text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                {item.progress}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1 line-clamp-2">
            {item.description}
          </p>
        </div>
      </div>

      {/* Footer: CTA pinned to bottom via mt-auto */}
      <div className="mt-auto pt-3">
        {onDismiss ? (
          <button
            onClick={item.onAction}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium hover:underline",
              a.cta,
            )}
          >
            {item.cta}
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              a.cta,
            )}
          >
            {item.cta}
            <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </>
  );

  /* Dismissable → <div> shell (separate click targets for dismiss & CTA).
     Non-dismissable → <button> shell (whole tile is clickable). */
  if (onDismiss) {
    return <div className={sharedClasses}>{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={item.onAction}
      className={cn(sharedClasses, "cursor-pointer")}
    >
      {inner}
    </button>
  );
}

export { ActionTile };
export type { ActionTileItem, ActionTileAccent };

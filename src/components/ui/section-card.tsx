import { cn } from "./utils";

/**
 * SectionCard — Standard content card matching the pricing-page style.
 * Rounded-xl, token border, token surface background, consistent padding.
 */
interface SectionCardProps extends React.ComponentProps<"div"> {
  /** Optional title rendered as an h2 at the top of the card */
  title?: string;
  /** Optional subtitle rendered below the title */
  subtitle?: string;
  /** Padding preset — "default" (p-6) | "compact" (p-4) | "none" */
  padding?: "default" | "compact" | "none";
}

const paddingMap: Record<string, string> = {
  default: "p-6",
  compact: "p-4",
  none: "",
};

function SectionCard({
  title,
  subtitle,
  padding = "default",
  className,
  children,
  ...props
}: SectionCardProps) {
  return (
    <div
      data-slot="section-card"
      className={cn(
        "bg-[var(--surface-1)] border border-[var(--border)] rounded-xl",
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className={cn("mb-4", padding === "none" && "px-6 pt-6")}>
          {title && (
            <h2 className="text-lg font-semibold text-[var(--text)] leading-tight font-display tracking-tight">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export { SectionCard };

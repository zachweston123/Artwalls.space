import { cn } from "./utils";




































export { PageShell };}  );    </div>      {children}    >      {...props}      )}        className,        sizeMap[size],        "mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-[var(--bg)] text-[var(--text)]",      className={cn(      data-slot="page-shell"    <div  return (function PageShell({ size = "default", className, children, ...props }: PageShellProps) {};  full: "max-w-full",  wide: "max-w-7xl",  default: "max-w-6xl",  narrow: "max-w-4xl",const sizeMap: Record<string, string> = {}  size?: "default" | "narrow" | "wide" | "full";  /** "default" (1280px) | "narrow" (896px) | "wide" (1536px) | "full" */interface PageShellProps extends React.ComponentProps<"div"> { */ * Use inside the main content area (sidebar layouts already provide outer chrome). * Applies max-width, horizontal padding, and token-based background. * PageShell — Consistent page-level container./**function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[var(--skeleton)] animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };

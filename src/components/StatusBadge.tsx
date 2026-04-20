import type { ReactNode } from "react";

type Variant = "default" | "success" | "primary" | "destructive";

interface StatusBadgeProps {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  default: "border-border text-muted-foreground",
  success: "border-success/40 text-success",
  primary: "border-primary/40 text-primary",
  destructive: "border-destructive/40 text-destructive",
};

export function StatusBadge({
  children,
  variant = "default",
  dot = false,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] bg-surface/60 ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-success"
          style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
        />
      )}
      {children}
    </span>
  );
}

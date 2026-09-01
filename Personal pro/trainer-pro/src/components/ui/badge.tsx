import { cn } from "@/lib/utils";
import { STATUS_BADGE } from "@/lib/status";

export function Badge({
  status,
  className,
}: {
  status: keyof typeof STATUS_BADGE;
  className?: string;
}) {
  const s = STATUS_BADGE[status];
  if (!s) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium",
        s.text,
        s.bg,
        className
      )}
    >
      {s.label}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-neutral-soft text-muted",
    primary: "bg-primary-soft text-primary-dark",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

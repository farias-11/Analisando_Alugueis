import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const fieldBase =
  "w-full rounded-xl border border-border bg-surface px-3.5 h-12 text-sm text-foreground placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-foreground", className)} {...props} />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldBase, "h-auto min-h-24 py-3 resize-y", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  name,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  description?: string;
  name?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-1">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-pill bg-neutral-soft peer-checked:bg-primary transition-colors" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

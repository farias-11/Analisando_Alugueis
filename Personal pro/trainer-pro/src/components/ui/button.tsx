import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "md" | "sm" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-primary-soft text-primary-dark hover:bg-primary-soft/70",
  outline: "border border-border bg-surface text-foreground hover:bg-neutral-soft",
  ghost: "text-foreground hover:bg-neutral-soft",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-12 px-4 text-sm",
  lg: "h-14 px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  prefetch?: boolean;
}

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
  prefetch,
}: ButtonLinkProps) {
  return (
    <Link href={href} prefetch={prefetch} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

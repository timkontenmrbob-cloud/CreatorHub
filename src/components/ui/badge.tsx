import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "brand" | "success" | "warning" | "error" | "neutral" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "brand",
  size = "md",
  ...props
}: BadgeProps) {
  const variantStyles = {
    brand: "bg-brand-blue/15 text-brand-blue border border-brand-blue/30",
    success: "bg-status-success/15 text-status-success border border-status-success/30",
    warning: "bg-status-warning/15 text-status-warning border border-status-warning/30",
    error: "bg-status-error/15 text-status-error border border-status-error/30",
    neutral: "bg-card-elevated text-text-secondary border border-border-subtle",
    outline: "bg-transparent text-text-primary border border-border-subtle",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs font-medium",
    md: "px-3 py-1 text-xs font-semibold tracking-wide",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full select-none transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}

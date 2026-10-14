import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "flat" | "interactive";
  radius?: "main" | "secondary";
}

export function Card({
  className,
  variant = "default",
  radius = "main",
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-card-surface border border-border-subtle",
    elevated: "bg-card-elevated border border-border-subtle shadow-xl shadow-black/40",
    flat: "bg-bg-secondary border border-border-subtle/60",
    interactive:
      "bg-card-surface border border-border-subtle hover:border-brand-blue/40 hover:bg-card-surface/90 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-brand-blue/5",
  };

  const radiusStyles = {
    main: "rounded-[20px]",
    secondary: "rounded-[16px]",
  };

  return (
    <div
      className={cn(
        "text-text-primary overflow-hidden",
        radiusStyles[radius],
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6 pb-3", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-text-primary", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-text-secondary leading-relaxed", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-3", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0 border-t border-border-subtle/50 mt-4", className)}
      {...props}
    />
  );
}

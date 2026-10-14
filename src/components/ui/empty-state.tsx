import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[20px] bg-card-surface/50 border border-border-subtle/80 border-dashed",
        className
      )}
    >
      {Icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-card-elevated border border-border-subtle text-brand-blue mb-4 shadow-inner">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h4 className="text-base font-semibold text-text-primary tracking-tight">
        {title}
      </h4>
      <p className="text-sm text-text-secondary max-w-sm mt-1.5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

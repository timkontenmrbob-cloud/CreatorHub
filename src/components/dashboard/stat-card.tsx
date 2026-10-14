import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: "blue" | "red" | "green" | "yellow";
}

export function StatCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  badge,
  trend,
  accentColor = "blue",
}: StatCardProps) {
  const accentStyles = {
    blue: "text-brand-blue bg-brand-blue/10 border-brand-blue/20",
    red: "text-brand-red bg-brand-red/10 border-brand-red/20",
    green: "text-status-success bg-status-success/10 border-status-success/20",
    yellow: "text-status-warning bg-status-warning/10 border-status-warning/20",
  };

  return (
    <Card className="p-6 bg-card-surface border-border-subtle hover:border-brand-blue/30 transition-all duration-200">
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </span>
        <div
          className={cn(
            "w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0",
            accentStyles[accentColor]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-mono">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-text-secondary">
              {unit}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-text-secondary leading-relaxed pt-1">
            {subtitle}
          </p>
        )}
      </div>

      {(badge || trend) && (
        <div className="mt-3 pt-3 border-t border-border-subtle/50 flex items-center justify-between">
          {badge ? (
            <Badge variant="neutral" size="sm">
              {badge}
            </Badge>
          ) : <div />}
          {trend && (
            <span
              className={cn(
                "text-[11px] font-medium font-mono",
                trend.isPositive ? "text-status-success" : "text-status-error"
              )}
            >
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

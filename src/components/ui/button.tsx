import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main";

    const variantStyles = {
      primary:
        "bg-brand-blue text-white hover:bg-brand-blue-hover active:scale-[0.98] shadow-lg shadow-brand-blue/20",
      secondary:
        "bg-card-surface text-text-primary border border-border-subtle hover:bg-card-elevated hover:border-border-subtle/80 active:scale-[0.98]",
      outline:
        "bg-transparent text-text-primary border border-border-subtle hover:bg-card-surface hover:border-brand-blue/50 active:scale-[0.98]",
      danger:
        "bg-brand-red text-white hover:bg-brand-red/90 active:scale-[0.98] shadow-lg shadow-brand-red/20",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-card-surface/60",
    };

    const sizeStyles = {
      sm: "text-xs px-3.5 py-1.5 rounded-xl gap-1.5",
      md: "text-sm px-5 py-2.5 rounded-xl gap-2",
      lg: "text-base px-6 py-3.5 rounded-[14px] gap-2.5 font-semibold",
      icon: "h-10 w-10 p-0 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

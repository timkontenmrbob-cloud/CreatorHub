import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-text-secondary tracking-wide uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-text-secondary">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
              "w-full rounded-[12px] bg-card-elevated border border-border-subtle px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none transition-all duration-200",
              "focus:border-brand-blue focus:ring-1 focus:ring-brand-blue",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-status-error focus:border-status-error focus:ring-status-error",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-text-secondary">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-status-error flex items-center gap-1 mt-1">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-text-secondary/80 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

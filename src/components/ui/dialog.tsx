"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  hideHeader = false,
}: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Content (20px border-radius) */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg rounded-[20px] bg-card-surface border border-border-subtle p-6 shadow-2xl shadow-black/80 transition-all",
          className
        )}
      >
        {!hideHeader && (
          <div className="flex items-start justify-between pb-4">
            <div>
              {title && (
                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-text-secondary hover:text-text-primary hover:bg-card-elevated transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={cn(!hideHeader && "pt-2", hideHeader && "flex flex-col flex-1 min-h-0 overflow-hidden")}>
          {children}
        </div>
      </div>
    </div>
  );
}

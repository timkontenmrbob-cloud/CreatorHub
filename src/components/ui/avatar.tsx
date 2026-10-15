"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy";
}

export function Avatar({
  name,
  src,
  size = "md",
  status,
  className,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const sizeStyles = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const getInitials = (n?: string) => {
    if (!n) return "MB";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const showImage = Boolean(src && failedSrc !== src);

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          "rounded-full bg-card-elevated border border-border-subtle flex items-center justify-center font-bold text-text-primary overflow-hidden select-none",
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name || "Avatar"}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={() => setFailedSrc(src || "")}
          />
        ) : (
          <span className="text-brand-blue">{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-bg-main",
            status === "online" && "bg-status-success",
            status === "busy" && "bg-status-error",
            status === "offline" && "bg-text-secondary"
          )}
        />
      )}
    </div>
  );
}

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  variant?: "creator" | "admin" | "default";
}

export function Logo({
  size = "md",
  showTagline = false,
  className,
  variant = "default",
}: LogoProps) {
  const dimensions = {
    sm: { img: 32, text: "text-base", sub: "text-[10px]" },
    md: { img: 40, text: "text-lg", sub: "text-xs" },
    lg: { img: 48, text: "text-xl", sub: "text-xs" },
  };

  const { img, text, sub } = dimensions[size];

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/logo-mrbob.png"
          alt="Mr.BOB Kampung Inggris"
          width={img}
          height={img}
          className="object-contain w-auto h-auto"
          priority
        />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={cn("font-bold tracking-tight text-text-primary", text)}>
            Mr.BOB
          </span>
          <span
            className={cn(
              "font-bold tracking-tight",
              text,
              variant === "admin" ? "text-brand-red" : "text-brand-blue"
            )}
          >
            {variant === "admin" ? "Admin" : "Creator Hub"}
          </span>
        </div>
        {showTagline && (
          <span className={cn("text-text-secondary mt-1 font-medium tracking-wide", sub)}>
            Post Your Video, Claim Your Reward!
          </span>
        )}
      </div>
    </div>
  );
}

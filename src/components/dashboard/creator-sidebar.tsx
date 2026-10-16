"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import {
  LayoutDashboard,
  UploadCloud,
  Film,
  Coins,
  Gift,
  Trophy,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CreatorSidebar({ isOpen, onClose }: CreatorSidebarProps) {
  const pathname = usePathname();
  const navigationItems = [
    {
      label: "Dashboard",
      href: "/creator/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Submit Content",
      href: "/creator/submit",
      icon: UploadCloud,
    },
    {
      label: "My Contents",
      href: "/creator/my-contents",
      icon: Film,
    },
    {
      label: "My Points",
      href: "/creator/my-points",
      icon: Coins,
    },
    {
      label: "Reward Shop",
      href: "/creator/reward-shop",
      icon: Gift,
    },
    {
      label: "My Rewards",
      href: "/creator/my-rewards",
      icon: Sparkles,
    },
    {
      label: "Leaderboard",
      href: "/creator/leaderboard",
      icon: Trophy,
    },
    {
      label: "Profile & Settings",
      href: "/creator/settings",
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[calc(100vw-2rem)] bg-bg-secondary border-r border-border-subtle flex flex-col transition-transform duration-200 lg:static lg:w-64 lg:max-w-none lg:translate-x-0 lg:h-full lg:shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-border-subtle flex items-center justify-between gap-2 shrink-0">
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden shrink-0 p-1.5 rounded-lg text-text-secondary hover:text-text-primary"
              aria-label="Tutup menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav aria-label="Menu Creator" className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150 group",
                  isActive
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                    : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-text-secondary group-hover:text-brand-blue"
                  )}
                />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

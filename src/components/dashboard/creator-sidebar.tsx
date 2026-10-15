"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  PlusCircle,
} from "lucide-react";
import { cn, formatPoints } from "@/lib/utils";

interface CreatorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CreatorSidebar({ isOpen, onClose }: CreatorSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigationItems = [
    {
      label: "Dashboard",
      href: "/creator/dashboard",
      icon: LayoutDashboard,
      phase: "Phase 1",
    },
    {
      label: "Submit Content",
      href: "/creator/submit",
      icon: UploadCloud,
      highlight: true,
      badge: "Poin+",
      phase: "Phase 3",
    },
    {
      label: "My Contents",
      href: "/creator/my-contents",
      icon: Film,
      phase: "Phase 3",
    },
    {
      label: "My Points",
      href: "/creator/my-points",
      icon: Coins,
      phase: "Phase 2",
    },
    {
      label: "Reward Shop",
      href: "/creator/reward-shop",
      icon: Gift,
      phase: "Phase 5",
    },
    {
      label: "My Rewards",
      href: "/creator/my-rewards",
      icon: Sparkles,
      phase: "Phase 5",
    },
    {
      label: "Leaderboard",
      href: "/creator/leaderboard",
      icon: Trophy,
      phase: "Phase 6",
    },
    {
      label: "Profile & Settings",
      href: "/creator/settings",
      icon: Settings,
      phase: "Phase 1",
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
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border-subtle flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:h-full lg:shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-border-subtle flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="p-4 pb-2">
          <Link href="/creator/submit" onClick={onClose}>
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center gap-2 shadow-md shadow-brand-blue/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Video Baru</span>
            </Button>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider">
            Menu Creator
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                    : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-text-secondary group-hover:text-brand-blue"
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && !isActive && (
                  <Badge variant="brand" size="sm" className="text-[10px] py-0 px-2">
                    {item.badge}
                  </Badge>
                )}

                {item.phase && item.phase !== "Phase 1" && !isActive && (
                  <span className="text-[9px] text-text-secondary/50 font-mono">
                    {item.phase}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Poin & User Summary Card */}
        <div className="p-4 border-t border-border-subtle bg-bg-main/50">
          <div className="p-3 rounded-2xl bg-card-surface border border-border-subtle/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-secondary font-medium">
                Saldo Poin Tersedia
              </span>
              <Coins className="w-3.5 h-3.5 text-brand-blue" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-text-primary font-mono">
                {formatPoints(user?.totalAvailablePoin || 0)}
              </span>
              <span className="text-xs font-semibold text-brand-blue">Poin</span>
            </div>
            <p className="text-[10px] text-text-secondary/70">
              1.000 views = 10 Poin
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

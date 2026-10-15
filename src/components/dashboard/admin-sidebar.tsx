"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Coins,
  Gift,
  FileCheck2,
  Trophy,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();

  const navigationItems = [
    {
      label: "Overview",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      phase: "Phase 1",
    },
    {
      label: "Content Verification",
      href: "/admin/verifications",
      icon: CheckSquare,
      badge: "Review",
      phase: "Phase 4",
    },
    {
      label: "Creator Management",
      href: "/admin/creators",
      icon: Users,
      phase: "Phase 4",
    },
    {
      label: "Points Management",
      href: "/admin/points",
      icon: Coins,
      phase: "Phase 2",
    },
    {
      label: "Reward Management",
      href: "/admin/rewards",
      icon: Gift,
      phase: "Phase 5",
    },
    {
      label: "Redemption Requests",
      href: "/admin/redemptions",
      icon: FileCheck2,
      phase: "Phase 5",
    },
    {
      label: "Creator Leaderboard",
      href: "/admin/leaderboard",
      icon: Trophy,
      phase: "Phase 6",
    },
    {
      label: "UGC Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      phase: "Phase 7",
    },
    {
      label: "Reports & Export",
      href: "/admin/reports",
      icon: FileSpreadsheet,
      phase: "Phase 7",
    },
    ...(isSuperAdmin
      ? [
          {
            label: "Admin Management",
            href: "/admin/team",
            icon: ShieldCheck,
            phase: "Super Admin",
          },
        ]
      : []),
    {
      label: "System Settings",
      href: "/admin/settings",
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

      {/* Admin Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border-subtle flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:h-full lg:shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-16 px-5 border-b border-border-subtle flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center">
            <Logo size="sm" variant="admin" />
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

        {/* Admin Badge Tag */}
        <div className="px-5 py-3 border-b border-border-subtle/50 bg-bg-main/40 flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            Hak Akses:
          </span>
          <Badge
            variant={isSuperAdmin ? "warning" : "brand"}
            size="sm"
            className="font-mono text-[10px]"
          >
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </Badge>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
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
                    ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                    : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-text-secondary group-hover:text-brand-red"
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && !isActive && (
                  <Badge variant="warning" size="sm" className="text-[10px] py-0 px-2">
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

        {/* Bottom Switch Portal */}
        <div className="p-4 border-t border-border-subtle bg-bg-main/50 space-y-2">
          <Link
            href="/creator/dashboard"
            className="flex items-center justify-between p-2.5 rounded-xl bg-card-surface border border-border-subtle hover:border-brand-blue/50 text-xs text-text-secondary hover:text-text-primary transition"
          >
            <span>Buka Creator Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-brand-blue" />
          </Link>
        </div>
      </aside>
    </>
  );
}

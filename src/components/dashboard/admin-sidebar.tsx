"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
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
    },
    {
      label: "Content Verification",
      href: "/admin/verifications",
      icon: CheckSquare,
    },
    {
      label: "Creator Management",
      href: "/admin/creators",
      icon: Users,
    },
    {
      label: "Points Management",
      href: "/admin/points",
      icon: Coins,
    },
    {
      label: "Reward Management",
      href: "/admin/rewards",
      icon: Gift,
    },
    {
      label: "Redemption Requests",
      href: "/admin/redemptions",
      icon: FileCheck2,
    },
    {
      label: "Creator Leaderboard",
      href: "/admin/leaderboard",
      icon: Trophy,
    },
    {
      label: "UGC Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      label: "Reports & Export",
      href: "/admin/reports",
      icon: FileSpreadsheet,
    },
    ...(isSuperAdmin
      ? [
          {
            label: "Admin Management",
            href: "/admin/team",
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      label: "System Settings",
      href: "/admin/settings",
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

      {/* Admin Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[calc(100vw-2rem)] bg-bg-secondary border-r border-border-subtle flex flex-col transition-transform duration-200 lg:static lg:w-64 lg:max-w-none lg:translate-x-0 lg:h-full lg:shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-16 px-5 border-b border-border-subtle flex items-center justify-between gap-2 shrink-0">
          <Link href="/admin/dashboard" className="flex items-center">
            <Logo size="sm" variant="admin" />
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
        <nav aria-label="Menu Admin" className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
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
                    ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                    : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-text-secondary group-hover:text-brand-red"
                  )}
                />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Portal switch */}
        <div className="shrink-0 border-t border-border-subtle px-3 py-3">
          <Link
            href="/creator/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-card-surface transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0 text-text-secondary" />
            <span className="min-w-0 truncate">Creator Portal</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

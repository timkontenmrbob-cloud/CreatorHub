"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  ExternalLink,
  Shield,
  ChevronDown,
} from "lucide-react";

interface DashboardHeaderProps {
  onToggleSidebar?: () => void;
  role: "creator" | "admin";
}

export function DashboardHeader({ onToggleSidebar, role }: DashboardHeaderProps) {
  const { user, isAdmin, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border-subtle bg-bg-main/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Brand Indicator */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-card-surface border border-border-subtle text-text-secondary hover:text-text-primary"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <Badge
            variant={role === "admin" ? "warning" : "brand"}
            size="sm"
            className="font-mono uppercase text-[10px]"
          >
            {role === "admin" ? "Admin Portal" : "Creator Portal"}
          </Badge>
          <span className="hidden sm:inline-block text-xs text-text-secondary/70">
            • Mr.BOB Kampung Inggris
          </span>
        </div>
      </div>

      {/* Right: Actions, Links & Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Public Landing Link */}
        <Link href="/" target="_blank" className="hidden md:inline-flex">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-text-secondary hover:text-text-primary">
            <span>Lihat Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </Link>

        {/* Notifications Icon (Phase 1 visual shell) */}
        <button
          className="p-2 rounded-xl bg-card-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-blue/40 transition-colors relative"
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-blue" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl bg-card-surface border border-border-subtle hover:border-border-subtle/80 cursor-pointer transition-colors"
          >
            <Avatar name={user?.displayName || "Creator"} size="sm" />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-text-primary max-w-[120px] truncate leading-tight">
                {user?.displayName || "Akun Saya"}
              </span>
              <span className="text-[10px] text-text-secondary capitalize leading-tight">
                {user?.role || role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary hidden sm:inline-block" />
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />

              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card-surface border border-border-subtle shadow-2xl p-2 z-50 divide-y divide-border-subtle/50">
                <div className="p-3">
                  <p className="text-xs font-bold text-text-primary truncate">
                    {user?.displayName}
                  </p>
                  <p className="text-[11px] text-text-secondary truncate mt-0.5">
                    {user?.email}
                  </p>
                  <div className="mt-2">
                    <Badge variant={isAdmin ? "warning" : "brand"} size="sm">
                      {isAdmin ? "Admin Role" : "Creator Role"}
                    </Badge>
                  </div>
                </div>

                <div className="py-1">
                  {isAdmin && role === "creator" && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-brand-blue hover:bg-card-elevated rounded-xl transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Masuk Portal Admin</span>
                    </Link>
                  )}

                  {isAdmin && role === "admin" && (
                    <Link
                      href="/creator/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-card-elevated rounded-xl transition"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Lihat Tampilan Creator</span>
                    </Link>
                  )}

                  <Link
                    href={role === "admin" ? "/admin/settings" : "/creator/settings"}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-card-elevated rounded-xl transition"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Profil & Pengaturan</span>
                  </Link>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-status-error hover:bg-status-error/10 rounded-xl transition text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  Shield,
  ChevronDown,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Gift,
  Coins,
  Sparkles,
  BellOff,
} from "lucide-react";
import {
  fetchUserNotifications,
  markAsRead,
  markAllAsRead,
} from "@/lib/supabase/notifications";
import { AppNotification } from "@/lib/types/notification";

interface DashboardHeaderProps {
  onToggleSidebar?: () => void;
  role: "creator" | "admin";
}

export function DashboardHeader({ onToggleSidebar, role }: DashboardHeaderProps) {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const userUid = user?.uid;

  useEffect(() => {
    if (!userUid) return;
    const uid = userUid;
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchUserNotifications(uid, isAdmin);
        if (!cancelled) {
          setNotifications(data);
        }
      } catch (err) {
        console.warn("Failed to load notifications:", err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userUid, isAdmin]);

  const notifList = notifications || [];
  const unreadCount = notifList.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notif: AppNotification) => {
    if (user?.uid && !notif.isRead) {
      markAsRead(user.uid, notif.id);
      setNotifications((prev) =>
        (prev || []).map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    setNotifOpen(false);
    if (notif.href) {
      router.push(notif.href);
    }
  };

  const handleMarkAllRead = () => {
    if (!user?.uid) return;
    markAllAsRead(
      user.uid,
      notifList.map((n) => n.id)
    );
    setNotifications((prev) => (prev || []).map((n) => ({ ...n, isRead: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "submission_approved":
        return <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />;
      case "submission_rejected":
        return <AlertCircle className="w-4 h-4 text-status-error shrink-0" />;
      case "submission_revision":
        return <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />;
      case "points_issued":
      case "points_expiring":
        return <Coins className="w-4 h-4 text-brand-blue shrink-0" />;
      case "redemption_completed":
      case "redemption_ready":
      case "redemption_processing":
        return <Gift className="w-4 h-4 text-status-success shrink-0" />;
      case "redemption_rejected":
        return <AlertCircle className="w-4 h-4 text-status-error shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 text-brand-blue shrink-0" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins}m lalu`;
      if (diffHours < 24) return `${diffHours}j lalu`;
      if (diffDays < 7) return `${diffDays}h lalu`;
      return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

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
        {/* Admin/Creator Portal Quick Switcher (Visible only to confirmed administrators) */}
        {isAdmin && role === "creator" && (
          <Link href="/admin/dashboard" className="hidden sm:inline-flex">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-status-warning/40 bg-status-warning/10 text-status-warning hover:bg-status-warning/20 text-xs font-semibold transition-colors"
              title="Beralih ke Admin Portal"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Beralih ke Admin Portal</span>
            </button>
          </Link>
        )}

        {isAdmin && role === "admin" && (
          <Link href="/creator/dashboard" className="hidden sm:inline-flex">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-blue/40 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 text-xs font-semibold transition-colors"
              title="Beralih ke Creator Portal"
            >
              <User className="w-3.5 h-3.5" />
              <span>Beralih ke Creator Portal</span>
            </button>
          </Link>
        )}

        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setDropdownOpen(false);
            }}
            className="p-2 rounded-xl bg-card-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-blue/40 transition-colors relative cursor-pointer"
            title="Notifikasi"
            aria-label="Lihat Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-brand-blue ring-2 ring-card-surface" />
            )}
          </button>

          {notifOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
              />

              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card-surface border border-border-subtle shadow-2xl p-0 z-50 flex flex-col overflow-hidden max-h-[480px]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-secondary/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">
                      Notifikasi
                    </span>
                    {unreadCount > 0 && (
                      <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5">
                        {unreadCount} baru
                      </Badge>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-brand-blue hover:text-brand-blue/80 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Tandai dibaca</span>
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="overflow-y-auto divide-y divide-border-subtle/50 max-h-[380px]">
                  {notifications === null ? (
                    <div className="p-8 text-center text-xs text-text-secondary">
                      Memuat notifikasi...
                    </div>
                  ) : notifList.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-2xl bg-card-elevated border border-border-subtle flex items-center justify-center text-text-secondary/60 mb-2">
                        <BellOff className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-text-primary">
                        Belum Ada Notifikasi
                      </p>
                      <p className="text-[11px] text-text-secondary/70 mt-1 max-w-[200px]">
                        Semua pembaruan verifikasi video dan hadiah akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    notifList.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 hover:bg-card-elevated/70 cursor-pointer transition-colors flex items-start gap-3 text-left ${
                          !n.isRead ? "bg-brand-blue/5" : ""
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-card-elevated border border-border-subtle shrink-0">
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span
                              className={`text-xs truncate ${
                                !n.isRead
                                  ? "font-bold text-text-primary"
                                  : "font-medium text-text-primary/90"
                              }`}
                            >
                              {n.title}
                            </span>
                            <span className="text-[10px] text-text-secondary shrink-0 font-mono">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl bg-card-surface border border-border-subtle hover:border-border-subtle/80 cursor-pointer transition-colors"
          >
            <Avatar name={user?.displayName || "Creator"} src={user?.photoURL} size="sm" />
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
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-status-warning hover:bg-status-warning/10 rounded-xl transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Beralih ke Admin Portal</span>
                    </Link>
                  )}

                  {isAdmin && role === "admin" && (
                    <Link
                      href="/creator/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-blue hover:bg-brand-blue/10 rounded-xl transition"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Beralih ke Creator Portal</span>
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

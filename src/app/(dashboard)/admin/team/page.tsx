"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import {
  ShieldCheck,
  Search,
  UserCheck,
  UserMinus,
  History,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface TeamUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: "super_admin" | "admin" | "creator";
  isSuperAdmin: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  target_user_id: string;
  target_email: string;
  action: string;
  performed_by_email: string;
  notes?: string;
  created_at: string;
}

export default function AdminTeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [actionType, setActionType] = useState<"assign" | "revoke" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setAuditLogs(data.auditLogs || []);
      } else {
        const err = await res.json();
        setToastMessage({ type: "error", text: err.error || "Gagal memuat data tim." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/admin/roles");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setUsers(data.users || []);
            setAuditLogs(data.auditLogs || []);
          }
        } else if (!ignore) {
          const err = await res.json();
          setToastMessage({ type: "error", text: err.error || "Gagal memuat data tim." });
        }
      } catch {
        if (!ignore) {
          setToastMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleActionClick = (user: TeamUser, action: "assign" | "revoke") => {
    setSelectedUser(user);
    setActionType(action);
    setActionNotes("");
  };

  const handleConfirmAction = async () => {
    if (!selectedUser || !actionType) return;
    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType === "assign" ? "assign_admin" : "revoke_admin",
          targetUserId: selectedUser.id,
          notes: actionNotes.trim() || undefined,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setToastMessage({
          type: "success",
          text: result.message || "Hak akses berhasil diperbarui.",
        });
        setSelectedUser(null);
        setActionType(null);
        await loadTeamData();
      } else {
        setToastMessage({
          type: "error",
          text: result.error || "Gagal memperbarui hak akses.",
        });
      }
    } catch {
      setToastMessage({
        type: "error",
        text: "Terjadi kendala saat menghubungi server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const superAdminCount = users.filter((u) => u.isSuperAdmin).length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const creatorCount = users.filter((u) => u.role === "creator").length;

  return (
    <ProtectedRoute requiredRole="super_admin">
      <div className="space-y-8 pb-16">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              toastMessage.type === "success"
                ? "bg-status-success/10 border-status-success/30 text-status-success"
                : "bg-status-error/10 border-status-error/30 text-status-error"
            }`}
          >
            <div className="flex items-center gap-3 text-xs font-semibold">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs hover:opacity-75 font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-status-warning/15 text-status-warning border border-status-warning/30">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-status-warning uppercase tracking-wider">
                Super Admin Privilege
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
              Admin & Team Management
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Kelola hak akses administrator Mr.BOB dan pantau riwayat audit perubahan wewenang tim.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTeamData}
            disabled={loading}
            className="self-start md:self-auto gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan Data</span>
          </Button>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-card-surface border-border-subtle">
            <span className="text-xs text-text-secondary">Total Pengguna</span>
            <div className="text-2xl font-black text-text-primary mt-1 font-mono">
              {totalUsers}
            </div>
            <span className="text-[10px] text-text-secondary/70">Terdaftar di platform</span>
          </Card>
          <Card className="p-4 bg-card-surface border-border-subtle">
            <span className="text-xs text-text-secondary">Super Admin</span>
            <div className="text-2xl font-black text-status-warning mt-1 font-mono">
              {superAdminCount}
            </div>
            <span className="text-[10px] text-status-warning/70">leadersosmed@gmail.com</span>
          </Card>
          <Card className="p-4 bg-card-surface border-border-subtle">
            <span className="text-xs text-text-secondary">Admin Aktif</span>
            <div className="text-2xl font-black text-brand-blue mt-1 font-mono">
              {adminCount}
            </div>
            <span className="text-[10px] text-text-secondary/70">Diberikan hak verifikasi</span>
          </Card>
          <Card className="p-4 bg-card-surface border-border-subtle">
            <span className="text-xs text-text-secondary">Creator Biasa</span>
            <div className="text-2xl font-black text-text-primary mt-1 font-mono">
              {creatorCount}
            </div>
            <span className="text-[10px] text-text-secondary/70">Hak akses standar</span>
          </Card>
        </div>

        {/* User Search & Filter */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama atau email..."
                className="pl-10"
              />
            </div>
            <span className="text-xs text-text-secondary self-center">
              Menampilkan {filteredUsers.length} pengguna
            </span>
          </div>

          {/* Users Table */}
          <Card className="p-0 overflow-hidden border-border-subtle bg-card-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-secondary/70 border-b border-border-subtle text-text-secondary uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Pengguna</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Hak Akses Saat Ini</th>
                    <th className="px-5 py-3 font-semibold">Terdaftar</th>
                    <th className="px-5 py-3 font-semibold text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 text-text-secondary">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center">
                        Memuat data tim dan pengguna...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center">
                        Tidak ada pengguna yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSuper = u.isSuperAdmin;
                      const isAdmin = u.role === "admin";

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-card-elevated/50 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
                              <div className="flex flex-col">
                                <span className="font-bold text-text-primary text-xs truncate max-w-[160px]">
                                  {u.fullName}
                                </span>
                                <span className="text-[10px] text-text-secondary/70 font-mono">
                                  UID: {u.id.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-text-primary">
                            {u.email}
                          </td>
                          <td className="px-5 py-3.5">
                            {isSuper ? (
                              <Badge variant="warning" size="sm" className="font-mono text-[10px]">
                                Super Admin
                              </Badge>
                            ) : isAdmin ? (
                              <Badge variant="brand" size="sm" className="font-mono text-[10px]">
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                                Creator
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-text-secondary text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isSuper ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-status-warning/10 border border-status-warning/20 text-status-warning text-[10px] font-semibold">
                                <Lock className="w-3 h-3" />
                                <span>Terlindungi</span>
                              </div>
                            ) : isAdmin ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActionClick(u, "revoke")}
                                className="text-status-error border-status-error/30 hover:bg-status-error/10 hover:border-status-error/50 text-[11px] h-8 px-3"
                              >
                                <UserMinus className="w-3.5 h-3.5 mr-1" />
                                <span>Cabut Akses</span>
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleActionClick(u, "assign")}
                                className="hover:border-brand-blue/50 text-[11px] h-8 px-3"
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-1 text-brand-blue" />
                                <span>Jadikan Admin</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Audit Logs Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-blue" />
            <h2 className="text-base font-bold text-text-primary">
              Riwayat Perubahan Hak Akses (Audit Trail)
            </h2>
          </div>

          <Card className="p-0 overflow-hidden border-border-subtle bg-card-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-secondary/70 border-b border-border-subtle text-text-secondary uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Waktu (WIB)</th>
                    <th className="px-5 py-3 font-semibold">Target Pengguna</th>
                    <th className="px-5 py-3 font-semibold">Tindakan</th>
                    <th className="px-5 py-3 font-semibold">Dilakukan Oleh</th>
                    <th className="px-5 py-3 font-semibold">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 text-text-secondary">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-xs text-text-secondary">
                        Belum ada riwayat perubahan wewenang yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-card-elevated/40">
                        <td className="px-5 py-3 text-[11px] font-mono text-text-secondary">
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-text-primary">
                          {log.target_email}
                        </td>
                        <td className="px-5 py-3">
                          {log.action === "assign_admin" ? (
                            <Badge variant="brand" size="sm" className="text-[10px]">
                              Pemberian Akses Admin
                            </Badge>
                          ) : (
                            <Badge variant="error" size="sm" className="text-[10px]">
                              Pencabutan Akses Admin
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[11px] font-mono text-text-secondary">
                          {log.performed_by_email}
                        </td>
                        <td className="px-5 py-3 text-[11px] text-text-secondary/80">
                          {log.notes || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Confirmation Modal */}
        <Dialog
          isOpen={Boolean(selectedUser && actionType)}
          onClose={() => {
            if (!isSubmitting) {
              setSelectedUser(null);
              setActionType(null);
            }
          }}
          title={
            actionType === "assign"
              ? "Konfirmasi Pemberian Akses Admin"
              : "Konfirmasi Pencabutan Akses Admin"
          }
          description={
            actionType === "assign"
              ? `Apakah Anda yakin ingin memberikan hak akses Administrator kepada ${selectedUser?.fullName} (${selectedUser?.email})?`
              : `Apakah Anda yakin ingin mencabut hak akses Administrator dari ${selectedUser?.fullName} (${selectedUser?.email})?`
          }
        >
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle space-y-2">
              <div className="flex items-center gap-2">
                <Avatar name={selectedUser?.fullName} src={selectedUser?.avatarUrl} size="sm" />
                <div>
                  <div className="text-xs font-bold text-text-primary">
                    {selectedUser?.fullName}
                  </div>
                  <div className="text-[11px] text-text-secondary font-mono">
                    {selectedUser?.email}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-text-secondary leading-relaxed pt-1 border-t border-border-subtle/50">
                {actionType === "assign" ? (
                  <p>
                    Pengguna ini akan dapat mengakses <strong>Admin Portal</strong>, memverifikasi konten video creator, menyetujui reward, dan melihat data analitik kampanye.
                  </p>
                ) : (
                  <p className="text-status-error/90">
                    Pengguna ini akan segera kehilangan akses ke seluruh fitur dan halaman Admin Portal. Akun akan kembali menjadi Creator biasa.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary">
                Catatan Alasan (Opsional untuk Audit):
              </label>
              <Input
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionType === "assign"
                    ? "Contoh: Tim Social Media Officer Kediri"
                    : "Contoh: Rotasi penugasan tim"
                }
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant={actionType === "assign" ? "primary" : "danger"}
                size="sm"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <span>Memproses...</span>
                ) : actionType === "assign" ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Jadikan Admin</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4" />
                    <span>Cabut Akses Admin</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

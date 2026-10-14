"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/context/auth-context";
import { updateUserProfile } from "@/lib/supabase/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { UserProfile } from "@/lib/types/user";
import {
  User,
  Mail,
  AtSign,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

function SettingsForm({
  user,
  refreshProfile,
}: {
  user: UserProfile | null;
  refreshProfile: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [tiktokUsername, setTiktokUsername] = useState(user?.tiktokUsername || "");
  const [instagramUsername, setInstagramUsername] = useState(user?.instagramUsername || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        tiktokUsername: tiktokUsername.trim().replace(/^@/, ""),
        instagramUsername: instagramUsername.trim().replace(/^@/, ""),
        phoneNumber: phoneNumber.trim(),
      });
      await refreshProfile();
      setSuccessMessage("Profil berhasil diperbarui.");
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Gagal memperbarui profil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {successMessage && (
        <div className="p-4 rounded-xl bg-status-success/15 border border-status-success/30 text-xs text-status-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error/30 text-xs text-status-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Card className="p-6 sm:p-8 bg-card-surface border-border-subtle shadow-xl">
        {/* User Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-border-subtle/60 mb-6">
          <Avatar name={user?.displayName} size="lg" />
          <div>
            <h3 className="text-base font-bold text-text-primary">
              {user?.displayName}
            </h3>
            <p className="text-xs text-text-secondary">{user?.email}</p>
            <div className="mt-1">
              <Badge variant="brand" size="sm">
                Role: {user?.role || "creator"}
              </Badge>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Nama Lengkap"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Alamat Email"
            value={user?.email || ""}
            disabled
            leftIcon={<Mail className="w-4 h-4" />}
            helperText="Alamat email akun tidak dapat diubah secara langsung."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username TikTok"
              placeholder="@username"
              value={tiktokUsername}
              onChange={(e) => setTiktokUsername(e.target.value)}
              leftIcon={<AtSign className="w-4 h-4" />}
            />

            <Input
              label="Username Instagram"
              placeholder="@username"
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              leftIcon={<AtSign className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Nomor WhatsApp"
            placeholder="0812xxxxxxx"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            helperText="Digunakan untuk konfirmasi pengiriman paket hadiah merchandise."
          />

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default function CreatorSettingsPage() {
  const { user, refreshProfile } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          Profil & Pengaturan Akun
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Kelola informasi identitas creator dan kontak pengiriman reward.
        </p>
      </div>

      <SettingsForm
        key={user?.uid || "empty"}
        user={user}
        refreshProfile={refreshProfile}
      />
    </div>
  );
}

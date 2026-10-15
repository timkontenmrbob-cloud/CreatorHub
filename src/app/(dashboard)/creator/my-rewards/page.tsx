"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { fetchCreatorRedemptions } from "@/lib/supabase/rewards";
import { Redemption, REDEMPTION_STATUS_LABELS } from "@/lib/types/reward";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Gift,
  Clock,
  CheckCircle2,
  Truck,
  Sparkles,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { formatPoints, formatDateTimeWIB } from "@/lib/utils";

export default function MyRewardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const userId = user?.uid;
    if (!userId) {
      return;
    }

    fetchCreatorRedemptions(userId)
      .then((data) => {
        if (!active) return;
        setRedemptions(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading redemptions:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, refreshTrigger]);

  const getStatusBadge = (status: Redemption["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-semibold">
            <Clock className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.pending}
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-semibold bg-amber-500/20 text-amber-300 border-amber-500/30">
            <Truck className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.processing}
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="brand" size="sm" className="gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.ready}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="success" size="sm" className="gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.completed}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="error" size="sm" className="gap-1 font-semibold">
            <XCircle className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.rejected}
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <Gift className="w-3 h-3" />
              Riwayat Klaim
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Hadiah Saya
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Pantau status pemrosesan paket merchandise, resi pengiriman, dan aktivasi voucher program belajarmu.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              setRefreshTrigger((prev) => prev + 1);
            }}
            disabled={loading}
            className="text-xs text-text-secondary hover:text-text-primary gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Perbarui</span>
          </Button>

          <Link href="/creator/reward-shop">
            <Button variant="primary" size="sm" className="text-xs gap-1.5 shadow-md shadow-brand-blue/20">
              <Gift className="w-4 h-4" />
              <span>Tukar Reward Baru</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="p-5 bg-card-surface border-border-subtle rounded-2xl animate-pulse flex flex-col sm:flex-row gap-4 items-center"
            >
              <div className="w-20 h-20 bg-card-elevated rounded-xl shrink-0" />
              <div className="space-y-2 flex-1 w-full">
                <div className="h-4 bg-card-elevated rounded w-1/3" />
                <div className="h-3 bg-card-elevated rounded w-1/4" />
              </div>
            </Card>
          ))}
        </div>
      ) : redemptions.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Belum ada hadiah yang kamu tukarkan."
          description="Yuk, kumpulkan poin dan pilih hadiah favoritmu!"
          actionLabel="Buka Reward Shop Sekarang"
          onAction={() => {
            router.push("/creator/reward-shop");
          }}
        />
      ) : (
        <div className="space-y-3">
          {redemptions.map((red) => {
            const isBroken = brokenImages[red.id];

            return (
              <Card
                key={red.id}
                className="p-3.5 sm:p-4 bg-card-surface border-border-subtle rounded-2xl hover:border-border-subtle/80 transition-all flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-start sm:items-center justify-between"
              >
                {/* Left & Center Container */}
                <div className="flex gap-3.5 sm:gap-4 items-start sm:items-center min-w-0 w-full sm:w-auto flex-1">
                  {/* Left: Small square thumbnail (80-88px) */}
                  <div className="relative w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-xl overflow-hidden bg-card-elevated shrink-0 border border-border-subtle">
                    {red.rewardImage && !isBroken ? (
                      <Image
                        src={red.rewardImage}
                        alt={red.rewardNameSnapshot}
                        fill
                        className="object-cover"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [red.id]: true }))
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-blue/50">
                        <Gift className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Center: Essential Information Hierarchy */}
                  <div className="space-y-1 min-w-0 flex-1">
                    {/* 1. Reward Name + Status Badge beside it */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-text-primary truncate">
                        {red.rewardNameSnapshot}
                      </h3>
                      {getStatusBadge(red.status)}
                    </div>

                    {/* 2. Submission Date */}
                    <p className="text-xs text-text-secondary">
                      Diajukan {formatDateTimeWIB(red.requestedAt)}
                    </p>

                    {/* 3. Reference / Voucher / Resi / Rejected Note */}
                    {red.status === "rejected" ? (
                      <div className="text-[11px] text-text-secondary space-y-0.5">
                        <p className="text-status-error/90 font-medium">
                          Poin yang memenuhi syarat telah dikembalikan ke saldo dompet.
                        </p>
                        {red.rejectionReason && (
                          <p className="text-text-secondary truncate text-[11px]">
                            Alasan: {red.rejectionReason}
                          </p>
                        )}
                      </div>
                    ) : red.rewardType === "merchandise" ? (
                      <p className="text-xs text-text-secondary">
                        <span className="text-text-secondary">Nomor Resi: </span>
                        {red.fulfillmentNotes ? (
                          <span className="text-text-primary font-mono font-semibold">
                            {red.fulfillmentNotes.replace(/^(nomor\s*resi\s*:\s*|resi\s*:\s*)/i, "").trim()}
                          </span>
                        ) : (
                          <span className="text-text-secondary/70 italic">Belum tersedia</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        <span className="text-text-secondary">Kode Voucher: </span>
                        {red.fulfillmentNotes ? (
                          <span className="text-brand-blue font-mono font-bold tracking-wider">
                            {red.fulfillmentNotes.replace(/^(kode\s*voucher\s*:\s*|voucher\s*:\s*|kode\s*:\s*)/i, "").trim()}
                          </span>
                        ) : (
                          <span className="text-text-secondary/70 italic">Menunggu admin</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Points Spent, Right-Aligned */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border-subtle shrink-0 text-right">
                  <span className="sm:hidden text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Poin
                  </span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-brand-blue">
                    −{formatPoints(red.requiredPointsSnapshot)} Poin
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

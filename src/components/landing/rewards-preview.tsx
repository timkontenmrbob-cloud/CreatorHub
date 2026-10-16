"use client";

import React, { useState } from "react";
import Image from "next/image";
import { RewardCatalogCard } from "@/components/rewards/reward-catalog-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { OFFICIAL_REWARDS, Reward } from "@/lib/types/reward";
import { formatPoints } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function RewardsPreview() {
  const [activeModalReward, setActiveModalReward] = useState<Reward | null>(null);

  return (
    <section id="rewards" className="py-20 sm:py-24 bg-bg-secondary/40 border-t border-border-subtle/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
            Pilihan Reward
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Katalog Hadiah Mr.BOB
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Kumpulkan poin dari views videomu dan tukarkan dengan merchandise eksklusif atau beasiswa program belajar bagi member Mr.BOB.
          </p>
        </div>

        {/* Compact catalog matching the creator reward shop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {OFFICIAL_REWARDS.map((reward) => (
            <RewardCatalogCard
              key={reward.id}
              reward={reward}
              onOpenDetail={setActiveModalReward}
            />
          ))}
        </div>
      </div>

      {/* Detail Dialog Modal */}
      {activeModalReward && (
        <Dialog
          isOpen={!!activeModalReward}
          onClose={() => setActiveModalReward(null)}
          title={activeModalReward.name}
        >
          <div className="space-y-5 pt-2">
            {activeModalReward.image && (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-card-elevated border border-border-subtle">
                <Image
                  src={activeModalReward.image}
                  alt={activeModalReward.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 500px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-4 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-between">
              <span className="text-xs text-text-secondary">Poin yang Dibutuhkan</span>
              <span className="text-lg font-black text-brand-blue font-mono">
                {formatPoints(activeModalReward.requiredPoin)} Poin
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Deskripsi Reward
              </span>
              <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                {activeModalReward.description}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle/60 text-xs text-text-secondary space-y-1.5">
              <div className="font-semibold text-text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                <span>Ketentuan Penukaran:</span>
              </div>
              <p className="leading-relaxed">
                Poin dapat ditukarkan kapan saja melalui Creator Portal setelah akumulasi poin videomu diverifikasi oleh admin.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModalReward(null)}
              >
                Tutup
              </Button>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Daftar untuk Klaim
                </Button>
              </Link>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}

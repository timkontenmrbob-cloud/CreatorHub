"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import type { Reward } from "@/lib/types/reward";
import { formatPoints } from "@/lib/utils";

interface RewardCatalogCardProps {
  reward: Reward;
  onOpenDetail: (reward: Reward) => void;
  variant?: "shop" | "preview";
}

export function RewardCatalogCard({ reward, onOpenDetail, variant = "preview" }: RewardCatalogCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isShopCard = variant === "shop";

  return (
    <Card className="group h-full rounded-2xl border-border-subtle bg-card-surface transition-colors hover:border-brand-blue/40">
      <button
        type="button"
        data-reward-id={reward.id}
        aria-label={`Lihat detail ${reward.name}`}
        onClick={() => onOpenDetail(reward)}
        className={`flex h-full w-full min-w-0 gap-3 p-3 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-blue ${isShopCard ? "items-center" : "items-stretch"}`}
      >
        <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-card-elevated sm:h-20 sm:w-20">
          {reward.image && !imageFailed && (
            <Image
              src={reward.image}
              alt={reward.name}
              fill
              sizes="80px"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>

        <div className={`flex min-w-0 flex-1 flex-col gap-1 ${isShopCard ? "justify-center" : "justify-between"}`}>
          <h3 className={`line-clamp-2 text-sm leading-snug text-text-primary sm:text-base ${isShopCard ? "font-semibold" : "font-bold"}`}>
            {reward.name}
          </h3>
          {isShopCard ? (
            <span className="whitespace-nowrap font-mono text-sm font-bold text-brand-blue">
              {formatPoints(reward.requiredPoin)} Poin
            </span>
          ) : (
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-2 gap-y-1">
              <span className="whitespace-nowrap font-mono text-sm font-bold text-brand-blue">
                {formatPoints(reward.requiredPoin)} Poin
              </span>
              <span className="whitespace-nowrap text-xs font-semibold text-text-secondary group-hover:text-brand-blue">
                Lihat Detail
              </span>
            </div>
          )}
        </div>
        {isShopCard && (
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-text-secondary transition-colors group-hover:text-brand-blue">
            Lihat Detail
          </span>
        )}
      </button>
    </Card>
  );
}

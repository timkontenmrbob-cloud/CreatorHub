"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculatePointsFromViews, formatPoints, formatViews } from "@/lib/utils";
import { OFFICIAL_REWARDS } from "@/lib/types/reward";
import { Gift } from "lucide-react";
import Link from "next/link";

export function PointsCalculator() {
  const [views, setViews] = useState<number>(50000);

  const points = calculatePointsFromViews(views);

  // Find the highest reward attainable with this point count
  const attainableRewards = OFFICIAL_REWARDS.filter(
    (r) => r.requiredPoin <= points
  ).sort((a, b) => b.requiredPoin - a.requiredPoin);

  const topReward = attainableRewards[0];

  return (
    <section id="points-calc" className="py-20 sm:py-24 bg-bg-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
            Kalkulator Poin
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Hitung Potensi Poin Videomu
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Rumus resmi: <strong className="text-text-primary">1.000 verified views = 10 Poin</strong>. Geser slider untuk melihat estimasi poin dan reward yang bisa kamu klaim.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="p-8 sm:p-10 bg-card-surface border-border-subtle shadow-xl">
            <div className="space-y-8">
              {/* Slider & Views Indicator */}
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Perkiraan Views
                  </span>
                  <div className="text-right">
                    <span className="text-3xl sm:text-4xl font-extrabold text-brand-blue font-mono tracking-tight">
                      {formatViews(views)}
                    </span>
                    <span className="text-xs text-text-secondary ml-1.5 font-medium">views</span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={views}
                  onChange={(e) => setViews(Number(e.target.value))}
                  className="w-full h-2.5 bg-card-elevated rounded-lg appearance-none cursor-pointer accent-brand-blue"
                  aria-label="Estimasi views video"
                />

                <div className="flex justify-between text-xs text-text-secondary/70 font-mono">
                  <span>1.000</span>
                  <span>250.000</span>
                  <span>500.000</span>
                  <span>1.000.000</span>
                </div>
              </div>

              {/* Conversion Result Block */}
              <div className="p-6 rounded-2xl bg-card-elevated border border-border-subtle grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Points Earned */}
                <div className="space-y-1">
                  <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">
                    Estimasi Hasil Poin
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-text-primary font-mono tracking-tight">
                      {formatPoints(points)}
                    </span>
                    <span className="text-base font-bold text-brand-blue">Poin</span>
                  </div>
                  <p className="text-[11px] text-text-secondary/80">
                    Poin resmi diterbitkan setelah review admin.
                  </p>
                </div>

                {/* Recommended Reward */}
                <div className="p-4 rounded-xl bg-card-surface border border-border-subtle/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-brand-blue font-medium">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Rekomendasi Hadiah</span>
                  </div>
                  {topReward ? (
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {topReward.name}
                      </h4>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                        Butuh {formatPoints(topReward.requiredPoin)} Poin
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary">
                      Kumpulkan min. 10 Poin untuk Keychain Mr.BOB.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1 flex justify-center">
                <Link href="/register">
                  <Button variant="primary" size="md" className="px-8 font-medium">
                    Mulai Kumpulkan Poin
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

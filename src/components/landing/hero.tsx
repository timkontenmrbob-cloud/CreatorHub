import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Gift,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Video,
} from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-bg-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Subtle Top Tag */}
          <div className="inline-flex items-center gap-2">
            <Badge variant="brand" size="md" className="py-1 px-3.5 bg-brand-blue/10 border-brand-blue/25 text-brand-blue font-medium">
              Post Your Video, Claim Your Reward!
            </Badge>
            <span className="hidden sm:inline-block text-xs text-text-secondary">
              • Tanpa Minimal Followers
            </span>
          </div>

          {/* Clean Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.12]">
            Mr.BOB <span className="text-brand-blue">Creator Hub</span>
          </h1>

          {/* Natural Supporting Description */}
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto font-normal">
            Bikin konten tentang Mr.BOB di TikTok atau Instagram Reels, kumpulkan views terverifikasi, dan tukarkan poinmu dengan merchandise official hingga beasiswa program kelas di Pare.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto text-sm sm:text-base px-8 py-3.5 font-medium shadow-md shadow-brand-blue/20"
              >
                Join as Creator
              </Button>
            </Link>
            <a href="#rewards" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto text-sm sm:text-base px-7 py-3.5 border-border-subtle hover:bg-card-elevated"
              >
                <Gift className="w-4 h-4 mr-1.5 text-brand-blue" />
                Explore Rewards
              </Button>
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-status-success" />
              <span>Untuk Alumni, Member, & Kreator Umum</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-blue" />
              <span>1.000 Views = 10 Poin</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-blue" />
              <span>Verifikasi Resmi & Transparan</span>
            </div>
          </div>
        </div>

        {/* 3 Streamlined Overview Cards - Aligned to Title Width (max-w-3xl) for Symmetry */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1 */}
            <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle hover:border-brand-blue/30 transition-colors flex flex-col items-center justify-center text-center">
              <div className="w-9 h-9 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-center text-brand-blue mb-2.5">
                <Video className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                1. Buat Video
              </h3>
            </Card>

            {/* Card 2 */}
            <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle hover:border-brand-blue/30 transition-colors flex flex-col items-center justify-center text-center">
              <div className="w-9 h-9 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-center text-brand-blue mb-2.5">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                2. Kumpulkan Poin
              </h3>
            </Card>

            {/* Card 3 */}
            <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle hover:border-brand-blue/30 transition-colors flex flex-col items-center justify-center text-center">
              <div className="w-9 h-9 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-center text-brand-red mb-2.5">
                <Gift className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                3. Dapatkan Hadiahnya
              </h3>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

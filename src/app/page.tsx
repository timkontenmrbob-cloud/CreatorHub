import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PointsCalculator } from "@/components/landing/points-calculator";
import { RewardsPreview } from "@/components/landing/rewards-preview";
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview";
import { FAQ } from "@/components/landing/faq";
import { LandingCTA } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary selection:bg-brand-blue selection:text-white flex flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <HowItWorks />
        <PointsCalculator />
        <RewardsPreview />
        <LeaderboardPreview />
        <FAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

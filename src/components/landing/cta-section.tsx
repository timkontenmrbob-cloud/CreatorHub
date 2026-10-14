import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingCTA() {
  return (
    <section className="py-20 sm:py-24 bg-bg-main">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-[20px] bg-card-surface border border-border-subtle text-center space-y-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
            Mulai Sekarang
          </p>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary max-w-xl mx-auto leading-tight">
            Siap Ubah Views Videomu Menjadi Hadiah Nyata?
          </h2>

          <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
            Upload videomu seputar Mr.BOB Kampung Inggris di TikTok atau Instagram Reels, kumpulkan Poin terverifikasi, dan klaim merchandise serta program kelas favoritmu.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto text-sm sm:text-base px-8 py-3.5 font-medium shadow-md shadow-brand-blue/20"
              >
                Gabung Sebagai Creator
              </Button>
            </Link>
            <a href="#rewards" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto text-sm sm:text-base px-7 py-3.5 border-border-subtle hover:bg-card-elevated"
              >
                Lihat Katalog Hadiah
              </Button>
            </a>
          </div>

          <div className="pt-3 text-xs text-text-secondary/70">
            Terbuka untuk alumni, member, dan kreator umum • Tanpa minimal followers • Gratis pendaftaran
          </div>
        </div>
      </div>
    </section>
  );
}

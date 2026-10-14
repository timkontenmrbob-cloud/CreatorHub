import Link from "next/link";
import { MapPin, Phone, Globe } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function LandingFooter() {
  const currentYear = 2026;

  return (
    <footer className="border-t border-border-subtle bg-bg-secondary text-text-secondary pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-border-subtle/60">
          {/* Brand Info with Official Logo */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <Logo size="md" showTagline />
            </Link>

            <p className="text-xs text-text-secondary leading-relaxed max-w-sm pt-1">
              Platform rewards konten kreator resmi Mr.BOB Kampung Inggris. Bikin video seru TikTok & Reels, kumpulkan poin dari views terverifikasi, dan klaim merchandise serta beasiswa program kelas bagi member.
            </p>

            <div className="space-y-2 text-xs text-text-secondary pt-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Jl. Asparaga No.61, Tegalsari, Tulungrejo, Kec. Pare, Kabupaten Kediri, Jawa Timur 64212
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                <span>WhatsApp / Telp: 0857-8481-9391</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                <span>Website: mrbobkampunginggris.com</span>
              </div>
            </div>
          </div>

          {/* Navigasi Utama */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Navigasi
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#how-it-works" className="hover:text-text-primary transition-colors">
                  Cara Kerja
                </a>
              </li>
              <li>
                <a href="#points-calc" className="hover:text-text-primary transition-colors">
                  Kalkulator Poin
                </a>
              </li>
              <li>
                <a href="#rewards" className="hover:text-text-primary transition-colors">
                  Katalog Hadiah
                </a>
              </li>
              <li>
                <a href="#leaderboard" className="hover:text-text-primary transition-colors">
                  Leaderboard
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-text-primary transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Portal Akun */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Portal Akun
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-text-primary transition-colors">
                  Masuk Akun
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-text-primary transition-colors">
                  Daftar Creator Baru
                </Link>
              </li>
              <li>
                <Link href="/creator/dashboard" className="hover:text-text-primary transition-colors">
                  Creator Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-text-primary transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Social Media */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Media Sosial
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://tiktok.com/@mrbobkampunginggris"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-blue transition-colors flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  TikTok @mrbobkampunginggris
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/mrbobkampunginggris"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-blue transition-colors flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Instagram @mrbobkampunginggris
                </a>
              </li>
              <li>
                <a
                  href="https://mrbobkampunginggris.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-blue transition-colors flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website Resmi Mr.BOB
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary/60">
          <div>
            &copy; {currentYear} Mr.BOB Creator Hub. All rights reserved. Mr.BOB Kampung Inggris.
          </div>
          <div className="flex items-center gap-4">
            <span>Dark Mode Edition</span>
            <span>•</span>
            <span>Kampung Inggris Pare</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

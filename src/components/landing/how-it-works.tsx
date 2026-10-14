import { Card } from "@/components/ui/card";
import {
  Video,
  UploadCloud,
  CheckCheck,
  Gift,
} from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Video,
      title: "Bikin Konten TikTok atau IG Reels",
      description:
        "Buat video kreatif seputar Mr.BOB Kampung Inggris—mulai dari serunya speaking club, daily life di camp, review kelas, hingga tips belajar.",
      note: "Pastikan akunmu berstatus publik agar video dapat diakses oleh tim admin.",
    },
    {
      step: "02",
      icon: UploadCloud,
      title: "Submit Video & Screenshot Insight",
      description:
        "Kirim link video dan screenshot insight views terbaru dalam kurun waktu 30 hari kalender sejak video pertama kali diposting.",
      note: "Smart Reminder otomatis menghitung sisa deadline submission videomu.",
    },
    {
      step: "03",
      icon: CheckCheck,
      title: "Verifikasi Resmi Tim Admin",
      description:
        "Admin memeriksa keaslian tanggal publikasi dan jumlah views yang valid. Views akan dikunci berdasarkan bukti snapshot submission.",
      note: "Setiap 1.000 verified views dikonversi langsung menjadi 10 Poin.",
    },
    {
      step: "04",
      icon: Gift,
      title: "Kumpulkan Poin & Klaim Hadiah",
      description:
        "Poin dari seluruh videomu akan terakumulasi di wallet. Tukarkan dengan merchandise official Mr.BOB, voucher belajar, atau program kelas gratis.",
      note: "Poin yang masa berlakunya lebih dekat akan digunakan lebih dulu saat kamu menukar hadiah.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-24 bg-bg-secondary/40 border-t border-border-subtle/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
            Alur Partisipasi
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Cara Kerja Mr.BOB Creator Hub
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Empat langkah sederhana untuk mengubah views konten videomu menjadi reward nyata.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                className="p-6 bg-card-surface border-border-subtle flex flex-col justify-between hover:border-border-subtle/90 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xl font-bold font-mono text-text-secondary/50">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-center text-brand-blue">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-text-primary mb-2 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border-subtle/50 text-[11px] text-text-secondary/80 leading-relaxed">
                  {item.note}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

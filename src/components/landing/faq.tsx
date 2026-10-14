"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  q: string;
  leadLines?: string[];
  list?: string[];
  followUpLines?: string[];
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      q: "Siapa saja yang boleh bergabung sebagai Creator?",
      leadLines: [
        "Program ini terbuka untuk siapa saja tanpa syarat minimal followers.",
        "Alumni, member aktif Mr.BOB Kampung Inggris, calon member, hingga kreator umum boleh berpartisipasi.",
        "Penilaian reward murni berdasarkan akumulasi views terverifikasi dari konten yang kamu buat.",
      ],
    },
    {
      q: "Berapa batas waktu submit setelah video diposting?",
      leadLines: [
        "Video hanya dapat diajukan dalam kurun waktu 30 hari kalender pertama sejak tanggal video dipublikasikan.",
      ],
      list: [
        "Hari publikasi pertama kali dihitung sebagai Hari ke-1.",
        "Batas akhir submit adalah Hari ke-30 tepat pukul 23:59:59 WIB.",
        "Video yang melewati hari ke-30 tidak lagi dapat diajukan.",
      ],
    },
    {
      q: "Platform video apa saja yang didukung?",
      leadLines: [
        "Saat ini Mr.BOB Creator Hub mendukung dua platform video vertikal:",
      ],
      list: [
        "TikTok (video wajib berstatus publik).",
        "Instagram Reels (akun dan video tidak di-private).",
      ],
      followUpLines: [
        "Pastikan tautan konten dapat diakses secara publik oleh tim kurasi kami.",
      ],
    },
    {
      q: "Bagaimana rumus konversi Poin dari views?",
      leadLines: [
        "Rumus resmi konversi adalah 1.000 verified views = 10 Poin.",
        "Perhitungan poin dibulatkan ke bawah: floor(views / 100).",
        "Contoh simulasi perolehan poin:",
      ],
      list: [
        "1.000 views = 10 Poin",
        "10.000 views = 100 Poin",
        "100.000 views = 1.000 Poin",
        "1.000.000 views = 10.000 Poin",
      ],
      followUpLines: [
        "Poin resmi akan masuk ke saldo akunmu setelah video dan screenshot insight diverifikasi oleh admin.",
      ],
    },
    {
      q: "Berapa lama masa aktif Poin di akun saya?",
      leadLines: [
        "Setiap poin memiliki masa aktif selama 6 bulan kalender sejak disetujui oleh admin.",
        "Tukarkan poinmu sebelum masa berlakunya habis.",
        "Poin yang masa berlakunya lebih dekat akan otomatis digunakan lebih dulu saat kamu menukar hadiah.",
      ],
    },
    {
      q: "Apakah satu video bisa disubmit ulang jika views-nya terus bertambah?",
      leadLines: [
        "Tidak bisa.",
        "Setiap video hanya dapat diajukan satu kali (One-Time Submission).",
        "Jumlah views akan dikunci berdasarkan screenshot insight analitik yang kamu unggah saat pengajuan.",
        "Pilihlah momen terbaik saat views videomu sudah optimal sebelum submit.",
      ],
    },
    {
      q: "Apa saja bukti yang wajib disertakan saat submit konten?",
      leadLines: [
        "Untuk setiap pengajuan video, kamu wajib melengkapi 5 data berikut:",
      ],
      list: [
        "Platform konten (TikTok atau Instagram Reels).",
        "URL video yang valid dan dapat diakses publik.",
        "Tanggal posting asli video.",
        "Jumlah views terkini saat pengajuan.",
        "Screenshot insight analitik video yang jelas dan terbaca.",
      ],
      followUpLines: [
        "Semua data akan diverifikasi oleh tim kurasi Mr.BOB sebelum poin diterbitkan ke akunmu.",
      ],
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-24 bg-bg-secondary/40 border-t border-border-subtle/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
            Pusat Bantuan
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Pahami aturan main, batas pengajuan, dan mekanisme reward di Mr.BOB Creator Hub.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Card
                key={idx}
                className={cn(
                  "border border-border-subtle transition-all duration-200 overflow-hidden",
                  isOpen ? "bg-card-surface border-border-subtle/90" : "bg-card-surface/60 hover:bg-card-surface"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-text-primary">
                    {faq.q}
                  </span>
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg bg-card-elevated border border-border-subtle flex items-center justify-center text-text-secondary shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180 text-brand-blue"
                    )}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-border-subtle/40 mt-1 space-y-2.5">
                    {faq.leadLines &&
                      faq.leadLines.map((line, lIdx) => (
                        <p key={lIdx} className="leading-relaxed">
                          {line}
                        </p>
                      ))}

                    {faq.list && faq.list.length > 0 && (
                      <ol className="space-y-1.5 list-decimal list-inside pl-1 text-text-primary/90 font-medium py-1">
                        {faq.list.map((pt, pIdx) => (
                          <li key={pIdx} className="leading-relaxed">
                            <span className="text-text-secondary font-normal">{pt}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {faq.followUpLines &&
                      faq.followUpLines.map((line, fIdx) => (
                        <p key={fIdx} className="leading-relaxed">
                          {line}
                        </p>
                      ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

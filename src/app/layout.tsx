import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/auth-context";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mr.BOB Creator Hub — Post Your Video, Claim Your Reward!",
  description:
    "Platform UGC rewards resmi Mr.BOB Kampung Inggris. Bikin konten video TikTok atau IG Reels, kumpulkan poin dari views terverifikasi, dan tukarkan dengan berbagai merchandise dan program kelas gratis!",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${inter.variable} dark`}
    >
      <body className="min-h-screen bg-bg-main text-text-primary font-sans antialiased selection:bg-brand-blue selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

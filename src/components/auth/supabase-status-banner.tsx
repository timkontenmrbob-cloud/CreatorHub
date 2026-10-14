"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/context/auth-context";

export function SupabaseStatusBanner() {
  const { isConfigured } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isConfigured) return null;

  const envTemplate = `# Supabase Configuration (.env.local)
# Dapatkan dari Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_publishable_key_here

# Service Role Key (Hanya untuk server, JANGAN ekspos ke client)
SUPABASE_SECRET_KEY=your_supabase_service_role_secret_key_here`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-status-warning/10 border border-status-warning/30 rounded-2xl p-4 text-xs text-text-primary mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-status-warning">
              Koneksi Supabase Belum Dikonfigurasi:
            </span>{" "}
            Sistem memerlukan environment variable Supabase untuk autentikasi aktif.
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-status-warning hover:underline flex items-center gap-1 shrink-0 font-medium cursor-pointer"
        >
          {isExpanded ? (
            <>
              Sembunyikan <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Petunjuk Setup <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-status-warning/20 space-y-2">
          <p className="text-text-secondary leading-relaxed">
            Tambahkan file <code className="text-brand-blue bg-card-surface px-1.5 py-0.5 rounded font-mono">.env.local</code> di folder root proyek dengan isi berikut:
          </p>
          <div className="relative">
            <pre className="p-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-secondary font-mono text-[11px] overflow-x-auto">
              {envTemplate}
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-card-elevated hover:bg-card-surface text-text-secondary hover:text-text-primary transition"
              title="Salin template .env"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-status-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-text-secondary/80 pt-1">
            📌 Kredensial dapat ditemukan di: <strong>Supabase Dashboard &gt; Project Settings &gt; API</strong> (Project URL &amp; API Keys).
          </p>
        </div>
      )}
    </div>
  );
}

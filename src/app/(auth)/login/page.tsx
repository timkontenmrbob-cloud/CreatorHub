"use client";

import React, { Suspense } from "react";
import { GoogleSignInCard } from "@/components/auth/google-sign-in-card";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="w-full">
      <Suspense
        fallback={
          <Card className="p-8 text-center text-text-secondary flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-6 h-6 animate-spin text-brand-blue mb-2" />
            <span className="text-xs">Memuat halaman login...</span>
          </Card>
        }
      >
        <GoogleSignInCard />
      </Suspense>
    </div>
  );
}

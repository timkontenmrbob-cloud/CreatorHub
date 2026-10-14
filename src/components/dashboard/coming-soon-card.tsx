import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon, Sparkles, ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";

interface ComingSoonModuleProps {
  title: string;
  phase: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  backHref?: string;
}

export function ComingSoonModule({
  title,
  phase,
  description,
  features,
  icon: Icon,
  backHref = "/creator/dashboard",
}: ComingSoonModuleProps) {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="p-8 sm:p-12 text-center bg-card-surface border-border-subtle shadow-2xl space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
            <Icon className="w-8 h-8" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2">
            <Badge variant="brand" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              {phase} — Coming Soon
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        <div className="max-w-md mx-auto text-left p-5 rounded-2xl bg-card-elevated border border-border-subtle space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Fitur Mendatang di Tahap Ini:
          </div>
          <ul className="space-y-2 text-xs text-text-secondary">
            {features.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <Link href={backHref}>
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

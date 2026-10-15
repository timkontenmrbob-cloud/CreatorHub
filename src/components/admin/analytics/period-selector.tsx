"use client";

import React from "react";
import { QuarterName, QuarterPeriod } from "@/lib/types/analytics";
import { Calendar, ChevronDown } from "lucide-react";

interface PeriodSelectorProps {
  selectedYear: number;
  selectedQuarter: QuarterName;
  period: QuarterPeriod;
  onSelectPeriod: (year: number, quarter: QuarterName) => void;
  availableYears?: number[];
}

export function PeriodSelector({
  selectedYear,
  selectedQuarter,
  period,
  onSelectPeriod,
  availableYears = [2026, 2025],
}: PeriodSelectorProps) {
  const quarters: { key: QuarterName; label: string; months: string }[] = [
    { key: "Q1", label: "Kuartal 1 (Q1)", months: "Jan – Mar" },
    { key: "Q2", label: "Kuartal 2 (Q2)", months: "Apr – Jun" },
    { key: "Q3", label: "Kuartal 3 (Q3)", months: "Jul – Sep" },
    { key: "Q4", label: "Kuartal 4 (Q4)", months: "Okt – Des" },
  ];

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Year & Quarter selection buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Year Select */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => onSelectPeriod(Number(e.target.value), selectedQuarter)}
              className="appearance-none bg-bg-main border border-border-subtle hover:border-brand-blue/50 text-text-primary text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 pr-8 transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-bg-secondary text-text-primary">
                  Tahun {y}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quarters Pills */}
          <div className="flex items-center bg-bg-main p-1 rounded-xl border border-border-subtle">
            {quarters.map((q) => {
              const isActive = selectedQuarter === q.key;
              return (
                <button
                  key={q.key}
                  onClick={() => onSelectPeriod(selectedYear, q.key)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-brand-blue text-white shadow-sm shadow-brand-blue/20"
                      : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
                  }`}
                >
                  <span className="sm:hidden">{q.key}</span>
                  <span className="hidden sm:inline">
                    {q.key} <span className="opacity-70 text-[10px]">({q.months})</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Period Details & Provisional Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary bg-bg-main px-3.5 py-2 rounded-xl border border-border-subtle">
            <Calendar className="w-3.5 h-3.5 text-brand-blue" />
            <span className="font-medium text-text-primary">{period.quarterLabel}:</span>
            <span>{period.label}</span>
            <span className="text-[10px] text-text-secondary/70 font-mono">(WIB)</span>
          </div>

          {period.isCurrentQuarter ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Sedang Berjalan</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-500/10 border border-zinc-500/30 text-zinc-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              <span>Periode Berakhir</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

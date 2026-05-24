"use client";

import { useMemo, useState } from "react";
import { Inter } from "next/font/google";
import { AnalyzeNavbar } from "@/components/analyze/Navbar";
import { Sidebar } from "@/components/analyze/Sidebar";
import { UploadSection } from "@/components/analyze/UploadSection";
import { LoadingSection } from "@/components/analyze/LoadingSection";
import { ResultsSection } from "@/components/analyze/ResultsSection";
import type { AnalysisResultData } from "@/lib/api";

const inter = Inter({ subsets: ["latin"] });

export default function AnalyzePage() {
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResultData | null>(null);

  const viewKey = useMemo(
    () => (loading ? "loading" : analysis ? "results" : "upload"),
    [loading, analysis],
  );

  return (
    <div className={`${inter.className} relative min-h-screen antialiased`}>
      <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-teal-50/95 via-emerald-50/80 to-cyan-50/90">
        <div className="absolute -left-28 top-16 h-[22rem] w-[22rem] rounded-full bg-teal-200/35 blur-3xl" />
        <div className="absolute right-[-8%] top-1/4 h-[26rem] w-[26rem] rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-10 left-1/4 h-72 w-72 rounded-full bg-cyan-100/45 blur-3xl" />
      </div>

      <AnalyzeNavbar onMenuClick={() => setMobileHistoryOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6 lg:px-8 lg:pb-20">
        <div className="flex min-h-[min(85vh,720px)] flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2">
          <Sidebar
            mobileOpen={mobileHistoryOpen}
            onCloseMobile={() => setMobileHistoryOpen(false)}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-md shadow-teal-900/5 ring-1 ring-white/80 backdrop-blur-md">
            <div
              key={viewKey}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto transition-opacity duration-300 ease-out animate-fade-in"
            >
              {loading ? (
                <LoadingSection />
              ) : analysis ? (
                <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setAnalysis(null)}
                      className="text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
                    >
                      Analyze another file
                    </button>
                  </div>
                  <ResultsSection data={analysis} />
                </div>
              ) : (
                <UploadSection
                  setAnalysis={setAnalysis}
                  setLoading={setLoading}
                  loading={loading}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-10 flex items-center gap-1 text-xs text-slate-500 transition hover:text-emerald-700 sm:bottom-8 sm:right-8"
      >
        Need help?
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

"use client";

import type { AnalysisResultData } from "@/lib/api";

export type { AnalysisResultData, ClauseResult } from "@/lib/api";

type ResultsSectionProps = {
  data: AnalysisResultData;
  className?: string;
};

function normalizeLevel(level: string): "high" | "low" | "other" {
  const l = level.trim().toLowerCase();
  if (l.includes("high")) return "high";
  if (l.includes("low")) return "low";
  return "other";
}

export function ResultsSection({ data, className = "" }: ResultsSectionProps) {
  const level = normalizeLevel(data.risk_level);
  const isHigh = level === "high";
  const isLow = level === "low";

  const headlineClass = isHigh
    ? "text-red-600"
    : isLow
      ? "text-emerald-600"
      : "text-amber-600";

  return (
    <section
      className={`rounded-2xl border border-white/70 bg-white/75 p-6 shadow-md shadow-teal-900/5 ring-1 ring-white/80 backdrop-blur-md sm:p-8 ${className}`}
    >
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className={`text-3xl font-bold tracking-tight sm:text-4xl ${headlineClass}`}>
            {data.risk_level} Risk
            <span className="ml-2 inline-block" aria-hidden>
              {isHigh ? "⚠️" : isLow ? "✓" : "◆"}
            </span>
          </p>
          <p
            className={`mt-2 text-lg font-medium sm:text-xl ${
              isHigh ? "text-red-600/90" : isLow ? "text-emerald-600/90" : "text-amber-700/90"
            }`}
          >
            {Math.round(data.risk_score)}% chance of claim rejection
          </p>
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed text-slate-500 sm:text-base">
          {data.summary}
        </p>

        {data.risk_flags.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal-800/90">
              Risk flags
            </h2>
            <ul className="flex flex-col gap-3">
              {data.risk_flags.map((flag, i) => (
                <li
                  key={`${flag}-${i}`}
                  className="flex items-start gap-3 rounded-xl border border-red-100/80 bg-red-50/90 px-4 py-3 shadow-sm ring-1 ring-red-100/50"
                >
                  <span className="mt-0.5 shrink-0 text-red-500">
                    <WarningIcon className="h-5 w-5" />
                  </span>
                  <span className="text-sm leading-snug text-red-900/90">{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.clauses.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal-800/90">
              Clauses
            </h2>
            <ul className="flex flex-col gap-4">
              {data.clauses.map((clause, i) => (
                <li
                  key={`${clause.title}-${i}`}
                  className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-800">
                      {clause.title}
                    </h3>
                    <ClauseRiskBadge risk={clause.risk} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {clause.explanation}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ClauseRiskBadge({ risk }: { risk: string }) {
  const level = normalizeLevel(risk);
  const isHigh = level === "high";
  const isLow = level === "low";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isHigh
          ? "bg-red-100 text-red-700"
          : isLow
            ? "bg-emerald-100 text-emerald-800"
            : "bg-amber-100 text-amber-800"
      }`}
    >
      {risk}
    </span>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.581c.75 1.334-.213 2.98-1.742 2.98H3.481c-1.53 0-2.493-1.646-1.743-2.98l6.52-11.58zM11 13a1 1 0 10-2 0v2a1 1 0 102 0v-2zm-1-8a1 1 0 00-.993.883L9 6v4a1 1 0 102 0V6l-.007-.117A1 1 0 009 5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

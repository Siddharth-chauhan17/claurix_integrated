"use client";

import { cn } from "@/lib/utils";
import type { ClauseRendererProps } from "./types";

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  medium: "bg-amber-50 text-amber-900 ring-amber-200",
  high: "bg-orange-50 text-orange-900 ring-orange-200",
  critical: "bg-red-50 text-red-800 ring-red-200",
};

/** Compact clause summary for cards and lists. */
export function ClauseRenderer({ clause, config }: ClauseRendererProps) {
  const risk = clause.ai_analysis.risk_level;
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{clause.title}</p>
          <p className="mt-0.5 text-xs capitalize text-slate-500">
            {clause.category} · {clause.comparison_type}
            {config.readOnly ? "" : " · editable"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1",
            RISK_STYLES[risk] ?? RISK_STYLES.medium
          )}
        >
          {risk}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {clause.values.map((v) => (
          <span
            key={`${clause.clause_id}-${v.insurer}`}
            className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700"
          >
            <span className="font-medium text-slate-500">{v.insurer}:</span>{" "}
            {v.value}
          </span>
        ))}
      </div>
    </div>
  );
}

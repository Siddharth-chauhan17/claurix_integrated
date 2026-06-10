"use client";

import { cn } from "@/lib/utils";
import type { SectionRendererProps } from "./types";
import { ClauseRenderer } from "./ClauseRenderer";

/** Card-style section view — alternative to table renderer. */
export function SectionRenderer({
  section,
  activeClauseId,
  config,
  callbacks,
}: SectionRendererProps) {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {section.section_name}
        </h2>
        <p className="text-xs text-slate-500">
          {section.clauses.length} clauses · {section.source_trace.length} source
          traces
        </p>
      </div>
      <div className="space-y-3">
        {section.clauses.map((clause) => (
          <button
            key={clause.clause_id}
            type="button"
            onClick={() => callbacks.onSelectClause?.(clause.clause_id)}
            className={cn(
              "w-full rounded-xl border text-left transition",
              activeClauseId === clause.clause_id
                ? "border-primary-300 bg-primary-50/80 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <ClauseRenderer clause={clause} section={section} config={config} />
          </button>
        ))}
      </div>
    </div>
  );
}

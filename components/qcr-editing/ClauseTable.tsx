"use client";

import {
  useVisibleClauses,
  useVisibleInsurers,
} from "@/lib/qcr-editing/workspace-store";
import { ClauseRow } from "./ClauseRow";

export function ClauseTable() {
  const clauses = useVisibleClauses();
  const insurers = useVisibleInsurers();

  if (insurers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        Enable at least one insurer column in the toolbar.
      </div>
    );
  }

  if (clauses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        No clauses match the current filters.
      </div>
    );
  }

  const gridCols = `minmax(200px, 1.1fr) minmax(240px, 1.3fr) repeat(${insurers.length}, minmax(200px, 1fr))`;

  return (
    <div className="h-full min-h-0 overflow-auto">
      <div className="min-w-max">
        <div
          role="row"
          className="sticky top-0 z-10 grid border-b border-slate-300 bg-slate-800 text-left text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="border-r border-slate-600 px-3 py-2.5">RFQ Clause</div>
          <div className="border-r border-slate-600 px-3 py-2.5">RFQ Requirement</div>
          {insurers.map((insurer) => (
            <div key={insurer} className="border-l border-slate-600 px-3 py-2.5">
              {insurer}
            </div>
          ))}
        </div>
        {clauses.map((clause, i) => (
          <ClauseRow
            key={clause.clause_id}
            clause={clause}
            insurers={insurers}
            rowIndex={i}
            gridCols={gridCols}
          />
        ))}
      </div>
    </div>
  );
}

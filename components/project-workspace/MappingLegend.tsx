"use client";

import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

export function MappingLegend() {
  const mappings = useProjectWorkspaceStore((s) => s.mappings);
  const activeSheetName = useProjectWorkspaceStore((s) => s.activeSheetName);
  const openMappingEditor = useProjectWorkspaceStore((s) => s.openMappingEditor);

  const sheetMappings = mappings.filter((m) => m.sheet_name === activeSheetName);

  if (sheetMappings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
      {sheetMappings.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => openMappingEditor(m.id)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: m.color }}
          />
          <span className="uppercase tracking-wide">{m.policy_line}</span>
          <span className="text-slate-400">
            rows {m.start_row}–{m.end_row}
          </span>
        </button>
      ))}
    </div>
  );
}

"use client";

import { getSectionRiskSummary } from "@/lib/workspace-engine";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function SectionNavigation() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeSectionId = useWorkspaceStore((s) => s.activeSectionId);
  const setActiveSection = useWorkspaceStore((s) => s.setActiveSection);

  if (!workspace) return null;

  return (
    <nav className="space-y-1 p-2">
      {workspace.sections.map((section) => {
        const summary = getSectionRiskSummary(workspace, section.section_id);
        const active = section.section_id === activeSectionId;
        return (
          <button
            key={section.section_id}
            type="button"
            onClick={() => setActiveSection(section.section_id)}
            className={cn(
              "w-full rounded-lg px-3 py-2.5 text-left transition",
              active
                ? "bg-primary-600 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            <span className="block truncate text-sm font-semibold">
              {section.section_name}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-xs",
                active ? "text-primary-100" : "text-slate-500"
              )}
            >
              {section.clauses.length} clauses
              {summary ? ` · ${summary.dominant_risk} risk` : ""}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

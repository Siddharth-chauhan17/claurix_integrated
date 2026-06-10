"use client";

import { useEffect, useState } from "react";
import { POLICY_LINE_OPTIONS } from "@/lib/project-workspace/policyLines";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

export function AssignPolicyMenu() {
  const assignMenu = useProjectWorkspaceStore((s) => s.assignMenu);
  const selectedRange = useProjectWorkspaceStore((s) => s.selectedRange);
  const assignPolicy = useProjectWorkspaceStore((s) => s.assignPolicyToSelection);
  const closeMenu = useProjectWorkspaceStore((s) => s.closeAssignMenu);
  const removeMapping = useProjectWorkspaceStore((s) => s.removeMapping);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!assignMenu) {
      setEntered(false);
      return;
    }
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [assignMenu]);

  if (!assignMenu) return null;

  const editingId = assignMenu.editingMappingId;
  const rowLabel =
    selectedRange && selectedRange.start !== selectedRange.end
      ? `Rows ${Math.min(selectedRange.start, selectedRange.end)}–${Math.max(selectedRange.start, selectedRange.end)}`
      : selectedRange
        ? `Row ${selectedRange.start}`
        : null;

  return (
    <>
      <div
        className={cn("pw-menu-backdrop fixed inset-0 z-40", entered && "pw-menu-backdrop--open")}
        onClick={closeMenu}
        aria-hidden
      />
      <div
        className={cn(
          "pw-assign-menu fixed z-50 w-[15.5rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-sm",
          entered && "pw-assign-menu--open"
        )}
        style={{
          left: assignMenu.x,
          top: assignMenu.y,
        }}
        role="dialog"
        aria-label="Assign policy line"
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Assign Policy Line
          </p>
          {rowLabel ? (
            <p className="mt-1 text-xs text-slate-400">{rowLabel} · operational section</p>
          ) : null}
        </div>
        <ul className="max-h-72 overflow-y-auto py-1.5">
          {POLICY_LINE_OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => assignPolicy(opt.label)}
                className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50/90"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm transition group-hover:scale-110"
                  style={{ backgroundColor: opt.color }}
                />
                <span className="font-medium">{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {editingId ? (
          <div className="border-t border-slate-100 bg-slate-50/50 p-2">
            <button
              type="button"
              onClick={() => {
                removeMapping(editingId);
                closeMenu();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Remove mapping
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

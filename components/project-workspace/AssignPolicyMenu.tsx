"use client";

import { useEffect, useRef, useState } from "react";
import {
  CUSTOM_POLICY_LINE_COLOR,
  isPredefinedPolicyLine,
  POLICY_LINE_OPTIONS,
} from "@/lib/project-workspace/policyLines";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

export function AssignPolicyMenu() {
  const assignMenu = useProjectWorkspaceStore((s) => s.assignMenu);
  const selectedRange = useProjectWorkspaceStore((s) => s.selectedRange);
  const mappings = useProjectWorkspaceStore((s) => s.mappings);
  const assignPolicy = useProjectWorkspaceStore((s) => s.assignPolicyToSelection);
  const closeMenu = useProjectWorkspaceStore((s) => s.closeAssignMenu);
  const removeMapping = useProjectWorkspaceStore((s) => s.removeMapping);
  const [entered, setEntered] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!assignMenu) {
      setEntered(false);
      setCustomMode(false);
      setCustomName("");
      setCustomError(null);
      return;
    }
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [assignMenu]);

  useEffect(() => {
    if (!customMode) return;
    const t = requestAnimationFrame(() => customInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [customMode]);

  if (!assignMenu) return null;

  const editingId = assignMenu.editingMappingId;
  const editingMapping = editingId
    ? mappings.find((m) => m.id === editingId)
    : undefined;
  const rowLabel =
    selectedRange && selectedRange.start !== selectedRange.end
      ? `Rows ${Math.min(selectedRange.start, selectedRange.end)}–${Math.max(selectedRange.start, selectedRange.end)}`
      : selectedRange
        ? `Row ${selectedRange.start}`
        : null;

  function openCustomMode() {
    const existing =
      editingMapping && !isPredefinedPolicyLine(editingMapping.policy_line)
        ? editingMapping.policy_line
        : "";
    setCustomName(existing);
    setCustomError(null);
    setCustomMode(true);
  }

  function submitCustomName() {
    const name = customName.trim();
    if (!name) {
      setCustomError("Enter a policy name");
      return;
    }
    assignPolicy(name);
  }

  return (
    <>
      <div
        className={cn("pw-menu-backdrop fixed inset-0 z-40", entered && "pw-menu-backdrop--open")}
        onClick={closeMenu}
        aria-hidden
      />
      <div
        className={cn(
          "pw-assign-menu fixed z-50 w-[17rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-sm",
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
            {customMode ? "Custom Policy Name" : "Assign Policy Line"}
          </p>
          {rowLabel ? (
            <p className="mt-1 text-xs text-slate-400">{rowLabel} · operational section</p>
          ) : null}
        </div>

        {customMode ? (
          <div className="space-y-3 px-4 py-3">
            <div>
              <label htmlFor="custom-policy-name" className="sr-only">
                Policy name
              </label>
              <input
                ref={customInputRef}
                id="custom-policy-name"
                type="text"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  if (customError) setCustomError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCustomName();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setCustomMode(false);
                    setCustomError(null);
                  }
                }}
                placeholder="e.g. Aviation Insurance"
                maxLength={80}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-primary-500/30 transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2"
              />
              {customError ? (
                <p className="mt-1.5 text-xs text-red-600">{customError}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submitCustomName}
                className="flex-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  setCustomError(null);
                }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1.5">
            {POLICY_LINE_OPTIONS.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() =>
                    opt.id === "custom" ? openCustomMode() : assignPolicy(opt.label)
                  }
                  className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50/90"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm transition group-hover:scale-110"
                    style={{
                      backgroundColor:
                        opt.id === "custom" ? CUSTOM_POLICY_LINE_COLOR : opt.color,
                    }}
                  />
                  <span className="font-medium">
                    {opt.id === "custom" ? "Custom…" : opt.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

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

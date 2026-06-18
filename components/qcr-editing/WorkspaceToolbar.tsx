"use client";

import { useState } from "react";
import type { ComparisonStatus } from "@/lib/qcr-editing/types";
import { STATUS_LABELS } from "@/lib/qcr-editing/status-styles";
import { clausesWithRemarkDrafts } from "@/lib/qcr-editing/export-payload";
import { exportQcrWorkbook } from "@/lib/api";
import { persistQcrExport } from "@/lib/project-workspace/persist-qcr-export";
import {
  selectHasUnsavedChanges,
  useQcrEditingStore,
  useVisibleClauses,
} from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { ExportExcelConfirmModal } from "./ExportExcelConfirmModal";
import { InsurerColumnsMenu } from "./InsurerColumnsMenu";

const STATUS_FILTERS: ComparisonStatus[] = [
  "agreed",
  "partially_agreed",
  "not_agreed",
];

export function WorkspaceToolbar() {
  const filter = useQcrEditingStore((s) => s.ui.filter);
  const isSaving = useQcrEditingStore((s) => s.ui.isSaving);
  const saveError = useQcrEditingStore((s) => s.ui.saveError);
  const setFilter = useQcrEditingStore((s) => s.setFilter);
  const toggleRightPanel = useQcrEditingStore((s) => s.toggleRightPanel);
  const rightPanelOpen = useQcrEditingStore((s) => s.ui.rightPanelOpen);
  const saveWorkspace = useQcrEditingStore((s) => s.saveWorkspace);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const visibleClauses = useVisibleClauses();
  const visibleCount = visibleClauses.length;
  const totalClauses = useQcrEditingStore((s) => s.clauses.length);
  const pendingRemarkDrafts = useQcrEditingStore(
    (s) => s.draft.remarkDrafts.length
  );

  const toggleStatus = (status: ComparisonStatus) => {
    const current = filter.statuses ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilter({ statuses: next.length ? next : undefined });
  };

  const openExportModal = () => {
    const { workspace: ws, clauses } = useQcrEditingStore.getState();
    if (!ws?.meta.project_id || clauses.length === 0) {
      toast.warn("No QCR clauses to export.");
      return;
    }
    setExportModalOpen(true);
  };

  const handleConfirmExport = async () => {
    const { workspace: ws, clauses, draft } = useQcrEditingStore.getState();
    if (!ws?.meta.project_id || clauses.length === 0) {
      setExportModalOpen(false);
      return;
    }

    setIsExporting(true);
    try {
      if (selectHasUnsavedChanges()) {
        await saveWorkspace();
      }

      const exportClauses = clausesWithRemarkDrafts(
        useQcrEditingStore.getState().clauses,
        draft.remarkDrafts
      );

      const blob = await exportQcrWorkbook(ws.meta.project_id, {
        workspace_id: ws.workspace_id,
        clauses: exportClauses as unknown as Array<Record<string, unknown>>,
        sections: ws.sections ?? [],
        insurers: ws.insurers,
      });

      const projectLabel =
        ws.meta.project_name?.trim() ||
        ws.meta.client_name?.trim() ||
        ws.workspace_id;
      const safeName = projectLabel.replace(/[^\w\- ]+/g, "_").trim() || "QCR";
      const fileName = `QCR_${safeName}.xlsx`;

      await persistQcrExport(ws.meta.project_id, blob, fileName);
      setExportModalOpen(false);
      toast.success(
        "QCR exported. Download it from Exported QCR in the workstation sidebar."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to export QCR workbook"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <div className="relative min-w-0 flex-1 max-w-md">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={filter.search ?? ""}
            onChange={(e) => setFilter({ search: e.target.value })}
            placeholder="Search clauses, proposals, notes…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-1 focus:ring-primary-200"
          />
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          <span className="mr-1 text-[10px] font-semibold uppercase text-slate-400">
            Status
          </span>
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-semibold uppercase transition",
                filter.statuses?.includes(status)
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <InsurerColumnsMenu />

        <span className="hidden text-xs text-slate-500 md:inline">
          {visibleCount} clause{visibleCount !== 1 ? "s" : ""}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {isSaving ? (
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">
              Saving…
            </span>
          ) : null}
          {!isSaving && pendingRemarkDrafts > 0 ? (
            <span className="hidden text-xs font-medium text-amber-600 sm:inline">
              {pendingRemarkDrafts} draft{pendingRemarkDrafts !== 1 ? "s" : ""}
            </span>
          ) : null}
          {saveError ? (
            <span
              className="max-w-[160px] truncate text-xs text-red-600"
              title={saveError}
            >
              Save failed
            </span>
          ) : null}
          <button
            type="button"
            onClick={openExportModal}
            disabled={isExporting || isSaving || totalClauses === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? "Exporting…" : "Export Excel"}
          </button>
          <button
            type="button"
            onClick={() => toggleRightPanel()}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            {rightPanelOpen ? "Hide review" : "Show review"}
          </button>
        </div>
      </div>

      <ExportExcelConfirmModal
        open={exportModalOpen}
        isExporting={isExporting}
        onConfirm={() => void handleConfirmExport()}
        onCancel={() => {
          if (!isExporting) setExportModalOpen(false);
        }}
      />
    </>
  );
}

"use client";

import { useEffect } from "react";

type ExportExcelConfirmModalProps = {
  open: boolean;
  isExporting: boolean;
  fileName: string;
  onFileNameChange: (value: string) => void;
  onExport: () => void;
  onDiscard: () => void;
};

export function ExportExcelConfirmModal({
  open,
  isExporting,
  fileName,
  onFileNameChange,
  onExport,
  onDiscard,
}: ExportExcelConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isExporting) onDiscard();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isExporting, onDiscard]);

  if (!open) return null;

  const canExport = fileName.trim().length > 0 && !isExporting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-excel-title"
      onClick={isExporting ? undefined : onDiscard}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 id="export-excel-title" className="text-lg font-semibold text-slate-900">
            Export to Excel
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Choose a file name for the exported workbook. It will be available
            from Exported QCR in the workstation sidebar.
          </p>
          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-600">File name</span>
            <input
              type="text"
              value={fileName}
              onChange={(e) => onFileNameChange(e.target.value)}
              disabled={isExporting}
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="QCR_ClientName.xlsx"
              aria-label="Export file name"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isExporting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

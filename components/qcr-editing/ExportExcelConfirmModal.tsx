"use client";

import { useEffect } from "react";

type ExportExcelConfirmModalProps = {
  open: boolean;
  isExporting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ExportExcelConfirmModal({
  open,
  isExporting,
  onConfirm,
  onCancel,
}: ExportExcelConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isExporting) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isExporting, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-excel-title"
      onClick={isExporting ? undefined : onCancel}
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
            Are you sure you want to export this QCR to Excel? The file will be
            available to download from the workstation sidebar.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            No
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExporting}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? "Exporting…" : "Yes, export"}
          </button>
        </div>
      </div>
    </div>
  );
}

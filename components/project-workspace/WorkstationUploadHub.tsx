"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DocumentsIcon, ProjectsIcon } from "@/components/workspace/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useWorkstationUploads } from "@/hooks/useWorkstationUploads";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { cn } from "@/lib/utils";

type UploadZoneCardProps = {
  title: string;
  description: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
  done?: boolean;
  variant?: "primary" | "default";
};

function UploadZoneCard({
  title,
  description,
  hint,
  icon,
  onClick,
  done = false,
  variant = "default",
}: UploadZoneCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[14rem] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
        done
          ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300"
          : variant === "primary"
            ? "border-primary-200 bg-primary-50/40 hover:border-primary-400 hover:bg-primary-50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
      )}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl shadow-sm ring-1 transition group-hover:scale-[1.02]",
          done
            ? "bg-emerald-600 text-white ring-emerald-500/20"
            : variant === "primary"
              ? "bg-primary-600 text-white ring-primary-500/20"
              : "bg-slate-100 text-slate-600 ring-slate-200/80 group-hover:bg-white"
        )}
      >
        {icon}
      </span>
      <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-[16rem] text-sm text-slate-500">{description}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        {done ? "Uploaded · click to replace" : hint}
      </p>
    </button>
  );
}

function UploadedFileRow({
  label,
  fileName,
  onRemove,
  removeLabel = "Remove",
}: {
  label: string;
  fileName: string;
  onRemove: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-slate-800" title={fileName}>
          {fileName}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
      >
        {removeLabel}
      </button>
    </div>
  );
}

type RemoveTarget =
  | { kind: "rfq" }
  | { kind: "quote"; id: string; name: string };

export function WorkstationUploadHub() {
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const quoteFiles = useProjectWorkspaceStore((s) => s.quoteFiles);
  const selectionNotice = useProjectWorkspaceStore((s) => s.selectionNotice);
  const proceedToPolicyMapping = useProjectWorkspaceStore(
    (s) => s.proceedToPolicyMapping
  );
  const archiveRfqWorkbook = useProjectWorkspaceStore((s) => s.archiveRfqWorkbook);
  const archiveQuoteFile = useProjectWorkspaceStore((s) => s.archiveQuoteFile);

  const {
    rfqInputRef,
    quotesInputRef,
    handleRfqUpload,
    handleQuotesUpload,
    openRfqPicker,
    openQuotesPicker,
  } = useWorkstationUploads();

  const hasRfq = Boolean(rfqWorkbook);
  const hasQuotes = quoteFiles.length > 0;
  const canProceed = hasRfq && hasQuotes;

  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    if (removeTarget.kind === "rfq") {
      archiveRfqWorkbook();
    } else {
      archiveQuoteFile(removeTarget.id);
    }
    setRemoveTarget(null);
  };

  const removeDialogMessage =
    removeTarget?.kind === "rfq"
      ? "Move this RFQ to Uploaded RFQ? Policy section mappings will be cleared and it will no longer be used for QCR generation."
      : removeTarget?.kind === "quote"
        ? `Move "${removeTarget.name}" to Uploaded Quotes? It will no longer be used for QCR generation.`
        : "";

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <input
        ref={rfqInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => handleRfqUpload(e.target.files)}
      />
      <input
        ref={quotesInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleQuotesUpload(e.target.files)}
      />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Upload documents
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Upload the RFQ and carrier quotes, then continue to policy section
            mapping and QCR generation.
          </p>
        </div>

        <ol className="mt-8 flex w-full max-w-3xl items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:gap-4">
          <li className={cn(hasRfq && "text-emerald-700")}>
            1. RFQ {hasRfq ? "✓" : ""}
          </li>
          <li aria-hidden className="text-slate-300">
            →
          </li>
          <li className={cn(hasQuotes && "text-emerald-700")}>
            2. Quotes {hasQuotes ? `✓ (${quoteFiles.length})` : ""}
          </li>
          <li aria-hidden className="text-slate-300">
            →
          </li>
          <li className={cn(canProceed && "text-primary-700")}>3. Map policies</li>
        </ol>

        <div className="mt-8 grid w-full max-w-3xl gap-5 sm:grid-cols-2">
          <UploadZoneCard
            title="Upload RFQ"
            description="Client request-for-quote Excel workbook."
            hint="Excel · .xlsx or .xls"
            icon={<ProjectsIcon className="h-7 w-7" />}
            onClick={openRfqPicker}
            done={hasRfq}
            variant="primary"
          />
          <UploadZoneCard
            title="Upload quotes"
            description="One or more carrier quote Excel files (2+ for AI comparison)."
            hint="Excel · .xlsx or .xls"
            icon={<DocumentsIcon className="h-7 w-7" />}
            onClick={openQuotesPicker}
            done={hasQuotes}
          />
        </div>

        {(hasRfq || hasQuotes) && (
          <div className="mt-6 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                RFQ
              </p>
              {hasRfq ? (
                <div className="mt-2">
                  <UploadedFileRow
                    label="RFQ"
                    fileName={rfqWorkbook!.fileName}
                    onRemove={() => setRemoveTarget({ kind: "rfq" })}
                    removeLabel="Move to archive"
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">No RFQ uploaded yet.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quotes
              </p>
              {hasQuotes ? (
                <div className="mt-2 space-y-2">
                  {quoteFiles.map((q) => (
                    <UploadedFileRow
                      key={q.id}
                      label="Quote"
                      fileName={q.name}
                      onRemove={() =>
                        setRemoveTarget({
                          kind: "quote",
                          id: q.id,
                          name: q.name,
                        })
                      }
                      removeLabel="Move to archive"
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">No quotes uploaded yet.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex w-full max-w-3xl flex-col items-center gap-3">
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => proceedToPolicyMapping()}
            className={cn(
              "w-full max-w-sm rounded-lg px-5 py-3 text-sm font-semibold transition sm:w-auto",
              canProceed
                ? "bg-primary-600 text-white shadow-sm hover:bg-primary-700"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            )}
          >
            Proceed to policy mapping
          </button>
          {!canProceed ? (
            <p className="text-center text-xs text-slate-500">
              {!hasRfq
                ? "Upload the RFQ workbook to continue."
                : "Upload at least one quote file to continue."}
            </p>
          ) : null}
          {selectionNotice ? (
            <p className="text-center text-xs font-medium text-amber-700">
              {selectionNotice}
            </p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title={
          removeTarget?.kind === "quote" || removeTarget?.kind === "rfq"
            ? "Move to archive?"
            : "Remove file?"
        }
        message={removeDialogMessage}
        confirmLabel={
          removeTarget?.kind === "quote" || removeTarget?.kind === "rfq"
            ? "Yes, move"
            : "Yes, remove"
        }
        cancelLabel="No"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

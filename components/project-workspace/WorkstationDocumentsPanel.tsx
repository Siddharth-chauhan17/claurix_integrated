"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DocumentsIcon, ProjectsIcon } from "@/components/workspace/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { DocumentFileCard } from "./sidebar/DocumentFileCard";

type WorkstationDocumentsPanelProps = {
  variant: "rfq" | "quotes" | "qcr";
};

type RemoveTarget =
  | { kind: "rfq" }
  | { kind: "quote"; id: string; name: string };

export function WorkstationDocumentsPanel({ variant }: WorkstationDocumentsPanelProps) {
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const rfqFileBlob = useProjectWorkspaceStore((s) => s.rfqFileBlob);
  const quoteFiles = useProjectWorkspaceStore((s) => s.quoteFiles);
  const quoteFileBlobs = useProjectWorkspaceStore((s) => s.quoteFileBlobs);
  const downloadRfqFile = useProjectWorkspaceStore((s) => s.downloadRfqFile);
  const downloadQuoteFile = useProjectWorkspaceStore((s) => s.downloadQuoteFile);
  const qcrExport = useProjectWorkspaceStore((s) => s.qcrExport);
  const qcrExportBlob = useProjectWorkspaceStore((s) => s.qcrExportBlob);
  const downloadQcrExport = useProjectWorkspaceStore((s) => s.downloadQcrExport);
  const clearRfqWorkbook = useProjectWorkspaceStore((s) => s.clearRfqWorkbook);
  const removeQuoteFile = useProjectWorkspaceStore((s) => s.removeQuoteFile);

  const isRfq = variant === "rfq";
  const isQcr = variant === "qcr";

  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    if (removeTarget.kind === "rfq") {
      clearRfqWorkbook();
    } else {
      removeQuoteFile(removeTarget.id);
    }
    setRemoveTarget(null);
  };

  const removeDialogMessage =
    removeTarget?.kind === "rfq"
      ? "Remove this RFQ file? Any policy section mappings will also be cleared."
      : removeTarget?.kind === "quote"
        ? `Remove "${removeTarget.name}" from this project?`
        : "";

  return (
    <>
    <div className="h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {isRfq ? "Uploaded RFQ" : isQcr ? "Exported QCR" : "Uploaded quotes"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isRfq
            ? "RFQ spreadsheet for this project."
            : isQcr
              ? "Latest QCR Excel export from the comparison workspace."
              : "Carrier quote files attached to this project."}
        </p>

        {isQcr ? (
          qcrExport ? (
            <div className="mt-6">
              <DocumentFileCard
                fileName={qcrExport.fileName}
                uploadedAt={qcrExport.exportedAt}
                canDownload={Boolean(qcrExportBlob)}
                onDownload={downloadQcrExport}
              />
            </div>
          ) : (
            <EmptyDocuments
              icon={<DocumentsIcon className="h-8 w-8" />}
              message="No QCR export yet."
              hint="Export from the QCR comparison workspace using Export Excel."
            />
          )
        ) : isRfq ? (
          rfqWorkbook ? (
            <div className="mt-6">
              <DocumentFileCard
                fileName={rfqWorkbook.fileName}
                uploadedAt={rfqWorkbook.uploadedAt}
                canDownload={Boolean(rfqFileBlob)}
                onDownload={downloadRfqFile}
                onRemove={() => setRemoveTarget({ kind: "rfq" })}
              />
            </div>
          ) : (
            <EmptyDocuments
              icon={<ProjectsIcon className="h-8 w-8" />}
              message="No RFQ uploaded yet."
            />
          )
        ) : quoteFiles.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {quoteFiles.map((file) => (
              <DocumentFileCard
                key={file.id}
                fileName={file.name}
                uploadedAt={file.uploadedAt}
                canDownload={Boolean(quoteFileBlobs[file.id])}
                onDownload={() => downloadQuoteFile(file.id)}
                onRemove={() =>
                  setRemoveTarget({
                    kind: "quote",
                    id: file.id,
                    name: file.name,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <EmptyDocuments
            icon={<DocumentsIcon className="h-8 w-8" />}
            message="No quotes uploaded yet."
          />
        )}
      </div>
    </div>

    <ConfirmDialog
      open={removeTarget !== null}
      title="Remove file?"
      message={removeDialogMessage}
      confirmLabel="Yes, remove"
      cancelLabel="No"
      variant="danger"
      onConfirm={handleConfirmRemove}
      onCancel={() => setRemoveTarget(null)}
    />
    </>
  );
}

function EmptyDocuments({
  icon,
  message,
  hint = "Upload files from the Upload documents step.",
}: {
  icon: ReactNode;
  message: string;
  hint?: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
      <span className="text-slate-300">{icon}</span>
      <p className="mt-4 text-sm text-slate-500">{message}</p>
      <p className="mt-3 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

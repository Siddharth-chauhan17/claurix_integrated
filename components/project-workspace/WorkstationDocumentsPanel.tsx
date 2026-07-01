"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { DocumentsIcon, ProjectsIcon } from "@/components/workspace/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { groupItemsByDate } from "@/lib/project-workspace/group-archived-by-date";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import type { QuoteFileRef, RfqFileRef } from "@/types/project-workspace";
import { DocumentFileCard } from "./sidebar/DocumentFileCard";

type WorkstationDocumentsPanelProps = {
  variant: "rfq" | "quotes" | "qcr";
};

type RemoveTarget =
  | { kind: "archived-quote"; id: string; name: string }
  | { kind: "archived-rfq"; id: string; name: string };

function quoteDisplayDate(file: QuoteFileRef): string {
  return file.archivedAt ?? file.uploadedAt;
}

function rfqDisplayDate(file: RfqFileRef): string {
  return file.archivedAt ?? file.workbook.uploadedAt;
}

export function WorkstationDocumentsPanel({ variant }: WorkstationDocumentsPanelProps) {
  const archivedQuoteFiles = useProjectWorkspaceStore((s) => s.archivedQuoteFiles);
  const archivedRfqFiles = useProjectWorkspaceStore((s) => s.archivedRfqFiles);
  const quoteFileBlobs = useProjectWorkspaceStore((s) => s.quoteFileBlobs);
  const archivedRfqFileBlobs = useProjectWorkspaceStore((s) => s.archivedRfqFileBlobs);
  const downloadArchivedQuoteFile = useProjectWorkspaceStore(
    (s) => s.downloadArchivedQuoteFile
  );
  const downloadArchivedRfqFile = useProjectWorkspaceStore(
    (s) => s.downloadArchivedRfqFile
  );
  const qcrExport = useProjectWorkspaceStore((s) => s.qcrExport);
  const qcrExportBlob = useProjectWorkspaceStore((s) => s.qcrExportBlob);
  const downloadQcrExport = useProjectWorkspaceStore((s) => s.downloadQcrExport);
  const deleteArchivedQuoteFile = useProjectWorkspaceStore(
    (s) => s.deleteArchivedQuoteFile
  );
  const deleteArchivedRfqFile = useProjectWorkspaceStore((s) => s.deleteArchivedRfqFile);
  const importArchivedQuoteFile = useProjectWorkspaceStore(
    (s) => s.importArchivedQuoteFile
  );
  const importArchivedRfqFile = useProjectWorkspaceStore((s) => s.importArchivedRfqFile);

  const isRfq = variant === "rfq";
  const isQcr = variant === "qcr";

  const archivedQuotesByDate = useMemo(
    () => groupItemsByDate(archivedQuoteFiles, quoteDisplayDate),
    [archivedQuoteFiles]
  );

  const archivedRfqsByDate = useMemo(
    () => groupItemsByDate(archivedRfqFiles, rfqDisplayDate),
    [archivedRfqFiles]
  );

  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setDeleting(true);
    try {
      if (removeTarget.kind === "archived-quote") {
        await deleteArchivedQuoteFile(removeTarget.id);
      } else {
        await deleteArchivedRfqFile(removeTarget.id);
      }
    } finally {
      setDeleting(false);
    }
    setRemoveTarget(null);
  };

  const handleImportQuote = (id: string) => {
    importArchivedQuoteFile(id);
  };

  const handleImportRfq = async (id: string) => {
    setImportingId(id);
    try {
      await importArchivedRfqFile(id);
    } finally {
      setImportingId(null);
    }
  };

  const removeDialogMessage =
    removeTarget?.kind === "archived-quote"
      ? `Permanently delete "${removeTarget.name}"? This removes the file from the server and cannot be undone.`
      : removeTarget?.kind === "archived-rfq"
        ? `Permanently delete "${removeTarget.name}"? This removes the file from the server and cannot be undone.`
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
              ? "Archived RFQ spreadsheets removed from the active upload step. These are not used for policy mapping or QCR generation."
              : isQcr
                ? "Latest QCR Excel export from the comparison workspace."
                : "Archived carrier quotes removed from the active upload step. These are not used for QCR generation."}
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
            archivedRfqFiles.length > 0 ? (
              <div className="mt-6 space-y-6">
                {archivedRfqsByDate.map(({ dateLabel, items }) => (
                  <section key={dateLabel}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {dateLabel}
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {items.map((file) => (
                        <DocumentFileCard
                          key={file.id}
                          fileName={file.workbook.fileName}
                          uploadedAt={rfqDisplayDate(file)}
                          canDownload={Boolean(archivedRfqFileBlobs[file.id])}
                          onDownload={() => downloadArchivedRfqFile(file.id)}
                          onImport={() => void handleImportRfq(file.id)}
                          importLabel={
                            importingId === file.id ? "Importing…" : "Import as RFQ"
                          }
                          onRemove={() =>
                            setRemoveTarget({
                              kind: "archived-rfq",
                              id: file.id,
                              name: file.workbook.fileName,
                            })
                          }
                          removeLabel="Delete"
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyDocuments
                icon={<ProjectsIcon className="h-8 w-8" />}
                message="No archived RFQ yet."
                hint="RFQs removed from Upload documents appear here until you delete them."
              />
            )
          ) : archivedQuoteFiles.length > 0 ? (
            <div className="mt-6 space-y-6">
              {archivedQuotesByDate.map(({ dateLabel, items }) => (
                <section key={dateLabel}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {dateLabel}
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {items.map((file) => (
                      <DocumentFileCard
                        key={file.id}
                        fileName={file.name}
                        uploadedAt={quoteDisplayDate(file)}
                        canDownload={Boolean(quoteFileBlobs[file.id])}
                        onDownload={() => downloadArchivedQuoteFile(file.id)}
                        onImport={() => handleImportQuote(file.id)}
                        importLabel="Import as quote"
                        onRemove={() =>
                          setRemoveTarget({
                            kind: "archived-quote",
                            id: file.id,
                            name: file.name,
                          })
                        }
                        removeLabel="Delete"
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyDocuments
              icon={<DocumentsIcon className="h-8 w-8" />}
              message="No archived quotes yet."
              hint="Quotes removed from Upload documents appear here until you delete them."
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Delete file?"
        message={removeDialogMessage}
        confirmLabel={deleting ? "Deleting…" : "Yes, delete"}
        cancelLabel="No"
        variant="danger"
        onConfirm={() => void handleConfirmRemove()}
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

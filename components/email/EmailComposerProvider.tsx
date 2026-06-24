"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { toast } from "react-toastify";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import {
  useEmailComposer,
  type LocalInlineDocument,
} from "@/hooks/useEmailComposer";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

type EmailComposerContextValue = ReturnType<typeof useEmailComposer>;

const EmailComposerContext = createContext<EmailComposerContextValue | null>(null);

type EmailComposerProviderProps = {
  children: ReactNode;
  /** Use on QCR editing route when workstation store is not initialized */
  projectId?: string;
};

function guessBlobContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  return "application/octet-stream";
}

export function EmailComposerProvider({
  children,
  projectId: projectIdProp,
}: EmailComposerProviderProps) {
  const storeProjectId = useProjectWorkspaceStore((s) => s.projectId);
  const projectId = projectIdProp ?? storeProjectId ?? "";
  const qcrExport = useProjectWorkspaceStore((s) => s.qcrExport);
  const qcrExportBlob = useProjectWorkspaceStore((s) => s.qcrExportBlob);
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const rfqFileBlob = useProjectWorkspaceStore((s) => s.rfqFileBlob);
  const quoteFiles = useProjectWorkspaceStore((s) => s.quoteFiles);
  const quoteFileBlobs = useProjectWorkspaceStore((s) => s.quoteFileBlobs);
  const restoreQcrExportBlob = useProjectWorkspaceStore((s) => s.restoreQcrExportBlob);
  const restoreRfqFileBlob = useProjectWorkspaceStore((s) => s.restoreRfqFileBlob);
  const reconcileServerDocuments = useProjectWorkspaceStore(
    (s) => s.reconcileServerDocuments
  );
  const hydrate = useProjectWorkspaceStore((s) => s.hydrate);
  const bumpEmailDraftsVersion = useProjectWorkspaceStore(
    (s) => s.bumpEmailDraftsVersion
  );

  useEffect(() => {
    if (projectId) {
      void restoreQcrExportBlob(projectId);
      void restoreRfqFileBlob(projectId);
    }
  }, [projectId, restoreQcrExportBlob, restoreRfqFileBlob]);

  const localInlineDocuments = useMemo((): LocalInlineDocument[] => {
    const items: LocalInlineDocument[] = [];
    if (rfqWorkbook && rfqFileBlob) {
      items.push({
        id: "inline:local:rfq",
        name: rfqWorkbook.fileName,
        blob: rfqFileBlob,
        content_type: guessBlobContentType(rfqWorkbook.fileName),
        kind: "rfq",
      });
    }
    for (const quote of quoteFiles) {
      const blob = quoteFileBlobs[quote.id];
      if (!blob) continue;
      items.push({
        id: `inline:local:quote:${quote.id}`,
        name: quote.name,
        blob,
        content_type: guessBlobContentType(quote.name),
        kind: "quote",
      });
    }
    return items;
  }, [quoteFileBlobs, quoteFiles, rfqFileBlob, rfqWorkbook]);

  const prepareComposer = useCallback(async () => {
    if (!projectId) return;
    hydrate(projectId);
    await Promise.all([
      restoreQcrExportBlob(projectId),
      restoreRfqFileBlob(projectId),
      reconcileServerDocuments(projectId),
    ]);
  }, [
    hydrate,
    projectId,
    reconcileServerDocuments,
    restoreQcrExportBlob,
    restoreRfqFileBlob,
  ]);

  const composer = useEmailComposer({
    projectId,
    localQcrBlob: qcrExportBlob,
    localQcrFilename: qcrExport?.fileName,
    localInlineDocuments,
    prepareComposer,
    onDraftSaved: bumpEmailDraftsVersion,
  });
  const sendWithToast = useCallback(async () => {
    const result = await composer.send();
    if (result) {
      toast.success("Email sent successfully");
      bumpEmailDraftsVersion();
    }
    return result;
  }, [composer, bumpEmailDraftsVersion]);

  const saveDraftWithToast = useCallback(async () => {
    const saved = await composer.saveDraft();
    if (saved) {
      toast.success("Draft saved to Outlook and Claurix");
    }
    return saved;
  }, [composer]);

  const value = useMemo(
    () => ({
      ...composer,
      send: sendWithToast,
      saveDraft: saveDraftWithToast,
    }),
    [composer, sendWithToast, saveDraftWithToast]
  );

  if (!projectId) {
    return <>{children}</>;
  }

  return (
    <EmailComposerContext.Provider value={value}>
      {children}
      <EmailComposerModal composer={value} />
    </EmailComposerContext.Provider>
  );
}

export function useEmailComposerContext(): EmailComposerContextValue {
  const ctx = useContext(EmailComposerContext);
  if (!ctx) {
    throw new Error("useEmailComposerContext must be used within EmailComposerProvider");
  }
  return ctx;
}

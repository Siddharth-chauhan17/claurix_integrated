"use client";

import { useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { uploadProjectRfq } from "@/lib/api";
import { parseExcelFile, isRfqExcel, isQuoteFile } from "@/lib/project-workspace/parseExcel";
import { syncQuotesToServer } from "@/lib/project-workspace/sync-quotes-to-server";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

async function syncRfqToServer(projectId: string, file: File) {
  const { document } = await uploadProjectRfq(projectId, file);
  useProjectWorkspaceStore.getState().setRfqServerDocumentId(document.id);
}

export function useWorkstationUploads() {
  const projectId = useProjectWorkspaceStore((s) => s.projectId);
  const setRfqWorkbook = useProjectWorkspaceStore((s) => s.setRfqWorkbook);
  const addQuoteFiles = useProjectWorkspaceStore((s) => s.addQuoteFiles);
  const rfqInputRef = useRef<HTMLInputElement>(null);
  const quotesInputRef = useRef<HTMLInputElement>(null);

  const handleRfqUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.[0]) return;
      const file = files[0];
      if (!isRfqExcel(file)) {
        alert("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      const sheets = await parseExcelFile(file);
      setRfqWorkbook(
        {
          fileName: file.name,
          sheets,
          uploadedAt: new Date().toISOString(),
        },
        file
      );
      if (projectId) {
        try {
          await syncRfqToServer(projectId, file);
          toast.success("RFQ uploaded to server.");
        } catch (err) {
          toast.warn(
            err instanceof Error
              ? `RFQ saved locally only: ${err.message}`
              : "RFQ saved locally only; server upload failed."
          );
        }
      }
      if (rfqInputRef.current) rfqInputRef.current.value = "";
    },
    [projectId, setRfqWorkbook]
  );

  const handleQuotesUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const valid = Array.from(files).filter(isQuoteFile);
      if (valid.length === 0) {
        alert("Upload Excel (.xlsx, .xls) or PDF files.");
        return;
      }

      const quoteCountBefore = useProjectWorkspaceStore.getState().quoteFiles.length;
      addQuoteFiles(valid);

      if (!projectId) {
        if (quotesInputRef.current) quotesInputRef.current.value = "";
        return;
      }

      const state = useProjectWorkspaceStore.getState();
      const newRefs = state.quoteFiles.slice(quoteCountBefore);
      const targets = newRefs
        .map((ref, index) => ({
          quoteFileId: ref.id,
          fileName: ref.name,
          file: valid[index],
        }))
        .filter((target) => target.file);

      try {
        const { linked, errors } = await syncQuotesToServer(
          projectId,
          targets,
          state.setQuoteServerDocumentId
        );
        if (linked > 0) {
          toast.success(
            linked === 1
              ? "Quote uploaded to server."
              : `${linked} quotes uploaded to server.`
          );
        }
        if (errors.length > 0) {
          toast.warn(
            errors.length === 1
              ? `Quote saved locally only: ${errors[0]}`
              : `Some quotes saved locally only: ${errors.join("; ")}`
          );
        }
      } catch (err) {
        toast.warn(
          err instanceof Error
            ? `Quotes saved locally only: ${err.message}`
            : "Quotes saved locally only; server upload failed."
        );
      }

      if (quotesInputRef.current) quotesInputRef.current.value = "";
    },
    [addQuoteFiles, projectId]
  );

  const openRfqPicker = useCallback(() => {
    rfqInputRef.current?.click();
  }, []);

  const openQuotesPicker = useCallback(() => {
    quotesInputRef.current?.click();
  }, []);

  return {
    rfqInputRef,
    quotesInputRef,
    handleRfqUpload,
    handleQuotesUpload,
    openRfqPicker,
    openQuotesPicker,
  };
}

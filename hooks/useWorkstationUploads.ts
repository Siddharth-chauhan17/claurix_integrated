"use client";

import { useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { uploadProjectQuotes, uploadProjectRfq } from "@/lib/api";
import { parseExcelFile, isRfqExcel, isQuoteFile } from "@/lib/project-workspace/parseExcel";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

async function syncRfqToServer(projectId: string, file: File) {
  const { document } = await uploadProjectRfq(projectId, file);
  useProjectWorkspaceStore.getState().setRfqServerDocumentId(document.id);
}

async function syncQuotesToServer(projectId: string, files: File[]) {
  const before = useProjectWorkspaceStore.getState().quoteFiles.length;
  const { items } = await uploadProjectQuotes(projectId, files);
  const quoteFiles = useProjectWorkspaceStore.getState().quoteFiles;
  const newRefs = quoteFiles.slice(before);
  items.forEach((doc, index) => {
    const ref = newRefs[index];
    if (ref) {
      useProjectWorkspaceStore.getState().setQuoteServerDocumentId(ref.id, doc.id);
    }
  });
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
      addQuoteFiles(valid);
      if (projectId) {
        try {
          await syncQuotesToServer(projectId, valid);
        } catch (err) {
          toast.warn(
            err instanceof Error
              ? `Quotes saved locally only: ${err.message}`
              : "Quotes saved locally only; server upload failed."
          );
        }
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

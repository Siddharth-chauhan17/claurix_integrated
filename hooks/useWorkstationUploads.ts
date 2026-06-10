"use client";

import { useRef, useCallback } from "react";
import { parseExcelFile, isRfqExcel, isQuoteFile } from "@/lib/project-workspace/parseExcel";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

export function useWorkstationUploads() {
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
      if (rfqInputRef.current) rfqInputRef.current.value = "";
    },
    [setRfqWorkbook]
  );

  const handleQuotesUpload = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const valid = Array.from(files).filter(isQuoteFile);
      if (valid.length === 0) {
        alert("Upload Excel (.xlsx, .xls) or PDF files.");
        return;
      }
      addQuoteFiles(valid);
      if (quotesInputRef.current) quotesInputRef.current.value = "";
    },
    [addQuoteFiles]
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

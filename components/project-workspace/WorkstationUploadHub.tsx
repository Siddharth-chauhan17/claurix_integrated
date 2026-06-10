"use client";

import type { ReactNode } from "react";
import { DocumentsIcon, ProjectsIcon } from "@/components/workspace/icons";
import { useWorkstationUploads } from "@/hooks/useWorkstationUploads";
import { cn } from "@/lib/utils";

type UploadZoneCardProps = {
  title: string;
  description: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "primary" | "default";
};

function UploadZoneCard({
  title,
  description,
  hint,
  icon,
  onClick,
  variant = "default",
}: UploadZoneCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[14rem] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
        variant === "primary"
          ? "border-primary-200 bg-primary-50/40 hover:border-primary-400 hover:bg-primary-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
      )}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl shadow-sm ring-1 transition group-hover:scale-[1.02]",
          variant === "primary"
            ? "bg-primary-600 text-white ring-primary-500/20"
            : "bg-slate-100 text-slate-600 ring-slate-200/80 group-hover:bg-white"
        )}
      >
        {icon}
      </span>
      <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-[16rem] text-sm text-slate-500">{description}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        {hint}
      </p>
    </button>
  );
}

export function WorkstationUploadHub() {
  const {
    rfqInputRef,
    quotesInputRef,
    handleRfqUpload,
    handleQuotesUpload,
    openRfqPicker,
    openQuotesPicker,
  } = useWorkstationUploads();

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
            Start your QCR workflow
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Upload the client RFQ spreadsheet and carrier quotes to begin policy mapping.
            View uploaded files under Uploaded RFQ and Uploaded Quotes in the sidebar.
          </p>
        </div>

        <div className="mt-8 grid w-full max-w-3xl gap-5 sm:grid-cols-2">
          <UploadZoneCard
            title="Upload RFQ"
            description="Load the client request-for-quote Excel workbook."
            hint="Excel · .xlsx or .xls"
            icon={<ProjectsIcon className="h-7 w-7" />}
            onClick={openRfqPicker}
            variant="primary"
          />
          <UploadZoneCard
            title="Upload quotes"
            description="Add one or more quote files from carriers."
            hint="Excel or PDF"
            icon={<DocumentsIcon className="h-7 w-7" />}
            onClick={openQuotesPicker}
          />
        </div>
      </div>
    </div>
  );
}

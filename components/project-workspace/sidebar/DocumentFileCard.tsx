"use client";

import { DocumentsIcon } from "@/components/workspace/icons";
import { cn } from "@/lib/utils";

function formatUploadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toUpperCase() : "FILE";
}

type DocumentFileCardProps = {
  fileName: string;
  uploadedAt: string;
  canDownload: boolean;
  onDownload: () => void;
  compact?: boolean;
};

export function DocumentFileCard({
  fileName,
  uploadedAt,
  canDownload,
  onDownload,
  compact = false,
}: DocumentFileCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/90 bg-slate-50/80 shadow-sm",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex gap-2.5">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md bg-white text-primary-600 ring-1 ring-slate-200/80",
            compact ? "h-8 w-8" : "h-9 w-9"
          )}
        >
          <DocumentsIcon className={compact ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900" title={fileName}>
            {fileName}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {fileExtension(fileName)}
            {uploadedAt ? (
              <span className="normal-case tracking-normal text-slate-500">
                {" "}
                · {formatUploadedAt(uploadedAt)}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={!canDownload}
        title={
          canDownload
            ? `Download ${fileName}`
            : "Re-upload this file in this session to enable download"
        }
        className={cn(
          "mt-2.5 w-full rounded-md border text-center text-xs font-semibold transition",
          canDownload
            ? "border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800"
            : "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
        )}
      >
        Download
      </button>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { analyzePolicy, type AnalysisResultData } from "@/lib/api";

type UploadSectionProps = {
  setAnalysis: (data: AnalysisResultData) => void;
  setLoading: (value: boolean) => void;
  loading: boolean;
};

export function UploadSection({
  setAnalysis,
  setLoading,
  loading,
}: UploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const runAnalysis = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const data = await analyzePolicy(file);
        setAnalysis(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setLoading(false);
      }
    },
    [setAnalysis, setLoading],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void runAnalysis(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      if (loading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) void runAnalysis(file);
    },
    [loading, runAnalysis],
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (loading) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const dropZoneActive = isDragging && !loading;

  return (
    <section
      role="region"
      aria-label="Upload policy file"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-10 transition-colors duration-200 sm:px-8 sm:py-12 lg:px-10 ${
        dropZoneActive
          ? "border-2 border-emerald-400 bg-emerald-50/40"
          : "border-2 border-transparent"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.csv,.xlsx,.xls,.json,application/pdf,text/csv,application/json"
        onChange={onFileChange}
        disabled={loading}
        aria-hidden
      />

      {dropZoneActive && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-emerald-50/30 p-6"
          aria-hidden
        >
          <p className="max-w-sm rounded-xl bg-white/95 px-6 py-4 text-center text-base font-semibold text-emerald-800 shadow-lg ring-2 ring-emerald-300/60 backdrop-blur-sm">
            Drop your file anywhere to analyze
          </p>
        </div>
      )}

      <div className="relative z-0 flex w-full max-w-lg flex-col items-center text-center sm:max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight text-teal-800 sm:text-3xl">
          Get Started with Your Analysis
        </h1>
        <p className="mt-3 text-sm text-slate-500 sm:text-base">
          Upload your data files to begin.
        </p>

        <div className="relative my-6 w-full sm:my-8">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-b from-teal-100/35 via-[#eef7f6]/70 to-emerald-50/25 blur-xl"
            aria-hidden
          />
          <div className="mx-auto max-w-lg rounded-2xl bg-[#f0f7f7]/35 px-4 py-6 sm:max-w-xl sm:px-8 sm:py-8">
            <Image
              src="/analyze-illustration.png"
              alt="Laptop with documents, folder, and charts for policy analysis"
              width={800}
              height={400}
              sizes="(max-width: 640px) 100vw, 640px"
              className="mx-auto h-auto w-full object-contain"
              priority
            />
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-sm rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100"
        >
          Select Files to Upload
        </button>

        <div className="mt-8 flex w-full max-w-md items-center gap-3 px-2 py-1">
          <span className="h-px flex-1 border-t border-dashed border-slate-300/80" />
          <p className="shrink-0 text-sm text-slate-500">
            Or <span className="font-medium text-slate-600">drag &amp; drop</span> anywhere in this
            panel
          </p>
          <span className="h-px flex-1 border-t border-dashed border-slate-300/80" />
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Supported formats: PDF, CSV, Excel, JSON
        </p>
      </div>
    </section>
  );
}

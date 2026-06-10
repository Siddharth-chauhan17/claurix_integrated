"use client";

import { useQcrWorkspaceStore } from "@/stores/qcrWorkspaceStore";

/** Loading / error only — success navigates straight to QCR workspace. */
export function QcrGenerationPanel() {
  const isGenerating = useQcrWorkspaceStore((s) => s.isGenerating);
  const error = useQcrWorkspaceStore((s) => s.error);
  const clear = useQcrWorkspaceStore((s) => s.clear);

  if (isGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div
          className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
          aria-hidden
        />
        <p className="text-lg font-semibold text-slate-800">Generating QCR workspace</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Sending your policy section mappings to the orchestration layer…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-semibold text-red-700">Generation failed</p>
        <p className="mt-2 max-w-md text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => clear()}
          className="mt-6 text-sm font-medium text-primary-600 hover:underline"
        >
          Back to mapping
        </button>
      </div>
    );
  }

  return null;
}

"use client";

import { useEmailComposerContext } from "@/components/email/EmailComposerProvider";
import { cn } from "@/lib/utils";

export function EmailToolbarButton() {
  const { openComposer } = useEmailComposerContext();

  return (
    <button
      type="button"
      onClick={() => openComposer()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700",
        "shadow-sm transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
      )}
    >
      <svg
        className="h-4 w-4 text-primary-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      Email
    </button>
  );
}

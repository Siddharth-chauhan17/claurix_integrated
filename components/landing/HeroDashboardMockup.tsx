export function HeroDashboardMockup() {
  return (
    <div className="relative">
      {/* Layered document outlines (background) */}
      <div className="absolute -right-4 -top-2 h-64 w-52 rounded-xl border border-slate-200 bg-white/60 shadow-lg" />
      <div className="absolute -right-2 top-2 h-64 w-52 rounded-xl border border-slate-200 bg-white/80 shadow-md" />

      {/* Main analysis card */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:max-w-md">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded bg-slate-100 p-1.5">
            <DocumentIcon className="h-5 w-5 text-slate-600" />
          </span>
          <span className="font-medium text-slate-800">Insurance Policy.pdf</span>
        </div>

        <div className="mb-4">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
            Detected: General Liability Insurance
          </span>
        </div>

        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-2">
            <RiskyClauseIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong className="text-slate-700">Risky clauses:</strong> Excludes
              coverage for machinery breakdowns if maintenance logs are missing.
            </span>
          </li>
          <li className="flex gap-2">
            <ExclusionIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
            <span>
              <strong className="text-slate-700">Exclusions:</strong> Natural
              disasters, cyber incidents, employee injuries.
            </span>
          </li>
          <li className="flex gap-2">
            <HiddenIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            <span>
              <strong className="text-slate-700">Hidden conditions:</strong>{" "}
              Annual inspection required, documentation rules.
            </span>
          </li>
        </ul>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
          >
            View full analysis
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function RiskyClauseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ExclusionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function HiddenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 8l4 4m0 0l-4 4m4-4H3"
      />
    </svg>
  );
}

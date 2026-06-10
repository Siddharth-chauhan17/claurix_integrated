import Link from "next/link";

export function RequestDemoSuccess() {
  return (
    <div className="flex flex-col items-center px-2 py-6 text-center sm:py-10">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-1 ring-primary-100">
        <CheckCircleIcon className="h-8 w-8" />
      </span>
      <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
        Workflow assessment request received
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">
        Our team will tailor the session around your current QCR process.
      </p>
      <p className="mt-2 text-sm text-slate-500">Expected response within 24 hours.</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
      >
        Return to Home
      </Link>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

"use client";

import Link from "next/link";

const historyItems = [
  {
    id: "1",
    date: "Mar 25, 2024",
    title: "Property Insurance Policy",
    risk: "High Risk" as const,
    active: true,
  },
  {
    id: "2",
    date: "Mar 20, 2024",
    title: "Small Business Policy",
    risk: "Low Risk" as const,
    active: false,
  },
];

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          aria-label="Close history"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[min(100%,252px)] flex-col rounded-r-2xl border border-white/60 border-l-0 bg-white/85 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-md transition-transform duration-300 ease-out
          lg:relative lg:z-0 lg:w-60 lg:shrink-0 lg:translate-x-0 lg:rounded-2xl lg:border lg:border-slate-200/70 lg:border-l lg:bg-white/85 lg:p-6 lg:shadow-lg lg:shadow-slate-900/[0.06] lg:ring-1 lg:ring-white/90
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <h2 className="text-base font-bold text-slate-800">History</h2>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/70"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mb-6 hidden text-base font-bold text-slate-800 lg:block">History</h2>

        <ul className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {historyItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={onCloseMobile}
                className={`
                  group relative flex w-full flex-col gap-2 rounded-xl border border-transparent bg-white/60 p-4 text-left shadow-sm transition-all
                  hover:border-emerald-200/60 hover:bg-white/90 hover:shadow-md
                  ${item.active ? "border-l-4 border-l-emerald-800 border border-white/70 bg-white/80 pl-3" : "pl-4"}
                `}
              >
                <span className="text-xs text-slate-400">{item.date}</span>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <BuildingIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">
                      {item.title}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.risk === "High Risk"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.risk}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end border-t border-slate-200/50 pt-4">
          <Link
            href="#"
            className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
            onClick={onCloseMobile}
          >
            View All
          </Link>
        </div>
      </aside>
    </>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

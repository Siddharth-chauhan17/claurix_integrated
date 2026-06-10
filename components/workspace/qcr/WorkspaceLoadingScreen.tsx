"use client";

export function WorkspaceLoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#f4f5f7]">
      <div className="w-full max-w-md space-y-4 px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-200/80"
            />
          ))}
        </div>
        <p className="pt-4 text-center text-sm text-slate-500">
          Loading QCR workspace…
        </p>
      </div>
    </div>
  );
}

"use client";

export function QcrEditingLoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#1e293b]">
      <div className="w-full max-w-sm space-y-4 px-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary-500" />
        </div>
        <p className="text-center text-sm font-medium text-slate-300">
          Loading quote comparison workspace…
        </p>
      </div>
    </div>
  );
}

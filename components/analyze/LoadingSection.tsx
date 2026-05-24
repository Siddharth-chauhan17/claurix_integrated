"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading document...",
  "Detecting clauses...",
  "Evaluating risks...",
] as const;

export function LoadingSection() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="flex min-h-[min(70vh,640px)] flex-1 flex-col items-center justify-center px-6 py-12 sm:px-8">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div
          className="mb-8 h-14 w-14 rounded-full border-2 border-teal-200 border-t-emerald-600 shadow-sm animate-spin"
          aria-hidden
        />

        <h2 className="text-xl font-semibold tracking-tight text-teal-800 sm:text-2xl">
          Analyzing your policy...
        </h2>

        <p
          key={stepIndex}
          className="mt-4 min-h-[1.5rem] animate-fade-in text-sm text-slate-500 sm:text-base"
        >
          {STEPS[stepIndex]}
        </p>

        <div className="mt-8 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500/80 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500/80 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-500/80" />
        </div>
      </div>
    </section>
  );
}

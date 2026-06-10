import Image from "next/image";

export function HeroWorkflowVisual() {
  return (
    <div className="relative w-full max-w-4xl xl:max-w-[44rem]">
      <div
        className="pointer-events-none absolute -right-6 top-6 h-80 w-80 rounded-full border border-dashed border-slate-200"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-4 bottom-4 h-32 w-32 rounded-full bg-primary-100/40 blur-2xl"
        aria-hidden
      />

      <div className="relative rounded-[1.75rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-white p-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.14)] ring-1 ring-slate-100">
          <div className="p-2 sm:p-3">
            <Image
              src="/hero-workflow.png"
              alt="claurix intelligence workflow: insurer quotes and policy wordings flow through the intelligence engine to compare, identify deviations, and deliver intelligent insights"
              width={1400}
              height={875}
              className="h-auto w-full min-h-[280px] rounded-xl object-contain sm:min-h-[340px] lg:min-h-[400px]"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

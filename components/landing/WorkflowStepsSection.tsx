import {
  WorkflowArrowIcon,
  WorkflowCompareIcon,
  WorkflowExtractIcon,
  WorkflowGenerateIcon,
  WorkflowReviewIcon,
  WorkflowUploadIcon,
} from "./workflow-icons";

const steps = [
  {
    icon: WorkflowUploadIcon,
    title: "Upload",
    caption: "Documents",
  },
  {
    icon: WorkflowExtractIcon,
    title: "Extract",
    caption: "& Structure",
  },
  {
    icon: WorkflowCompareIcon,
    title: "Compare",
    caption: "Quotes",
  },
  {
    icon: WorkflowReviewIcon,
    title: "Review",
    caption: "Differences",
  },
  {
    icon: WorkflowGenerateIcon,
    title: "Generate",
    caption: "QCR",
  },
];

export function WorkflowStepsSection() {
  return (
    <section className="bg-[#f7f8f9] pb-2 pt-8 sm:pb-4 sm:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200/90 bg-white px-3 py-6 shadow-sm sm:px-6 sm:py-8">
          <div className="flex items-center justify-center gap-1 overflow-x-auto sm:gap-2 lg:gap-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                <article className="flex w-[5.5rem] flex-col items-center rounded-xl border border-slate-200 bg-white px-2 py-4 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:w-[6.75rem] sm:px-3 sm:py-5 lg:w-[7.5rem]">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-1 ring-primary-100 sm:h-[3.75rem] sm:w-[3.75rem]">
                    <step.icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </span>
                  <p className="mt-3 text-sm font-bold leading-tight text-slate-900 sm:text-[0.9375rem]">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-tight text-slate-500 sm:text-sm">
                    {step.caption}
                  </p>
                </article>
                {index < steps.length - 1 ? (
                  <WorkflowArrowIcon className="h-3 w-8 shrink-0 text-slate-300 sm:h-3.5 sm:w-10 lg:w-12" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

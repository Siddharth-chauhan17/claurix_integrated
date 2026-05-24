import { Fragment } from "react";
import {
  DocumentArrowUpIcon,
  CogIcon,
  ChatBubbleCheckIcon,
  DocumentCheckIcon,
} from "./icons";

const steps = [
  {
    step: 1,
    title: "Upload policy",
    description: "PDF or scanned documents.",
    icon: DocumentArrowUpIcon,
  },
  {
    step: 2,
    title: "AI analysis",
    description: "Detects policy type & clauses.",
    icon: CogIcon,
  },
  {
    step: 3,
    title: "Answer questions",
    description: "Business context.",
    icon: ChatBubbleCheckIcon,
  },
  {
    step: 4,
    title: "Get risk report",
    description: "Exclusions & recommendations.",
    icon: DocumentCheckIcon,
  },
];

function ArrowConnector() {
  return (
    <div
      className="hidden shrink-0 self-stretch lg:flex lg:items-center lg:px-1"
      aria-hidden
    >
      <svg
        className="h-5 w-5 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 8l4 4m0 0l-4 4m4-4H3"
        />
      </svg>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="bg-slate-50 pt-6 pb-16 sm:pt-8 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          How It Works
        </h2>
        <div className="mt-8 flex flex-col gap-6 lg:mt-10 lg:flex-row lg:items-stretch lg:gap-4">
          {steps.map((item, index) => (
            <Fragment key={item.step}>
              <div className="flex min-w-0 flex-1 flex-row items-start gap-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-md sm:p-8">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <item.icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && <ArrowConnector />}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

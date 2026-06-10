import {
  ChartBarsIcon,
  DocumentCheckIcon,
  GridIcon,
  UserCheckIcon,
} from "./icons";

const benefits = [
  {
    icon: GridIcon,
    title: "Save Hours on Analysis",
    description:
      "Automate data extraction and comparison across multiple quotes.",
  },
  {
    icon: UserCheckIcon,
    title: "Improve Accuracy",
    description: "Reduce manual errors and ensure nothing gets missed.",
  },
  {
    icon: ChartBarsIcon,
    title: "Standardize QCRs",
    description: "Generate consistent, audit-ready QCRs in minutes.",
  },
  {
    icon: DocumentCheckIcon,
    title: "Close with Confidence",
    description: "Deliver precise insights that strengthen client trust.",
  },
];

export function PurposeBuiltSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-[#f7f8f9] pb-10 pt-4 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Purpose-built for insurance brokers
        </h2>
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {benefits.map((item) => (
            <article
              key={item.title}
              className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-primary-600">
                <item.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-[0.8125rem]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import { ChecklistIcon, RefreshIcon, UserCircleIcon } from "./icons";

const highlights = [
  {
    icon: ChecklistIcon,
    label: "Tailored to your workflow",
  },
  {
    icon: UserCircleIcon,
    label: "Live demo with our experts",
  },
  {
    icon: RefreshIcon,
    label: "Solutions that drive results",
  },
];

export function RequestDemoMarketing() {
  return (
    <div className="max-w-xl lg:pt-6">
      <p className="text-lg font-bold text-primary-600 sm:text-xl">Request a Demo</p>
      <h1 className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-[2.75rem] lg:text-5xl">
        Your Workflow.
        <br />
        Smarter, Faster,
        <br />
        <span className="text-primary-600">Better.</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
        Request a demo to see how claurix can streamline your quote comparison
        and QCR generation process.
      </p>
      <ul className="mt-10 space-y-5">
        {highlights.map((item) => (
          <li key={item.label} className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-600">
              <item.icon className="h-5 w-5" />
            </span>
            <span className="text-base font-medium text-slate-800 sm:text-lg">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

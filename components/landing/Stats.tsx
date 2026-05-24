import { ShieldCheckIcon } from "./icons";

const stats = [
  {
    value: "$500M+",
    label: "Claims analyzed",
    icon: ShieldCheckIcon,
  },
  {
    value: "120+",
    label: "Policy types",
    icon: ShieldCheckIcon,
  },
  {
    value: "98%",
    label: "Risk detection accuracy",
    icon: ShieldCheckIcon,
  },
];

export function Stats() {
  return (
    <section className="border-y border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <stat.icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  {stat.value}
                </p>
                <p className="text-slate-600">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

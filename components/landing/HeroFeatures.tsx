import {
  BoltIcon,
  GridIcon,
  ShieldIcon,
  UserCheckIcon,
} from "./icons";

const features = [
  {
    icon: GridIcon,
    title: "100% QCR Intelligence",
  },
  {
    icon: UserCheckIcon,
    title: "No Manual Rework",
  },
  {
    icon: ShieldIcon,
    title: "Secure & Trusted",
  },
  {
    icon: BoltIcon,
    title: "Accelerate Pricing",
  },
];

export function HeroFeatures() {
  return (
    <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 border-t border-slate-200 pt-10 sm:grid-cols-4 sm:gap-5">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="flex flex-col items-center gap-3 rounded-xl border border-primary-200/90 bg-white p-5 text-center shadow-sm sm:items-start sm:p-6 sm:text-left"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary-200 bg-primary-50/50 text-primary-600">
            <feature.icon className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-slate-800 sm:text-base">
            {feature.title}
          </p>
        </div>
      ))}
    </div>
  );
}

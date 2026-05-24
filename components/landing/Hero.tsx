"use client";

import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ShieldCheckIcon } from "./icons";

const heroStats = [
  { value: "$500M+", label: "Claims analyzed", icon: ShieldCheckIcon },
  { value: "120+", label: "Policy types", icon: ShieldCheckIcon },
  { value: "98%", label: "Risk detection accuracy", icon: ShieldCheckIcon },
];

export function Hero() {
  const { user, loading } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/90 via-white to-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:pt-16 lg:pb-12">
        {/* Left column: headline, description, CTAs, stats */}
        <div className="flex flex-col">
        <h1 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Understand Your Insurance Policy Before It&apos;s Too Late
          </h1>
          <p className="mt-6 max-w-xl text-base text-gray-600 sm:mt-8">
            Upload your policy and detect hidden exclusions, risky clauses, and
            claim risks before they cause rejection. Get AI-powered analysis
            tailored to your business context.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Button href="/analyze" variant="primary">
              Analyze Policy
            </Button>
            {!loading && !user && (
              <Button href="/signup" variant="secondary">
                Sign Up
              </Button>
            )}
          </div>
          {/* Stats row: icon on left, number + label to the right of icon */}
          <div className="mt-6 flex flex-nowrap items-center gap-8">
            {heroStats.map((stat, index) => (
              <div
                key={stat.label}
                className={`flex items-center gap-3 ${
                  index > 0 ? "border-l border-gray-200 pl-8" : ""
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                  <stat.icon className="h-5 w-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="whitespace-nowrap text-sm text-gray-600">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right column: product preview with soft rounded background, centered */}
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-lg">
            <div
              className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-sky-100/70 via-primary-50/40 to-sky-50/60 blur-sm sm:-inset-4 sm:rounded-[1.5rem]"
              aria-hidden
            />
            <div
              className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-sky-100/50 via-white/80 to-primary-50/30 sm:-inset-4 sm:rounded-[1.5rem]"
              aria-hidden
            />
            <div className="relative rounded-xl p-2 shadow-lg ring-1 ring-slate-200/50 sm:rounded-2xl sm:p-3">
              <Image
                src="/hero-dashboard.png"
                alt="Dashboard preview showing policy analysis with risky clauses, exclusions, and hidden conditions"
                width={640}
                height={480}
                className="h-auto w-full rounded-lg object-contain sm:rounded-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

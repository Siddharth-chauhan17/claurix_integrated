"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { HeroBadge } from "./HeroBadge";
import { HeroDashboardMockup } from "./HeroDashboardMockup";
import { HeroWorkflowVisual } from "./HeroWorkflowVisual";

export function Hero() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <section className="relative overflow-hidden bg-[#f7f8f9]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:gap-8 xl:gap-10">
          <div className="max-w-xl shrink-0">
            {isLoggedIn ? (
              <p className="text-lg font-medium italic text-primary-700 sm:text-xl">
                Welcome back, {firstName}!{" "}
                <span aria-hidden="true">👋</span>
              </p>
            ) : (
              <HeroBadge>Made for Professional Brokers</HeroBadge>
            )}
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
              Scale Quality.
              <br />
              Deliver Consistency.
              <br />
              <span className="text-primary-600">Every Time.</span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
              AI-powered QCR platform built to streamline workflows and empower
              your team.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isLoggedIn ? (
                <Button href="/workspace" variant="primaryFlat" className="h-11 px-8">
                  Go to Workspace
                </Button>
              ) : (
                <>
                  <Button href="/request-demo" variant="primary3d" className="h-11 min-w-[9.5rem] px-6 py-3">
                    Request Demo
                  </Button>
                  <Button href="#how-it-works" variant="outline" className="h-11 min-w-[9.5rem] px-6">
                    How it works
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex min-w-0 justify-center lg:justify-end">
            {isLoggedIn ? <HeroDashboardMockup /> : <HeroWorkflowVisual />}
          </div>
        </div>
      </div>
    </section>
  );
}

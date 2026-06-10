import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LandingGuestSections } from "@/components/landing/LandingGuestSections";
import { WorkflowStepsSection } from "@/components/landing/WorkflowStepsSection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f8f9]">
      <Navbar />
      <main>
        <Hero />
        <WorkflowStepsSection />
        <LandingGuestSections />
      </main>
    </div>
  );
}

"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PurposeBuiltSection } from "./PurposeBuiltSection";
import { TrustedBySection } from "./TrustedBySection";

export function LandingGuestSections() {
  const { user } = useAuth();

  if (user) return null;

  return (
    <>
      <PurposeBuiltSection />
      <TrustedBySection />
    </>
  );
}

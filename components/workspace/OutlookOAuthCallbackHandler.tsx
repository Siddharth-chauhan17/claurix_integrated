"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { outlookOAuthErrorMessage } from "@/lib/outlook-oauth-messages";

/**
 * Handles ?outlook= query params after Microsoft OAuth redirect to /workspace/settings.
 * Mount once inside Workspace shell (Suspense boundary required).
 */
export function OutlookOAuthCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const outlook = searchParams.get("outlook");
    if (!outlook) return;

    handled.current = true;

    if (outlook === "connected") {
      toast.success("Outlook connected successfully");
      window.dispatchEvent(new Event("outlook-connection-changed"));
    } else if (outlook === "error") {
      const reason = searchParams.get("reason");
      toast.error(outlookOAuthErrorMessage(reason));
    }

    router.replace("/workspace/settings", { scroll: false });
  }, [searchParams, router]);

  return null;
}

"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function WorkspaceRouteLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f8f9]">
        <p className="text-sm text-slate-500">Loading workspace...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}

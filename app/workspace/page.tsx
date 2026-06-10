"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WorkspacePage() {
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

  return <WorkspaceLayout />;
}

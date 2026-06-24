"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { QcrEditingLoadingScreen } from "@/components/qcr-editing/QcrEditingLoadingScreen";
import { WorkspaceShell } from "@/components/qcr-editing/WorkspaceShell";
import { EmailComposerProvider } from "@/components/email/EmailComposerProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { projectWorkstationPath } from "@/lib/projectWorkstation";
import { useActivityStore } from "@/lib/qcr-editing/activity-store";
import { registerAuthUser } from "@/lib/qcr-editing/users";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";

export default function ProjectQcrWorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params.projectId === "string" ? params.projectId : "";

  const workspace = useQcrEditingStore((s) => s.workspace);
  const isLoading = useQcrEditingStore((s) => s.ui.isLoading);
  const loadError = useQcrEditingStore((s) => s.ui.loadError);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!projectId) return;

    registerAuthUser({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    useActivityStore.getState().setCurrentUserId(user.id);
    void useQcrEditingStore.getState().loadWorkspace(projectId);

    return () => {
      useQcrEditingStore.getState().resetWorkspace();
    };
  }, [authLoading, user, router, projectId]);

  if (authLoading || isLoading) {
    return <QcrEditingLoadingScreen />;
  }

  if (!user) return null;

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#e8eaed] p-6">
        <p className="text-sm text-red-600">{loadError}</p>
        <Link
          href={projectWorkstationPath(projectId)}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Back to workstation
        </Link>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#e8eaed] p-6">
        <p className="text-sm text-slate-600">No comparison workspace loaded.</p>
        <Link
          href={projectWorkstationPath(projectId)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Go to workstation
        </Link>
      </div>
    );
  }

  return (
    <EmailComposerProvider projectId={projectId}>
      <WorkspaceShell />
    </EmailComposerProvider>
  );
}

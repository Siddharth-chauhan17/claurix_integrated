"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectWorkstationShell } from "@/components/project-workspace/ProjectWorkstationShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { getProject } from "@/lib/api";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { useQcrWorkspaceStore } from "@/stores/qcrWorkspaceStore";

export default function ProjectWorkstationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params.projectId === "string" ? params.projectId : "";

  const initProject = useProjectWorkspaceStore((s) => s.initProject);
  const hydrated = useProjectWorkspaceStore((s) => s.hydrated);
  const resetStore = () => {
    useProjectWorkspaceStore.setState({
      projectId: null,
      projectName: "",
      clientName: "",
      clientId: null,
      rfqWorkbook: null,
      rfqFileBlob: null,
      quoteFiles: [],
      archivedQuoteFiles: [],
      archivedRfqFiles: [],
      archivedRfqFileBlobs: {},
      quoteFileBlobs: {},
      qcrExport: null,
      qcrExportBlob: null,
      mappings: [],
      selectedRange: null,
      assignMenu: null,
      hydrated: false,
      currentStage: "document-upload",
      relatedEmailsCount: 0,
      relatedEmailsDetailMessageId: null,
    });
  };

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!projectId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    getProject(projectId)
      .then((project) => {
        if (cancelled) return;
        initProject({
          projectId: project.id,
          projectName: project.name,
          clientName: project.client_name,
          clientId: project.client_id,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load project");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      resetStore();
      useQcrWorkspaceStore.getState().clear();
    };
  }, [authLoading, user, router, projectId, initProject]);

  if (authLoading || loading || !hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#eef0f3]">
        <p className="text-sm text-slate-500">Loading workstation...</p>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#eef0f3] p-6">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/workstation")}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Back to workstation
        </button>
      </div>
    );
  }

  return <ProjectWorkstationShell />;
}

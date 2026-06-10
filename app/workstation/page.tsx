"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listProjects } from "@/lib/api";
import { projectWorkstationPath } from "@/lib/projectWorkstation";

type EntryStatus = "loading" | "empty" | "error";

/** Entry route — opens the most recent project workstation. */
export default function WorkstationEntryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<EntryStatus>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError("");

    listProjects({ limit: 1 })
      .then((res) => {
        if (cancelled) return;
        const project = res.items[0];
        if (project) {
          router.replace(projectWorkstationPath(project.id));
          return;
        }
        setStatus("empty");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load projects");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  if (authLoading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef0f3]">
        <p className="text-sm text-slate-500">Opening workstation…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#eef0f3] p-8 text-center">
      {status === "error" ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <h1 className="text-lg font-semibold text-slate-900">No projects yet</h1>
          <p className="max-w-md text-sm text-slate-500">
            Create a client and project in Workspace, then return here to upload RFQ and
            quotes.
          </p>
        </>
      )}
      <Link
        href="/workspace"
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Go to Workspace
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getProjectActivities, type ProjectActivityItem } from "@/lib/api";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProjectActivityPanel() {
  const projectId = useProjectWorkspaceStore((s) => s.projectId);
  const [items, setItems] = useState<ProjectActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getProjectActivities(projectId)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load activity");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        Loading activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-semibold text-slate-800">No activity yet</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Project events such as emails sent will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Project activity</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-900">{item.summary}</p>
            <p className="mt-1 text-xs text-slate-500">{formatWhen(item.created_at)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

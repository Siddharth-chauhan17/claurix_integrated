"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { useEmailComposerContext } from "@/components/email/EmailComposerProvider";
import {
  deleteProjectEmailDraft,
  listProjectEmailDrafts,
  sendProjectEmailDraft,
  type ProjectEmailDraft,
} from "@/lib/api";
import { cn } from "@/lib/utils";
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function DraftPreview({ draft }: { draft: ProjectEmailDraft }) {
  const preview = stripHtml(draft.body_html).slice(0, 220);
  const toLabel = draft.to.length ? draft.to.join(", ") : "(no recipients yet)";

  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-[4rem_1fr]">
        <span className="text-xs font-medium text-slate-500">To</span>
        <span className="text-slate-800">{toLabel}</span>
        {draft.cc.length > 0 ? (
          <>
            <span className="text-xs font-medium text-slate-500">CC</span>
            <span className="text-slate-800">{draft.cc.join(", ")}</span>
          </>
        ) : null}
        <span className="text-xs font-medium text-slate-500">Subject</span>
        <span className="font-medium text-slate-900">{draft.subject}</span>
      </div>
      <div
        className="prose prose-sm max-w-none rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-slate-700"
        dangerouslySetInnerHTML={{ __html: draft.body_html }}
      />
      {preview && !draft.body_html.includes("<") ? (
        <p className="text-slate-600">{preview}</p>
      ) : null}
      {draft.attachment_count > 0 ? (
        <p className="text-xs text-slate-500">
          {draft.attachment_count} attachment{draft.attachment_count === 1 ? "" : "s"} selected
        </p>
      ) : null}
      <p className="text-xs text-slate-400">
        Saved {formatWhen(draft.updated_at)}
        {draft.outlook_draft_id ? " · synced to Outlook Drafts" : null}
      </p>
    </div>
  );
}

export function ProjectEmailDraftsPanel({ embedded = false }: { embedded?: boolean }) {
  const projectId = useProjectWorkspaceStore((s) => s.projectId);
  const emailDraftsVersion = useProjectWorkspaceStore((s) => s.emailDraftsVersion);
  const bumpEmailDraftsVersion = useProjectWorkspaceStore(
    (s) => s.bumpEmailDraftsVersion
  );
  const { openDraft } = useEmailComposerContext();

  const [items, setItems] = useState<ProjectEmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const res = await listProjectEmailDrafts(projectId);
      setItems(res.items);
      setExpandedId((prev) => prev ?? res.items[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts, emailDraftsVersion]);

  async function handleSend(draft: ProjectEmailDraft) {
    if (!projectId) return;
    if (!draft.to.length) {
      toast.error("Add at least one recipient before sending.");
      openDraft(draft.id);
      return;
    }
    setBusyId(draft.id);
    try {
      await sendProjectEmailDraft(projectId, draft.id);
      toast.success("Draft sent successfully");
      bumpEmailDraftsVersion();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send draft");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(draft: ProjectEmailDraft) {
    if (!projectId) return;
    const ok = window.confirm("Delete this draft from Claurix and Outlook?");
    if (!ok) return;
    setBusyId(draft.id);
    try {
      await deleteProjectEmailDraft(projectId, draft.id);
      toast.success("Draft deleted");
      if (expandedId === draft.id) setExpandedId(null);
      bumpEmailDraftsVersion();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete draft");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        Loading email drafts…
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
        <p className="text-lg font-semibold text-slate-800">No email drafts yet</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Compose an email and click Save Draft. Drafts are stored in your Outlook mailbox
          and listed here for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {!embedded ? (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Email drafts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Saved drafts for this placement — open to edit, send, or delete.
          </p>
        </div>
      ) : null}
      <ul className="space-y-3">
        {items.map((draft) => {
          const expanded = expandedId === draft.id;
          const busy = busyId === draft.id;
          return (
            <li
              key={draft.id}
              className={cn(
                "rounded-xl border bg-white shadow-sm transition",
                expanded ? "border-primary-200 ring-1 ring-primary-100" : "border-slate-200"
              )}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedId(expanded ? null : draft.id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{draft.subject}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    To: {draft.to.length ? draft.to.join(", ") : "—"} ·{" "}
                    {formatWhen(draft.updated_at)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{expanded ? "▲" : "▼"}</span>
              </button>
              {expanded ? (
                <div className="border-t border-slate-100 px-4 py-4">
                  <DraftPreview draft={draft} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => openDraft(draft.id)}
                    >
                      Open & edit
                    </Button>
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => void handleSend(draft)}
                    >
                      {busy ? "Sending…" : "Send"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={busy}
                      onClick={() => void handleDelete(draft)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

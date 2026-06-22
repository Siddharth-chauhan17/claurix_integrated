"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  getMailMessage,
  getMailMessageAttachments,
  getProjectRelatedEmails,
  importOutlookAttachment,
  type MailAttachmentSummary,
  type MailMessageDetail,
  type RelatedEmailSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

function formatListDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatDetailDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function attachmentCountLabel(hasAttachments: boolean): string {
  if (!hasAttachments) return "no attachments";
  return "attachments";
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function RelatedEmailsPanel() {
  const projectId = useProjectWorkspaceStore((s) => s.projectId);
  const projectName = useProjectWorkspaceStore((s) => s.projectName);
  const clientName = useProjectWorkspaceStore((s) => s.clientName);
  const detailMessageId = useProjectWorkspaceStore((s) => s.relatedEmailsDetailMessageId);
  const setDetailMessageId = useProjectWorkspaceStore(
    (s) => s.setRelatedEmailsDetailMessageId
  );
  const refreshRelatedEmailsCount = useProjectWorkspaceStore(
    (s) => s.refreshRelatedEmailsCount
  );

  const [emails, setEmails] = useState<RelatedEmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadEmails = useCallback(
    async (options?: { resync?: boolean }) => {
      if (!projectId) return;
      const isResync = options?.resync === true;
      if (isResync) {
        setSyncing(true);
      } else {
        setLoading(true);
      }
      setError("");
      try {
        const { messages } = await getProjectRelatedEmails(projectId);
        setEmails(messages);
        await refreshRelatedEmailsCount();
        if (isResync) {
          toast.success("Related emails updated");
        }
      } catch (err) {
        if (!isResync) {
          setEmails([]);
        }
        const message =
          err instanceof Error ? err.message : "Failed to load related emails";
        setError(message);
        if (isResync) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [projectId, refreshRelatedEmailsCount]
  );

  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  if (!projectId) return null;

  if (detailMessageId) {
    return (
      <RelatedEmailDetailView
        projectId={projectId}
        messageId={detailMessageId}
        onBack={() => setDetailMessageId(null)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Related Outlook emails</h2>
            <p className="mt-1 text-sm text-slate-500">
              Matched on &apos;{projectName}&apos;, {clientName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadEmails({ resync: true })}
            disabled={loading || syncing}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Re-sync"}
          </button>
        </div>

        {error ? (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading related emails…</p>
        ) : emails.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No related emails found.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {emails.map((email) => {
              const sender = email.sender_email ?? email.sender_name ?? "Unknown sender";
              const date = formatListDate(email.received_at);
              return (
                <li key={email.message_id}>
                  <button
                    type="button"
                    onClick={() => setDetailMessageId(email.message_id)}
                    className="w-full rounded-lg border border-transparent bg-slate-100 px-4 py-3 text-left transition hover:bg-slate-100/80"
                  >
                    <p className="text-sm font-semibold text-slate-900">{email.subject}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {sender}
                      {date ? ` · ${date}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {attachmentCountLabel(email.has_attachments)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function RelatedEmailDetailView({
  projectId,
  messageId,
  onBack,
}: {
  projectId: string;
  messageId: string;
  onBack: () => void;
}) {
  const setStage = useProjectWorkspaceStore((s) => s.setStage);
  const [message, setMessage] = useState<MailMessageDetail | null>(null);
  const [attachments, setAttachments] = useState<MailAttachmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importingKey, setImportingKey] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [detail, attachmentList] = await Promise.all([
        getMailMessage(messageId),
        getMailMessageAttachments(messageId, projectId),
      ]);
      setMessage(detail);
      setAttachments(attachmentList.attachments);
    } catch (err) {
      setMessage(null);
      setAttachments([]);
      setError(err instanceof Error ? err.message : "Failed to load email");
    } finally {
      setLoading(false);
    }
  }, [messageId, projectId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function handleImport(
    attachment: MailAttachmentSummary,
    documentType: "rfq" | "quote"
  ) {
    const key = `${attachment.id}:${documentType}`;
    setImportingKey(key);
    try {
      await importOutlookAttachment(projectId, {
        message_id: messageId,
        attachment_id: attachment.id,
        document_type: documentType,
      });
      toast.success(
        documentType === "rfq" ? "RFQ imported successfully" : "Quote imported successfully"
      );
      const attachmentList = await getMailMessageAttachments(messageId, projectId);
      setAttachments(attachmentList.attachments);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingKey(null);
    }
  }

  const sender = message?.sender_email ?? message?.sender_name ?? "";

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-500 transition hover:text-primary-600"
        >
          ← Related emails
        </button>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading email…</p>
        ) : error ? (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : message ? (
          <>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{message.subject}</h2>
            {sender ? (
              <p className="mt-2 text-sm text-slate-700">From: {sender}</p>
            ) : null}
            {message.received_at ? (
              <p className="mt-1 text-sm text-slate-600">
                {formatDetailDate(message.received_at)}
              </p>
            ) : null}
            {message.body_preview ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                {message.body_preview}
              </p>
            ) : null}

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                Attachments
              </p>
              {attachments.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No file attachments.</p>
              ) : (
                <ul className="mt-3 space-y-4">
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{attachment.name}</p>
                        {attachment.size_bytes != null ? (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {formatFileSize(attachment.size_bytes)}
                          </p>
                        ) : null}
                      </div>

                      {attachment.imported && attachment.document_type ? (
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-slate-700">
                            ✓ Imported as{" "}
                            {attachment.document_type === "rfq" ? "RFQ" : "Quote"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setStage(
                                attachment.document_type === "rfq"
                                  ? "rfq-upload"
                                  : "quote-uploads"
                              )
                            }
                            className="text-sm font-medium text-primary-600 hover:underline"
                          >
                            Open {attachment.document_type === "rfq" ? "RFQ" : "Quote"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={importingKey !== null}
                            onClick={() => void handleImport(attachment, "rfq")}
                            className={cn(
                              "rounded-md border border-slate-900 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition",
                              importingKey === `${attachment.id}:rfq`
                                ? "opacity-60"
                                : "hover:bg-slate-50"
                            )}
                          >
                            {importingKey === `${attachment.id}:rfq`
                              ? "Importing…"
                              : "Import as RFQ"}
                          </button>
                          <button
                            type="button"
                            disabled={importingKey !== null}
                            onClick={() => void handleImport(attachment, "quote")}
                            className={cn(
                              "rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition",
                              importingKey === `${attachment.id}:quote`
                                ? "opacity-60"
                                : "hover:bg-primary-700"
                            )}
                          >
                            {importingKey === `${attachment.id}:quote`
                              ? "Importing…"
                              : "Import as Quote"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

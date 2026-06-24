"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SimpleRichTextEditor } from "@/components/email/SimpleRichTextEditor";
import { cn } from "@/lib/utils";
import type { useEmailComposer } from "@/hooks/useEmailComposer";

type EmailComposerModalProps = {
  composer: ReturnType<typeof useEmailComposer>;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50";

function formatBytes(size: number | null): string {
  if (size == null) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailComposerModal({ composer }: EmailComposerModalProps) {
  const {
    open,
    closeComposer,
    loading,
    sending,
    saving,
    error,
    draftId,
    to,
    setTo,
    cc,
    setCc,
    bcc,
    setBcc,
    showBcc,
    setShowBcc,
    subject,
    setSubject,
    bodyHtml,
    setBodyHtml,
    insurerNames,
    attachments,
    selectedAttachmentIds,
    toggleAttachment,
    outlookConnected,
    send,
    saveDraft,
  } = composer;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-composer-title"
      onClick={closeComposer}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="email-composer-title" className="text-base font-semibold text-slate-900">
            {draftId ? "Edit Draft" : "New Message"}
          </h2>
          {!outlookConnected ? (
            <Link
              href="/workspace/settings"
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              Connect Outlook in Settings →
            </Link>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading composer…</p>
          ) : (
            <div className="space-y-3">
              {insurerNames.length > 0 ? (
                <p className="text-xs text-slate-500">
                  Insurers on this placement:{" "}
                  <span className="font-medium text-slate-700">
                    {insurerNames.join(", ")}
                  </span>
                  {" "}(add underwriter emails in To/CC)
                </p>
              ) : null}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
                <input
                  type="text"
                  className={inputClass}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="underwriter@example.com, placement@example.com"
                  disabled={sending || saving}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">CC</span>
                <input
                  type="text"
                  className={inputClass}
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  disabled={sending || saving}
                />
              </label>

              {showBcc ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">BCC</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    disabled={sending || saving}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => setShowBcc(true)}
                >
                  Show BCC
                </button>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Subject</span>
                <input
                  type="text"
                  className={inputClass}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending || saving}
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-medium text-slate-600">Message</span>
                <SimpleRichTextEditor
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  disabled={sending || saving}
                />
              </div>

              <div>
                <span className="mb-2 block text-xs font-medium text-slate-600">
                  Attachments
                </span>
                {attachments.length === 0 ? (
                  <p className="text-sm text-slate-500">No attachments available.</p>
                ) : (
                  <ul className="space-y-2">
                    {attachments.map((file) => {
                      const selected = selectedAttachmentIds.has(file.id);
                      const disabled = !file.available;
                      return (
                        <li
                          key={file.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                            selected
                              ? "border-primary-200 bg-primary-50/50"
                              : "border-slate-200 bg-slate-50/50",
                            disabled && "opacity-50"
                          )}
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={disabled || sending || saving}
                              onChange={() => toggleAttachment(file.id)}
                            />
                            <span className="truncate">
                              📄 {file.name}
                              {file.size_bytes != null ? (
                                <span className="ml-2 text-xs text-slate-500">
                                  {formatBytes(file.size_bytes)}
                                </span>
                              ) : null}
                            </span>
                          </label>
                          {!file.available ? (
                            <span className="ml-2 shrink-0 text-xs text-slate-400">
                              Unavailable
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            {outlookConnected
              ? "Sent via your connected Outlook mailbox (Ctrl+Enter to send)"
              : "Outlook connection required to send"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={closeComposer} disabled={sending || saving}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => void saveDraft()}
              disabled={sending || saving || loading || !outlookConnected}
            >
              {saving ? "Saving…" : "Save Draft"}
            </Button>
            <Button
              variant="primary3d"
              onClick={() => void send()}
              disabled={sending || saving || loading || !outlookConnected}
            >
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

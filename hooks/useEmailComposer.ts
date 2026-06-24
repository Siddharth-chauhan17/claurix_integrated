"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getEmailComposeContext,
  getProjectEmailDraft,
  logEmailComposerOpened,
  saveProjectEmailDraft,
  sendProjectEmail,
  sendProjectEmailDraft,
  type EmailComposeContext,
  type InlineEmailAttachmentPayload,
  type ProjectEmailDraft,
  type ProjectEmailSendResponse,
} from "@/lib/api";

export type ComposerAttachment = {
  id: string;
  name: string;
  content_type: string;
  size_bytes: number | null;
  available: boolean;
  kind: string;
  source: "server" | "inline";
  inlinePayload?: InlineEmailAttachmentPayload;
  inlineBlob?: Blob;
};

export type LocalInlineDocument = {
  id: string;
  name: string;
  blob: Blob;
  content_type: string;
  kind: string;
};

const EXPORTED_QCR_ATTACHMENT_ID = "inline:exported-qcr";

function parseAddressList(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinAddresses(list: string[]): string {
  return list.join(", ");
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export type UseEmailComposerOptions = {
  projectId: string;
  localQcrBlob?: Blob | null;
  localQcrFilename?: string;
  localInlineDocuments?: LocalInlineDocument[];
  prepareComposer?: () => Promise<void>;
  onDraftSaved?: () => void;
};

function serverHasAttachmentName(
  list: ComposerAttachment[],
  filename: string
): boolean {
  const key = filename.trim().toLowerCase();
  return list.some((item) => item.available && item.name.trim().toLowerCase() === key);
}

export function useEmailComposer({
  projectId,
  localQcrBlob,
  localQcrFilename,
  localInlineDocuments = [],
  prepareComposer,
  onDraftSaved,
}: UseEmailComposerOptions) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [insurerNames, setInsurerNames] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(
    new Set()
  );
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef<string>("");

  const markDirty = useCallback(() => setDirty(true), []);

  const buildAttachmentList = useCallback(
    (ctx: EmailComposeContext, draft?: ProjectEmailDraft) => {
      const list: ComposerAttachment[] = ctx.attachments.map((item) => ({
        ...item,
        source: "server" as const,
      }));

      if (localQcrBlob) {
        const exportedName = localQcrFilename || "QCR_Export.xlsx";
        if (!list.some((a) => a.id === EXPORTED_QCR_ATTACHMENT_ID)) {
          list.push({
            id: EXPORTED_QCR_ATTACHMENT_ID,
            name: exportedName,
            content_type:
              localQcrBlob.type ||
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size_bytes: localQcrBlob.size,
            available: true,
            kind: "qcr-export",
            source: "inline",
            inlineBlob: localQcrBlob,
          });
        }
      }

      for (const local of localInlineDocuments) {
        if (serverHasAttachmentName(list, local.name)) continue;
        if (list.some((a) => a.id === local.id)) continue;
        list.push({
          id: local.id,
          name: local.name,
          content_type: local.content_type,
          size_bytes: local.blob.size,
          available: true,
          kind: local.kind,
          source: "inline",
          inlineBlob: local.blob,
        });
      }

      if (draft) {
        for (const inline of draft.inline_attachments) {
          const inlineId = `inline:draft:${inline.name}`;
          if (!list.some((a) => a.id === inlineId)) {
            list.push({
              id: inlineId,
              name: inline.name,
              content_type: inline.content_type,
              size_bytes: Math.ceil((inline.content_base64.length * 3) / 4),
              available: true,
              kind: "inline",
              source: "inline",
              inlinePayload: inline,
            });
          }
        }
      }

      return list;
    },
    [localInlineDocuments, localQcrBlob, localQcrFilename]
  );

  const collectPayloadAttachments = useCallback(async () => {
    const attachment_ids: string[] = [];
    const inline_attachments: InlineEmailAttachmentPayload[] = [];

    for (const item of attachments) {
      if (!selectedAttachmentIds.has(item.id)) continue;
      if (item.source === "inline") {
        if (item.inlinePayload) {
          inline_attachments.push(item.inlinePayload);
          continue;
        }
        const blob = item.inlineBlob ?? null;
        if (!blob) continue;
        inline_attachments.push({
          name: item.name,
          content_type: item.content_type,
          content_base64: await blobToBase64(blob),
        });
      } else if (item.available) {
        attachment_ids.push(item.id);
      }
    }

    return { attachment_ids, inline_attachments };
  }, [attachments, selectedAttachmentIds]);

  const applyComposeContext = useCallback(
    (ctx: EmailComposeContext, draft?: ProjectEmailDraft) => {
      if (draft) {
        setTo(joinAddresses(draft.to));
        setCc(joinAddresses(draft.cc));
        setBcc(joinAddresses(draft.bcc));
        setSubject(draft.subject === "(No subject)" ? "" : draft.subject);
        setBodyHtml(draft.body_html);
        setDraftId(draft.id);
      } else {
        setTo(joinAddresses(ctx.to));
        setCc(joinAddresses(ctx.cc));
        setBcc(joinAddresses(ctx.bcc));
        setSubject(ctx.subject);
        setBodyHtml(ctx.body_html);
        setDraftId(null);
      }

      setInsurerNames(ctx.insurer_names);
      setOutlookConnected(ctx.outlook_connected);
      setShowBcc(Boolean(draft?.bcc.length));

      const list = buildAttachmentList(ctx, draft);
      setAttachments(list);

      const selected = new Set<string>();
      if (draft) {
        for (const id of draft.attachment_ids) {
          if (id === "rfq") {
            const rfqItem = list.find((a) => a.kind === "rfq" && a.available);
            selected.add(rfqItem?.id ?? id);
            continue;
          }
          selected.add(id);
        }
        for (const inline of draft.inline_attachments) {
          selected.add(`inline:draft:${inline.name}`);
        }
      } else {
        for (const id of ctx.default_attachment_ids) selected.add(id);
        if (localQcrBlob) {
          selected.add(EXPORTED_QCR_ATTACHMENT_ID);
        }
      }
      setSelectedAttachmentIds(selected);

      initialSnapshot.current = JSON.stringify({
        to: draft?.to ?? ctx.to,
        subject: draft?.subject ?? ctx.subject,
        body: draft?.body_html ?? ctx.body_html,
      });
      setDirty(false);
    },
    [buildAttachmentList, localQcrBlob]
  );

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = await getEmailComposeContext(projectId);
      applyComposeContext(ctx);
      void logEmailComposerOpened(projectId).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open composer");
    } finally {
      setLoading(false);
    }
  }, [applyComposeContext, projectId]);

  const loadDraft = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const [ctx, draft] = await Promise.all([
          getEmailComposeContext(projectId),
          getProjectEmailDraft(projectId, id),
        ]);
        applyComposeContext(ctx, draft);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load draft");
      } finally {
        setLoading(false);
      }
    },
    [applyComposeContext, projectId]
  );

  const openComposer = useCallback(() => {
    setOpen(true);
    void (async () => {
      try {
        await prepareComposer?.();
      } catch {
        /* local restore is best-effort */
      }
      await loadContext();
    })();
  }, [loadContext, prepareComposer]);

  const openDraft = useCallback(
    (id: string) => {
      setOpen(true);
      void (async () => {
        try {
          await prepareComposer?.();
        } catch {
          /* local restore is best-effort */
        }
        await loadDraft(id);
      })();
    },
    [loadDraft, prepareComposer]
  );

  const closeComposer = useCallback(() => {
    if (dirty) {
      const ok = window.confirm(
        "Discard unsent email? Your changes will be lost."
      );
      if (!ok) return;
    }
    setOpen(false);
    setError(null);
    setDraftId(null);
  }, [dirty]);

  const toggleAttachment = useCallback(
    (id: string) => {
      setSelectedAttachmentIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  const saveDraft = useCallback(async (): Promise<ProjectEmailDraft | null> => {
    setError(null);
    if (!outlookConnected) {
      setError("Connect Outlook in Settings before saving a draft.");
      return null;
    }

    setSaving(true);
    try {
      const { attachment_ids, inline_attachments } =
        await collectPayloadAttachments();
      const saved = await saveProjectEmailDraft(projectId, {
        draft_id: draftId,
        to: parseAddressList(to),
        cc: parseAddressList(cc),
        bcc: parseAddressList(bcc),
        subject: subject.trim(),
        body_html: bodyHtml,
        attachment_ids,
        inline_attachments,
      });
      setDraftId(saved.id);
      setDirty(false);
      onDraftSaved?.();
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    bodyHtml,
    bcc,
    cc,
    collectPayloadAttachments,
    draftId,
    onDraftSaved,
    outlookConnected,
    projectId,
    subject,
    to,
  ]);

  const send = useCallback(async (): Promise<ProjectEmailSendResponse | null> => {
    setError(null);
    const toList = parseAddressList(to);
    if (!toList.length) {
      setError("Add at least one recipient in To.");
      return null;
    }
    if (!subject.trim()) {
      setError("Subject is required.");
      return null;
    }
    if (!outlookConnected) {
      setError("Connect Outlook in Settings before sending email.");
      return null;
    }

    setSending(true);
    try {
      if (draftId) {
        await saveProjectEmailDraft(projectId, {
          draft_id: draftId,
          to: toList,
          cc: parseAddressList(cc),
          bcc: parseAddressList(bcc),
          subject: subject.trim(),
          body_html: bodyHtml,
          ...(await collectPayloadAttachments()),
        });
        const result = await sendProjectEmailDraft(projectId, draftId);
        setDirty(false);
        setOpen(false);
        setDraftId(null);
        onDraftSaved?.();
        return result;
      }

      const { attachment_ids, inline_attachments } =
        await collectPayloadAttachments();

      const result = await sendProjectEmail(projectId, {
        to: toList,
        cc: parseAddressList(cc),
        bcc: parseAddressList(bcc),
        subject: subject.trim(),
        body_html: bodyHtml,
        attachment_ids,
        inline_attachments,
      });
      setDirty(false);
      setOpen(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
      return null;
    } finally {
      setSending(false);
    }
  }, [
    bcc,
    bodyHtml,
    cc,
    collectPayloadAttachments,
    draftId,
    onDraftSaved,
    outlookConnected,
    projectId,
    subject,
    to,
  ]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void send();
      }
      if (e.key === "Escape") {
        closeComposer();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, send, closeComposer]);

  return {
    open,
    openComposer,
    openDraft,
    closeComposer,
    loading,
    sending,
    saving,
    error,
    draftId,
    to,
    setTo: (v: string) => {
      setTo(v);
      markDirty();
    },
    cc,
    setCc: (v: string) => {
      setCc(v);
      markDirty();
    },
    bcc,
    setBcc: (v: string) => {
      setBcc(v);
      markDirty();
    },
    showBcc,
    setShowBcc,
    subject,
    setSubject: (v: string) => {
      setSubject(v);
      markDirty();
    },
    bodyHtml,
    setBodyHtml: (v: string) => {
      setBodyHtml(v);
      markDirty();
    },
    insurerNames,
    attachments,
    selectedAttachmentIds,
    toggleAttachment,
    outlookConnected,
    dirty,
    send,
    saveDraft,
  };
}

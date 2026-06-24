"use client";

import { RelatedEmailsPanel } from "@/components/project-workspace/RelatedEmailsPanel";
import { ProjectEmailDraftsPanel } from "@/components/project-workspace/ProjectEmailDraftsPanel";
import { EmailToolbarButton } from "@/components/project-workspace/EmailToolbarButton";
import { cn } from "@/lib/utils";
import type { EmailWorkspaceTab } from "@/types/project-workspace";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

const TABS: { id: EmailWorkspaceTab; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "drafts", label: "Drafts" },
];

export function EmailWorkspacePanel() {
  const emailTab = useProjectWorkspaceStore((s) => s.emailTab);
  const setEmailTab = useProjectWorkspaceStore((s) => s.setEmailTab);
  const relatedEmailsCount = useProjectWorkspaceStore((s) => s.relatedEmailsCount);
  const emailDraftsCount = useProjectWorkspaceStore((s) => s.emailDraftsCount);
  const detailMessageId = useProjectWorkspaceStore((s) => s.relatedEmailsDetailMessageId);
  const setRelatedEmailsDetailMessageId = useProjectWorkspaceStore(
    (s) => s.setRelatedEmailsDetailMessageId
  );

  const showInbox = emailTab === "inbox" || Boolean(detailMessageId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {detailMessageId ? (
        <div className="flex shrink-0 items-center justify-end border-b border-slate-200 bg-white px-3 py-2">
          <EmailToolbarButton />
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const active = emailTab === tab.id;
              const count =
                tab.id === "inbox" ? relatedEmailsCount : emailDraftsCount;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setRelatedEmailsDetailMessageId(null);
                    setEmailTab(tab.id);
                  }}
                  className={cn(
                    "relative px-4 py-2.5 text-sm font-medium transition",
                    active
                      ? "text-primary-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary-600"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                  {count > 0 ? (
                    <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <EmailToolbarButton />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {showInbox ? (
          <RelatedEmailsPanel embedded />
        ) : (
          <ProjectEmailDraftsPanel embedded />
        )}
      </div>
    </div>
  );
}

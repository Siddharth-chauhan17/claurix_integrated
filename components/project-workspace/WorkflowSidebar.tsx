"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentsIcon,
  HexLogo,
  ProjectsIcon,
} from "@/components/workspace/icons";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import type { WorkflowStageId } from "@/types/project-workspace";

const NAV_ITEMS: {
  stage: WorkflowStageId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: (state: {
    rfqWorkbook: { fileName: string } | null;
    quoteCount: number;
  }) => number;
}[] = [
  {
    stage: "workstation",
    label: "Workstation",
    icon: ProjectsIcon,
  },
  {
    stage: "rfq-upload",
    label: "Uploaded RFQ",
    icon: DocumentsIcon,
    count: ({ rfqWorkbook }) => (rfqWorkbook ? 1 : 0),
  },
  {
    stage: "quote-uploads",
    label: "Uploaded Quotes",
    icon: DocumentsIcon,
    count: ({ quoteCount }) => quoteCount,
  },
];

function NavItem({
  label,
  active,
  collapsed,
  count,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  collapsed: boolean;
  count: number;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
        collapsed && "justify-center px-2",
        active
          ? "bg-primary-50 text-primary-800"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon
        className={cn(
          "h-[1.125rem] w-[1.125rem] shrink-0",
          active ? "text-primary-600" : "text-slate-400"
        )}
      />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {count > 0 ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                active ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-600"
              )}
            >
              {count}
            </span>
          ) : null}
        </>
      ) : null}
    </button>
  );
}

export function WorkflowSidebar() {
  const collapsed = useProjectWorkspaceStore((s) => s.sidebarCollapsed);
  const currentStage = useProjectWorkspaceStore((s) => s.currentStage);
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const quoteFiles = useProjectWorkspaceStore((s) => s.quoteFiles);
  const toggleSidebar = useProjectWorkspaceStore((s) => s.toggleSidebar);
  const setStage = useProjectWorkspaceStore((s) => s.setStage);

  const resolvedStage: WorkflowStageId =
    currentStage === "policy-mapping" ? "workstation" : currentStage;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out",
        collapsed ? "w-[4.25rem]" : "w-56"
      )}
    >
      <div
        className={cn(
          "flex border-b border-slate-200",
          collapsed
            ? "h-16 flex-col items-center justify-center gap-1 px-2 py-2"
            : "h-14 items-center justify-between gap-2 px-4"
        )}
      >
        <Link
          href="/workspace"
          className={cn(
            "flex min-w-0 items-center gap-2.5 transition hover:opacity-80",
            collapsed && "justify-center"
          )}
          title="claurix"
        >
          <HexLogo className="h-7 w-7 shrink-0 text-primary-600" />
          {!collapsed ? (
            <span className="truncate text-sm font-bold tracking-tight text-slate-900">
              claurix
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ stage, label, icon, count }) => (
            <li key={stage}>
              <NavItem
                label={label}
                icon={icon}
                active={resolvedStage === stage}
                collapsed={collapsed}
                count={
                  count
                    ? count({
                        rfqWorkbook,
                        quoteCount: quoteFiles.length,
                      })
                    : 0
                }
                onClick={() => setStage(stage)}
              />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

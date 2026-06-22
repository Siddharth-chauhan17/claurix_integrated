"use client";

import dynamic from "next/dynamic";
import { QcrGenerationPanel } from "@/components/project-workspace/QcrGenerationPanel";
import { WorkstationDocumentsPanel } from "@/components/project-workspace/WorkstationDocumentsPanel";
import { RelatedEmailsPanel } from "@/components/project-workspace/RelatedEmailsPanel";
import { WorkstationUploadHub } from "@/components/project-workspace/WorkstationUploadHub";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { useQcrWorkspaceStore } from "@/stores/qcrWorkspaceStore";
import { MappingLegend } from "./MappingLegend";

const RfqSpreadsheetGrid = dynamic(
  () => import("./RfqSpreadsheetGrid").then((m) => m.RfqSpreadsheetGrid),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-500">
        Loading spreadsheet…
      </div>
    ),
  }
);

export function WorkspaceMainPanel() {
  const currentStage = useProjectWorkspaceStore((s) => s.currentStage);
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const activeSheetName = useProjectWorkspaceStore((s) => s.activeSheetName);
  const setActiveSheet = useProjectWorkspaceStore((s) => s.setActiveSheet);
  const qcrBusy = useQcrWorkspaceStore(
    (s) => s.isGenerating || Boolean(s.error)
  );

  if (
    currentStage === "ai-processing" ||
    currentStage === "review-edit" ||
    currentStage === "activity"
  ) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-semibold text-slate-800">Coming soon</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          This workflow stage will be enabled in a future release after policy mapping and AI
          processing are connected.
        </p>
      </div>
    );
  }

  if (currentStage === "document-upload") {
    return <WorkstationUploadHub />;
  }

  if (currentStage === "rfq-upload") {
    return <WorkstationDocumentsPanel variant="rfq" />;
  }

  if (currentStage === "quote-uploads") {
    return <WorkstationDocumentsPanel variant="quotes" />;
  }

  if (currentStage === "related-emails") {
    return <RelatedEmailsPanel />;
  }

  if (currentStage === "export-qcr") {
    return <WorkstationDocumentsPanel variant="qcr" />;
  }

  const onPolicyMapping =
    currentStage === "policy-mapping" || currentStage === "workstation";
  const showGrid = onPolicyMapping && Boolean(rfqWorkbook);

  if (!showGrid) {
    return <WorkstationUploadHub />;
  }

  if (onPolicyMapping && qcrBusy) {
    return <QcrGenerationPanel />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {rfqWorkbook && rfqWorkbook.sheets.length > 1 ? (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
          {rfqWorkbook.sheets.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActiveSheet(s.name)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeSheetName === s.name
                  ? "bg-primary-100 text-primary-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <RfqSpreadsheetGrid />
      </div>
      <MappingLegend />
    </div>
  );
}

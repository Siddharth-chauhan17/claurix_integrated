import type { WorkflowStageId } from "@/types/project-workspace";

export type WorkflowStageMeta = {
  id: WorkflowStageId;
  label: string;
  shortLabel: string;
  enabled: boolean;
};

export const WORKFLOW_STAGES: WorkflowStageMeta[] = [
  { id: "document-upload", label: "Upload documents", shortLabel: "Upload", enabled: true },
  { id: "workstation", label: "Workstation", shortLabel: "Workstation", enabled: true },
  { id: "rfq-upload", label: "Uploaded RFQ", shortLabel: "RFQ", enabled: true },
  { id: "quote-uploads", label: "Uploaded Quotes", shortLabel: "Quotes", enabled: true },
  { id: "email", label: "Email", shortLabel: "Email", enabled: true },
  { id: "policy-mapping", label: "Policy Mapping", shortLabel: "Mapping", enabled: true },
  { id: "ai-processing", label: "AI Processing", shortLabel: "AI", enabled: false },
  { id: "review-edit", label: "Review & Edit", shortLabel: "Review", enabled: false },
  { id: "export-qcr", label: "Exported QCR", shortLabel: "QCR", enabled: true },
  { id: "activity", label: "Activity", shortLabel: "Activity", enabled: true },
];

export function stageLabel(id: WorkflowStageId): string {
  return WORKFLOW_STAGES.find((s) => s.id === id)?.label ?? id;
}

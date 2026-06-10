/**
 * Normalizes raw AI clause JSON into QcrWorkspace editing contracts.
 * Framework-agnostic — used by mock-api today and real API later.
 */

import type { AiClauseComparisonRaw, AiInsurerComparisonRaw } from "./ai-mock-response";
import { DEFAULT_QCR_INSURERS } from "./ai-mock-response";
import { buildAiExplanation } from "./ai-explanation";
import type {
  ClauseComparison,
  ComparisonStatus,
  InsurerComparison,
  QcrSectionId,
  QcrWorkspace,
} from "./types";

const STATUS_MAP: Record<string, ComparisonStatus> = {
  agreed: "agreed",
  "partially agreed": "partially_agreed",
  partially_agreed: "partially_agreed",
  "not agreed": "not_agreed",
  not_agreed: "not_agreed",
  "not applicable": "not_applicable",
  not_applicable: "not_applicable",
  pending: "pending_review",
  pending_review: "pending_review",
};

export function normalizeAiStatus(raw: string): ComparisonStatus {
  const key = raw.trim().toLowerCase();
  return STATUS_MAP[key] ?? "pending_review";
}

/** AI returns 0–1 decimals; UI store uses 0–100 integer scale. */
export function normalizeGapScore(raw: number): number {
  if (raw <= 1 && raw >= 0) return Math.round(raw * 100);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function clauseIdFromTitle(title: string): string {
  return (
    "c_" +
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

function inferSectionId(rfqClause: string): QcrSectionId {
  const t = rfqClause.toLowerCase();
  if (
    t.includes("business interruption") ||
    t.includes("loss of rent") ||
    t.includes("automatic asset")
  ) {
    return "business_interruption";
  }
  if (
    t.includes("transit") ||
    t.includes("temporary removal")
  ) {
    return "extensions";
  }
  if (
    t.includes("claim settlement") ||
    t.includes("waiver") ||
    t.includes("claims preparation")
  ) {
    return "special_conditions";
  }
  return "property_damage";
}

function normalizeInsurerRow(
  raw: AiInsurerComparisonRaw,
  rfqClause: string,
  rfqRequirement: string
): InsurerComparison {
  const row: InsurerComparison = {
    insurer: raw.insurer,
    proposal_clause: raw.proposal_clause ?? "",
    status: normalizeAiStatus(raw.status),
    gap_score: normalizeGapScore(raw.gap_score),
    differences: raw.differences ?? [],
    broker_note: raw.broker_note ?? "",
    override_status: null,
    reviewed: false,
    ai_explanation: "",
  };
  row.ai_explanation = buildAiExplanation(rfqClause, rfqRequirement, row);
  return row;
}

function pendingComparison(
  insurer: string,
  rfqClause: string,
  rfqRequirement: string
): InsurerComparison {
  const row: InsurerComparison = {
    insurer,
    proposal_clause: "",
    status: "pending_review",
    gap_score: 0,
    differences: [],
    broker_note: "",
    override_status: null,
    reviewed: false,
    ai_explanation: "",
  };
  row.ai_explanation = buildAiExplanation(rfqClause, rfqRequirement, row);
  return row;
}

/**
 * Ensures every clause has a row per insurer (empty AI comparisons → pending placeholders).
 */
export function normalizeAiClause(
  raw: AiClauseComparisonRaw,
  insurers: readonly string[] = DEFAULT_QCR_INSURERS
): ClauseComparison {
  const byInsurer = new Map(
    raw.comparisons.map((c) => [
      c.insurer,
      normalizeInsurerRow(c, raw.rfq_clause, raw.rfq_requirement),
    ])
  );

  const comparisons = insurers.map(
    (insurer) =>
      byInsurer.get(insurer) ??
      pendingComparison(insurer, raw.rfq_clause, raw.rfq_requirement)
  );

  return {
    clause_id: clauseIdFromTitle(raw.rfq_clause),
    section_id: inferSectionId(raw.rfq_clause),
    rfq_clause: raw.rfq_clause,
    rfq_requirement: raw.rfq_requirement,
    source: raw.source,
    broker_remark: "",
    final_recommendation: null,
    review_status: "not_reviewed",
    comparisons,
  };
}

export function normalizeAiClauses(
  rawClauses: AiClauseComparisonRaw[],
  insurers: readonly string[] = DEFAULT_QCR_INSURERS
): ClauseComparison[] {
  return rawClauses.map((c) => normalizeAiClause(c, insurers));
}

export function buildQcrWorkspaceFromAiResponse(
  rawClauses: AiClauseComparisonRaw[],
  options: {
    projectId: string;
    projectName?: string;
    clientName?: string;
    workspaceId?: string;
  }
): QcrWorkspace {
  const insurers = [...DEFAULT_QCR_INSURERS];
  const clauses = normalizeAiClauses(rawClauses, insurers);

  return {
    workspace_id: options.workspaceId ?? `wrk_${options.projectId}`,
    meta: {
      project_id: options.projectId,
      project_name: options.projectName ?? "Property QCR Review",
      client_name: options.clientName,
      rfq_file_name: "RFQ_Property_Comparison.xlsx",
      generated_at: new Date().toISOString(),
      schema_version: "2.0",
    },
    insurers,
    clauses,
  };
}

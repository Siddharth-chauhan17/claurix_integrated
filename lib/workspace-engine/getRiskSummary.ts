import type { RiskLevel, WorkspaceResponse } from "@/types/workspace";
import type { SectionRiskSummary, WorkspaceRiskSummary } from "./types";

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

function dominantRisk(counts: Record<RiskLevel, number>): RiskLevel {
  let best: RiskLevel = "low";
  let bestScore = -1;
  for (const level of RISK_ORDER) {
    const score = counts[level] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = level;
    }
  }
  return best;
}

export function getSectionRiskSummary(
  workspace: WorkspaceResponse,
  sectionId: string
): SectionRiskSummary | null {
  const section = workspace.sections.find((s) => s.section_id === sectionId);
  if (!section) return null;

  const by_risk: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const clause of section.clauses) {
    by_risk[clause.ai_analysis.risk_level] += 1;
  }

  return {
    section_id: section.section_id,
    section_name: section.section_name,
    total_clauses: section.clauses.length,
    by_risk,
    dominant_risk: dominantRisk(by_risk),
  };
}

export function getRiskSummary(workspace: WorkspaceResponse): WorkspaceRiskSummary {
  const sections = workspace.sections
    .map((s) => getSectionRiskSummary(workspace, s.section_id))
    .filter((s): s is SectionRiskSummary => s !== null);

  const aggregate: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const s of sections) {
    for (const level of RISK_ORDER) {
      aggregate[level] += s.by_risk[level];
    }
  }

  return {
    sections,
    overall_dominant_risk: dominantRisk(aggregate),
  };
}

/**
 * Workspace engine types — pure data shapes for matrices, filters, summaries.
 * No React, no AG Grid.
 */

import type {
  Clause,
  ClauseCategory,
  ComparisonType,
  PolicySection,
  RiskLevel,
  WorkspaceResponse,
} from "@/types/workspace";

export type ComparisonMatrixRow = {
  clause_id: string;
  title: string;
  category: ClauseCategory;
  comparison_type: ComparisonType;
  editable: boolean;
  risk_level: RiskLevel;
  /** Dynamic insurer columns keyed by insurer name */
  insurers: Record<string, string>;
};

export type ComparisonMatrix = {
  section_id: string;
  section_name: string;
  insurer_columns: string[];
  rows: ComparisonMatrixRow[];
};

export type WorkspaceFilters = {
  search: string;
  categories: ClauseCategory[];
  riskLevels: RiskLevel[];
};

export type ClauseGroupKey = ClauseCategory | "all";

export type GroupedClauses = {
  key: ClauseGroupKey;
  label: string;
  clauses: Clause[];
};

export type SectionRiskSummary = {
  section_id: string;
  section_name: string;
  total_clauses: number;
  by_risk: Record<RiskLevel, number>;
  dominant_risk: RiskLevel;
};

export type WorkspaceRiskSummary = {
  sections: SectionRiskSummary[];
  overall_dominant_risk: RiskLevel;
};

export type WorkspaceEngineContext = {
  workspace: WorkspaceResponse;
};

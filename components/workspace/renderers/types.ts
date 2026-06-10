/**
 * Renderer contracts — presentation only; no business state ownership.
 */

import type { ReactNode } from "react";
import type { ComparisonMatrix } from "@/lib/workspace-engine";
import type { RendererMode } from "@/stores/workspace-store";
import type { Clause, PolicySection, WorkspaceResponse } from "@/types/workspace";

export type RendererConfig = {
  mode: RendererMode;
  /** Read-only until editing phase */
  readOnly: boolean;
};

export type RendererCallbacks = {
  onSelectClause?: (clauseId: string) => void;
  onSelectSection?: (sectionId: string) => void;
};

export type WorkspaceRendererProps = {
  workspace: WorkspaceResponse;
  section: PolicySection;
  matrix: ComparisonMatrix | null;
  visibleClauseIds: string[];
  activeClauseId: string | null;
  config: RendererConfig;
  callbacks: RendererCallbacks;
};

export type SectionRendererProps = {
  workspace: WorkspaceResponse;
  section: PolicySection;
  activeClauseId: string | null;
  config: RendererConfig;
  callbacks: RendererCallbacks;
};

export type ClauseRendererProps = {
  clause: Clause;
  section: PolicySection;
  config: RendererConfig;
};

export type WorkspaceRendererComponent = (
  props: WorkspaceRendererProps
) => ReactNode;

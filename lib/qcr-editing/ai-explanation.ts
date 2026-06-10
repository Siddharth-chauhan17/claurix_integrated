import { STATUS_LABELS } from "./status-styles";
import type { ComparisonStatus } from "./types";

export function buildAiExplanation(
  rfqClause: string,
  rfqRequirement: string,
  comparison: {
    insurer: string;
    proposal_clause: string;
    status: ComparisonStatus;
    override_status: ComparisonStatus | null;
    differences: string[];
  }
): string {
  const proposal =
    comparison.proposal_clause.trim() || "No proposal text provided.";
  const diffLines =
    comparison.differences.length > 0
      ? `\n\nDifferences:\n${comparison.differences.map((d) => `• ${d}`).join("\n")}`
      : "\n\nDifferences:\nNone";

  return (
    `RFQ requested ${rfqRequirement} for ${rfqClause}.\n\n` +
    `${comparison.insurer} proposal: ${proposal}.${diffLines}`
  );
}

export function statusLabel(status: ComparisonStatus): string {
  return STATUS_LABELS[status];
}

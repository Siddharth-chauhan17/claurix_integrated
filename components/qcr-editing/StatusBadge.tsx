"use client";

import { STATUS_LABELS, STATUS_STYLES } from "@/lib/qcr-editing/status-styles";
import { getEffectiveStatus } from "@/lib/qcr-editing/selectors";
import type { InsurerComparison } from "@/lib/qcr-editing/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  comparison,
  compact = false,
}: {
  comparison: InsurerComparison;
  compact?: boolean;
}) {
  const status = getEffectiveStatus(comparison);
  const overridden = comparison.override_status !== null;
  const pending = status === "pending_review" && !comparison.proposal_clause;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase ring-1",
        STATUS_STYLES[status].badge,
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      )}
    >
      {pending ? "Pending" : STATUS_LABELS[status]}
      {overridden ? (
        <span className="normal-case text-[9px] font-medium opacity-80">
          (override)
        </span>
      ) : null}
    </span>
  );
}

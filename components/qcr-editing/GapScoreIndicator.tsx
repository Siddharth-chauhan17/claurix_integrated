"use client";

import { gapScoreColor } from "@/lib/qcr-editing/status-styles";
import { cn } from "@/lib/utils";

export function GapScoreIndicator({
  score,
  showLabel = true,
}: {
  score: number;
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", gapScoreColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <span className="font-mono text-[10px] font-medium text-slate-600">
          {pct}
        </span>
      ) : null}
    </div>
  );
}

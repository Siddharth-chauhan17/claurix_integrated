import type { ComparisonStatus } from "./types";

export const STATUS_LABELS: Record<ComparisonStatus, string> = {
  agreed: "Agreed",
  partially_agreed: "Partially Agreed",
  not_agreed: "Not Agreed",
  not_applicable: "N/A",
  pending_review: "Pending",
};

export const STATUS_STYLES: Record<
  ComparisonStatus,
  { badge: string; dot: string; row: string }
> = {
  agreed: {
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    row: "border-l-emerald-500",
  },
  partially_agreed: {
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    row: "border-l-amber-500",
  },
  not_agreed: {
    badge: "bg-red-50 text-red-800 ring-red-200",
    dot: "bg-red-500",
    row: "border-l-red-500",
  },
  not_applicable: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
    row: "border-l-slate-300",
  },
  pending_review: {
    badge: "bg-violet-50 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
    row: "border-l-violet-400",
  },
};

export function gapScoreColor(score: number): string {
  if (score <= 10) return "bg-emerald-500";
  if (score <= 25) return "bg-amber-500";
  if (score <= 40) return "bg-orange-500";
  return "bg-red-500";
}

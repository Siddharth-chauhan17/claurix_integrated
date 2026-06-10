"use client";

import { cn } from "@/lib/utils";

const CHEVRON_LEFT = "M15 19l-7-7 7-7";
const CHEVRON_RIGHT = "M9 5l7 7-7 7";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      className="h-6 w-6 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? CHEVRON_LEFT : CHEVRON_RIGHT}
      />
    </svg>
  );
}

/** Chevron points the way the panel will move when clicked. */
function chevronDirection(side: "left" | "right", collapsed: boolean): "left" | "right" {
  if (side === "left") {
    return collapsed ? "right" : "left";
  }
  return collapsed ? "left" : "right";
}

type PanelToggleButtonProps = {
  collapsed: boolean;
  onClick: () => void;
  variant: "dark" | "light";
  side: "left" | "right";
  expandAriaLabel: string;
  collapseAriaLabel: string;
};

export function PanelToggleButton({
  collapsed,
  onClick,
  variant,
  side,
  expandAriaLabel,
  collapseAriaLabel,
}: PanelToggleButtonProps) {
  const isDark = variant === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? expandAriaLabel : collapseAriaLabel}
      title={collapsed ? expandAriaLabel : collapseAriaLabel}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border-2 shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        collapsed ? "h-11 w-full" : "h-11 w-11",
        isDark
          ? "border-slate-400 bg-slate-600 text-white hover:border-slate-300 hover:bg-slate-500 focus-visible:outline-slate-300"
          : "border-slate-400 bg-white text-slate-800 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-900 focus-visible:outline-primary-400"
      )}
    >
      <ChevronIcon direction={chevronDirection(side, collapsed)} />
    </button>
  );
}

type HeroBadgeProps = {
  children: React.ReactNode;
};

export function HeroBadge({ children }: HeroBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-800 ring-1 ring-primary-100">
      <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-primary-700" />
      {children}
    </span>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.2 4.2L17.5 7.5 13.2 8.7 12 13l-1.2-4.3L6.5 7.5l4.3-1.3L12 2zm7 9l.9 3.1L23 15l-3.1.9L19 19l-.9-3.1L15 15l3.1-.9L19 11zm-14 0l.9 3.1L9 15l-3.1.9L5 19l-.9-3.1L1 15l3.1-.9L5 11z" />
    </svg>
  );
}

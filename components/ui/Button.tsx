import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 border-b-2 border-primary-700 border-t border-primary-400/30 shadow-md hover:shadow-lg active:translate-y-0.5 active:border-b active:shadow-sm transition-all",
  secondary:
    "bg-white text-slate-700 border border-slate-300 border-b-2 border-b-slate-400 hover:bg-slate-50 hover:border-slate-400 shadow-sm hover:shadow active:translate-y-0.5 active:border-b active:shadow-none transition-all",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
};

export function Button({
  children,
  href,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const styles = `${base} ${variantStyles[variant]} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={styles} disabled={disabled}>
      {children}
    </button>
  );
}

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className = "" }: AuthCardProps) {
  return (
    <div
      className={`w-full max-w-md rounded-xl bg-white p-8 shadow-lg ring-1 ring-slate-200/50 sm:p-10 ${className}`}
    >
      {children}
    </div>
  );
}

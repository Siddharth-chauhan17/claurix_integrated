import Link from "next/link";
import { ShieldIcon } from "./icons";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const year = new Date().getFullYear();

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-sky-50/80 via-white to-slate-50/50">
      {/* Subtle background decoration */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-primary-100/30 blur-3xl" />
        <div className="absolute -right-20 top-1/2 h-96 w-96 rounded-full bg-sky-100/40 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 sm:mb-10"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 text-white shadow-md">
            <ShieldIcon className="h-6 w-6" />
          </span>
          <span className="text-xl font-semibold text-slate-800">claurix</span>
        </Link>
        {children}
      </div>

      <footer className="relative border-t border-slate-200/60 bg-white/50 py-6 text-center">
        <p className="text-sm text-slate-500">© {year} claurix</p>
        <p className="mt-2 text-xs text-slate-400">
          By logging in, you agree to our{" "}
          <Link href="/terms" className="text-primary-600 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/components/providers/AuthProvider";
import { logout as apiLogout } from "@/lib/api";

const navItems = [
  { label: "Dashboard", href: "/dashboard", active: false },
  { label: "Analyze", href: "/analyze", active: true },
  { label: "History", href: "#", active: false, hasChevron: true },
];

export function AnalyzeNavbar({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleLogout() {
    setDropdownOpen(false);
    await apiLogout();
    setUser(null);
    router.push("/");
    toast.success("Logged out successfully 👋");
  }

  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-emerald-700 lg:hidden"
          aria-label="Open history"
          onClick={onMenuClick}
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-800/20">
            <ShieldCheckIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-800">
            PolicyAI
          </span>
        </Link>
      </div>

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex">
        {navItems.map((item) => (
          <div key={item.label} className="relative flex flex-col items-center">
            <Link
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                item.active
                  ? "text-emerald-800"
                  : "text-slate-500 hover:text-slate-700"
              } ${item.hasChevron ? "inline-flex items-center gap-1" : ""}`}
              onClick={(e) => item.hasChevron && e.preventDefault()}
            >
              {item.label}
              {item.hasChevron && (
                <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
              )}
            </Link>
            {item.active && (
              <span
                className="absolute -bottom-2 h-1 w-full rounded-full bg-emerald-800"
                aria-hidden
              />
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/55 px-3 py-2 text-sm font-medium text-emerald-800 shadow-sm ring-1 ring-emerald-200/40 backdrop-blur-sm transition hover:bg-white/85 hover:ring-emerald-300/50 sm:px-4"
        >
          <HomeIcon className="h-4 w-4 shrink-0 text-emerald-700" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {!loading && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-slate-300"
              aria-label="Profile menu"
            >
              <UserIcon className="h-5 w-5" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                {user ? (
                  <>
                    <div className="border-b border-slate-100 px-4 py-2">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs text-slate-500">You&apos;re not signed in</p>
                    <Link
                      href="/login"
                      className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Sign in
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

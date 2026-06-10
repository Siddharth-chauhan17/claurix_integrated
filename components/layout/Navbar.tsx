"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { companyNameFromEmail } from "@/lib/company";

const navLinks = [
  { label: "Platform", href: "/#how-it-works" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Resources", href: "/#how-it-works" },
  { label: "Pricing", href: "/signup" },
  { label: "Company", href: "/" },
];

export function Navbar() {
  const { user, signOut } = useAuth();
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
    toast.success("Logged out successfully");
    await signOut();
  }

  const companyLabel =
    user?.email ? companyNameFromEmail(user.email) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f7f8f9]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <HexLogo className="h-9 w-9 text-primary-600" />
          <span className="text-[1.35rem] font-bold tracking-tight text-slate-900">
            claurix
          </span>
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-[0.9375rem] font-medium text-slate-600 transition hover:text-slate-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-3 rounded-lg py-1 pl-1 pr-2 transition hover:bg-white/60 sm:pr-3"
                aria-label="Profile menu"
                aria-expanded={dropdownOpen}
              >
                <span className="relative shrink-0">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {getInitials(user.name)}
                  </span>
                  <span
                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#f7f8f9] bg-violet-600"
                    aria-hidden
                  />
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {user.name}
                  </span>
                  {companyLabel ? (
                    <span className="block truncate text-xs text-slate-500">
                      {companyLabel}
                    </span>
                  ) : null}
                </span>
                <ChevronDownIcon
                  className={`hidden h-4 w-4 shrink-0 text-slate-400 transition sm:block ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3 sm:hidden">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.name}
                    </p>
                    {companyLabel ? (
                      <p className="truncate text-xs text-slate-500">{companyLabel}</p>
                    ) : null}
                  </div>
                  <Link
                    href="/workspace"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Workspace
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  href="/login"
                  variant="outline"
                  className="h-9 min-w-[5rem] px-4 text-sm font-semibold"
                >
                  Log in
                </Button>
                <Button
                  href="/signup"
                  variant="outline"
                  className="h-9 min-w-[5rem] px-4 text-sm font-semibold"
                >
                  Sign Up
                </Button>
                <Button
                  href="/request-demo"
                  variant="primaryFlat"
                  className="h-9 min-w-[7rem] px-4 text-sm font-semibold"
                >
                  Request Demo
                </Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "U").toUpperCase();
}

function HexLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <path d="M16 2l12 7v14l-12 7L4 23V9L16 2zm0 3.5L7.5 10.5v11L16 26.5l8.5-5V10.5L16 5.5z" />
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

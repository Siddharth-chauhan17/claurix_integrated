"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/components/providers/AuthProvider";
import { companyNameFromEmail } from "@/lib/company";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "./icons";

interface WorkspaceTopBarProps {
  title?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewClient: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "U").toUpperCase();
}

export function WorkspaceTopBar({
  title,
  searchQuery,
  onSearchChange,
  onNewClient,
}: WorkspaceTopBarProps) {
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

  const companyLabel = user?.email ? companyNameFromEmail(user.email) : null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/"
          className="shrink-0 text-sm font-medium text-slate-500 transition hover:text-primary-600"
        >
          ← Home
        </Link>
        {title ? (
          <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="relative max-w-sm flex-1 min-w-[8rem]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search clients..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            aria-label="Search clients"
          />
        </div>

        <button
          type="button"
          onClick={onNewClient}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">New Client</span>
        </button>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-50"
              aria-label="Profile menu"
              aria-expanded={dropdownOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                {getInitials(user.name)}
              </span>
              <ChevronDownIcon
                className={`hidden h-4 w-4 text-slate-400 transition sm:block ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                  {companyLabel ? (
                    <p className="truncate text-xs text-slate-500">{companyLabel}</p>
                  ) : null}
                </div>
                <Link
                  href="/"
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setDropdownOpen(false)}
                >
                  Back to home
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
        ) : null}
      </div>
    </header>
  );
}

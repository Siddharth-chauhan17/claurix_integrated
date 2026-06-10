"use client";

import Link from "next/link";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";

interface ClientAppShellProps {
  children: React.ReactNode;
}

/** Workspace chrome: claurix sidebar + narrow content column (matches /workspace). */
export function ClientAppShell({ children }: ClientAppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8f9]">
      <WorkspaceSidebar activeSection="projects" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6">
          <Link
            href="/workspace"
            className="text-sm font-medium text-slate-500 transition hover:text-primary-600"
          >
            ← Workspace
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

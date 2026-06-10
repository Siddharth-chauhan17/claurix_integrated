"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  ComparisonsIcon,
  DocumentsIcon,
  ExportsIcon,
  HexLogo,
  ProjectsIcon,
  SettingsIcon,
} from "./icons";

export type WorkspaceSection =
  | "projects"
  | "documents"
  | "comparisons"
  | "exports"
  | "activity"
  | "settings";

const navItems: {
  id: WorkspaceSection;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "projects", label: "Workspace", href: "/workspace", icon: ProjectsIcon },
  { id: "documents", label: "Documents", href: "/workspace", icon: DocumentsIcon },
  { id: "comparisons", label: "Comparisons", href: "/workspace", icon: ComparisonsIcon },
  { id: "exports", label: "Exports", href: "/workspace", icon: ExportsIcon },
  { id: "activity", label: "Activity", href: "/workspace", icon: ActivityIcon },
  { id: "settings", label: "Settings", href: "/workspace", icon: SettingsIcon },
];

interface WorkspaceSidebarProps {
  activeSection?: WorkspaceSection;
}

export function WorkspaceSidebar({ activeSection }: WorkspaceSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <HexLogo className="h-7 w-7 text-primary-600" />
          <span className="text-sm font-bold tracking-tight text-slate-900">claurix</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ id, label, href, icon: Icon }) => {
            const isActive =
              activeSection != null
                ? id === activeSection
                : id === "projects"
                  ? pathname === "/workspace" || pathname.startsWith("/clients")
                  : false;
            return (
              <li key={id}>
                <Link
                  href={href}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary-50 text-primary-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
                      isActive ? "text-primary-600" : "text-slate-400"
                    }`}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-5 py-4">
        <p className="text-xs font-medium text-slate-500">QCR Workspace</p>
        <p className="mt-0.5 text-xs text-slate-400">Enterprise edition</p>
      </div>
    </aside>
  );
}

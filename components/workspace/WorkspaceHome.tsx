"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  listClients,
  listProjects,
  touchClient,
  touchProject,
  type Client,
  type Project,
} from "@/lib/api";
import { projectWorkstationPath } from "@/lib/projectWorkstation";
import { markWorkspaceNeedsRefresh } from "@/lib/workspaceRefresh";
import { FolderIcon, PlusIcon, ProjectsIcon } from "./icons";
import { NewClientModal } from "./NewClientModal";

const RECENT_CLIENT_LIMIT = 5;
const RECENT_PROJECT_LIMIT = 10;

function sortByLastWorked<T extends { last_worked_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.last_worked_at).getTime() - new Date(a.last_worked_at).getTime()
  );
}

interface WorkspaceHomeProps {
  searchQuery: string;
  onNewClient: () => void;
  modalOpen: boolean;
  onModalClose: () => void;
  refreshKey: number;
}

export function WorkspaceHome({
  searchQuery,
  onNewClient,
  modalOpen,
  onModalClose,
  refreshKey,
}: WorkspaceHomeProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    const isSearch = debouncedSearch.trim().length > 0;
    try {
      if (isSearch) {
        const res = await listClients(debouncedSearch);
        setClients(sortByLastWorked(res.items));
        setProjects([]);
      } else {
        const [clientRes, projectRes] = await Promise.all([
          listClients(undefined, RECENT_CLIENT_LIMIT),
          listProjects({ limit: RECENT_PROJECT_LIMIT }),
        ]);
        setClients(sortByLastWorked(clientRes.items));
        setProjects(
          sortByLastWorked(
            projectRes.items.filter((p) => p.status === "active")
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace");
      setClients([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace, refreshKey]);

  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <section>
          {showSearchResults ? (
            <>
              <SectionHeader
                title="Search Results"
                subtitle={`Matching "${searchQuery.trim()}"`}
              />
              {error ? <ErrorBanner message={error} /> : null}
              {loading ? (
                <p className="mt-6 text-sm text-slate-500">Loading clients...</p>
              ) : (
                <div className="mt-6">
                  {clients.length === 0 ? (
                    <PanelEmptyState
                      title="No clients found"
                      description="Try a different search term or create a new client."
                      icon={<FolderIcon className="h-5 w-5" />}
                    />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {clients.map((client) => (
                        <ClientCard key={client.id} client={client} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <SectionHeader
                title="Recent Clients"
                subtitle="Most recently worked on first"
              />
              {error ? <ErrorBanner message={error} /> : null}
              {loading ? (
                <p className="mt-6 text-sm text-slate-500">Loading clients...</p>
              ) : (
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-stretch">
                  <CreateClientCard onClick={onNewClient} />
                  <RecentClientsPanel clients={clients} />
                </div>
              )}

              <section className="mt-10">
                <SectionHeader
                  title="Recent Projects"
                  subtitle="Most recently worked on first"
                />
                <div className="mt-6">
                  <RecentProjectsPanel projects={projects.slice(0, RECENT_PROJECT_LIMIT)} />
                </div>
              </section>
            </>
          )}
        </section>
      </div>

      <NewClientModal
        open={modalOpen}
        onClose={onModalClose}
        onCreated={loadWorkspace}
      />
    </>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
  );
}

function CreateClientCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-center transition hover:border-primary-300 hover:bg-primary-50/30 sm:w-[11.5rem]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
        <PlusIcon className="h-5 w-5" />
      </span>
      <span className="mt-3 text-sm font-semibold text-slate-900">New Client</span>
      <span className="mt-1 max-w-[14rem] text-xs text-slate-500">
        Add a client for quote comparison and QCR work
      </span>
    </button>
  );
}

function RecentClientsPanel({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <PanelEmptyState
        title="No recent clients"
        description="Create a client to see them here."
        icon={<FolderIcon className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="flex min-h-[9.5rem] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex w-full gap-4 overflow-x-auto">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} compact />
        ))}
      </div>
    </div>
  );
}

function RecentProjectsPanel({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <PanelEmptyState
        title="No recent projects"
        description="Projects will appear here once you start QCR work under a client."
        icon={<ProjectsIcon className="h-5 w-5" />}
        fullWidth
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <ul className="divide-y divide-slate-100">
        {projects.map((project) => (
          <li key={project.id}>
            <RecentProjectLink project={project} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentProjectLink({ project }: { project: Project }) {
  const router = useRouter();

  async function handleOpen(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    try {
      await touchProject(project.id);
      markWorkspaceNeedsRefresh();
    } catch {
      /* navigate even if touch fails */
    }
    router.push(projectWorkstationPath(project.id));
  }

  return (
    <Link
      href={projectWorkstationPath(project.id)}
      prefetch={false}
      onClick={handleOpen}
      className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-slate-50 sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <ProjectsIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
          <p className="truncate text-xs text-slate-500">{project.client_name}</p>
        </div>
      </div>
      <p className="shrink-0 text-right text-xs text-slate-500">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Last worked
        </span>
        <span className="mt-0.5 block font-medium text-slate-700">
          {formatDate(project.last_worked_at)}
        </span>
      </p>
    </Link>
  );
}

function ClientCard({ client, compact }: { client: Client; compact?: boolean }) {
  const router = useRouter();
  const className = compact
    ? "flex w-[11.5rem] shrink-0 flex-col rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition hover:border-primary-200 hover:bg-white hover:shadow-sm"
    : "flex min-h-[9.5rem] flex-col rounded-xl border border-slate-200 bg-white p-6 transition hover:border-primary-200 hover:shadow-sm";

  async function handleOpen(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    try {
      await touchClient(client.id);
      markWorkspaceNeedsRefresh();
    } catch {
      /* navigate even if touch fails */
    }
    router.push(`/clients/${client.id}`);
  }

  return (
    <Link
      href={`/clients/${client.id}`}
      prefetch={false}
      onClick={handleOpen}
      className={className}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <FolderIcon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{client.name}</h3>
      {client.industry ? (
        <p className="mt-1 text-xs text-slate-500">{client.industry}</p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">No industry set</p>
      )}
      <p className="mt-auto pt-3 text-xs text-slate-400">
        Last worked {formatDate(client.last_worked_at)}
      </p>
    </Link>
  );
}

function PanelEmptyState({
  title,
  description,
  icon,
  fullWidth,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[9.5rem] flex-col justify-center rounded-xl border border-slate-200 bg-white px-6 py-5 ${
        fullWidth ? "w-full" : "min-w-0 flex-1"
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

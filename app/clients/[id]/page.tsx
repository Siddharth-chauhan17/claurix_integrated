"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ClientAppShell } from "@/components/clients/ClientAppShell";
import { NewProjectModal } from "@/components/clients/NewProjectModal";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ProjectsIcon,
  SearchIcon,
} from "@/components/workspace/icons";
import {
  getClient,
  listProjects,
  updateProjectStatus,
  type Client,
  type Project,
  type ProjectStatus,
  type User,
} from "@/lib/api";
import { projectWorkstationPath } from "@/lib/projectWorkstation";

const ACTIVE_PROJECT_PREVIEW_LIMIT = 5;

type ProjectSortOrder = "created_desc" | "created_asc";

function projectStatus(project: Project): ProjectStatus {
  return project.status === "completed" ? "completed" : "active";
}

function isActiveProject(project: Project): boolean {
  return projectStatus(project) === "active";
}

function normalizeProject(project: Project): Project {
  return { ...project, status: projectStatus(project) };
}

function sortProjectsByLastWorked(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) =>
      new Date(b.last_worked_at).getTime() - new Date(a.last_worked_at).getTime()
  );
}

export default function ClientDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = typeof params.id === "string" ? params.id : "";

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusActionError, setStatusActionError] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSort, setProjectSort] = useState<ProjectSortOrder>("created_desc");
  const [modalOpen, setModalOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!clientId) return;
    setProjectsLoading(true);
    try {
      const res = await listProjects({ clientId, limit: 100 });
      setProjects(res.items.map(normalizeProject));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!clientId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    getClient(clientId)
      .then((c) => {
        if (!cancelled) setClient(c);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load client");
          setClient(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, clientId, loadProjects]);

  const handleProjectStatusChange = useCallback(
    async (projectId: string, status: ProjectStatus) => {
      setStatusActionError("");
      try {
        const updated = await updateProjectStatus(projectId, status);
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? normalizeProject(updated) : p))
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update project status";
        setStatusActionError(message);
        throw err;
      }
    },
    []
  );

  const activeProjects = useMemo(
    () => sortProjectsByLastWorked(projects.filter(isActiveProject)),
    [projects]
  );

  const recentActiveProjects = useMemo(
    () => activeProjects.slice(0, ACTIVE_PROJECT_PREVIEW_LIMIT),
    [activeProjects]
  );

  const displayedProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    const filtered = q
      ? projects.filter((p) => p.name.toLowerCase().includes(q))
      : [...projects];

    return filtered.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return projectSort === "created_desc" ? tb - ta : ta - tb;
    });
  }, [projects, projectSearch, projectSort]);

  if (authLoading || (!user && !error)) {
    return (
      <ClientAppShell>
        <p className="text-sm text-slate-500">Loading...</p>
      </ClientAppShell>
    );
  }

  if (!user) return null;

  return (
    <ClientAppShell>
        {loading ? (
          <p className="text-sm text-slate-500">Loading client...</p>
        ) : error && !client ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : client ? (
          <>
            {statusActionError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {statusActionError}
              </div>
            ) : null}

            {/* Client header */}
            <section className="border-b border-slate-200/90 pb-3">
              <div className="flex items-start gap-4">
                <ClientAvatar name={client.name} />
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
                    {client.name}
                  </h1>
                  <p className="shrink-0 text-right text-sm text-slate-500 sm:pb-0.5">
                    Created {formatMonthYear(client.created_at)}
                  </p>
                </div>
              </div>
            </section>

            {/* Active projects + create (workspace-style row) */}
            <OperationalProjectsSection
              totalProjects={projects.length}
              activeCount={activeProjects.length}
              recentProjects={recentActiveProjects}
              loading={projectsLoading}
              onCreateProject={() => setModalOpen(true)}
              onProjectStatusChange={handleProjectStatusChange}
              onStatusError={setStatusActionError}
            />

            {/* Projects */}
            <section className="mt-6 border-t border-slate-200/90 pt-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    All Projects
                  </h2>
                  {!projectsLoading && displayedProjects.length > 0 ? (
                    <span className="text-xs text-slate-400">
                      {displayedProjects.length} shown
                    </span>
                  ) : null}
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:w-[20rem]">
                    <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full rounded-lg border border-slate-200/90 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      aria-label="Search projects"
                    />
                  </div>
                  <div className="self-end sm:self-auto">
                    <ProjectSortDropdown
                      value={projectSort}
                      onChange={setProjectSort}
                    />
                  </div>
                </div>
              </div>

              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[5.5rem] animate-pulse rounded-xl border border-slate-200/80 bg-white"
                    />
                  ))}
                </div>
              ) : displayedProjects.length === 0 ? (
                <EmptyProjects hasSearch={Boolean(projectSearch.trim())} />
              ) : (
                <ul className="space-y-3">
                  {displayedProjects.map((project) => (
                    <li key={project.id}>
                      <ProjectCard
                        project={project}
                        client={client}
                        currentUser={user}
                        onStatusChange={handleProjectStatusChange}
                        onStatusError={setStatusActionError}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}

      {client ? (
        <NewProjectModal
          open={modalOpen}
          clientId={client.id}
          onClose={() => setModalOpen(false)}
          onCreated={loadProjects}
        />
      ) : null}
    </ClientAppShell>
  );
}

const SORT_OPTIONS: { value: ProjectSortOrder; label: string }[] = [
  { value: "created_desc", label: "Latest to oldest" },
  { value: "created_asc", label: "Oldest to latest" },
];

function ProjectSortDropdown({
  value,
  onChange,
}: {
  value: ProjectSortOrder;
  onChange: (order: ProjectSortOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Sort by</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
        aria-label="Sort projects"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <ChevronDownIcon
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Sort by"
          className="absolute right-0 top-full z-20 mt-1.5 min-w-[11.5rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {SORT_OPTIONS.map((opt) => (
            <li key={opt.value} role="option" aria-selected={value === opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  value === opt.value
                    ? "font-medium text-primary-700 bg-primary-50/50"
                    : "text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OperationalProjectsSection({
  totalProjects,
  activeCount,
  recentProjects,
  loading,
  onCreateProject,
  onProjectStatusChange,
  onStatusError,
}: {
  totalProjects: number;
  activeCount: number;
  recentProjects: Project[];
  loading: boolean;
  onCreateProject: () => void;
  onProjectStatusChange: (projectId: string, status: ProjectStatus) => Promise<void>;
  onStatusError: (message: string) => void;
}) {
  return (
    <section className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Projects" value={loading ? "—" : totalProjects} />
        <MetricCard label="Active Projects" value={loading ? "—" : activeCount} />
      </div>

      {loading ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <div className="h-[9.5rem] w-full shrink-0 animate-pulse rounded-xl border border-slate-200 bg-white sm:w-[11.5rem]" />
          <div className="min-h-[9.5rem] flex-1 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <CreateProjectCard onClick={onCreateProject} />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-3 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">Recent Projects</h2>
              <p className="mt-1 text-sm text-slate-500">
                Active projects · most recently worked on first
              </p>
            </div>
            <RecentProjectsPanel
              projects={recentProjects}
              onStatusChange={onProjectStatusChange}
              onStatusError={onStatusError}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex min-h-[5.25rem] flex-col justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-200 bg-white p-6 text-center transition hover:border-primary-400 hover:bg-primary-50/40 sm:w-[11.5rem]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm transition group-hover:bg-primary-700">
        <PlusIcon className="h-5 w-5" />
      </span>
      <span className="mt-3 text-sm font-semibold text-slate-900">Create New Project</span>
      <span className="mt-1 max-w-[14rem] text-xs text-slate-500">
        Start a renewal workflow for this client
      </span>
    </button>
  );
}

function RecentProjectsPanel({
  projects,
  onStatusChange,
  onStatusError,
}: {
  projects: Project[];
  onStatusChange: (projectId: string, status: ProjectStatus) => Promise<void>;
  onStatusError: (message: string) => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="flex min-h-[9.5rem] min-w-0 flex-1 flex-col justify-center rounded-xl border border-slate-200 bg-white px-6 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <ProjectsIcon className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-900">No active projects</h3>
        <p className="mt-1 text-xs text-slate-500">
          Open or create a project to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[9.5rem] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex w-full gap-4 overflow-x-auto">
        {projects.map((project) => (
          <RecentProjectCard
            key={project.id}
            project={project}
            onStatusChange={onStatusChange}
            onStatusError={onStatusError}
          />
        ))}
      </div>
    </div>
  );
}

function RecentProjectCard({
  project,
  onStatusChange,
  onStatusError,
}: {
  project: Project;
  onStatusChange: (projectId: string, status: ProjectStatus) => Promise<void>;
  onStatusError: (message: string) => void;
}) {
  const [statusBusy, setStatusBusy] = useState(false);

  const handleMarkCompleted = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      await onStatusChange(project.id, "completed");
    } catch (err) {
      onStatusError?.(
        err instanceof Error ? err.message : "Failed to mark project completed"
      );
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <div className="flex w-[11.5rem] shrink-0 flex-col rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <Link
        href={projectWorkstationPath(project.id)}
        className="flex flex-1 flex-col transition hover:opacity-90"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <ProjectsIcon className="h-5 w-5" />
        </span>
        <h3 className="mt-3 truncate text-sm font-semibold text-slate-900">{project.name}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Last worked {formatShortDate(project.last_worked_at)}
        </p>
        <span className="mt-3 inline-flex w-fit">
          <ProjectStatusBadge status={projectStatus(project)} />
        </span>
      </Link>
      <button
        type="button"
        onClick={handleMarkCompleted}
        disabled={statusBusy}
        className="mt-3 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {statusBusy ? "Saving…" : "Mark completed"}
      </button>
    </div>
  );
}

function ClientAvatar({ name }: { name: string }) {
  const initials = getClientInitials(name);
  return (
    <span
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold tracking-tight text-emerald-700 ring-1 ring-emerald-100/80"
      aria-hidden
    >
      {initials}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
      Active
    </span>
  );
}

function ProjectCard({
  project,
  client,
  currentUser,
  onStatusChange,
  onStatusError,
}: {
  project: Project;
  client: Client;
  currentUser: User;
  onStatusChange: (projectId: string, status: ProjectStatus) => Promise<void>;
  onStatusError: (message: string) => void;
}) {
  const tags = getProjectTags(project, client);
  const subline = getProjectSubline(project, client, currentUser);
  const isCompleted = projectStatus(project) === "completed";
  const [statusBusy, setStatusBusy] = useState(false);

  const handleStatusClick = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      await onStatusChange(
        project.id,
        isCompleted ? "active" : "completed"
      );
    } catch (err) {
      onStatusError(
        err instanceof Error ? err.message : "Failed to update project status"
      );
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <div
      className={`group flex w-full items-stretch overflow-hidden rounded-xl border bg-white shadow-sm transition duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-primary-500/30 ${
        isCompleted
          ? "border-slate-200/80 opacity-95"
          : "border-slate-200/90 hover:border-slate-300"
      }`}
    >
      <Link
        href={projectWorkstationPath(project.id)}
        className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition group-hover:bg-primary-50 group-hover:text-primary-600 ${
            isCompleted ? "bg-slate-100 text-slate-500" : "bg-slate-100 text-slate-600"
          }`}
        >
          <ProjectsIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`truncate text-base font-semibold sm:text-[1.05rem] ${
                isCompleted
                  ? "text-slate-700 group-hover:text-slate-800"
                  : "text-slate-900 group-hover:text-primary-700"
              }`}
            >
              {project.name}
            </p>
            <ProjectStatusBadge status={projectStatus(project)} />
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{subline}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-6 sm:flex">
          <MetaColumn label="Created" value={formatShortDate(project.created_at)} />
          <MetaColumn label="Last worked" value={formatShortDate(project.last_worked_at)} />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 sm:hidden">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Last worked
          </span>
          <span className="text-xs font-medium text-slate-700">
            {formatShortDate(project.last_worked_at)}
          </span>
        </div>

        <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </Link>

      <div className="flex shrink-0 flex-col justify-center border-l border-slate-100 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={handleStatusClick}
          disabled={statusBusy}
          className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {statusBusy
            ? "Saving…"
            : isCompleted
              ? "Mark active"
              : "Mark completed"}
        </button>
      </div>
    </div>
  );
}

function MetaColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[5.5rem] text-right">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-700">{value}</p>
    </div>
  );
}

function EmptyProjects({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <ProjectsIcon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-base font-semibold text-slate-900">
        {hasSearch ? "No matching projects" : "No projects yet"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        {hasSearch
          ? "Try a different search term."
          : "Create your first project to begin working with this client."}
      </p>
      {!hasSearch ? (
        <p className="mt-4 text-xs text-slate-400">
          Use <span className="font-medium text-slate-500">Create New Project</span> above to
          get started.
        </p>
      ) : null}
    </div>
  );
}

function getClientInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function getProjectSubline(project: Project, client: Client, user: User): string {
  const parts: string[] = [];
  if (client.industry) parts.push(client.industry);
  if (project.location) parts.push(project.location);
  parts.push("Renewal workspace");
  const context = parts.filter(Boolean).slice(0, 2).join(" · ");
  const by = user.name?.trim() || "You";
  return context ? `${context} · Created by ${by}` : `Created by ${by}`;
}

function getProjectTags(project: Project, client: Client): string[] {
  const tags = new Set<string>();
  const haystack = `${project.name} ${client.industry ?? ""} ${project.location ?? ""}`.toLowerCase();

  const keywords: Record<string, string> = {
    marine: "Marine",
    property: "Property",
    casualty: "Casualty",
    eb: "EB",
    employee: "EB",
    benefits: "EB",
    commercial: "Commercial",
    renewal: "Renewal",
  };

  for (const [key, label] of Object.entries(keywords)) {
    if (haystack.includes(key)) tags.add(label);
  }

  if (client.industry) {
    const word = client.industry.split(/\s+/)[0];
    if (word && word.length > 2) tags.add(word);
  }

  if (tags.size === 0) tags.add("QCR");
  return Array.from(tags).slice(0, 4);
}

function formatMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
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

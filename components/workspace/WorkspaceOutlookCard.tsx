"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import {
  disconnectOutlook,
  getOutlookConnectUrl,
  getOutlookStatus,
  type OutlookStatusResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

function OutlookConnectedDot() {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_0_0_2px_rgba(16,185,129,0.25)]"
      aria-hidden
    />
  );
}

function CollapseChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={cn(
        "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300",
        expanded ? "rotate-0" : "rotate-180"
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Unknown";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOutlookConnected(status: OutlookStatusResponse): boolean {
  return status.connected && status.is_active && status.status === "ok";
}

export function WorkspaceOutlookCard() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [status, setStatus] = useState<OutlookStatusResponse | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoadState("loading");
    try {
      const next = await getOutlookStatus();
      setStatus(next);
      setLoadState("ready");
    } catch {
      setStatus(null);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const onConnectionChanged = () => void loadStatus();
    window.addEventListener("outlook-connection-changed", onConnectionChanged);
    return () =>
      window.removeEventListener("outlook-connection-changed", onConnectionChanged);
  }, [loadStatus]);

  function handleConnect() {
    window.location.href = getOutlookConnectUrl();
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectOutlook();
      toast.success("Outlook disconnected");
      await loadStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disconnect Outlook"
      );
    } finally {
      setDisconnecting(false);
    }
  }

  if (loadState === "loading") {
    return <OutlookCardSkeleton />;
  }

  if (loadState === "error") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Outlook Integration</h2>
        <p className="mt-2 text-sm text-slate-500">Unable to load status.</p>
        <button
          type="button"
          onClick={() => void loadStatus()}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status && isOutlookConnected(status)) {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white transition-[padding] duration-300",
          expanded ? "p-6" : "px-4 py-3"
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse Outlook details" : "Expand Outlook details"}
          className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-900">
            <OutlookConnectedDot />
            Outlook Connected
          </h2>
          <CollapseChevron expanded={expanded} />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{status.email}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Last sync:{" "}
                  <span className="font-medium text-slate-600">
                    {formatRelativeTime(status.last_sync_at)}
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="danger3d"
                disabled={disconnecting}
                className="shrink-0 px-4 py-2"
                onClick={() => void handleDisconnect()}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Outlook Integration</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
            Import RFQs and insurer quotes directly from Outlook.
          </p>
          {status?.status === "reconnect_required" && status.email ? (
            <p className="mt-2 text-sm text-amber-700">
              Session expired for {status.email}. Connect again to continue.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleConnect}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Connect Outlook
        </button>
      </div>
    </div>
  );
}

function OutlookCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-slate-200 bg-white p-6"
      aria-hidden
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
          <div className="h-4 w-32 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-36 shrink-0 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

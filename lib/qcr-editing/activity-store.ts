/**
 * Project-scoped immutable activity event store.
 * Events are prepended (newest first). Does not trigger QCR workspace re-renders.
 */

import { create } from "zustand";
import type { ActivityEvent } from "./activity-types";

function activitySessionKey(projectId: string): string {
  return `claurix:qcr-activity:${projectId}`;
}

type ActivityStoreState = {
  /** Newest-first immutable lists per project */
  eventsByProject: Readonly<Record<string, readonly ActivityEvent[]>>;
  currentUserId: string | null;

  setCurrentUserId: (userId: string | null) => void;
  initProject: (projectId: string) => void;
  appendEvent: (event: ActivityEvent) => void;
  getProjectEvents: (projectId: string) => readonly ActivityEvent[];
  reset: () => void;
};

function loadPersistedEvents(projectId: string): ActivityEvent[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(activitySessionKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivityEvent[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isMockActivityEvent(event: ActivityEvent): boolean {
  return event.id.startsWith("evt_mock_");
}

function filterRealEvents(events: readonly ActivityEvent[]): ActivityEvent[] {
  return events.filter((event) => !isMockActivityEvent(event));
}

function persistEvents(projectId: string, events: readonly ActivityEvent[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(activitySessionKey(projectId), JSON.stringify(events));
}

export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  eventsByProject: {},
  currentUserId: null,

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  initProject: (projectId) => {
    const existing = get().eventsByProject[projectId];
    if (existing && existing.length > 0) {
      const realOnly = filterRealEvents(existing);
      if (realOnly.length !== existing.length) {
        persistEvents(projectId, realOnly);
        set((s) => ({
          eventsByProject: {
            ...s.eventsByProject,
            [projectId]: Object.freeze([...realOnly]) as readonly ActivityEvent[],
          },
        }));
      }
      return;
    }

    const persisted = loadPersistedEvents(projectId);
    const initial = filterRealEvents(persisted ?? []);

    if (persisted?.some(isMockActivityEvent)) {
      persistEvents(projectId, initial);
    }

    if (initial.length === 0) return;

    set((s) => ({
      eventsByProject: {
        ...s.eventsByProject,
        [projectId]: Object.freeze([...initial]) as readonly ActivityEvent[],
      },
    }));
  },

  appendEvent: (event) => {
    set((s) => {
      const current = s.eventsByProject[event.project_id] ?? [];
      const next = Object.freeze([event, ...current]) as readonly ActivityEvent[];
      persistEvents(event.project_id, next);
      return {
        eventsByProject: {
          ...s.eventsByProject,
          [event.project_id]: next,
        },
      };
    });
  },

  getProjectEvents: (projectId) => get().eventsByProject[projectId] ?? [],

  reset: () => set({ eventsByProject: {}, currentUserId: null }),
}));

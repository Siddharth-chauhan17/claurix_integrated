"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { lookupClauseSourceValue } from "./excel-source-lookup";
import type { ClauseSource } from "./types";

type UseClauseSourceValueResult = {
  value: string | null;
  loading: boolean;
  resolved: boolean;
};

/**
 * Lazy-loads the original RFQ Excel clause cell value when Source popover opens.
 * Always resolves against the project's RFQ workbook (never quote files).
 */
export function useClauseSourceValue(
  source: ClauseSource | undefined,
  projectId: string | null | undefined,
  enabled: boolean
): UseClauseSourceValueResult {
  const rfqFileBlob = useProjectWorkspaceStore((s) => s.rfqFileBlob);
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const storeProjectId = useProjectWorkspaceStore((s) => s.projectId);
  const hydrated = useProjectWorkspaceStore((s) => s.hydrated);
  const hydrate = useProjectWorkspaceStore((s) => s.hydrate);
  const restoreRfqFileBlob = useProjectWorkspaceStore((s) => s.restoreRfqFileBlob);

  const effectiveProjectId = projectId ?? storeProjectId;

  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!effectiveProjectId) return;
    if (!hydrated) {
      hydrate(effectiveProjectId);
      return;
    }
    void restoreRfqFileBlob(effectiveProjectId);
  }, [effectiveProjectId, hydrated, hydrate, restoreRfqFileBlob]);

  const load = useCallback(async () => {
    if (!source || !effectiveProjectId) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);

    await restoreRfqFileBlob(effectiveProjectId);

    const { rfqFileBlob: blob, rfqWorkbook: workbook } =
      useProjectWorkspaceStore.getState();

    try {
      const text = await lookupClauseSourceValue({
        projectId: effectiveProjectId,
        source,
        rfqFileBlob: blob,
        rfqWorkbook: workbook,
      });
      if (requestIdRef.current === requestId) {
        setValue(text);
        setResolved(true);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [source, effectiveProjectId, restoreRfqFileBlob]);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setResolved(false);
      setValue(null);
      setLoading(false);
      return;
    }
    if (source && effectiveProjectId) {
      void load();
    }
  }, [
    enabled,
    source,
    effectiveProjectId,
    load,
    // Re-run when hydrate/IDB restore populates the RFQ workbook/blob.
    rfqFileBlob,
    rfqWorkbook,
  ]);

  return { value, loading, resolved };
};

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { RendererMode } from "@/stores/workspace-store";
import { rendererRegistry } from "./RendererRegistry";
import type { WorkspaceRendererComponent } from "./types";

type RendererContextValue = {
  mode: RendererMode;
  Renderer: WorkspaceRendererComponent | null;
};

const RendererContext = createContext<RendererContextValue | null>(null);

export function RendererProvider({
  mode,
  children,
}: {
  mode: RendererMode;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      mode,
      Renderer: rendererRegistry.get(mode) ?? null,
    }),
    [mode]
  );

  return (
    <RendererContext.Provider value={value}>{children}</RendererContext.Provider>
  );
}

export function useRendererContext(): RendererContextValue {
  const ctx = useContext(RendererContext);
  if (!ctx) {
    throw new Error("useRendererContext must be used within RendererProvider");
  }
  return ctx;
}

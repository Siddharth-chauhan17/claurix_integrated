import type { RendererMode } from "@/stores/workspace-store";
import type { WorkspaceRendererComponent } from "./types";

/**
 * Pluggable renderer registry — register table, cards, negotiation, etc.
 * without touching WorkspaceResponse or backend contracts.
 */
class RendererRegistryImpl {
  private readonly map = new Map<RendererMode, WorkspaceRendererComponent>();

  register(mode: RendererMode, renderer: WorkspaceRendererComponent): void {
    this.map.set(mode, renderer);
  }

  get(mode: RendererMode): WorkspaceRendererComponent | undefined {
    return this.map.get(mode);
  }

  has(mode: RendererMode): boolean {
    return this.map.has(mode);
  }
}

export const rendererRegistry = new RendererRegistryImpl();

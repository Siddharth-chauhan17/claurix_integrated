import { rendererRegistry } from "./RendererRegistry";
import { TableRenderer } from "./TableRenderer";
import { SectionCardsRenderer } from "./SectionCardsRenderer";

let registered = false;

/** Register built-in renderers once at app bootstrap. */
export function registerWorkspaceRenderers(): void {
  if (registered) return;
  rendererRegistry.register("table", TableRenderer);
  rendererRegistry.register("section-cards", SectionCardsRenderer);
  registered = true;
}

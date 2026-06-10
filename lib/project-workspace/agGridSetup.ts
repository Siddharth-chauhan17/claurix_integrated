import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

let registered = false;

export function ensureAgGridModules(): void {
  if (registered) return;
  ModuleRegistry.registerModules([AllCommunityModule]);
  registered = true;
}

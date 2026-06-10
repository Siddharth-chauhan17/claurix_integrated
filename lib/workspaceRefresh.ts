/** Set when user opens a project; workspace reads on return to refetch recents. */
export const WORKSPACE_REFRESH_FLAG = "claurix-refresh-workspace";

export function markWorkspaceNeedsRefresh(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(WORKSPACE_REFRESH_FLAG, "1");
  }
}

/** App entry: opens the user’s most recent project workstation. */

export const WORKSTATION_ENTRY_PATH = "/workstation";



/** URL for the per-project RFQ grid / policy-mapping UI (not the /workspace home). */

export function projectWorkstationPath(projectId: string): string {

  return `/projects/${encodeURIComponent(projectId)}/workstation`;

}



/** URL for the generated QCR comparison workspace (schema-driven renderers). */

export function projectQcrWorkspacePath(projectId: string): string {

  return `/projects/${encodeURIComponent(projectId)}/workspace`;

}


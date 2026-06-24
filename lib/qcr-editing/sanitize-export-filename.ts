const INVALID_CHARS = /[\\/:*?"<>|]/g;

/** Normalize user input into a safe .xlsx filename. */
export function sanitizeExportFileName(raw: string, fallback = "QCR_Export.xlsx"): string {
  let name = raw.trim().replace(INVALID_CHARS, "_");
  if (!name) return fallback;
  if (!/\.xlsx$/i.test(name)) {
    name = `${name.replace(/\.+$/, "")}.xlsx`;
  }
  return name;
}

export function defaultQcrExportFileName(
  projectName?: string | null,
  clientName?: string | null,
  workspaceId?: string
): string {
  const label =
    projectName?.trim() || clientName?.trim() || workspaceId?.trim() || "QCR";
  const safe = label.replace(/[^\w\- ]+/g, "_").trim() || "QCR";
  return `QCR_${safe}.xlsx`;
}

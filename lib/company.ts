/** Client-side fallback when API has not yet returned company_name. */
export function companyNameFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at === -1) return "Unknown";

  const domain = normalized.slice(at + 1);
  const generic = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.in",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "rediffmail.com",
  ]);
  if (generic.has(domain)) return "Personal";

  const label = domain.split(".")[0] ?? domain;
  return label
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

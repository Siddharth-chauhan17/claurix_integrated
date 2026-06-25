export type PolicyLineOption = {
  id: string;
  label: string;
  color: string;
};

export const POLICY_LINE_OPTIONS: PolicyLineOption[] = [
  { id: "marine", label: "Marine", color: "#0284c7" },
  { id: "property", label: "Property", color: "#7c3aed" },
  { id: "employee-benefits", label: "Employee Benefits", color: "#059669" },
  { id: "liability", label: "Liability", color: "#d97706" },
  { id: "transit", label: "Transit", color: "#db2777" },
  { id: "fire", label: "Fire", color: "#dc2626" },
  {
    id: "electronic-equipment-insurance",
    label: "Electronic Equipment Insurance",
    color: "#0d9488",
  },
  { id: "miscellaneous", label: "Miscellaneous", color: "#64748b" },
  { id: "custom", label: "Custom", color: "#475569" },
];

export const CUSTOM_POLICY_LINE_COLOR =
  POLICY_LINE_OPTIONS.find((p) => p.id === "custom")?.color ?? "#475569";

export function isPredefinedPolicyLine(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return POLICY_LINE_OPTIONS.some(
    (p) => p.id !== "custom" && p.label.toLowerCase() === normalized
  );
}

export function policyLineByLabel(label: string): PolicyLineOption | undefined {
  return POLICY_LINE_OPTIONS.find(
    (p) => p.label.toLowerCase() === label.toLowerCase()
  );
}

export function policyLineColor(label: string): string {
  const predefined = policyLineByLabel(label);
  if (predefined && predefined.id !== "custom") {
    return predefined.color;
  }
  return CUSTOM_POLICY_LINE_COLOR;
}

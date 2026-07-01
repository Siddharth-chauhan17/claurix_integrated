export function toTimestamp(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export function formatDateGroupLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

export function groupItemsByDate<T>(
  items: T[],
  getDate: (item: T) => string
): { dateLabel: string; items: T[] }[] {
  const sorted = [...items].sort(
    (a, b) => toTimestamp(getDate(b)) - toTimestamp(getDate(a))
  );

  const groups = new Map<string, T[]>();
  for (const item of sorted) {
    const label = formatDateGroupLabel(getDate(item));
    const list = groups.get(label) ?? [];
    list.push(item);
    groups.set(label, list);
  }

  return Array.from(groups.entries()).map(([dateLabel, groupItems]) => ({
    dateLabel,
    items: groupItems,
  }));
}

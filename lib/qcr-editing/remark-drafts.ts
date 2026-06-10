/** Persisted insurer remark drafts (not committed until explicit Save). */

export type InsurerRemarkDraft = {
  clause_id: string;
  rfq_clause: string;
  insurer: string;
  draft: string;
  /** Last saved proposal_clause when draft started or last commit */
  baseline: string;
  updated_at: string;
};

export function remarkDraftKey(clauseId: string, insurer: string): string {
  return `${clauseId}::${insurer}`;
}

export function upsertRemarkDraftInList(
  drafts: InsurerRemarkDraft[],
  entry: Omit<InsurerRemarkDraft, "updated_at"> & { updated_at?: string }
): InsurerRemarkDraft[] {
  const key = remarkDraftKey(entry.clause_id, entry.insurer);
  const next: InsurerRemarkDraft = {
    ...entry,
    updated_at: entry.updated_at ?? new Date().toISOString(),
  };
  const idx = drafts.findIndex(
    (d) => remarkDraftKey(d.clause_id, d.insurer) === key
  );
  if (idx === -1) return [...drafts, next];
  const copy = [...drafts];
  copy[idx] = next;
  return copy;
}

export function removeRemarkDraftFromList(
  drafts: InsurerRemarkDraft[],
  clauseId: string,
  insurer: string
): InsurerRemarkDraft[] {
  const key = remarkDraftKey(clauseId, insurer);
  return drafts.filter((d) => remarkDraftKey(d.clause_id, d.insurer) !== key);
}

export function findRemarkDraft(
  drafts: InsurerRemarkDraft[],
  clauseId: string,
  insurer: string
): InsurerRemarkDraft | undefined {
  const key = remarkDraftKey(clauseId, insurer);
  return drafts.find((d) => remarkDraftKey(d.clause_id, d.insurer) === key);
}

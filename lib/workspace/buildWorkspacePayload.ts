/**
 * Builds WorkspacePayload from workstation state (mappings + uploads).
 * Semantic source regions only — not tied to AG Grid row objects.
 */

import { policyLineByLabel } from "@/lib/project-workspace/policyLines";
import {
  WORKSPACE_SCHEMA_VERSION,
  type DocumentDescriptor,
  type SectionSourceMapping,
  type SelectedPolicySection,
  type SourceReference,
  type WorkspaceMetadata,
  type WorkspacePayload,
} from "@/types/workspace";
import type { PolicyMapping, QuoteFileRef, RfqWorkbook } from "@/types/project-workspace";

export const RFQ_DOCUMENT_ID = "doc_rfq";

export function quoteDocumentId(quoteId: string): string {
  return `doc_quote_${quoteId}`;
}

function sectionIdForPolicyLine(policyLineLabel: string): string {
  const known = policyLineByLabel(policyLineLabel);
  if (known) return known.id;
  return policyLineLabel
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "custom";
}

function mappingToSourceReference(mapping: PolicyMapping): SourceReference {
  return {
    source_type: "spreadsheet",
    location: {
      sheet_name: mapping.sheet_name,
      row_start: mapping.start_row,
      row_end: mapping.end_row,
    },
    label: `${mapping.policy_line} (${mapping.sheet_name} rows ${mapping.start_row}–${mapping.end_row})`,
  };
}

function buildDocuments(
  rfqWorkbook: RfqWorkbook | null,
  quoteFiles: QuoteFileRef[]
): DocumentDescriptor[] {
  const docs: DocumentDescriptor[] = [];
  if (rfqWorkbook) {
    docs.push({
      document_id: RFQ_DOCUMENT_ID,
      file_name: rfqWorkbook.fileName,
      document_type: "rfq",
      uploaded_at: rfqWorkbook.uploadedAt,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      server_document_id: rfqWorkbook.serverDocumentId ?? null,
    });
  }
  for (const q of quoteFiles) {
    docs.push({
      document_id: quoteDocumentId(q.id),
      file_name: q.name,
      document_type: "quote",
      uploaded_at: q.uploadedAt,
      server_document_id: q.serverDocumentId ?? null,
    });
  }
  return docs;
}

function groupMappingsIntoSections(
  mappings: PolicyMapping[]
): SelectedPolicySection[] {
  const byLine = new Map<string, PolicyMapping[]>();
  for (const m of mappings) {
    const key = m.policy_line.trim();
    if (!key) continue;
    const list = byLine.get(key) ?? [];
    list.push(m);
    byLine.set(key, list);
  }

  const sections: SelectedPolicySection[] = [];
  for (const [policyLine, group] of Array.from(byLine.entries())) {
    const source_mappings: SectionSourceMapping[] = group.map((mapping: PolicyMapping) => ({
      document_id: RFQ_DOCUMENT_ID,
      source_reference: mappingToSourceReference(mapping),
    }));
    sections.push({
      section_id: sectionIdForPolicyLine(policyLine),
      section_name: policyLine,
      source_mappings,
    });
  }
  return sections;
}

export type BuildWorkspacePayloadInput = {
  projectId: string;
  projectName?: string;
  clientName?: string;
  rfqWorkbook: RfqWorkbook | null;
  quoteFiles: QuoteFileRef[];
  mappings: PolicyMapping[];
};

/**
 * Canonical JSON sent to POST /projects/{id}/generate-qcr.
 * Requires at least one policy mapping with a labeled section.
 */
export function buildWorkspacePayload(
  input: BuildWorkspacePayloadInput
): WorkspacePayload {
  const selected_sections = groupMappingsIntoSections(input.mappings);
  if (selected_sections.length === 0) {
    throw new Error(
      "Assign at least one policy section with row mappings before generating QCR."
    );
  }

  const documents = buildDocuments(input.rfqWorkbook, input.quoteFiles);
  const metadata: WorkspaceMetadata = {
    project_name: input.projectName ?? null,
    client_name: input.clientName ?? null,
    mapping_count: input.mappings.length,
    document_count: documents.length,
  };

  return {
    project_id: input.projectId,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    documents,
    selected_sections,
    metadata,
  };
}

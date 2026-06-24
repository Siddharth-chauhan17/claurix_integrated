/**
 * API base URL for the FastAPI backend.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getAuthUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}/auth${p}`;
}

/** Redirect URL for Google OAuth (backend starts the flow, then redirects to Google). */
export function getGoogleOAuthUrl(): string {
  return getAuthUrl("/google");
}

/** Full-page redirect URL to start Outlook mailbox OAuth (backend → Microsoft). */
export function getOutlookConnectUrl(): string {
  return `${API_BASE_URL}/integrations/outlook/connect`;
}

export type OutlookStatusKind = "ok" | "not_connected" | "reconnect_required";

export type OutlookStatusResponse = {
  connected: boolean;
  email: string | null;
  is_active: boolean;
  expires_at: string | null;
  granted_scopes: string | null;
  last_sync_at: string | null;
  status: OutlookStatusKind;
};

export type OutlookDisconnectResponse = {
  status: "disconnected";
  message: string;
};

export async function getOutlookStatus(): Promise<OutlookStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/integrations/outlook/status`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load Outlook status"));
  }
  return res.json() as Promise<OutlookStatusResponse>;
}

export async function disconnectOutlook(): Promise<OutlookDisconnectResponse> {
  const res = await fetch(`${API_BASE_URL}/integrations/outlook/disconnect`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to disconnect Outlook"));
  }
  return res.json() as Promise<OutlookDisconnectResponse>;
}

export type RelatedEmailSummary = {
  message_id: string;
  subject: string;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null;
  has_attachments: boolean;
  conversation_id: string | null;
};

export type RelatedEmailListResponse = {
  messages: RelatedEmailSummary[];
};

export type MailMessageDetail = {
  id: string;
  subject: string;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null;
  body_preview: string | null;
  has_attachments: boolean;
  conversation_id: string | null;
};

export type MailAttachmentSummary = {
  id: string;
  name: string;
  content_type: string | null;
  size_bytes: number | null;
  is_inline: boolean;
  extension: string | null;
  imported: boolean;
  document_id: string | null;
  document_type: "rfq" | "quote" | null;
};

export type MailAttachmentListResponse = {
  message_id: string;
  attachments: MailAttachmentSummary[];
};

export type OutlookImportAttachmentPayload = {
  message_id: string;
  attachment_id: string;
  document_type: "rfq" | "quote";
};

export type OutlookImportAttachmentResponse = {
  status: "imported";
  document_id: string;
  file_name: string;
  document_type: "rfq" | "quote";
};

export async function getProjectRelatedEmails(
  projectId: string
): Promise<RelatedEmailListResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/related-emails`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load related emails"));
  }
  return res.json() as Promise<RelatedEmailListResponse>;
}

export async function getMailMessage(messageId: string): Promise<MailMessageDetail> {
  const res = await fetch(
    `${API_BASE_URL}/mail/messages/${encodeURIComponent(messageId)}`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load email"));
  }
  return res.json() as Promise<MailMessageDetail>;
}

export async function getMailMessageAttachments(
  messageId: string,
  projectId: string
): Promise<MailAttachmentListResponse> {
  const params = new URLSearchParams({ project_id: projectId });
  const res = await fetch(
    `${API_BASE_URL}/mail/messages/${encodeURIComponent(messageId)}/attachments?${params.toString()}`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load attachments"));
  }
  return res.json() as Promise<MailAttachmentListResponse>;
}

export async function importOutlookAttachment(
  projectId: string,
  payload: OutlookImportAttachmentPayload
): Promise<OutlookImportAttachmentResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/mail/import-attachment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to import attachment"));
  }
  return res.json() as Promise<OutlookImportAttachmentResponse>;
}

export type EmailAttachmentDescriptor = {
  id: string;
  name: string;
  content_type: string;
  size_bytes: number | null;
  available: boolean;
  kind: string;
};

export type EmailComposeContext = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  insurer_names: string[];
  attachments: EmailAttachmentDescriptor[];
  default_attachment_ids: string[];
  sender_name: string;
  sender_email: string;
  outlook_connected: boolean;
};

export type InlineEmailAttachmentPayload = {
  name: string;
  content_type: string;
  content_base64: string;
};

export type ProjectEmailSendPayload = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  attachment_ids: string[];
  inline_attachments?: InlineEmailAttachmentPayload[];
};

export type ProjectEmailSendResponse = {
  message_id: string | null;
  conversation_id: string | null;
  sent_at: string;
  status: "sent";
};

export type ProjectEmailDraft = {
  id: string;
  subject: string;
  to: string[];
  cc: string[];
  bcc: string[];
  body_html: string;
  attachment_ids: string[];
  inline_attachments: InlineEmailAttachmentPayload[];
  outlook_draft_id: string | null;
  conversation_id: string | null;
  attachment_count: number;
  created_at: string;
  updated_at: string;
};

export type ProjectEmailDraftListResponse = {
  count: number;
  items: ProjectEmailDraft[];
};

export type ProjectEmailDraftSavePayload = {
  draft_id?: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  attachment_ids: string[];
  inline_attachments?: InlineEmailAttachmentPayload[];
};

export type ProjectActivityItem = {
  id: string;
  activity_type: string;
  summary: string;
  created_at: string;
  user_id: string;
};

export type ProjectActivityListResponse = {
  count: number;
  items: ProjectActivityItem[];
};

export async function getEmailComposeContext(
  projectId: string
): Promise<EmailComposeContext> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/compose-context`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load email composer"));
  }
  return res.json() as Promise<EmailComposeContext>;
}

export async function logEmailComposerOpened(projectId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/composer-opened`,
    { method: "POST", credentials: "include" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to log composer activity"));
  }
}

export async function sendProjectEmail(
  projectId: string,
  payload: ProjectEmailSendPayload
): Promise<ProjectEmailSendResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/send`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to send email"));
  }
  return res.json() as Promise<ProjectEmailSendResponse>;
}

export async function listProjectEmailDrafts(
  projectId: string
): Promise<ProjectEmailDraftListResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/drafts`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load email drafts"));
  }
  return res.json() as Promise<ProjectEmailDraftListResponse>;
}

export async function getProjectEmailDraft(
  projectId: string,
  draftId: string
): Promise<ProjectEmailDraft> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/drafts/${encodeURIComponent(draftId)}`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load email draft"));
  }
  return res.json() as Promise<ProjectEmailDraft>;
}

export async function saveProjectEmailDraft(
  projectId: string,
  payload: ProjectEmailDraftSavePayload
): Promise<ProjectEmailDraft> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/drafts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to save email draft"));
  }
  return res.json() as Promise<ProjectEmailDraft>;
}

export async function sendProjectEmailDraft(
  projectId: string,
  draftId: string
): Promise<ProjectEmailSendResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/drafts/${encodeURIComponent(draftId)}/send`,
    { method: "POST", credentials: "include" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to send draft"));
  }
  return res.json() as Promise<ProjectEmailSendResponse>;
}

export async function deleteProjectEmailDraft(
  projectId: string,
  draftId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/email/drafts/${encodeURIComponent(draftId)}`,
    { method: "DELETE", credentials: "include" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to delete draft"));
  }
}

export async function getProjectActivities(
  projectId: string
): Promise<ProjectActivityListResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/activities`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load project activity"));
  }
  return res.json() as Promise<ProjectActivityListResponse>;
}

/** User shape returned by GET /auth/me (matches backend UserResponse). */
export interface User {
  id: string;
  organization_id: string;
  employee_id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  google_id: string | null;
}

export type Client = {
  id: string;
  organization_id: string;
  name: string;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_worked_at: string;
};

export type ClientCreatePayload = {
  name: string;
  industry?: string;
  contact_name?: string;
  contact_email?: string;
  notes?: string;
};

export type ClientListResponse = {
  count: number;
  items: Client[];
};

export type ProjectStatus = "active" | "completed";

export type Project = {
  id: string;
  organization_id: string;
  client_id: string;
  client_name: string;
  name: string;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_worked_at: string;
  status: ProjectStatus;
};

export type ProjectListResponse = {
  count: number;
  items: Project[];
};

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const err = await res.json();
    if (typeof err.detail === "string") return err.detail;
    if (Array.isArray(err.detail))
      return err.detail.map((d: { msg?: string }) => d.msg).join(", ");
  } catch {
    /* ignore */
  }
  return fallback;
}

export async function listClients(
  search?: string,
  limit?: number
): Promise<ClientListResponse> {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (limit != null) params.set("limit", String(limit));
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/clients${q}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load clients"));
  }
  return res.json() as Promise<ClientListResponse>;
}

export async function getClient(clientId: string): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/clients/${encodeURIComponent(clientId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load client"));
  }
  return res.json() as Promise<Client>;
}

/** Record that the user opened this client (updates recent-clients order). */
export async function touchClient(clientId: string): Promise<Client> {
  const res = await fetch(
    `${API_BASE_URL}/clients/${encodeURIComponent(clientId)}/touch`,
    { method: "POST", credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to update client activity"));
  }
  return res.json() as Promise<Client>;
}

export type ProjectCreatePayload = {
  client_id: string;
  name: string;
};

export async function listProjects(
  options?: { limit?: number; clientId?: string }
): Promise<ProjectListResponse> {
  const params = new URLSearchParams();
  const limit = options?.limit ?? 10;
  params.set("limit", String(limit));
  if (options?.clientId) params.set("client_id", options.clientId);
  const res = await fetch(`${API_BASE_URL}/projects?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load projects"));
  }
  return res.json() as Promise<ProjectListResponse>;
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load project"));
  }
  return res.json() as Promise<Project>;
}

/** Record that the user opened this project (updates recent-projects order). */
export async function touchProject(projectId: string): Promise<Project> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/touch`,
    { method: "POST", credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to update project activity"));
  }
  return res.json() as Promise<Project>;
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<Project> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to update project status"));
  }
  return res.json() as Promise<Project>;
}

export type ProjectDocumentType = "rfq" | "quote";

export type ProjectDocument = {
  id: string;
  project_id: string;
  document_type: ProjectDocumentType;
  original_filename: string;
  uploaded_by: string;
  created_at: string;
};

export type ProjectDocumentListResponse = {
  count: number;
  items: ProjectDocument[];
};

export async function listProjectDocuments(
  projectId: string,
  documentType?: ProjectDocumentType
): Promise<ProjectDocumentListResponse> {
  const params = new URLSearchParams();
  if (documentType) params.set("document_type", documentType);
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/documents${q}`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load project documents"));
  }
  return res.json() as Promise<ProjectDocumentListResponse>;
}

export async function uploadProjectRfq(
  projectId: string,
  file: File
): Promise<{ document: ProjectDocument }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/documents/rfq`,
    { method: "POST", credentials: "include", body: form }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to upload RFQ to server"));
  }
  return res.json() as Promise<{ document: ProjectDocument }>;
}

export type QcrEditingDataSource = "gap_analysis" | "mock";

export type QcrEditingWorkspaceApiResponse = {
  project_id: string;
  source: QcrEditingDataSource;
  workspace_id: string;
  insurers: string[];
  sections: { id: string; label: string }[];
  clauses: Array<{
    policy_name?: string;
    rfq_clause: string;
    rfq_requirement: string;
    comparisons: Array<{
      insurer: string;
      proposal_clause: string;
      status: string;
      gap_score: number;
      differences?: string[];
      broker_note?: string;
    }>;
    source?: {
      file_name?: string;
      sheet_name: string;
      excel_row: number;
      clause_cell: string;
      requirement_cell: string;
      uw_remark_cell: string;
    };
  }> | null;
  rfq_file_name?: string | null;
  generated_at?: string | null;
  run_id?: string | null;
  broker_clauses?: Array<Record<string, unknown>> | null;
  broker_saved_at?: string | null;
  broker_saved_by?: string | null;
};

export type QcrWorkspaceSaveApiRequest = {
  workspace_id: string;
  clauses: Array<Record<string, unknown>>;
  saved_at?: string;
};

export type QcrWorkspaceSaveApiResponse = {
  project_id: string;
  workspace_id: string;
  saved_at: string;
  saved_by: string;
  clause_count: number;
};

/** GET /projects/{id}/qcr-workspace — raw clauses for QCR editing UI (v2.0). */
export async function fetchQcrEditingWorkspace(
  projectId: string
): Promise<QcrEditingWorkspaceApiResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/qcr-workspace`,
    { credentials: "include", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load QCR workspace"));
  }
  return res.json() as Promise<QcrEditingWorkspaceApiResponse>;
}

/** POST /projects/{id}/qcr-workspace — persist broker clause edits. */
export async function saveQcrEditingWorkspace(
  projectId: string,
  body: QcrWorkspaceSaveApiRequest
): Promise<QcrWorkspaceSaveApiResponse> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/qcr-workspace`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to save QCR workspace"));
  }
  return res.json() as Promise<QcrWorkspaceSaveApiResponse>;
}

export type QcrExportApiRequest = {
  workspace_id?: string;
  clauses: Array<Record<string, unknown>>;
  sections: { id: string; label: string }[];
  insurers: string[];
};

/** POST /projects/{id}/export-qcr — multi-sheet Excel (one sheet per policy). */
export async function exportQcrWorkbook(
  projectId: string,
  body: QcrExportApiRequest
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/export-qcr`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to export QCR workbook"));
  }
  return res.blob();
}

export async function uploadProjectQuotes(
  projectId: string,
  files: File[]
): Promise<{ count: number; items: ProjectDocument[] }> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/documents/quotes`,
    { method: "POST", credentials: "include", body: form }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to upload quotes to server"));
  }
  return res.json() as Promise<{ count: number; items: ProjectDocument[] }>;
}

export async function createProject(payload: ProjectCreatePayload): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to create project"));
  }
  return res.json() as Promise<Project>;
}

export async function createClient(payload: ClientCreatePayload): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to create client"));
  }
  return res.json() as Promise<Client>;
}

/**
 * Fetch current user from cookie. GET /auth/me with credentials: "include".
 * Returns user or null if not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const user: User = await res.json();
    return user;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Log out: POST /auth/logout with credentials, clears cookie on server.
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export type DemoRequestPayload = {
  full_name: string;
  work_email: string;
  company_name: string;
  job_role: string;
  qcr_generation_method: string;
  monthly_quote_volume: string;
  operational_challenges: string[];
  lines_of_business: string[];
  review_team_size: string;
  preferred_demo_date: string;
  preferred_time_window: string;
  requested_demo_topics: string[];
  additional_notes?: string;
  website?: string;
};

export type DemoRequestSummary = {
  id: number;
  full_name: string;
  work_email: string;
  company_name: string;
  job_role: string;
  qcr_generation_method: string;
  monthly_quote_volume: string;
  operational_challenges: string[];
  lines_of_business: string[];
  review_team_size: string;
  preferred_demo_date: string;
  preferred_time_window: string;
  requested_demo_topics: string[];
  additional_notes: string | null;
  created_at: string;
};

export type DemoRequestListResponse = {
  count: number;
  items: DemoRequestSummary[];
};

export type DemoRequestSubmitResponse = {
  success: boolean;
  message: string;
};

/**
 * POST /demo-requests — public demo lead submission.
 */
export async function submitDemoRequest(
  payload: DemoRequestPayload
): Promise<DemoRequestSubmitResponse> {
  const res = await fetch(`${API_BASE_URL}/demo-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = "Failed to submit demo request";
    try {
      const err = await res.json();
      if (typeof err.detail === "string") message = err.detail;
      else if (Array.isArray(err.detail))
        message = err.detail.map((d: { msg?: string }) => d.msg).join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<DemoRequestSubmitResponse>;
}

/**
 * GET /demo-requests — admin-only lead list (requires session + allowlisted email).
 */
export async function listDemoRequests(
  limit = 50
): Promise<DemoRequestListResponse> {
  const res = await fetch(`${API_BASE_URL}/demo-requests?limit=${limit}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to fetch demo requests"));
  }
  return res.json() as Promise<DemoRequestListResponse>;
}

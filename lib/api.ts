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

/** User shape returned by GET /auth/me (matches backend UserResponse). */
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  google_id: string | null;
}

/**
 * Fetch current user from cookie. GET /auth/me with credentials: "include".
 * Returns user or null if not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const user: User = await res.json();
    return user;
  } catch {
    return null;
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

/** Policy analysis API response (matches backend AnalysisResponse). */
export type ClauseResult = {
  title: string;
  risk: string;
  explanation: string;
};

export type AnalysisResultData = {
  risk_score: number;
  risk_level: string;
  summary: string;
  risk_flags: string[];
  clauses: ClauseResult[];
};

/**
 * POST /analyze-policy with multipart file. Sends cookies so httponly JWT is included.
 * Optionally pass Bearer token for non-cookie clients.
 */
export async function analyzePolicy(
  file: File,
  accessToken?: string | null
): Promise<AnalysisResultData> {
  const form = new FormData();
  form.append("file", file);
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/analyze-policy`, {
    method: "POST",
    body: form,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    let message = "Analysis failed";
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
  return res.json() as Promise<AnalysisResultData>;
}

/**
 * Workspace users lookup table — activity events store user_id only.
 * In production, resolve via API / organization users table.
 */

export type WorkspaceUser = {
  id: string;
  name: string;
  email?: string;
};

/** Fallback demo users for name resolution when auth user is not registered yet. */
export const WORKSPACE_USERS: WorkspaceUser[] = [
  { id: "usr_rahul_sharma", name: "Rahul Sharma", email: "rahul.sharma@claurix.ai" },
  { id: "usr_priya_mehta", name: "Priya Mehta", email: "priya.mehta@claurix.ai" },
  { id: "usr_anita_desai", name: "Anita Desai", email: "anita.desai@claurix.ai" },
  { id: "usr_vikram_singh", name: "Vikram Singh", email: "vikram.singh@claurix.ai" },
];

const usersById = new Map(WORKSPACE_USERS.map((u) => [u.id, u]));

export function getWorkspaceUserById(userId: string): WorkspaceUser | undefined {
  return usersById.get(userId);
}

export function getWorkspaceUserName(userId: string): string {
  return getWorkspaceUserById(userId)?.name ?? "Unknown user";
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Register authenticated user for activity name resolution (not stored on events). */
export function registerAuthUser(user: { id: string; name: string; email?: string }): void {
  if (!usersById.has(user.id)) {
    usersById.set(user.id, {
      id: user.id,
      name: user.name,
      email: user.email,
    });
  }
}

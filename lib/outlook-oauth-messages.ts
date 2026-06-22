/** User-facing messages for Outlook OAuth callback query parameters. */

const OUTLOOK_ERROR_MESSAGES: Record<string, string> = {
  account_already_linked:
    "This Outlook account is already linked to another user.",
  invalid_state: "Connection could not be verified. Please try again.",
  token_exchange_failed: "Microsoft authentication failed. Please try again.",
  graph_identity_failed: "Microsoft authentication failed. Please try again.",
  token_encryption_not_configured:
    "Server configuration error. Contact administrator.",
};

export function outlookOAuthErrorMessage(reason: string | null): string {
  if (!reason) return "Unable to connect Outlook.";
  return OUTLOOK_ERROR_MESSAGES[reason] ?? "Unable to connect Outlook.";
}

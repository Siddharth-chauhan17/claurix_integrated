/**
 * Shared utilities for the claurix frontend.
 */

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

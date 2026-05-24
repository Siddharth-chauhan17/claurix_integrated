/**
 * Shared utilities for the Insurify frontend.
 */

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

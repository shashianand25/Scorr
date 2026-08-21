/**
 * Time grouping utility for library page sorting.
 * Extracted from library/page.tsx for reusability and smaller file size.
 */

export type TimeGroup = "This week" | "Last week" | "Older";

/** Categorises a timestamp into a human-readable time group for display. */
export function getTimeGroup(timestamp: number | string | undefined): TimeGroup {
  if (!timestamp) return "Older";
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return "This week";
  if (diffDays < 14) return "Last week";
  return "Older";
}

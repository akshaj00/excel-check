/**
 * Project name normalisation and matching.
 *
 * The daily report may spell a project slightly differently from the
 * Main Excel file (e.g. "352-MAC - Greystar" vs "352 MAC Greystar").
 * All matching tolerance lives here so it can be tuned later.
 */

/** Strips punctuation/spacing so representations can be compared. */
export function normalizeProjectName(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Extracts a leading project code such as "352-MAC" -> "352mac". */
export function projectCode(value: unknown): string {
  const normalized = normalizeProjectName(value);
  const match = normalized.match(/^(\d{2,6})\s*([a-z]{2,6})?/);
  if (!match) return "";
  return `${match[1]}${match[2] ?? ""}`;
}

/** True when two project representations most likely refer to one project. */
export function projectMatches(a: unknown, b: unknown): boolean {
  const left = normalizeProjectName(a);
  const right = normalizeProjectName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftCode = projectCode(a);
  const rightCode = projectCode(b);
  return leftCode !== "" && leftCode === rightCode;
}

/** Finds the column whose values look like project names. */
export function findProjectColumn(headers: string[]): string | null {
  const exact = headers.find((h) => h.trim().toLowerCase() === "project");
  if (exact) return exact;
  return headers.find((h) => /project/i.test(h)) ?? null;
}

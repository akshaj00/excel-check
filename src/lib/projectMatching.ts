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

/** 
 * Strict resolution of a project name against a list of candidates.
 * Returns the exact matched string, or throws an error if ambiguous/not found.
 */
export function resolveProjectMatch(targetProject: string, candidates: string[]): string {
  if (candidates.length === 0) {
    throw new Error("No project candidates found in the dataset.");
  }

  // 1. Exact normalized match
  const normalizedTarget = normalizeProjectName(targetProject);
  const exactMatches = candidates.filter(c => normalizeProjectName(c) === normalizedTarget);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    throw new Error("Multiple exact project matches found.");
  }

  // 2. Exact project code
  const codeTarget = projectCode(targetProject);
  if (codeTarget) {
    const codeMatches = candidates.filter(c => projectCode(c) === codeTarget);
    if (codeMatches.length === 1) return codeMatches[0];
    if (codeMatches.length > 1) {
      throw new Error("Multiple possible projects found with the same project code.");
    }
  }

  // 3. Substring match
  const substringMatches = candidates.filter(c => {
    const normalizedC = normalizeProjectName(c);
    if (!normalizedC) return false;
    return normalizedTarget.includes(normalizedC) || normalizedC.includes(normalizedTarget);
  });
  if (substringMatches.length === 1) return substringMatches[0];
  if (substringMatches.length > 1) {
    throw new Error("Multiple possible projects found in the Main Excel. Please verify the project matching logic.");
  }

  throw new Error("The detected project could not be found in the Main Excel file.");
}

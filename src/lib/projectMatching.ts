/**
 * Project name normalisation and matching.
 *
 * The daily report may spell a project slightly differently from the
 * Main Excel file (e.g. "352-MAC - Greystar" vs "352 MAC Greystar", or
 * "303 Collin Street" / "303col" vs "303COL").
 * All matching tolerance lives here so it can be tuned.
 */

export type ProjectMatchMethod = "exact" | "code" | "substring" | "keyword" | "none";

export interface ProjectMatchResult {
  /** The candidate string from the Main Excel that was matched. */
  matched: string;
  /** How the match was determined. */
  method: ProjectMatchMethod;
  /** Confidence score (0-100). */
  score?: number;
}

export const PROJECT_STOP_WORDS = new Set([
  "street", "st", "road", "rd", "avenue", "ave", "highway", "hwy",
  "lane", "ln", "way", "drive", "dr", "boulevard", "blvd", "place", "pl",
  "project", "report", "daily", "rds", "kpg", "document", "controller",
  "building", "tower", "stage", "level", "phase", "oct", "nov", "dec",
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "xlsx", "xls"
]);

/** Strips punctuation/spacing so representations can be compared. */
export function normalizeProjectName(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Removes all whitespace for compact matching (e.g. "303 col" -> "303col"). */
export function compactProjectName(value: unknown): string {
  return normalizeProjectName(value).replace(/\s+/g, "");
}

/** Extracts a leading project code such as "352-MAC" -> "352mac" or "303COL" -> "303col". */
export function projectCode(value: unknown): string {
  const normalized = normalizeProjectName(value);
  const match = normalized.match(/^(\d{2,6})\s*([a-z]{2,6})?/);
  if (!match) return "";
  return `${match[1]}${match[2] ?? ""}`;
}

/**
 * Computes a similarity score (0 to 100) between a Main Excel candidate and a target project string.
 */
export function scoreProjectMatch(
  mainCandidate: string,
  target: string,
): { score: number; method: ProjectMatchMethod } {
  const normMain = normalizeProjectName(mainCandidate);
  const normTarget = normalizeProjectName(target);
  if (!normMain || !normTarget) return { score: 0, method: "none" };

  const compMain = compactProjectName(mainCandidate);
  const compTarget = compactProjectName(target);

  // 1. Exact match (with spaces or compact)
  if (normMain === normTarget || compMain === compTarget) {
    return { score: 100, method: "exact" };
  }

  // 2. Project code matching (e.g. 352mac === 352mac or 303col vs 303collin)
  const codeMain = projectCode(mainCandidate);
  const codeTarget = projectCode(target);
  if (codeMain && codeTarget) {
    if (codeMain === codeTarget) {
      return { score: 95, method: "code" };
    }
    // Prefix match on codes (e.g. '303col' is prefix of '303collin')
    if (codeMain.startsWith(codeTarget) || codeTarget.startsWith(codeMain)) {
      return { score: 88, method: "code" };
    }
  }

  // 3. Compact inclusion (e.g. '303col' in '303collinstreet', or 'mel05c4' in filename)
  if (compMain.length >= 4 && compTarget.includes(compMain)) {
    return { score: 85, method: "keyword" };
  }
  if (compTarget.length >= 4 && compMain.includes(compTarget)) {
    return { score: 80, method: "substring" };
  }

  // 4. Significant words match (excluding stop words like 'street', 'road')
  const mainWords = normMain
    .split(" ")
    .filter((w) => w.length >= 3 && !PROJECT_STOP_WORDS.has(w));
  const targetWords = normTarget
    .split(" ")
    .filter((w) => w.length >= 3 && !PROJECT_STOP_WORDS.has(w));

  for (const mw of mainWords) {
    for (const tw of targetWords) {
      if (mw === tw) {
        return { score: 75, method: "keyword" };
      }
      if (mw.length >= 4 && (tw.startsWith(mw) || mw.startsWith(tw))) {
        return { score: 70, method: "keyword" };
      }
    }
  }

  return { score: 0, method: "none" };
}

/** True when two project representations most likely refer to one project. */
export function projectMatches(a: unknown, b: unknown): boolean {
  const res = scoreProjectMatch(String(a ?? ""), String(b ?? ""));
  return res.score >= 65;
}

/** Legacy helper */
export function keywordMatchProject(
  mainProject: unknown,
  reportProject: unknown,
): boolean {
  const res = scoreProjectMatch(String(mainProject ?? ""), String(reportProject ?? ""));
  return res.score >= 65;
}

/** Finds the column whose values look like project names. */
export function findProjectColumn(headers: string[]): string | null {
  const exact = headers.find((h) => h.trim().toLowerCase() === "project");
  if (exact) return exact;
  return headers.find((h) => /project/i.test(h)) ?? null;
}

/**
 * Resolves a project from the report against Main Excel candidates using best-score matching.
 * Returns both the matched string and the method used.
 * Throws if no match is found or if the result is truly ambiguous.
 */
export function resolveProjectMatchDetailed(
  targetProject: string,
  candidates: string[],
): ProjectMatchResult {
  if (candidates.length === 0) {
    throw new Error("No project candidates found in the dataset.");
  }

  let bestCand: string | null = null;
  let bestScore = 0;
  let bestMethod: ProjectMatchMethod = "none";
  let secondBestScore = 0;

  for (const cand of candidates) {
    const res = scoreProjectMatch(cand, targetProject);
    if (res.score > bestScore) {
      secondBestScore = bestScore;
      bestScore = res.score;
      bestCand = cand;
      bestMethod = res.method;
    } else if (res.score === bestScore && res.score > 0) {
      secondBestScore = res.score;
    }
  }

  // Threshold of 65 guarantees high confidence
  if (bestScore >= 65 && bestCand) {
    // If there's an exact tie at the top, check if both are distinct
    if (bestScore === secondBestScore && bestScore < 100) {
      throw new Error(
        `Ambiguous project match for '${targetProject}' in Main Excel.`,
      );
    }
    return { matched: bestCand, method: bestMethod, score: bestScore };
  }

  throw new Error(
    `The project '${targetProject}' could not be matched to any project in the Main Excel file.`,
  );
}

/**
 * Compatibility wrapper — returns just the matched string.
 */
export function resolveProjectMatch(
  targetProject: string,
  candidates: string[],
): string {
  return resolveProjectMatchDetailed(targetProject, candidates).matched;
}

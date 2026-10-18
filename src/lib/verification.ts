/**
 * Orchestration: read both workbooks in the browser, identify the project
 * and report dates, filter the Main Excel data, then hand everything to the
 * comparison engine.
 */

import {
  normalizeDate,
  parseMainWorkbook,
  parseProjectReport,
  readWorkbook,
  type DailyReport,
  type Row,
} from "@/lib/excel";
import {
  findProjectColumn,
  resolveProjectMatchDetailed,
  type ProjectMatchMethod,
} from "@/lib/projectMatching";
import {
  analyzeProjectData,
  type ComparisonResponse,
  type DateBucket,
} from "@/lib/comparison";

export class VerificationError extends Error {}

export interface DetectedReport {
  date: string;
  sheet: string;
  mainRecordCount: number;
}

export interface ProjectVerificationOutcome {
  fileName: string;
  /** The project name as it appears in the Project Report (top-right field). */
  project: string;
  /** The matching project code from the Main Excel's Project column. */
  matchedProjectCode: string;
  /** How the keyword/project match was determined. */
  matchMethod: ProjectMatchMethod;
  projectRowCount: number;
  detectedReports: DetectedReport[];
  comparison: ComparisonResponse;
  error?: string;
}

export interface VerificationOutcome {
  mainRowCount: number;
  /** All verified projects */
  projects: ProjectVerificationOutcome[];
  /** Primary project name (for backward compatibility) */
  project: string;
  /** Primary matching project code (for backward compatibility) */
  matchedProjectCode: string;
  /** Primary match method (for backward compatibility) */
  matchMethod: ProjectMatchMethod;
  projectRowCount: number;
  detectedReports: DetectedReport[];
  comparison: ComparisonResponse;
}

/** Column used to match a Main Excel record to a report date. */
export function findDateColumn(headers: string[]): string | null {
  return headers.find((h) => h.trim().toLowerCase() === "receipt date (rds)") ?? null;
}

/** Keeps only the Main Excel rows that belong to the detected project.
 * Returns the matched rows AND the ProjectMatchResult for UI display. */
export function filterByProject(
  rows: Row[],
  project: string,
): { rows: Row[]; matchedCode: string; matchMethod: ProjectMatchMethod } {
  if (rows.length === 0)
    return { rows: [], matchedCode: "", matchMethod: "none" };
  const headers = Object.keys(rows[0] ?? {});
  const projectColumn = findProjectColumn(headers);
  if (!projectColumn)
    throw new VerificationError(
      "Could not find a project column in Main Excel.",
    );

  const candidates = Array.from(
    new Set(
      rows
        .map((r) => String(r[projectColumn] ?? ""))
        .filter(
          (val) => val !== "null" && val !== "undefined" && val !== "",
        ),
    ),
  );
  if (candidates.length === 0)
    return { rows: [], matchedCode: "", matchMethod: "none" };

  let matchResult: { matched: string; method: ProjectMatchMethod };
  try {
    matchResult = resolveProjectMatchDetailed(project, candidates);
  } catch (err: any) {
    throw new VerificationError(
      err.message || "Failed to resolve project match.",
    );
  }

  return {
    rows: rows.filter(
      (row) => String(row[projectColumn] ?? "") === matchResult.matched,
    ),
    matchedCode: matchResult.matched,
    matchMethod: matchResult.method,
  };
}

/** Groups project rows by normalised date. */
export function groupByDate(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  if (rows.length === 0) return grouped;
  const headers = Object.keys(rows[0] ?? {});
  const dateColumn = findDateColumn(headers);
  if (!dateColumn) throw new VerificationError("Required column 'Receipt Date (RDS)' not found in Main Excel.");

  for (const row of rows) {
    const date = normalizeDate(row[dateColumn]);
    if (!date) continue;
    const bucket = grouped.get(date);
    if (bucket) bucket.push(row);
    else grouped.set(date, [row]);
  }
  return grouped;
}

/** Column used to match close-out records in Main Excel. */
export function findCloseoutDateColumn(headers: string[]): string | null {
  return (
    headers.find((h) => {
      const s = h.trim().toLowerCase();
      return s.includes("close-out date") || s.includes("close out date");
    }) ?? null
  );
}

/** Groups project rows by normalised TRN Close-out Date. */
export function groupByCloseoutDate(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  if (rows.length === 0) return grouped;
  const headers = Object.keys(rows[0] ?? {});
  const dateColumn = findCloseoutDateColumn(headers);
  if (!dateColumn) return grouped;

  for (const row of rows) {
    const date = normalizeDate(row[dateColumn]);
    if (!date) continue;
    const bucket = grouped.get(date);
    if (bucket) bucket.push(row);
    else grouped.set(date, [row]);
  }
  return grouped;
}

export async function runVerification(
  mainFile: File,
  projectInput: File | File[],
): Promise<VerificationOutcome> {
  const projectFiles = Array.isArray(projectInput)
    ? projectInput
    : [projectInput];
  if (projectFiles.length === 0) {
    throw new VerificationError(
      "Please upload at least one Project Report Excel file.",
    );
  }

  let mainRows: Row[];
  try {
    const mainWorkbook = await readWorkbook(mainFile);
    mainRows = parseMainWorkbook(mainWorkbook);
  } catch {
    throw new VerificationError(
      "Unable to read the Main Excel file. Please check the file and try again.",
    );
  }

  const outcomes: ProjectVerificationOutcome[] = [];

  for (const pFile of projectFiles) {
    try {
      const reportWorkbook = await readWorkbook(pFile);
      const parsed = parseProjectReport(reportWorkbook);
      const reports = parsed.reports;

      // Extract candidate strings from report sheets and filename
      const fileNameNoExt = pFile.name.replace(/\.[^/.]+$/, "");
      const candidateList = Array.from(
        new Set(
          [
            ...parsed.projectCandidates,
            parsed.project,
            fileNameNoExt,
          ].filter((x): x is string => Boolean(x && x.trim())),
        ),
      );

      let filterResult: {
        rows: Row[];
        matchedCode: string;
        matchMethod: ProjectMatchMethod;
      } | null = null;
      let usedReportProject = parsed.project || fileNameNoExt || pFile.name;

      // Try finding the best matching candidate from the report sheets or filename
      for (const cand of candidateList) {
        try {
          const res = filterByProject(mainRows, cand);
          if (res.rows.length > 0) {
            filterResult = res;
            usedReportProject = cand;
            break;
          }
        } catch {
          // Continue trying other candidates
        }
      }

      if (!filterResult) {
        // Attempt with usedReportProject to record descriptive error
        try {
          filterResult = filterByProject(mainRows, usedReportProject);
        } catch (err: any) {
          outcomes.push({
            fileName: pFile.name,
            project: usedReportProject,
            matchedProjectCode: "",
            matchMethod: "none",
            projectRowCount: 0,
            detectedReports: [],
            comparison: {
              project: usedReportProject,
              summary: { total: 0, matched: 0, changed: 0, missing: 0 },
              dates: [],
            },
            error:
              err.message ||
              `The project '${usedReportProject}' could not be matched in the Main Excel file.`,
          });
          continue;
        }
      }

      const projectRows = filterResult.rows;
      if (projectRows.length === 0) {
        outcomes.push({
          fileName: pFile.name,
          project: usedReportProject,
          matchedProjectCode: filterResult.matchedCode,
          matchMethod: filterResult.matchMethod,
          projectRowCount: 0,
          detectedReports: [],
          comparison: {
            project: usedReportProject,
            summary: { total: 0, matched: 0, changed: 0, missing: 0 },
            dates: [],
          },
          error: `No matching records found in Main Excel for '${filterResult.matchedCode}'.`,
        });
        continue;
      }

      const grouped = groupByDate(projectRows);
      const closeoutGrouped = groupByCloseoutDate(projectRows);
      const buckets: DateBucket[] = reports.map((report) => ({
        report,
        mainRows: grouped.get(report.date) ?? [],
        closeoutRows: closeoutGrouped.get(report.date) ?? [],
        allProjectRows: projectRows,
      }));

      const detected = buckets.map(({ report, mainRows: rows }) => ({
        date: report.date,
        sheet: report.sheet,
        mainRecordCount: rows.length,
      }));

      const comparison = analyzeProjectData(usedReportProject, buckets);

      outcomes.push({
        fileName: pFile.name,
        project: usedReportProject,
        matchedProjectCode: filterResult.matchedCode,
        matchMethod: filterResult.matchMethod,
        projectRowCount: projectRows.length,
        detectedReports: detected,
        comparison,
      });
    } catch (err: any) {
      outcomes.push({
        fileName: pFile.name,
        project: pFile.name,
        matchedProjectCode: "",
        matchMethod: "none",
        projectRowCount: 0,
        detectedReports: [],
        comparison: {
          project: pFile.name,
          summary: { total: 0, matched: 0, changed: 0, missing: 0 },
          dates: [],
        },
        error: err.message || `Failed to process '${pFile.name}'.`,
      });
    }
  }

  const validOutcomes = outcomes.filter((o) => !o.error);
  if (validOutcomes.length === 0) {
    const errorDetails = outcomes
      .map((o) => `${o.fileName}: ${o.error}`)
      .join("\n");
    throw new VerificationError(
      `Unable to verify uploaded project reports:\n${errorDetails}`,
    );
  }

  const primary = validOutcomes[0]!;

  // Collect all unique detected reports across all projects
  const dateMap = new Map<string, DetectedReport>();
  for (const o of outcomes) {
    for (const d of o.detectedReports) {
      if (!dateMap.has(d.date)) {
        dateMap.set(d.date, d);
      }
    }
  }

  return {
    mainRowCount: mainRows.length,
    projects: outcomes,
    project: primary.project,
    matchedProjectCode: primary.matchedProjectCode,
    matchMethod: primary.matchMethod,
    projectRowCount: validOutcomes.reduce((acc, p) => acc + p.projectRowCount, 0),
    detectedReports: Array.from(dateMap.values()),
    comparison: primary.comparison,
  };
}

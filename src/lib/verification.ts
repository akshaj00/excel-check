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
import { findProjectColumn, projectMatches } from "@/lib/projectMatching";
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

export interface VerificationOutcome {
  project: string;
  mainRowCount: number;
  projectRowCount: number;
  detectedReports: DetectedReport[];
  comparison: ComparisonResponse;
}

/** Column used to match a Main Excel record to a report date. */
export function findDateColumn(headers: string[]): string | null {
  return (
    headers.find((h) => /receipt\s*date/i.test(h)) ??
    headers.find((h) => /date/i.test(h)) ??
    null
  );
}

/** Keeps only the Main Excel rows that belong to the detected project. */
export function filterByProject(rows: Row[], project: string): Row[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0] ?? {});
  const projectColumn = findProjectColumn(headers);
  if (!projectColumn) return [];
  return rows.filter((row) => projectMatches(row[projectColumn], project));
}

/** Groups project rows by normalised date. */
export function groupByDate(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  if (rows.length === 0) return grouped;
  const headers = Object.keys(rows[0] ?? {});
  const dateColumn = findDateColumn(headers);
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
  projectFile: File,
): Promise<VerificationOutcome> {
  let mainRows: Row[];
  let project: string | null;
  let reports: DailyReport[];

  try {
    const mainWorkbook = await readWorkbook(mainFile);
    mainRows = parseMainWorkbook(mainWorkbook);
  } catch {
    throw new VerificationError(
      "Unable to read the Main Excel file. Please check the file and try again.",
    );
  }

  try {
    const reportWorkbook = await readWorkbook(projectFile);
    const parsed = parseProjectReport(reportWorkbook);
    project = parsed.project;
    reports = parsed.reports;
  } catch {
    throw new VerificationError(
      "Unable to read the Project Report Excel file. Please check the file and try again.",
    );
  }

  if (!project) {
    throw new VerificationError(
      "Unable to identify the project from the Project Report.",
    );
  }
  if (reports.length === 0) {
    throw new VerificationError(
      "No daily report dates were found in the Project Report.",
    );
  }

  const projectRows = filterByProject(mainRows, project);
  if (projectRows.length === 0) {
    throw new VerificationError(
      "The detected project could not be found in the Main Excel file.",
    );
  }

  const grouped = groupByDate(projectRows);
  const buckets: DateBucket[] = reports.map((report) => ({
    report,
    mainRows: grouped.get(report.date) ?? [],
  }));

  return {
    project,
    mainRowCount: mainRows.length,
    projectRowCount: projectRows.length,
    detectedReports: buckets.map(({ report, mainRows: rows }) => ({
      date: report.date,
      sheet: report.sheet,
      mainRecordCount: rows.length,
    })),
    comparison: analyzeProjectData(project, buckets),
  };
}

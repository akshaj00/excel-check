/**
 * Comparison engine (client-side).
 *
 * The actual counting/comparison RULES are intentionally not implemented
 * yet. They live in `src/lib/rules.ts` as a list of rule functions, so new
 * rules can be added later without touching any UI component.
 */

import type { Row, DailyReport } from "@/lib/excel";
import { COMPARISON_RULES } from "@/lib/rules";

export type ResultStatus = "matched" | "changed" | "missing" | (string & {});

export interface ComparisonResultRow {
  date: string;
  field: string;
  mainValue: string | number | null;
  reportValue: string | number | null;
  difference?: number | null;
  status: ResultStatus;
  note?: string;
}

export interface DateComparison {
  date: string;
  sheet: string;
  mainRecordCount: number;
  /** Set when the date has no matching Main Excel records. */
  error?: string;
  results: ComparisonResultRow[];
}

export interface ComparisonSummary {
  total: number;
  matched: number;
  changed: number;
  missing: number;
}

export interface ComparisonResponse {
  project: string;
  summary: ComparisonSummary;
  dates: DateComparison[];
}

/** Input given to every comparison rule for a single reporting date. */
export interface RuleContext {
  project: string;
  date: string;
  /** Main Excel rows for this project + date (filtered by Receipt Date). */
  mainRows: Row[];
  /** Main Excel rows for this project filtered by TRN Close-out Date. */
  closeoutRows?: Row[];
  /** All Main Excel rows for this project. */
  allProjectRows?: Row[];
  /** The daily report sheet for this date. */
  report: DailyReport;
}

export type ComparisonRule = (context: RuleContext) => ComparisonResultRow[];

export interface DateBucket {
  report: DailyReport;
  mainRows: Row[];
  closeoutRows?: Row[];
  allProjectRows?: Row[];
}

/**
 * Runs every registered rule for every detected date.
 * Rules that throw are ignored so one bad rule cannot crash the app.
 */
export function analyzeProjectData(
  project: string,
  buckets: DateBucket[],
): ComparisonResponse {
  const dates: DateComparison[] = buckets.map(
    ({ report, mainRows, closeoutRows, allProjectRows }) => {
      const results: ComparisonResultRow[] = [];
      const hasRecords =
        mainRows.length > 0 || (closeoutRows && closeoutRows.length > 0);

      if (hasRecords || (report.grid && report.grid.length > 0)) {
        for (const rule of COMPARISON_RULES) {
          try {
            results.push(
              ...rule({
                project,
                date: report.date,
                mainRows,
                closeoutRows,
                allProjectRows,
                report,
              }),
            );
          } catch {
            // A failing rule must not break the whole verification.
          }
        }
      }

      return {
        date: report.date,
        sheet: report.sheet,
        mainRecordCount: mainRows.length,
        ...(!hasRecords
          ? {
              error: `${report.date} was not found for this project in the Main Excel file.`,
            }
          : {}),
        results,
      };
    },
  );

  const all = dates.flatMap((d) => d.results);
  const summary: ComparisonSummary = {
    total: all.length,
    matched: all.filter((r) => r.status === "matched").length,
    changed: all.filter((r) => r.status === "changed").length,
    missing: all.filter((r) => r.status === "missing").length,
  };

  return { project, summary, dates };
}

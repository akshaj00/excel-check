/**
 * Client-side Excel reading helpers (SheetJS).
 *
 * This module only knows how to READ workbooks and pull out generic
 * structures. No comparison rules live here.
 */

import * as XLSX from "xlsx";

export type Row = Record<string, unknown>;

export interface DailyReport {
  /** Worksheet name, e.g. "3-08" */
  sheet: string;
  /** Normalised date string, e.g. "03/08/2026" */
  date: string;
  /** Raw sheet content as a grid (rows of cells) */
  grid: unknown[][];
}

export interface ProjectReportWorkbook {
  project: string | null;
  reports: DailyReport[];
}

/** Reads a File into a SheetJS workbook. */
export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array" });
}

/** Pads a number to two digits. */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats a Date as YYYY-MM-DD using UTC to prevent timezone shifts. */
export function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Normalises any cell value that could represent a date into DD/MM/YYYY.
 * Returns null when the value is not date-like.
 */
export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value);
  }

  // Excel serial number
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const SSF = XLSX.SSF || (XLSX as any).default?.SSF;
    const parsed = SSF?.parse_date_code(value);
    if (parsed && parsed.y > 1900) {
      return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
    }
    return null;
  }

  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  // DD/MM/YYYY or MM/DD/YYYY (also 2-digit years)
  const dmy = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    let p1 = Number(dmy[1]);
    let p2 = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    
    let month = p2;
    let day = p1;
    // Check if it's MM/DD/YYYY
    if (p1 <= 12 && p2 > 12) {
      month = p1;
      day = p2;
    } else if (p1 <= 12 && p2 <= 12) {
      // Ambiguous, let's check if JS Date thinks it's a valid US date.
      // JS Date parses "8/3/2026" as Aug 3 (US format).
      const d = new Date(`${p1}/${p2}/${year}`);
      if (!Number.isNaN(d.getTime()) && d.getMonth() + 1 === p1) {
        month = p1;
        day = p2;
      }
    }
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
    return null;
  }

  // YYYY-MM-DD
  const ymd = text.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (ymd) {
    return `${Number(ymd[1])}-${pad(Number(ymd[2]))}-${pad(Number(ymd[3]))}`;
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime()) && /\d{4}/.test(text)) {
    return formatDate(parsedDate);
  }

  return null;
}

/** Lower-cased, whitespace-collapsed cell text. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  return String(value).replace(/\s+/g, " ").trim();
}

/**
 * Reads the Main Excel workbook into a flat list of row objects.
 * Uses the first sheet and treats the first non-empty row as the header.
 */
export function parseMainWorkbook(workbook: XLSX.WorkBook): Row[] {
  const rows: Row[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
});
    const headerIndex = grid.findIndex(
      (row) => row.filter((c) => cellText(c) !== "").length >= 3,
    );
    if (headerIndex === -1) continue;
    const headers = (grid[headerIndex] ?? []).map((c) => cellText(c));
    for (let i = headerIndex + 1; i < grid.length; i++) {
      const raw = grid[i] ?? [];
      if (raw.every((c) => cellText(c) === "")) continue;
      const record: Row = {};
      headers.forEach((header, index) => {
        if (!header) return;
        record[header] = raw[index] ?? null;
      });
      rows.push(record);
    }
    // Main file data lives in the first data-bearing sheet.
    if (rows.length > 0) break;
  }
  return rows;
}

const PROJECT_LABEL = /^project\b/i;
const DATE_LABEL = /^date\b/i;

/**
 * Looks for a "label: value" pair near the top of a sheet grid.
 * The value may sit in the same row (to the right) or in the row below.
 */
function findLabelledValue(
  grid: unknown[][],
  labelPattern: RegExp,
  maxRows = 15,
): unknown {
  const limit = Math.min(grid.length, maxRows);
  for (let r = 0; r < limit; r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const text = cellText(row[c]).replace(/:$/, "");
      if (!labelPattern.test(text)) continue;

      for (let k = c + 1; k < row.length; k++) {
        if (cellText(row[k]) !== "") return row[k];
      }
      const below = grid[r + 1] ?? [];
      if (cellText(below[c]) !== "") return below[c];
      for (let k = 0; k < below.length; k++) {
        if (cellText(below[k]) !== "") return below[k];
      }
    }
  }
  return null;
}

/**
 * Reads a Project Daily Report workbook: one sheet per reporting date.
 */
export function parseProjectReport(
  workbook: XLSX.WorkBook,
): ProjectReportWorkbook {
  const reports: DailyReport[] = [];
  const projectCandidates: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    const projectValue = cellText(findLabelledValue(grid, PROJECT_LABEL));
    if (projectValue) projectCandidates.push(projectValue);

    const dateValue = findLabelledValue(grid, DATE_LABEL);
    const date = normalizeDate(dateValue) ?? normalizeDate(sheetName);
    if (!date) continue;

    reports.push({ sheet: sheetName, date, grid });
  }

  // Most frequent project string wins.
  const counts = new Map<string, number>();
  for (const candidate of projectCandidates) {
    counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
  }
  let project: string | null = null;
  let best = 0;
  for (const [value, count] of counts) {
    if (count > best) {
      best = count;
      project = value;
    }
  }

  return { project, reports };
}

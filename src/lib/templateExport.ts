/**
 * Fills the "Download Template" workbook with verified daily-report figures.
 *
 * A project's row is filled ONLY when every template heading was verified as
 * matching between the Main Excel and the Daily Report for the chosen date.
 * If any heading differs (or is missing), that project's row is left blank.
 *
 * The template's XML is edited in place, so all styling, the Excel table and
 * column widths from the original template are preserved.
 */

import * as XLSX from "xlsx";
import { normalizeProjectName, scoreProjectMatch } from "@/lib/projectMatching";
import type { ProjectVerificationOutcome } from "@/lib/verification";

export const TEMPLATE_URL = "/download-template.xlsx";

/** Template heading -> comparison rule field that must be "matched". */
export const TEMPLATE_FIELD_MAP: Record<string, string> = {
  "Incoming Transmittals": "Total Transmittals",
  Drawings: "Total Drawings",
  "Technical Submission": "Total Technical Data",
  Pending: "Pending Documents",
  "Close out WF": "Total Close-out Transmittals",
  "Documents in Close out WF": "Total Close-out Documents",
};

export type TemplateRowStatus = "filled" | "mismatch" | "no-report";

export interface TemplateRowResult {
  project: string;
  status: TemplateRowStatus;
  /** Why the row was left blank (headings that differ, missing date, ...). */
  reason?: string;
}

export interface TemplateExportResult {
  fileName: string;
  rows: TemplateRowResult[];
}

/** Every date that at least one successfully verified project reported on. */
export function collectReportDates(projects: ProjectVerificationOutcome[]): string[] {
  const dates = new Set<string>();
  for (const p of projects) {
    if (p.error) continue;
    for (const d of p.comparison.dates) dates.add(d.date);
  }
  return Array.from(dates).sort().reverse();
}

// ---------------------------------------------------------------------------
// Matching verified outcomes to template rows
// ---------------------------------------------------------------------------

function outcomeScore(templateProject: string, outcome: ProjectVerificationOutcome): number {
  const target = normalizeProjectName(templateProject);
  const names = [outcome.matchedProjectCode, outcome.project].filter(Boolean);
  if (names.some((n) => normalizeProjectName(n) === target)) return 101;
  return Math.max(0, ...names.map((n) => scoreProjectMatch(templateProject, n).score));
}

/** Assigns each verified outcome to the single template row it fits best. */
function assignOutcomes(
  templateProjects: string[],
  outcomes: ProjectVerificationOutcome[],
): Map<number, ProjectVerificationOutcome[]> {
  const assigned = new Map<number, ProjectVerificationOutcome[]>();
  for (const outcome of outcomes) {
    if (outcome.error) continue;
    let bestIdx = -1;
    let bestScore = 0;
    templateProjects.forEach((name, idx) => {
      const score = outcomeScore(name, outcome);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx === -1 || bestScore < 65) continue;
    const list = assigned.get(bestIdx) ?? [];
    list.push(outcome);
    assigned.set(bestIdx, list);
  }
  return assigned;
}

type Evaluation =
  | { ok: true; values: Record<string, number> }
  | { ok: false; status: TemplateRowStatus; reason: string };

/** Checks one project's results for the date; all headings must match. */
function evaluate(outcomes: ProjectVerificationOutcome[], date: string): Evaluation {
  const entries = outcomes
    .map((o) => o.comparison.dates.find((d) => d.date === date))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  if (entries.length === 0) {
    return { ok: false, status: "no-report", reason: "No daily report for this date" };
  }

  let firstReason = "";
  for (const entry of entries) {
    if (entry.error) {
      firstReason ||= entry.error;
      continue;
    }
    const values: Record<string, number> = {};
    const problems: string[] = [];
    for (const [heading, field] of Object.entries(TEMPLATE_FIELD_MAP)) {
      const result = entry.results.find((r) => r.field === field);
      if (!result) {
        problems.push(`${heading} (not checked)`);
      } else if (result.status !== "matched") {
        problems.push(`${heading} (report ${result.reportValue ?? "-"} vs main ${result.mainValue ?? "-"})`);
      } else {
        values[heading] = Number(result.reportValue) || 0;
      }
    }
    if (problems.length === 0) return { ok: true, values };
    firstReason ||= `Mismatch: ${problems.join(", ")}`;
  }
  return { ok: false, status: "mismatch", reason: firstReason };
}

// ---------------------------------------------------------------------------
// XLSX (zip + XML) helpers
// ---------------------------------------------------------------------------

type CfbContainer = ReturnType<typeof XLSX.CFB.read>;

/** CFB stores zip entries under a root, so lookups need a leading slash. */
function findEntry(cfb: CfbContainer, path: string) {
  return XLSX.CFB.find(cfb, path.startsWith("/") ? path : `/${path}`);
}

function readZipText(cfb: CfbContainer, path: string): string | null {
  const entry = findEntry(cfb, path);
  if (!entry?.content) return null;
  return new TextDecoder("utf-8").decode(entry.content as Uint8Array);
}

function writeZipText(cfb: CfbContainer, path: string, text: string): void {
  const entry = findEntry(cfb, path);
  if (!entry) throw new Error(`Template part '${path}' not found.`);
  entry.content = new TextEncoder().encode(text) as unknown as typeof entry.content;
  entry.size = (entry.content as Uint8Array).length;
}

/** Resolves the zip path of the first worksheet (normally xl/worksheets/sheet1.xml). */
function firstSheetPath(cfb: CfbContainer): string {
  const workbookXml = readZipText(cfb, "xl/workbook.xml") ?? "";
  const relsXml = readZipText(cfb, "xl/_rels/workbook.xml.rels") ?? "";
  const rid = workbookXml.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (rid) {
    const rel = relsXml.match(new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*>`))?.[0];
    const target = rel?.match(/\bTarget="([^"]+)"/)?.[1];
    if (target) return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  }
  return "xl/worksheets/sheet1.xml";
}

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Writes a numeric value into a cell, keeping the cell's existing style. */
function setNumericCell(sheetXml: string, ref: string, value: number): string {
  const cellRe = new RegExp(`<c r="${ref}"((?:\\s[^>]*?)?)(?:/>|>[\\s\\S]*?</c>)`);
  const match = sheetXml.match(cellRe);
  if (match) {
    const attrs = (match[1] ?? "").replace(/\s+t="[^"]*"/, "");
    return sheetXml.replace(cellRe, `<c r="${ref}"${attrs}><v>${value}</v></c>`);
  }

  // Cell does not exist yet: insert it into its row in column order.
  const [, colLetters, rowNum] = ref.match(/^([A-Z]+)(\d+)$/)!;
  const newCell = `<c r="${ref}"><v>${value}</v></c>`;
  const rowRe = new RegExp(`(<row r="${rowNum}"[^>]*?)(/>|>([\\s\\S]*?)</row>)`);
  const rowMatch = sheetXml.match(rowRe);
  if (!rowMatch) return sheetXml; // Row not present: leave untouched.
  if (rowMatch[2] === "/>") {
    return sheetXml.replace(rowRe, `${rowMatch[1]}>${newCell}</row>`);
  }
  const inner = rowMatch[3] ?? "";
  const target = colIndex(colLetters!);
  const cells = inner.match(/<c r="[A-Z]+\d+"[\s\S]*?(?:\/>|<\/c>)/g) ?? [];
  let newInner = inner + newCell;
  for (const cell of cells) {
    const letters = cell.match(/^<c r="([A-Z]+)/)![1]!;
    if (colIndex(letters) > target) {
      newInner = inner.replace(cell, newCell + cell);
      break;
    }
  }
  return sheetXml.replace(rowRe, `${rowMatch[1]}>${newInner}</row>`);
}

/** Converts YYYY-MM-DD to an Excel date serial number. */
function excelDateSerial(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return (Date.UTC(y!, m! - 1, d!) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

function displayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function buildTemplateWorkbook(
  projects: ProjectVerificationOutcome[],
  date: string,
): Promise<{ data: Uint8Array; result: TemplateExportResult }> {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error("Could not load the download template.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());

  // Read template layout (headings + project names) with SheetJS.
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });
  const headers = (grid[0] ?? []).map((h) => String(h ?? "").trim());
  const columnOf = (name: string) => {
    const idx = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    return idx === -1 ? null : XLSX.utils.encode_col(idx);
  };

  const projectCol = headers.findIndex((h) => h.toLowerCase() === "project");
  if (projectCol === -1) throw new Error("The template has no 'Project' column.");
  const dateCol = columnOf("Date");
  const valueCols = Object.keys(TEMPLATE_FIELD_MAP).map((heading) => {
    const col = columnOf(heading);
    if (!col) throw new Error(`The template is missing the '${heading}' column.`);
    return { heading, col };
  });

  const templateRows: { excelRow: number; project: string }[] = [];
  for (let r = 1; r < grid.length; r++) {
    const name = String(grid[r]?.[projectCol] ?? "").trim();
    if (name) templateRows.push({ excelRow: r + 1, project: name });
  }

  const assigned = assignOutcomes(
    templateRows.map((r) => r.project),
    projects,
  );

  // Edit the worksheet XML directly so formatting is preserved.
  const cfb = XLSX.CFB.read(bytes, { type: "buffer" });
  const sheetPath = firstSheetPath(cfb);
  let sheetXml = readZipText(cfb, sheetPath);
  if (!sheetXml) throw new Error("Could not read the template worksheet.");

  const rows: TemplateRowResult[] = templateRows.map(({ excelRow, project }, idx) => {
    const evaluation = evaluate(assigned.get(idx) ?? [], date);
    if (!evaluation.ok) {
      return { project, status: evaluation.status, reason: evaluation.reason };
    }
    if (dateCol) {
      sheetXml = setNumericCell(sheetXml!, `${dateCol}${excelRow}`, excelDateSerial(date));
    }
    for (const { heading, col } of valueCols) {
      sheetXml = setNumericCell(sheetXml!, `${col}${excelRow}`, evaluation.values[heading] ?? 0);
    }
    return { project, status: "filled" };
  });

  writeZipText(cfb, sheetPath, sheetXml);
  const out = XLSX.CFB.write(cfb, {
    fileType: "zip",
    type: "array",
    compression: true,
  }) as ArrayLike<number>;

  return {
    data: out instanceof Uint8Array ? out : new Uint8Array(out),
    result: { fileName: `Daily Report ${displayDate(date)}.xlsx`, rows },
  };
}

/** Builds the filled template and triggers a browser download. */
export async function downloadTemplate(
  projects: ProjectVerificationOutcome[],
  date: string,
): Promise<TemplateExportResult> {
  const { data, result } = await buildTemplateWorkbook(projects, date);
  const blob = new Blob([data as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return result;
}

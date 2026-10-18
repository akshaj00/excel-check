/**
 * Comparison / counting rules.
 *
 * Add new rules here — each rule receives the Main Excel rows and the daily
 * report sheet for one date, and returns result rows. The UI renders whatever
 * the rules produce, so no field names are hardcoded in components.
 *
 * The exact rules have not been defined yet, so this list is empty.
 */

import type { ComparisonRule, ComparisonResultRow } from "@/lib/comparison";
import { normalizeDate } from "@/lib/excel";

export const incomingTransmittalsRule: ComparisonRule = (context) => {
  const { report, mainRows, date } = context;
  const grid = report.grid;

  let startRow = -1;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    const cell0 = String(row[0] || "").trim().toLowerCase();
    if (cell0.includes("incoming") && cell0.includes("transmittals")) {
      startRow = r;
      break;
    }
  }

  if (startRow === -1) {
    throw new Error("Missing Incoming Transmittals section in the Daily Report.");
  }

  let headerRow = -1;
  for (let r = startRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const cell0 = String(row[0] || "").trim().toLowerCase();
    if (cell0 === "transmittals") {
      headerRow = r;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error("Missing Transmittals header row in the Incoming Transmittals section.");
  }

  let totalRowIdx = -1;
  let reportTransmittalsCount = 0;
  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const cell0 = String(row[0] || "").trim().toLowerCase();
    if (cell0 === "total") {
      totalRowIdx = r;
      break;
    }
    // Count rows that have a transmittal identifier (not empty)
    if (cell0 !== "" && cell0 !== "null") {
      reportTransmittalsCount++;
    }
  }

  if (totalRowIdx === -1) {
    throw new Error("Missing Total row in the Incoming Transmittals section.");
  }

  const totalRow = grid[totalRowIdx] || [];
  
  const reportDrawings = Number(totalRow[1]) || 0;
  const reportTech = Number(totalRow[2]) || 0;
  const reportPending = Number(totalRow[3]) || 0;

  // Main Excel sums
  let mainTransmittals = mainRows.length;
  let mainDrawings = 0;
  let mainTech = 0;
  let mainPending = 0;

  for (const row of mainRows) {
    mainDrawings += Number(row["Drawings (RDS)"]) || 0;
    mainTech += Number(row["Technical data (RDS)"]) || 0;
    mainPending += Number(row["Pending (RDS)"]) || 0;
  }

  const makeRow = (field: string, reportVal: number, mainVal: number): ComparisonResultRow => {
    const difference = mainVal - reportVal;
    return {
      date,
      field,
      reportValue: reportVal,
      mainValue: mainVal,
      difference,
      status: difference === 0 ? "matched" : "changed",
    };
  };

  return [
    makeRow("Total Transmittals", reportTransmittalsCount, mainTransmittals),
    makeRow("Total Drawings", reportDrawings, mainDrawings),
    makeRow("Total Technical Data", reportTech, mainTech),
    makeRow("Pending Documents", reportPending, mainPending),
  ];
};

export const closeoutTransmittalsRule: ComparisonRule = (context) => {
  const { report, mainRows, closeoutRows, allProjectRows, date } = context;
  const grid = report.grid;

  let headerRow = -1;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    const cell0 = String(row[0] || "").trim().toLowerCase();
    if (cell0 === "transmittals") {
      headerRow = r;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error("Missing Transmittals header row in the Daily Report.");
  }

  // Identify close-out columns in report
  const hRow = grid[headerRow] || [];
  let closeoutTransmittalCol = -1;
  let closeoutDocsColReport = -1;
  for (let c = 1; c < hRow.length; c++) {
    const text = String(hRow[c] || "").trim().toLowerCase();
    if (text === "transmittals" && closeoutTransmittalCol === -1) {
      closeoutTransmittalCol = c;
    }
    if (text.includes("documents") && !text.includes("pending") && closeoutDocsColReport === -1) {
      closeoutDocsColReport = c;
    }
  }

  // Fallback defaults if header columns weren't identified by name
  if (closeoutTransmittalCol === -1) closeoutTransmittalCol = 5;
  if (closeoutDocsColReport === -1) closeoutDocsColReport = 6;

  let totalRowIdx = -1;
  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const cell0 = String(row[0] || "").trim().toLowerCase();
    if (cell0 === "total") {
      totalRowIdx = r;
      break;
    }
  }

  let reportCloseoutTransmittalsCount = 0;
  let fallbackDocsSum = 0;
  const endRow = totalRowIdx !== -1 ? totalRowIdx : grid.length;
  for (let r = headerRow + 1; r < endRow; r++) {
    const row = grid[r] || [];
    const tVal = String(row[closeoutTransmittalCol] ?? "").trim();
    if (tVal !== "" && tVal.toLowerCase() !== "null" && tVal.toLowerCase() !== "undefined") {
      reportCloseoutTransmittalsCount++;
    }
    fallbackDocsSum += Number(row[closeoutDocsColReport]) || 0;
  }

  const totalRow = totalRowIdx !== -1 ? grid[totalRowIdx] || [] : [];
  const totalCell = totalRow[closeoutDocsColReport];
  const reportCloseoutDocs =
    totalCell !== undefined && totalCell !== null && !isNaN(Number(totalCell))
      ? Number(totalCell)
      : fallbackDocsSum;

  // Main Excel rows to check:
  // If closeoutRows is passed and has items, use it.
  // Else if allProjectRows is available, look for a close-out date column and filter by that date.
  // Else fallback to mainRows.
  let candidateRows = closeoutRows ?? [];
  if (candidateRows.length === 0 && allProjectRows && allProjectRows.length > 0) {
    const sampleHeaders = Object.keys(allProjectRows[0] || {});
    const closeoutDateCol = sampleHeaders.find((h) => /close[-\s]*out\s*date/i.test(h));
    if (closeoutDateCol) {
      candidateRows = allProjectRows.filter(
        (r) => normalizeDate(r[closeoutDateCol]) === date,
      );
    }
  }
  if (candidateRows.length === 0 && (!closeoutRows || closeoutRows.length === 0)) {
    candidateRows = mainRows;
  }

  const sampleRow = candidateRows[0] || (allProjectRows ? allProjectRows[0] : mainRows[0]) || {};
  const sampleHeaders = Object.keys(sampleRow);
  const closeoutRefCol =
    sampleHeaders.find((h) => /trn\s*close[-\s]*out\s*ref/i.test(h)) ||
    "TRN Close-out Ref. (RDS)";
  const closeoutDocsCol =
    sampleHeaders.find((h) => /(total\s*)?close[-\s]*out\s*doc/i.test(h)) ||
    "Total Close-out Documents (RDS)";

  let mainCloseoutRefCount = 0;
  let mainCloseoutDocsSum = 0;

  for (const row of candidateRows) {
    const ref = row[closeoutRefCol];
    if (
      ref !== null &&
      ref !== undefined &&
      String(ref).trim() !== "" &&
      String(ref).trim().toLowerCase() !== "null"
    ) {
      mainCloseoutRefCount++;
    }
    mainCloseoutDocsSum += Number(row[closeoutDocsCol]) || 0;
  }

  const makeRow = (field: string, reportVal: number, mainVal: number): ComparisonResultRow => {
    const difference = mainVal - reportVal;
    return {
      date,
      field,
      reportValue: reportVal,
      mainValue: mainVal,
      difference,
      status: difference === 0 ? "matched" : "changed",
    };
  };

  return [
    makeRow("Total Close-out Transmittals", reportCloseoutTransmittalsCount, mainCloseoutRefCount),
    makeRow("Total Close-out Documents", reportCloseoutDocs, mainCloseoutDocsSum),
  ];
};

export const COMPARISON_RULES: ComparisonRule[] = [
  incomingTransmittalsRule,
  closeoutTransmittalsRule,
];

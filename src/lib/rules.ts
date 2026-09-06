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
  
  console.log(`\nDate: ${date}\n`);
  console.log(`Daily Report source:`);
  console.log(`Total Transmittals = ${reportTransmittalsCount}`);
  console.log(`Drawings = ${reportDrawings}`);
  console.log(`Technical Data = ${reportTech}`);
  console.log(`Pending Documents = ${reportPending}\n`);
  console.log(`Main Excel filtered rows = ${mainRows.length}\n`);
  console.log(`Main Excel calculated:`);
  console.log(`Transmittals = ${mainTransmittals}`);
  console.log(`Drawings = ${mainDrawings}`);
  console.log(`Technical Data = ${mainTech}`);
  console.log(`Pending = ${mainPending}`);

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

export const COMPARISON_RULES: ComparisonRule[] = [incomingTransmittalsRule];

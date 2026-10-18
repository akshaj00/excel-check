import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import { normalizeDate } from "./src/lib/excel";

async function main() {
  const projectFile = path.resolve("./test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx");
  const mainFile = path.resolve("./test-data/Project file.xlsx");

  // Read Daily Reportt
  const projBuf = fs.readFileSync(projectFile);
  const projWb = XLSX.read(projBuf, { cellDates: true });
  const sheet = projWb.Sheets["3-08"];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

  let startRow = -1;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    const cell0 = String(row[0] || "").trim().toLowerCase();
    if (cell0.includes("incoming") && cell0.includes("transmittals")) {
      startRow = r;
      break;
    }
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

  const dailyTransmittals: string[] = [];
  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const cell0 = String(row[0] || "").trim();
    if (cell0.toLowerCase() === "total") break;
    if (cell0 !== "" && cell0.toLowerCase() !== "null") {
      dailyTransmittals.push(cell0);
    }
  }

  console.log("Daily Report Transmittals");
  console.log("-------------------------");
  dailyTransmittals.forEach((t, i) => console.log(`${i + 1}. ${t}`));
  console.log("");

  // Read Main Excel
  const mainBuf = fs.readFileSync(mainFile);
  const mainWb = XLSX.read(mainBuf, { cellDates: true });
  const mainRows = XLSX.utils.sheet_to_json<Record<string,unknown>>(mainWb.Sheets[mainWb.SheetNames[0]], { raw: false, defval: null });

  console.log("Main Excel matching records");
  console.log("---------------------------");

  const expectedSet = new Set(dailyTransmittals.map(t => {
      // Typically the Transmittal ID is just the first part before the colon or space
      // E.g. "Auspan-TRANSMIT-000571: Precast shop drawings..."
      const match = t.match(/^([^:\s]+)/);
      return match ? match[1] : t;
  }));

  const mainMatches = [];
  const foundTransmittals = new Set();
  
  for (let i = 0; i < mainRows.length; i++) {
    const row = mainRows[i];
    const tVal = String(row["Transmittals (RDS)"] || "").trim();
    if (!tVal) continue;
    
    // We want to see if any of our expected daily transmittals matches this row
    let isMatch = false;
    for (const exp of expectedSet) {
       if (tVal.includes(exp) || exp.includes(tVal)) {
           isMatch = true;
           foundTransmittals.add(exp);
           break;
       }
    }
    
    // As a fallback, check the full string
    for (const dt of dailyTransmittals) {
       if (dt.includes(tVal) || tVal.includes(dt)) {
           isMatch = true;
           foundTransmittals.add(dt);
           break;
       }
    }

    if (isMatch) {
       mainMatches.push({
          rowIdx: i + 2, // 0-based to 1-based, plus header row
          transmittal: tVal,
          project: String(row["Project"] || ""),
          rawDate: row["Receipt Date (RDS)"],
          normDate: row["Receipt Date (RDS)"] ? normalizeDate(row["Receipt Date (RDS)"]) : "null"
       });
    }
  }

  mainMatches.forEach((m, i) => {
     console.log(`${i + 1}. Row ${m.rowIdx} -> ${m.transmittal} -> ${m.project} -> ${m.rawDate} (Norm: ${m.normDate})`);
  });

  console.log("");
  console.log("Excluded Records Analysis");
  console.log("-------------------------");
  
  // The current filter logic:
  // Project normalized to "greystar" (so substring match with GREYSTAR)
  // normalizeDate === "2026-08-03"
  
  for (const m of mainMatches) {
     const projMatch = String(m.project).toUpperCase() === "GREYSTAR";
     const dateMatch = m.normDate === "2026-08-03";
     if (!projMatch || !dateMatch) {
         console.log(`Main Excel row: ${m.rowIdx}`);
         console.log(`Project: ${m.project}`);
         console.log(`Receipt Date (RDS): ${m.rawDate} (Norm: ${m.normDate})`);
         console.log(`Transmittals (RDS): ${m.transmittal}`);
         const reasons = [];
         if (!projMatch) reasons.push(`Project "${m.project}" is not "GREYSTAR"`);
         if (!dateMatch) reasons.push(`Normalized Receipt Date "${m.normDate}" is not "2026-08-03"`);
         console.log(`Reason current filter excludes it: ${reasons.join(" AND ")}\n`);
     }
  }

}

main().catch(console.error);

import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import { parseMainWorkbook, parseProjectReport, normalizeDate } from "./src/lib/excel";
import { resolveProjectMatch, findProjectColumn } from "./src/lib/projectMatching";
import { findDateColumn, filterByProject, groupByDate } from "./src/lib/verification";
import { analyzeProjectData, type DateBucket } from "./src/lib/comparison";

async function main() {
  console.log("================================");
  console.log("REAL DATA VERIFICATION");
  console.log("================================");
  
  const mainFile = path.resolve("./test-data/Project file.xlsx");
  const projectFile = path.resolve("./test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx");

  console.log("\nReading files...");
  const mainBuf = fs.readFileSync(mainFile);
  const projBuf = fs.readFileSync(projectFile);
  const mainWb = XLSX.read(mainBuf, { cellDates: true });
  const projWb = XLSX.read(projBuf, { cellDates: true });
  
  console.log("\nParsing Daily Report...");
  const projParsed = parseProjectReport(projWb);
  
  console.log("\nProject detected:");
  console.log(`Detected value: ${projParsed.project}`);
  
  const firstSheet = projParsed.reports[0];
  console.log(`\nSource Sheet: ${firstSheet?.sheet}`);
  
  console.log("\nParsing Main Excel...");
  const mainRows = parseMainWorkbook(mainWb);
  console.log(`Main Excel total rows: ${mainRows.length}`);
  
  const headers = Object.keys(mainRows[0] ?? {});
  const projectColumn = findProjectColumn(headers);
  const dateColumn = findDateColumn(headers);
  
  console.log(`Main Excel Project Column: ${projectColumn}`);
  console.log(`Main Excel Date Column: ${dateColumn}`);
  
  let resolvedProject = "";
  try {
    const candidates = Array.from(new Set(mainRows.map(r => String(r[projectColumn!] ?? "")).filter(val => val !== "null" && val !== "undefined" && val !== "")));
    resolvedProject = resolveProjectMatch(projParsed.project as string, candidates);
    console.log(`\nProject matching:\nPASS (Resolved to: ${resolvedProject})`);
  } catch (err: any) {
    console.log(`\nProject matching:\nFAIL (${err.message})`);
  }
  
  console.log(`\nNumber of report sheets:\n${projParsed.reports.length}`);
  
  console.log("\nDate detection:");
  console.log("Sheet | Detected Date | Normalized Date");
  let dateDetectionPass = true;
  const DATE_LABEL = /^date\b/i;
  for (const rep of projParsed.reports) {
    let rawDateVal: any = "none";
    for (let r=0; r<15 && r<rep.grid.length; r++) {
      const row = rep.grid[r] || [];
      for (let c=0; c<row.length; c++) {
        if (DATE_LABEL.test(String(row[c]).replace(/\s+/g, " ").trim().replace(/:$/, ""))) {
           rawDateVal = row[c+1] || rep.grid[r+1]?.[c];
        }
      }
    }
    let normDate = normalizeDate(rep.date) || "";
    console.log(`${rep.sheet} | raw: ${rawDateVal} | final: ${normDate}`);
    rep.date = normDate;
    if (!rep.date || rep.date === "NaN-NaN-NaN" || rep.date.includes("NaN")) {
      dateDetectionPass = false;
    }
  }
  console.log(dateDetectionPass ? "PASS" : "FAIL");

  console.log(`\nReceipt Date (RDS) matching:\n${dateColumn === "Receipt Date (RDS)" ? "PASS" : "FAIL"}`);

  if (resolvedProject && dateColumn === "Receipt Date (RDS)") {
    console.log("\nCombined Project + Date filtering:");
    let combinedPass = true;
    let projectRows = [];
    try {
        projectRows = filterByProject(mainRows, projParsed.project as string);
    } catch(e: any) {
        console.log(`FAIL (${e.message})`);
        combinedPass = false;
    }
    
    if (combinedPass) {
        const grouped = groupByDate(projectRows);
        console.log("PASS");
        
        const buckets: DateBucket[] = projParsed.reports.map(report => ({
            report,
            mainRows: grouped.get(report.date) ?? []
        }));
        
        const comparison = analyzeProjectData(projParsed.project as string, buckets);
        
        console.log("\n=================================");
        console.log("COMPARISON RESULTS");
        console.log("=================================\n");
        
        for (const d of comparison.dates) {
            console.log(d.date);
            console.log("┌──────────────────────────┬─────────────┬─────────────┬────────────┐");
            console.log("│ Metric                   │ Daily Report│ Main Excel  │ Status     │");
            console.log("├──────────────────────────┼─────────────┼─────────────┼────────────┤");
            
            for (const r of d.results) {
                const metric = r.field.padEnd(24);
                const dr = String(r.reportValue ?? 0).padEnd(11);
                const mx = String(r.mainValue ?? 0).padEnd(11);
                let diffStr = String(r.difference ?? 0);
                if ((r.difference ?? 0) > 0) diffStr = "+" + diffStr;
                const stat = (r.status === "matched" ? "Match" : `Mismatch(${diffStr})`).padEnd(10);
                console.log(`│ ${metric} │ ${dr} │ ${mx} │ ${stat} │`);
            }
            console.log("└──────────────────────────┴─────────────┴─────────────┴────────────┘\n");
        }
    }
  } else {
    console.log("\nCombined Project + Date filtering:\nFAIL");
  }
  
}

main().catch(console.error);

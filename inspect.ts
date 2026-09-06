import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

async function main() {
  const projectFile = path.resolve("./test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx");
  const projBuf = fs.readFileSync(projectFile);
  const projWb = XLSX.read(projBuf, { cellDates: true });
  
  const sheetsToInspect = ["19-08", "20-08"];
  const DATE_LABEL = /^date\b/i;

  for (const sheetName of sheetsToInspect) {
    console.log(`\nInspecting sheet: ${sheetName}`);
    const sheet = projWb.Sheets[sheetName];
    if (!sheet) {
      console.log(`Sheet not found.`);
      continue;
    }
    
    // Let's get the raw json to find where "Date:" is
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: null,
    });
    
    console.log("Daily Report Grid (first 30 rows):");
    for (let i = 0; i < Math.min(30, grid.length); i++) {
       console.log(`Row ${i}:`, JSON.stringify(grid[i]));
    }
  }

  const mainFile = path.resolve("./test-data/Project file.xlsx");
  const mainBuf = fs.readFileSync(mainFile);
  const mainWb = XLSX.read(mainBuf, { cellDates: true });
  const mainRows = XLSX.utils.sheet_to_json<Record<string,unknown>>(mainWb.Sheets[mainWb.SheetNames[0]], { raw: false, defval: null });
  console.log("\nMain Excel Headers:");
  if (mainRows.length > 0) {
      console.log(Object.keys(mainRows[0]));
      console.log("Main Excel first 2 rows:");
      console.log(mainRows[0]);
      console.log(mainRows[1]);
  }

}

main().catch(console.error);

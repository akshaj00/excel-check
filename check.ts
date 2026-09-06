import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const projectFile = path.resolve("./test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx");
const projBuf = fs.readFileSync(projectFile);
const projWb = XLSX.read(projBuf, { cellDates: true });
const grid = XLSX.utils.sheet_to_json<unknown[]>(projWb.Sheets["3-08"], { header: 1, defval: null });
console.log(JSON.stringify(grid.slice(0, 30), null, 2));

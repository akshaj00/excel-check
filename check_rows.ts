import * as XLSX from 'xlsx';
import * as fs from 'fs';

function main() {
  const mainPath = './test-data/Project file.xlsx';
  const mainBuf = fs.readFileSync(mainPath);
  const mainWb = XLSX.read(mainBuf, { cellDates: true });
  const mainSheetName = mainWb.SheetNames[0]; 
  const mainSheet = mainWb.Sheets[mainSheetName];
  const mainData = XLSX.utils.sheet_to_json<any>(mainSheet, { header: 1 });
  
  const rowsToCheck = [4593, 4604, 4605, 4607, 4630, 4631, 4633, 4641];
  
  for (const rowNum of rowsToCheck) {
      const row = mainData[rowNum - 1]; // 0-indexed
      console.log(`Row ${rowNum}:`);
      console.log(`  Project: ${row[0]}`); // Assuming project is col 0
      console.log(`  Date: ${row[1]}`); // Assuming date is col 1
      console.log(`  Transmittal: ${row[2]}`); // Assuming transmittal is col 2
      console.log(`  Status: ${row[3]}`); 
      // let's just print the whole row nicely
      console.log(JSON.stringify(row).substring(0, 200));
  }
}

main();

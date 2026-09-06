import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { parseMainWorkbook, parseProjectReport } from './src/lib/excel';
import { filterByProject, groupByDate } from './src/lib/verification';

async function main() {
  const mainPath = './test-data/Project file.xlsx';
  const dailyPath = './test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx';
  
  const mainBuf = fs.readFileSync(mainPath);
  const mainWb = XLSX.read(mainBuf, { type: 'buffer' }); // cellDates removed
  
  const dailyBuf = fs.readFileSync(dailyPath);
  const dailyWb = XLSX.read(dailyBuf, { type: 'buffer' });
  
  const mainRows = parseMainWorkbook(mainWb);
  const filtered = filterByProject(mainRows, "352-MAC - Greystar");
  const grouped = groupByDate(filtered);
  
  const dailyReports = parseProjectReport(dailyWb).reports;
  
  for (const dateStr of ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06']) {
     const bucket = grouped.get(dateStr) || [];
     console.log(`\nDate: ${dateStr}`);
     console.log(`Main Excel filtered rows = ${bucket.length}`);
     
     if (dateStr === '2026-08-03') {
        bucket.forEach((row, i) => {
           // rowNumber is index + 2 usually, but we filtered. Let's just print project and transmittal.
           const transmittal = row['transmittals (rds)'] || row['transmittal'];
           console.log(`  -> ${transmittal}`);
        });
     }
  }
}

main().catch(console.error);

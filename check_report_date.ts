import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { parseProjectReport } from './src/lib/excel';

async function main() {
  const dailyPath = './test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx';
  const dailyBuf = fs.readFileSync(dailyPath);
  const dailyWb = XLSX.read(dailyBuf, { cellDates: true, type: 'buffer' });
  
  const dailyReports = parseProjectReport(dailyWb);
  dailyReports.reports.forEach(r => {
     if (r.sheet === '3-08') {
         console.log(`Daily report 3-08 date is: ${r.date}`);
     }
  });
}

main().catch(console.error);

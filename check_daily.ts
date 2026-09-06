import * as XLSX from 'xlsx';
import * as fs from 'fs';

function main() {
  const dailyPath = './test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx';
  const dailyBuf = fs.readFileSync(dailyPath);
  const dailyWb = XLSX.read(dailyBuf, { cellDates: true });
  
  if (dailyWb.SheetNames.includes('3-08')) {
    const sheet = dailyWb.Sheets['3-08'];
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
    for (let r = 0; r < Math.min(20, data.length); r++) {
       console.log(`Row ${r}: ${JSON.stringify(data[r])}`);
    }
  }
}

main();

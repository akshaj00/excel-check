import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function main() {
  const dailyPath = './test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx';
  const dailyBuf = fs.readFileSync(dailyPath);
  const dailyWb = XLSX.read(dailyBuf, { cellDates: true, type: 'buffer' });
  
  if (dailyWb.SheetNames.includes('4-08')) {
    const sheet = dailyWb.Sheets['4-08'];
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
    console.log('Daily Report 4-08 Transmittals:');
    for (let r = 5; r < data.length; r++) {
       const val = data[r][0];
       if (val && typeof val === 'string' && val.toLowerCase() !== 'total' && val.trim() !== '') {
           console.log(`  ${val.trim()}`);
       }
    }
  }
}

main().catch(console.error);

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { parseMainWorkbook } from './src/lib/excel';
import { filterByProject, groupByDate } from './src/lib/verification';

async function main() {
  const mainPath = './test-data/Project file.xlsx';
  const mainBuf = fs.readFileSync(mainPath);
  const mainWb = XLSX.read(mainBuf, { cellDates: true, type: 'buffer' });
  
  const mainRows = parseMainWorkbook(mainWb);
  const filtered = filterByProject(mainRows, "352-MAC - Greystar");
  const grouped = groupByDate(filtered);
  
  const aug3Bucket = grouped.get("2026-08-03") || [];
  console.log(`August 3rd bucket has ${aug3Bucket.length} rows`);
  aug3Bucket.forEach((row, i) => {
     console.log(`  ${i+1}. ${JSON.stringify(row).substring(0, 150)}`);
  });
}

main().catch(console.error);

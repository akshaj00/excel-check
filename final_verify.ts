import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { normalizeDate, parseMainWorkbook, parseProjectReport, readWorkbook } from './src/lib/excel';
import { filterByProject, groupByDate } from './src/lib/verification';

async function main() {
  const parsedSerial = normalizeDate(46237);
  console.log(`Test 2: normalizeDate(46237) = ${parsedSerial}`);

  const mainBuf = fs.readFileSync('./test-data/Project file.xlsx');
  const mainWb = XLSX.read(mainBuf, { type: 'buffer' });
  const mainRows = parseMainWorkbook(mainWb);
  const filtered = filterByProject(mainRows, "352-MAC - Greystar");
  const grouped = groupByDate(filtered);
  
  const aug3Bucket = grouped.get('2026-08-03') || [];
  console.log(`\nTest 3 (Aug 3 rows): ${aug3Bucket.length}`);
  aug3Bucket.forEach((row, i) => {
     const entries = Object.entries(row);
     const transmittalEntry = entries.find(([k]) => k.toLowerCase().includes('transmittal'));
     console.log(`  -> ${transmittalEntry ? transmittalEntry[1] : 'unknown'}`);
  });
}

main().catch(console.error);

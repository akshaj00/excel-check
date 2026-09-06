import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function main() {
  const mainPath = './test-data/Project file.xlsx';
  const mainBuf = fs.readFileSync(mainPath);
  
  // Read WITHOUT cellDates: true to see raw values
  const wbRaw = XLSX.read(mainBuf, { type: 'buffer' });
  const sheetRaw = wbRaw.Sheets[wbRaw.SheetNames[0]];
  
  // Read WITH cellDates: true to see what the app currently sees
  const wbDates = XLSX.read(mainBuf, { type: 'buffer', cellDates: true });
  const sheetDates = wbDates.Sheets[wbDates.SheetNames[0]];
  
  // The row we want is 4604. In 0-indexed terms, if row 1 is header, row 4604 is at index 4603.
  // We need to find the column for Receipt Date.
  const headerRow = XLSX.utils.sheet_to_json<any>(sheetRaw, { header: 1 })[0] || [];
  let dateColIdx = headerRow.findIndex((h: any) => String(h || '').toLowerCase().includes('receipt date (rds)'));
  if (dateColIdx === -1) dateColIdx = headerRow.findIndex((h: any) => String(h || '').toLowerCase().includes('date'));
  
  // Convert column index to Excel column letter (e.g. 0 -> A, 1 -> B)
  const colLetter = XLSX.utils.encode_col(dateColIdx);
  const cellAddress = `${colLetter}4604`;
  
  console.log(`Checking cell ${cellAddress}`);
  
  const cellRaw = sheetRaw[cellAddress];
  const cellDate = sheetDates[cellAddress];
  
  console.log('\n--- WITHOUT cellDates: true ---');
  console.log(cellRaw);
  
  console.log('\n--- WITH cellDates: true ---');
  console.log(cellDate);
}

main().catch(console.error);

import * as XLSX from 'xlsx';
import * as fs from 'fs';

function main() {
  const dailyPath = './test-data/352 MAC- DOCUMENT CONTROLLER DAILY REPORT -AUG.xlsx';
  const mainPath = './test-data/Project file.xlsx';

  const dailyBuf = fs.readFileSync(dailyPath);
  const dailyWb = XLSX.read(dailyBuf, { cellDates: true });
  
  const dailyTransmittals: string[] = [];
  
  if (dailyWb.SheetNames.includes('3-08')) {
    const sheet = dailyWb.Sheets['3-08'];
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
    for (let r = 5; r < data.length; r++) {
       const val = data[r][0];
       if (val && typeof val === 'string' && val.toLowerCase() !== 'total') {
           const match = val.match(/([A-Za-z0-9&]+-TRANSMIT-\d+)/);
           if (match) {
               dailyTransmittals.push(match[1]);
           }
       }
    }
  }
  
  console.log('Daily Report Transmittals (Aug 3):');
  dailyTransmittals.forEach((t, i) => console.log(`${i + 1}. ${t}`));
  
  const mainBuf = fs.readFileSync(mainPath);
  const mainWb = XLSX.read(mainBuf, { cellDates: true });
  const mainSheetName = mainWb.SheetNames[0]; 
  const mainSheet = mainWb.Sheets[mainSheetName];
  const mainData = XLSX.utils.sheet_to_json<any>(mainSheet, { header: 1 });
  
  let headers: string[] = [];
  let headerRowIdx = -1;
  for (let r = 0; r < 20; r++) {
      if (!mainData[r]) continue;
      const rowStrings = mainData[r].map((c: any) => String(c || '').toLowerCase());
      if (rowStrings.some((c: string) => c.includes('transmittal'))) {
          headers = rowStrings;
          headerRowIdx = r;
          break;
      }
  }
  
  let transmittalColMain = headers.findIndex(h => h.includes('transmittal'));
  let receiptDateColMain = headers.findIndex(h => h.includes('receipt date (rds)') || h.includes('rds date'));
  if (receiptDateColMain === -1) receiptDateColMain = headers.findIndex(h => h.includes('date'));
  let projectColMain = headers.findIndex(h => h.includes('project'));
  
  console.log('\nMain Excel matching records:');
  const mainMatchingTransmittals: any[] = [];
  
  for (let r = headerRowIdx + 1; r < mainData.length; r++) {
      const row = mainData[r];
      if (!row) continue;
      
      const transmittalRaw = row[transmittalColMain];
      if (!transmittalRaw) continue;
      
      const transmittalStr = String(transmittalRaw).trim();
      const projectStr = String(row[projectColMain] || '').trim();
      const dateRaw = row[receiptDateColMain];
      
      const matchedDaily = dailyTransmittals.find(dt => transmittalStr.includes(dt));
      
      if (matchedDaily) {
          mainMatchingTransmittals.push({
             rowNumber: r + 1,
             transmittals: transmittalStr,
             project: projectStr,
             receiptDate: dateRaw,
             matchedDaily
          });
      }
  }
  
  let idx = 1;
  for (const row of mainMatchingTransmittals) {
      let dateStr = row.receiptDate;
      if (row.receiptDate instanceof Date) {
          dateStr = row.receiptDate.toISOString();
      }
      console.log(`${idx++}. Row ${row.rowNumber} -> ${row.transmittals} -> ${row.project} -> ${dateStr}`);
  }
  
  console.log('\nIdentifying Excluded Records:');
  for (const row of mainMatchingTransmittals) {
      let isAug3 = false;
      let dateParsed = 'N/A';
      if (row.receiptDate) {
         if (row.receiptDate instanceof Date) {
             dateParsed = row.receiptDate.toISOString();
             if (dateParsed.startsWith('2026-08-03') || dateParsed.startsWith('2026-03-08')) isAug3 = true; // allow both just in case
         } else {
             dateParsed = String(row.receiptDate);
             if (dateParsed.includes('03/08') || dateParsed.includes('8/3/2026') || dateParsed.includes('2026-08-03')) {
                 isAug3 = true;
             }
         }
      }
      
      let isGreystar = false;
      if (row.project && typeof row.project === 'string' && row.project.toUpperCase().includes('GREYSTAR')) {
          isGreystar = true;
      }
      
      if (!isAug3 || !isGreystar) {
          console.log(`Main Excel row: ${row.rowNumber}`);
          console.log(`Project: ${row.project}`);
          console.log(`Receipt Date (RDS): ${row.receiptDate instanceof Date ? row.receiptDate.toISOString() : row.receiptDate}`);
          console.log(`Transmittals (RDS): ${row.transmittals}`);
          console.log(`Reason current filter excludes it: ${!isAug3 ? 'Date mismatch' : ''} ${!isGreystar ? 'Project mismatch' : ''}`);
          console.log('---');
      }
  }
}

main();

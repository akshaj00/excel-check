import { extractDailyReports } from './src/lib/daily-report';
import { extractMainExcelData } from './src/lib/excel';

async function main() {
  const dailyReportsData = await extractDailyReports('./data/daily-reports');
  const mainExcelData = await extractMainExcelData('./data/main-excel/MASTER LOG - 2026.xlsx');

  const aug3DailyReports = dailyReportsData.filter(dr => {
    const drDate = new Date(dr.date).toISOString().split('T')[0];
    return drDate === '2026-08-03' && dr.project === '352-MAC - Greystar';
  });

  console.log('Daily Report Transmittals for Aug 3, 2026:');
  const dailyTransmittals = [];
  aug3DailyReports.forEach(report => {
    report.items.forEach(item => {
      if (item.transmittal) {
         dailyTransmittals.push(item.transmittal);
      }
    });
  });
  console.log(dailyTransmittals.map((t, i) => `${i + 1}. ${t}`).join('\n'));
  
  console.log('\nMain Excel matching records for Daily Report Transmittals:');
  const mainMatchingTransmittals = mainExcelData.filter(row => {
    if (!row.transmittals) return false;
    const transmittals = row.transmittals.split(/[\n,]/).map(t => t.trim()).filter(t => t);
    return transmittals.some(t => dailyTransmittals.includes(t));
  });

  mainMatchingTransmittals.forEach((row, i) => {
    console.log(`${i + 1}. Row ${row.rowNumber || '?'} -> ${row.transmittals} -> ${row.project} -> ${row.receiptDate}`);
  });
  
  console.log('\nMain Excel records for GREYSTAR on Aug 3:');
  const mainGreystarAug3 = mainExcelData.filter(row => {
     let isAug3 = false;
     if (row.receiptDate) {
         const date = new Date(row.receiptDate);
         if (!isNaN(date.getTime()) && date.toISOString().split('T')[0] === '2026-08-03') {
             isAug3 = true;
         }
     }
     
     let isGreystar = false;
     if (row.project && typeof row.project === 'string' && row.project.toUpperCase().includes('GREYSTAR')) {
         isGreystar = true;
     }
     
     return isAug3 && isGreystar;
  });
  
  mainGreystarAug3.forEach((row, i) => {
    console.log(`${i + 1}. Row ${row.rowNumber || '?'} -> ${row.transmittals} -> ${row.project} -> ${row.receiptDate}`);
  });
  
  console.log('\nPotential Missing Records (Matched by Transmittal but missed by Date/Project):');
  mainMatchingTransmittals.forEach(row => {
      let isAug3 = false;
      if (row.receiptDate) {
         const date = new Date(row.receiptDate);
         if (!isNaN(date.getTime()) && date.toISOString().split('T')[0] === '2026-08-03') {
             isAug3 = true;
         }
      }
      
      let isGreystar = false;
      if (row.project && typeof row.project === 'string' && row.project.toUpperCase().includes('GREYSTAR')) {
          isGreystar = true;
      }
      
      if (!isAug3 || !isGreystar) {
          console.log(`Row: ${row.rowNumber || '?'}`);
          console.log(`Project: ${row.project}`);
          console.log(`Receipt Date (RDS): ${row.receiptDate} (Parsed: ${row.receiptDate ? new Date(row.receiptDate).toISOString() : 'N/A'})`);
          console.log(`Transmittals (RDS): ${row.transmittals}`);
          console.log(`Reason excluded: ${!isAug3 ? 'Date mismatch/invalid' : ''} ${!isGreystar ? 'Project mismatch' : ''}`);
          console.log('---');
      }
  });
}

main().catch(console.error);

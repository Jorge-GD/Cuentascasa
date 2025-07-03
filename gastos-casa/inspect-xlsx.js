const XLSX = require('xlsx');
const fs = require('fs');

const buffer = fs.readFileSync('../ejemplo/movements-172025.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer' });
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('📊 Estructura del archivo XLSX:');
console.log('- Hojas:', workbook.SheetNames);
console.log('- Filas totales:', data.length);
console.log('\n🔍 Primeras 10 filas:');
data.slice(0, 10).forEach((row, i) => {
  console.log(`Fila ${i}: [${Array.isArray(row) ? row.join(' | ') : row}]`);
});
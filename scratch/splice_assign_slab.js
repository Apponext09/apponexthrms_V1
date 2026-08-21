const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/features/payroll/pages/PayrollProcessing.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('// ── Tab 4: Assign Salary Slab to Employees (Bulk Management) ──────────────'));
const endIndex = lines.findIndex(l => l.includes('// ── Tab 2: Process Payroll Register Table ─────────────────────────────────'));

console.log('startIndex:', startIndex, 'endIndex:', endIndex);

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Successfully spliced out AssignSlabTab component!');
}

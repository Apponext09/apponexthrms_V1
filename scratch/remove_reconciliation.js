const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/features/payroll/pages/PayrollProcessing.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original length:', content.length);

// 1. Remove reconciliation states
content = content.replace(/\s*const \[reconciliation, setReconciliation\] = useState<any \| null>\(null\);/g, '');
content = content.replace(/\s*const \[reconciliationLoading, setReconciliationLoading\] = useState\(false\);/g, '');

// 2. Remove handleReconciliation function
const fnRegex = /\s*const handleReconciliation = async \(\) => {[\s\S]*?finally {\s*setReconciliationLoading\(false\);\s*}\s*};/g;
content = content.replace(fnRegex, '');

// 3. Remove reconciliation button
const btnRegex = /\s*<button\s*onClick=\{handleReconciliation\}[\s\S]*?<\/button>/g;
content = content.replace(btnRegex, '');

// 4. Remove reconciliation modal block
const modalRegex = /\s*\{reconciliation && \([\s\S]*?<\/div>\s*\)\}/g;
content = content.replace(modalRegex, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated length:', content.length);

// Check if any reconciliation remains
const remaining = content.split('\n').filter(l => l.toLowerCase().includes('reconciliation'));
console.log('Remaining reconciliation occurrences:', remaining.length);
if (remaining.length > 0) {
  console.log(remaining);
}

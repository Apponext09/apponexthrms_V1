const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../client/src/features/payroll/pages/MassSalaryStructureUploadPage.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace tab border and text colors
content = content.replace(/border-indigo-600 text-indigo-600 bg-indigo-50\/50 dark:bg-indigo-950\/20/g, 'border-primary text-primary bg-primary/5');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('MassSalaryStructureUploadPage.tsx color theme aligned!');

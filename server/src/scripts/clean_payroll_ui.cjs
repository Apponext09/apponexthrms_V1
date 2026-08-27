const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/src/features/payroll/pages/PayrollProcessing.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Remove removePagination
const remPagRegex = /<div className="flex items-center gap-2 pb-2">[\s\S]*?id="removePagination"[\s\S]*?<\/div>/g;
content = content.replace(remPagRegex, '');

// 2. Remove bypassCache
const bypassRegex = /<div className="flex items-center gap-2 ml-2">[\s\S]*?id="bypassCache"[\s\S]*?<\/div>/g;
content = content.replace(bypassRegex, '');

// 3. Remove note
const noteRegex = /\{\/\* Note \*\/\}[\s\S]*?<p className="text-\[11px\] font-bold text-rose-600 pt-1">[\s\S]*?<\/p>/g;
content = content.replace(noteRegex, '');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully removed all target elements with regex!');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/features/payroll/pages/PayrollProcessing.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove assign_slab from MainTab type
content = content.replace("type MainTab = 'process' | 'payroll_download' | 'payroll_runs' | 'assign_slab';", "type MainTab = 'process' | 'payroll_download' | 'payroll_runs';");

// 2. Remove assign_slab from MAIN_TABS
content = content.replace(/\s*\{\s*key:\s*'assign_slab',\s*label:\s*'Assign Slab',\s*icon:\s*Layers\s*\},/g, '');

// 3. Remove the AssignSlabTab component definition
const assignSlabRegex = /\/\/\s*──\s*Tab\s*2:\s*Assign\s*Slab[\s\S]*?const AssignSlabTab: React\.FC[\s\S]*?<\/div>\s*\);\s*};/g;
content = content.replace(assignSlabRegex, '');

// 4. Remove activeTab check in render
content = content.replace(/\s*\{activeTab === 'assign_slab' && <AssignSlabTab cycles=\{cycles\} \/>\}/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated PayrollProcessing.tsx without Assign Slab tab');

// Check remaining
const lines = content.split('\n').filter(l => l.includes('assign_slab') || l.includes('AssignSlabTab'));
console.log('Remaining occurrences:', lines.length);

const fs = require('fs');
const filePath = 'client/src/features/payroll/pages/PayrollProcessing.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const searchStr = "import { showToast } from '@/components/ui/toast';";
const replaceStr = "import { showToast } from '@/components/ui/toast';\nimport { AssignPaySlabTab } from '@/features/payroll/components/AssignPaySlabTab';";

if (content.includes("AssignPaySlabTab")) {
  console.log('Import already present, skipping.');
} else {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Import added successfully!');
}

// Also replace the inline AssignSlabTab usage in JSX with AssignPaySlabTab
// Check if old inline component is still there
let content2 = fs.readFileSync(filePath, 'utf8');
const oldJsx = `{activeTab === 'assign' && <AssignSlabTab />}`;
const newJsx = `{activeTab === 'assign' && <AssignPaySlabTab />}`;
if (content2.includes(oldJsx)) {
  content2 = content2.replace(oldJsx, newJsx);
  fs.writeFileSync(filePath, content2, 'utf8');
  console.log('JSX usage replaced!');
} else if (content2.includes(`<AssignPaySlabTab />`)) {
  console.log('JSX already updated.');
} else {
  console.log('WARNING: Could not find assign tab JSX. Check manually.');
}

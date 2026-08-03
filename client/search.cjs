import fs from 'fs';
const content = fs.readFileSync('src/features/settings/pages/LeavePoliciesPage.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('Employee Type') || line.includes('grades') || line.includes('employeeTypes')) {
    console.log(`${index + 1}: ${line}`);
  }
});

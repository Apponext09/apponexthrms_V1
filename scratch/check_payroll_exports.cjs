const fs = require('fs');
const path = require('path');
const pagesDir = 'd:/shakyadita_projects/apponexthrms/client/src/features/payroll/pages';

const indexContent = fs.readFileSync(path.join(pagesDir, 'index.ts'), 'utf8');
const matches = [...indexContent.matchAll(/from '\.\/(\w+)'/g)];
const exportedFiles = matches.map(m => m[1]);

const missing = [];
exportedFiles.forEach(f => {
  const p = path.join(pagesDir, f + '.tsx');
  if (!fs.existsSync(p)) {
    missing.push(f);
    console.log('MISSING:', f);
  } else {
    console.log('OK:', f);
  }
});

if (missing.length === 0) {
  console.log('\nAll exported files exist!');
} else {
  console.log('\nMISSING FILES:', missing);
}

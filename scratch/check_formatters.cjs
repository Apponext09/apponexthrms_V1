const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) checkDir(full);
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      lines.forEach((l, i) => {
        if (l.includes('en-US') || l.includes('USD') || l.includes('DollarSign')) {
          console.log(path.relative('.', full) + ':' + (i + 1) + ' -> ' + l.trim());
        }
      });
    }
  }
}

checkDir('client/src/features/payroll');

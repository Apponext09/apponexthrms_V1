const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchDir(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      
      // Look for DollarSign
      if (content.includes('DollarSign')) {
        console.log(`[Icon DollarSign] in ${path.relative('.', full)}`);
      }
      
      // Look for currency: 'USD' or currency: "USD"
      if (/currency\s*:\s*['"]USD['"]/i.test(content)) {
        console.log(`[USD currency code] in ${path.relative('.', full)}`);
      }

      // Look for literal '$' in strings (e.g. '$' or '$ ' or '$')
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (/['"`]\s*\$\s*['"`]/.test(l) || /['"`]\s*\$[0-9]/.test(l) || />\s*\$\s*</.test(l) || />\s*\$[0-9]/.test(l)) {
          console.log(`[Literal $] ${path.relative('.', full)}:${idx+1} -> ${l.trim()}`);
        }
      });
    }
  }
}

searchDir(path.resolve('client/src/features/payroll'));

const fs = require('fs');
const path = require('path');

function check(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) check(full);
    else if (f.endsWith('.tsx')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      lines.forEach((l, i) => {
        let clean = l;
        // Strip template literals
        clean = clean.replace(/\$\{[^}]*\}/g, '');
        // Strip regex replacement groups like $1, $2
        clean = clean.replace(/\$[0-9]/g, '');
        // Strip regex end-of-string anchors like /$
        clean = clean.replace(/\/\$/g, '');
        if (clean.includes('$')) {
          console.log(path.relative('.', full) + ':' + (i+1) + ' -> ' + l.trim());
        }
      });
    }
  }
}
check('client/src/features/payroll');

const fs = require('fs');
const filePath = 'd:/shakyadita_projects/apponexthrms/client/src/features/payroll/pages/PayrollProcessing.tsx';

let content = fs.readFileSync(filePath, 'utf8');
const before = content.length;

// Remove lines that are purely box-drawing/comment decoration (the â"€â"€ lines)
// These are comment header lines in the file that got UTF-8 corrupted
content = content.replace(/\/\/\s*[â\xc3\xa2\xe2\u00e2â\u0082\u0094\u0096\u0097\u0098\u0099\u009a\u009b\u009c\u009d\u009e\u009f]+.*/g, '// ---');

// Remove sequences of replacement/corrupted bytes outside strings and JSX
// Target: sequences that look like â"€â"€ or â"?â"?
const cleaned = content.split('\n').map(line => {
  // If a comment line has mangled box chars, clean it
  if (line.includes('â') || line.includes('\u00e2') || line.includes('\ufffd')) {
    // Replace mangled sequences in comments only
    return line
      .replace(/â[\u0080-\u00bf][\u0080-\u00bf]/g, '-')
      .replace(/\ufffd/g, '')
      .replace(/â"[\u0080-\u00ff]/g, '-')
      .replace(/â€[\u0080-\u00ff]/g, '"')
      .replace(/â\u0080[\u0090-\u0097]/g, '-')
      .replace(/[\u0080-\u009f]{2,}/g, '');
  }
  return line;
}).join('\n');

fs.writeFileSync(filePath, cleaned, 'utf8');
console.log('Cleaned. Before:', before, 'After:', cleaned.length);

const fs = require('fs');
const p = 'd:/shakyadita_projects/apponexthrms/client/src/features/payroll/pages/PayrollProcessing.tsx';
let content = fs.readFileSync(p, 'utf8');

// Fix all instances of â‚¹ -> ₹ (rupee sign corrupted to â‚¹ in UTF-8 double-decoded)
// The â‚¹ pattern is: 0xE2 0x82 0xB9 which is the correct UTF-8 for ₹ but displayed as mojibake
// We need to find strings in JSX like â‚¹{ and replace with ₹{
content = content.replace(/â‚¹/g, '₹');

// Fix other common mojibake sequences
content = content.replace(/â€"/g, '—');  // em dash
content = content.replace(/â€˜/g, '\u2018');  // left single quote  
content = content.replace(/â€™/g, '\u2019');  // right single quote
content = content.replace(/â€œ/g, '\u201C');  // left double quote
content = content.replace(/â€/g, '\u201D');   // right double quote
content = content.replace(/â€¦/g, '…');       // ellipsis
content = content.replace(/â"€/g, '─');        // box drawing

// Remove sequences of corrupted box drawing chars used in comments
// These look like â"€â"€â"€â"€ etc. 
content = content.replace(/[â]{1,}[€"™˜"\u0080-\u009f\u00a0-\u00bf\u00c0-\u00ff]*â[€"™˜"\u0080-\u009f\u00a0-\u00bf\u00c0-\u00ff]*/g, '---');

fs.writeFileSync(p, content, 'utf8');
console.log('Done. Lines:', content.split('\n').length);

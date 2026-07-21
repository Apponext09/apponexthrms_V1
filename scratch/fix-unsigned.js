const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'database', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Find table.bigInteger('...') without .unsigned()
  // Match patterns like: table.bigInteger('name')
  // We want to replace table.bigInteger('name') with table.bigInteger('name').unsigned()
  // But only if it does not already have .unsigned()
  
  // We can use a regex replacement with a callback
  content = content.replace(/table\.bigInteger\((['"`][a-zA-Z0-9_-]+['"`])\)(?!\.unsigned)/g, (match, p1) => {
    console.log(`Fixing in ${file}: ${match} -> table.bigInteger(${p1}).unsigned()`);
    return `table.bigInteger(${p1}).unsigned()`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
console.log('Done scanning and fixing.');

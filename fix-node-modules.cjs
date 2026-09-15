const fs = require('fs');
const path = require('path');

const nodeModulesDir = path.join(__dirname, 'node_modules');

function fixDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('@')) {
        fixDir(path.join(dir, entry.name));
      } else if (entry.name.startsWith('.')) {
        // e.g. .cssesc-QNl0d4O5 -> cssesc
        const match = entry.name.match(/^\.([a-zA-Z0-9_-]+)-[a-zA-Z0-9_-]+$/);
        if (match) {
          const pkgName = match[1];
          const targetPath = path.join(dir, pkgName);
          const srcPath = path.join(dir, entry.name);
          if (!fs.existsSync(targetPath)) {
            try {
              fs.renameSync(srcPath, targetPath);
              console.log(`Renamed ${entry.name} -> ${pkgName}`);
            } catch (err) {
              console.error(`Error renaming ${srcPath} to ${targetPath}:`, err.message);
            }
          }
        }
      }
    }
  }
}

console.log('Fixing node_modules dot folders...');
fixDir(nodeModulesDir);
console.log('Done.');

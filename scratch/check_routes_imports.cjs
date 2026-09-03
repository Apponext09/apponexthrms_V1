const fs = require('fs');
const path = require('path');

const routesFile = 'd:/shakyadita_projects/apponexthrms/client/src/routes.tsx';
const srcDir = 'd:/shakyadita_projects/apponexthrms/client/src';

const content = fs.readFileSync(routesFile, 'utf8');

// Find all import statements
const importMatches = [...content.matchAll(/import\s+\{([^}]+)\}\s+from\s+'([^']+)'/g)];

const problems = [];

importMatches.forEach(match => {
  const importPath = match[2];
  // Only check relative imports
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) return;
  
  let resolvedPath;
  if (importPath.startsWith('@/')) {
    resolvedPath = path.join(srcDir, importPath.replace('@/', ''));
  } else {
    resolvedPath = path.resolve(path.dirname(routesFile), importPath);
  }
  
  // Check if file exists with various extensions
  const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
  const exists = extensions.some(ext => fs.existsSync(resolvedPath + ext));
  
  if (!exists) {
    problems.push({ path: importPath, resolved: resolvedPath });
  }
});

if (problems.length === 0) {
  console.log('All imports in routes.tsx resolve correctly!');
} else {
  console.log('BROKEN IMPORTS:');
  problems.forEach(p => console.log(' -', p.path, '->', p.resolved));
}

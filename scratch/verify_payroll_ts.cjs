const fs = require('fs');
const ts = require('typescript');

const filePath = 'd:/shakyadita_projects/apponexthrms/client/src/features/payroll/pages/PayrollProcessing.tsx';
const code = fs.readFileSync(filePath, 'utf8');

// Transpile with TypeScript to check for any syntax/type issues
const result = ts.transpileModule(code, {
  compilerOptions: {
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext
  }
});

console.log('TypeScript Transpile Success! Output length:', result.outputText.length);

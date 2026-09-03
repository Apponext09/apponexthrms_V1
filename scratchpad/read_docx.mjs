import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const src = 'C:/Users/armys/.claude/uploads/63f02998-7675-4175-a502-517ce81b15cb/46e47aec-payroll_manual_testing_shakyadita..docx';
const outDir = 'D:/shakyadita_projects/apponexthrms/scratchpad/docx_extract';
fs.mkdirSync(outDir, { recursive: true });

// Use PowerShell's built-in zip extraction via .NET since docx is a zip file
const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${src.replace(/\//g,'\\\\')}', '${outDir.replace(/\//g,'\\\\')}', $true)`;
execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit' });

const xml = fs.readFileSync(path.join(outDir, 'word/document.xml'), 'utf-8');
let text = xml.replace(/<w:p[ >]/g, '\n');
text = text.replace(/<w:tab\/>/g, '\t');
text = text.replace(/<[^>]+>/g, '');
text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
fs.writeFileSync('D:/shakyadita_projects/apponexthrms/scratchpad/docx_text.txt', text);
console.log(text);

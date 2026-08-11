const fs = require('fs');

const files = [
  'client/src/features/recruitment/pages/CandidateReportPage.tsx',
  'client/src/features/recruitment/pages/ApplicantTrackerPage.tsx',
  'client/src/features/recruitment/pages/InterviewerRatingPage.tsx'
];

const replacements = {
  'bg-slate-50': 'bg-background',
  'bg-slate-100': 'bg-muted',
  'bg-white': 'bg-card text-card-foreground',
  'text-slate-700': 'text-foreground',
  'text-slate-600': 'text-foreground/90',
  'text-slate-500': 'text-muted-foreground',
  'border-slate-200': 'border-border',
  'border-slate-300': 'border-input',
  'border-slate-100': 'border-border',
  'hover:bg-slate-50': 'hover:bg-muted/50',
  'hover:text-slate-500': 'hover:text-muted-foreground',
  'text-white': 'text-primary-foreground',
  'bg-orange-500': 'bg-destructive',
  'hover:bg-orange-600': 'hover:bg-destructive/90'
};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    const regex = new RegExp('\\b' + oldClass + '\\b', 'g');
    content = content.replace(regex, newClass);
  }
  
  // Also clean up edge cases where bg-card text-card-foreground replaced bg-white inside TableHead where it shouldn't have background
  content = content.replace(/className="bg-card text-card-foreground"/g, 'className="bg-card"');
  
  fs.writeFileSync(file, content);
});
console.log('Done replacing theme tokens!');

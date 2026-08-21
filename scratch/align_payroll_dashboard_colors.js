const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../client/src/features/payroll/pages/PayrollDashboard.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace dark hero with standard theme-aware card banner
const oldHero = `      {/* ── 1. RICH HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-xl text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shrink-0 ring-4 ring-white/10">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-white">Payroll Executive Hub</h1>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-bold px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                  Active Cycle: {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Real-time monthly disbursement analytics, automated statutory compliance, and salary execution controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate(isHRPath ? '/hr/payroll/mass-salary-upload' : '/payroll/mass-salary-upload')}
              className="h-10 text-xs font-bold gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur-xs flex-1 sm:flex-initial"
            >
              <UploadCloud className="w-4 h-4" />
              Mass Upload CSV
            </Button>
            <Button
              onClick={() => navigate(isHRPath ? '/hr/payroll-processing' : '/payroll/processing')}
              className="h-10 text-xs font-bold gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md flex-1 sm:flex-initial"
            >
              <Play className="w-4 h-4 fill-white" />
              Run Payroll Pipeline
            </Button>
          </div>
        </div>
      </div>`;

const newHero = `      {/* ── 1. STANDARD THEMED HERO BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-4 ring-primary/5">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">Payroll Dashboard</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping mr-1.5" />
                Active Cycle: {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time monthly disbursement analytics, automated statutory compliance, and salary execution controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={() => navigate(isHRPath ? '/hr/payroll/mass-salary-upload' : '/payroll/mass-salary-upload')}
            className="h-9 text-xs font-bold gap-2"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Mass Upload CSV
          </Button>
          <Button
            onClick={() => navigate(isHRPath ? '/hr/payroll-processing' : '/payroll/processing')}
            className="h-9 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Run Payroll Pipeline
          </Button>
        </div>
      </div>`;

content = content.replace(oldHero, newHero);

// Replace card top colored lines with subtle primary accents matching theme
content = content.replace(/bg-gradient-to-r from-blue-500 to-indigo-600/g, 'bg-primary');
content = content.replace(/bg-gradient-to-r from-emerald-500 to-teal-600/g, 'bg-emerald-600');
content = content.replace(/bg-gradient-to-r from-violet-500 to-purple-600/g, 'bg-primary');
content = content.replace(/bg-gradient-to-r from-amber-500 to-orange-600/g, 'bg-amber-500');
content = content.replace(/bg-gradient-to-r from-cyan-500 to-blue-600/g, 'bg-primary');

// Replace pipeline card background
content = content.replace(/bg-gradient-to-r from-indigo-50\/40 via-background to-blue-50\/40 dark:from-indigo-950\/20 dark:to-blue-950\/20/g, 'bg-card');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('PayrollDashboard.tsx color theme aligned perfectly with all other modules!');

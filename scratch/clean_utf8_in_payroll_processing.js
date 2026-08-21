const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../client/src/features/payroll/pages/PayrollProcessing.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Replace corrupted multibyte sequences with clean ASCII
content = content.replace(/â”€+/g, '---');
content = content.replace(/âœ…/g, '✅');

// 2. Modernize the root component layout and header banner
const oldReturn = `  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payroll Processing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Process and manage monthly employee payroll runs and disbursements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {MAIN_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as MainTab)}
            className={\`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors \${activeTab === key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }\`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'process' && <ProcessPayrollTab cycles={cycles} />}
        {activeTab === 'payroll_download' && <PayrollDownloadTab cycles={cycles} />}
        {activeTab === 'payroll_runs' && <PayrollRunsTab cycles={cycles} />}
      </div>
    </div>
  );`;

const newReturn = `  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Modern Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-4 ring-primary/5">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">Payroll Processing Engine</h1>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                Live Register
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Execute monthly salary calculations, review itemized line items, and generate official payroll registers.
            </p>
          </div>
        </div>
      </div>

      {/* ── Modern Nav Tabs ── */}
      <div className="flex border-b border-border space-x-1">
        {MAIN_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as MainTab)}
            className={\`flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer \${
              activeTab === key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="pt-1">
        {activeTab === 'process' && <ProcessPayrollTab cycles={cycles} />}
        {activeTab === 'payroll_download' && <PayrollDownloadTab cycles={cycles} />}
        {activeTab === 'payroll_runs' && <PayrollRunsTab cycles={cycles} />}
      </div>
    </div>
  );`;

content = content.replace(oldReturn, newReturn);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Cleaned UTF-8 and updated PayrollProcessing.tsx successfully!');

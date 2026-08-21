const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../client/src/features/payroll/pages/PayrollSettingsPage.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Replace outer page container & Guided Workspace Header
const oldHeader = `<div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 text-foreground space-y-6">
      {/* Guided Workspace Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Payroll Master Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure monthly calculation cycles, component definitions catalog, and statutory slabs.</p>
          </div>
        </div>

        {/* 3 Master Setup Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('cycles')}
            className={\`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all \${
              activeTab === 'cycles'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Cycles
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={\`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all \${
              activeTab === 'components'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Layers className="w-3.5 h-3.5" />
            Components Catalog
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={\`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all \${
              activeTab === 'slabs'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Slabs &amp; Statutory Rules
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={\`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all \${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>`;

const newHeader = `<div className="w-full space-y-6 pb-12">
      {/* ── Modern Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shrink-0 shadow-sm ring-4 ring-primary/5">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">Payroll Master Settings & Rules</h1>
              <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
                Config Engine
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure payroll cycles, pay component formulas, statutory deduction rules, and compensation slabs.
            </p>
          </div>
        </div>

        {/* ── Modern Setup Nav Tabs ── */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('cycles')}
            className={\`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              activeTab === 'cycles'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Cycles
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={\`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              activeTab === 'components'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Layers className="w-3.5 h-3.5" />
            Components
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={\`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              activeTab === 'slabs'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Slabs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={\`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              activeTab === 'settings'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }\`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>`;

content = content.replace(oldHeader, newHeader);

// 2. Replace the hardcoded teal in slab cards with modern tokens
content = content.replace(/border: isSelected \? '2px solid #00a8a8' : '1px solid #e2e8f0'/g, `border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))'`);
content = content.replace(/boxShadow: isSelected \? '0 2px 8px rgba\(0,168,168,0\.18\)' : '0 1px 3px rgba\(0,0,0,0\.05\)'/g, `boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.15)' : 'none'`);
content = content.replace(/background: isSelected \? '#00a8a8' : '#00a8a8'/g, `background: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'`);
content = content.replace(/background: '#e0f7fa'/g, `background: 'hsl(var(--card))'`);
content = content.replace(/color: '#00796b'/g, `color: 'hsl(var(--foreground))'`);
content = content.replace(/stroke="#00a8a8"/g, `stroke="hsl(var(--primary))"`);

// 3. Clean up Group banner headers
content = content.replace(/border border-\[\#4dd0e1\] shadow-xs bg-\[\#00a8a8\]/g, `border border-border/80 shadow-xs bg-card`);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('PayrollSettingsPage.tsx modernized successfully!');

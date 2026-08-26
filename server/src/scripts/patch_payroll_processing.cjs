const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/src/features/payroll/pages/PayrollProcessing.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add Minimize2 import
if (!content.includes('Minimize2,')) {
  content = content.replace('Maximize2,', 'Maximize2,\n  Minimize2,');
}

// 2. Add isFilterExpanded and isFullscreen state
const stateMarker = "  const [removePagination, setRemovePagination] = useState(true);";
const stateReplacement = `  const [removePagination, setRemovePagination] = useState(true);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);`;

if (!content.includes('const [isFilterExpanded,')) {
  content = content.replace(stateMarker, stateReplacement);
}

// 3. Update top header icons with working Expand & Fullscreen
const headerIconsMarker = `<div className="flex items-center gap-1.5 text-muted-foreground">
              <button className="p-1 hover:bg-muted rounded text-foreground"><Expand className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-muted rounded text-foreground"><Maximize2 className="w-4 h-4" /></button>
            </div>`;

const headerIconsReplacement = `<div className="flex items-center gap-1.5 text-muted-foreground">
              <button
                type="button"
                onClick={() => setIsFilterExpanded(prev => !prev)}
                title={isFilterExpanded ? "Collapse Filters" : "Expand Filters"}
                className="p-1 hover:bg-muted rounded text-foreground cursor-pointer transition-colors"
              >
                <Expand className={\`w-4 h-4 transition-transform \${!isFilterExpanded ? 'rotate-180 text-primary' : ''}\`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                    setIsFullscreen(true);
                  } else {
                    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
                    setIsFullscreen(false);
                  }
                }}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                className="p-1 hover:bg-muted rounded text-foreground cursor-pointer transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>`;

content = content.replace(headerIconsMarker, headerIconsReplacement);

// 4. Wrap filters in isFilterExpanded and remove "Remove Pagination"
const row1Marker = `{/* Row 1: Generate Payroll On *, Payroll Cycle *, Month *, Sort By, Payroll Status, Remove Pagination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">`;

const row1Replacement = `{isFilterExpanded && (
          <>
        {/* Row 1: Generate Payroll On *, Payroll Cycle *, Month *, Sort By, Payroll Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">`;

content = content.replace(row1Marker, row1Replacement);

const paginationBox = `          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="removePagination"
              checked={removePagination}
              onChange={e => setRemovePagination(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="removePagination" className="text-xs font-medium text-foreground cursor-pointer select-none">
              Remove Pagination
            </label>
          </div>`;

content = content.replace(paginationBox, '');

// Close isFilterExpanded right before Step 1
const filterCloseMarker = `        {/* Row 4: Action Buttons — Step 1: Initialize / Process Payroll */}`;
const filterCloseReplacement = `        </>
        )}

        {/* Row 4: Action Buttons — Step 1: Initialize / Process Payroll */}`;

content = content.replace(filterCloseMarker, filterCloseReplacement);

// 5. Remove Bypass Cache checkbox and note
const bypassCacheSection = `          <div className="flex items-center gap-2 ml-2">
            <input
              type="checkbox"
              id="bypassCache"
              checked={bypassCache}
              onChange={e => setBypassCache(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="bypassCache" className="text-xs font-medium text-foreground cursor-pointer select-none">
              Bypass Cache
            </label>
          </div>
        </div>

        {/* Note */}
        <p className="text-[11px] font-bold text-rose-600 pt-1">
          *Note: If any payroll calculation changes are made, click "Bypass Cache and Filter" before processing payroll.
        </p>`;

const bypassCacheReplacement = `        </div>`;

content = content.replace(bypassCacheSection, bypassCacheReplacement);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully patched PayrollProcessing.tsx!');

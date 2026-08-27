const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/src/features/payroll/pages/PayrollProcessing.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Remove removePagination checkbox
const removePaginationBlock = `          <div className="flex items-center gap-2 pb-2">
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

if (content.includes(removePaginationBlock)) {
  content = content.replace(removePaginationBlock, '');
  console.log('Removed removePagination checkbox block.');
} else {
  console.log('removePagination block not matched exactly, looking for alternative...');
}

// 2. Remove bypassCache checkbox and note
const bypassCacheBlock = `          <div className="flex items-center gap-2 ml-2">
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

const bypassReplacement = `        </div>`;

if (content.includes(bypassCacheBlock)) {
  content = content.replace(bypassCacheBlock, bypassReplacement);
  console.log('Removed bypassCache checkbox and note block.');
} else {
  console.log('bypassCache block not matched exactly, trying regex/flexible replace...');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Finished removing unwanted UI elements in PayrollProcessing.tsx');

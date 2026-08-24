const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/src/features/payroll/pages/PayrollProcessing.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const startMarker = "  const openAttendanceCalendar = async (row: any) => {";
const endMarker = "    setAttendanceCalendarLoading(true);";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const replacement = `  const openAttendanceCalendar = async (row: any) => {
    const empId = row.employeeId || row.employee_id || row.id;
    const empName = \`\${row.firstName || row.first_name || ''} \${row.lastName || row.last_name || ''}\`.trim() || \`Employee #\${empId}\`;

    const [yr, mo] = (payrollMonth || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const maxDaysInMonth = new Date(yr, mo, 0).getDate();

    const cycleStartDay = Math.max(1, Math.min(maxDaysInMonth, Number(row.cycle_start_day || row.cycle_start_date_num || selectedCycleObj?.start_date || selectedCycleObj?.startDate || 1)));
    const cycleCutoffDay = Math.max(1, Math.min(maxDaysInMonth, Number(row.cycle_cutoff_day || selectedCycleObj?.cutoff_day || selectedCycleObj?.cutoffDay || maxDaysInMonth)));

    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStart = \`\${payrollMonth}-\${pad(cycleStartDay)}\`;
    const monthEnd = \`\${payrollMonth}-\${pad(cycleCutoffDay)}\`;

    setAttendanceCalendarItem({ employeeName: empName, startDate: monthStart, endDate: monthEnd, days: [] });
    setAttendanceCalendarLoading(true);`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex + endMarker.length);
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully patched openAttendanceCalendar in PayrollProcessing.tsx!');

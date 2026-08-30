# -*- coding: utf-8 -*-
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def set_cell_shading(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_col_widths(table, widths_cm):
    table.autofit = False
    for row in table.rows:
        for idx, w in enumerate(widths_cm):
            row.cells[idx].width = Cm(w)
    for idx, w in enumerate(widths_cm):
        table.columns[idx].width = Cm(w)

doc = Document()

# Base font
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(10)

# Title
title = doc.add_heading('Payroll Module — Manual & Automated Test Cases', level=0)
sub = doc.add_paragraph('Apponext HRMS — Payroll Dashboard, Master Settings, Salary Revision, Processing, Reports')
sub.runs[0].italic = True
sub.runs[0].font.size = Pt(11)
meta = doc.add_paragraph('Tested by: Shakyadita  |  Environments: Local (dev) & Hosted (hrms.apponext.in)  |  Date: 21 Aug 2026')
meta.runs[0].font.size = Pt(9)
meta.runs[0].font.color.rgb = RGBColor(0x60, 0x60, 0x60)

doc.add_paragraph()

COLS = ['TC ID', 'Test Case', 'Expected Result', 'Actual Result', 'Status']
WIDTHS = [1.8, 4.2, 4.2, 5.5, 1.6]

def add_module_heading(text):
    h = doc.add_heading(text, level=1)
    return h

def add_table(rows):
    table = doc.add_table(rows=1, cols=len(COLS))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for i, c in enumerate(COLS):
        hdr[i].text = c
        for p in hdr[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(hdr[i], '1F4E78')

    for r in rows:
        row_cells = table.add_row().cells
        for i, val in enumerate(r):
            row_cells[i].text = str(val)
            for p in row_cells[i].paragraphs:
                p.paragraph_format.space_after = Pt(2)
                for run in p.runs:
                    run.font.size = Pt(9)
        # status shading
        status = r[4]
        cell = row_cells[4]
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        if status == 'Pass':
            set_cell_shading(cell, '2E7D32')
        elif status == 'Fail':
            set_cell_shading(cell, 'C62828')
        else:
            set_cell_shading(cell, 'E0A800')
    set_col_widths(table, WIDTHS)
    doc.add_paragraph()
    return table

# ---------------------------------------------------------------------------
# MODULE A: PAYROLL DASHBOARD
# ---------------------------------------------------------------------------
add_module_heading('A. Payroll Dashboard')
add_table([
    ['TC-A01', 'Dashboard loads correctly (layout, dark mode, responsive)',
     'Page renders without errors on desktop and mobile; dark mode toggles correctly.',
     'Renders cleanly on both local and hosted builds. Dark mode works. Responsive down to 390px mobile width.',
     'Pass'],
    ['TC-A02', '"Run Payroll Pipeline" button navigation',
     'Clicking the button navigates to the Payroll Processing page.',
     'Correctly redirects to Payroll Processing page.',
     'Pass'],
    ['TC-A03', '"Mass Upload CSV" button navigation',
     'Clicking the button navigates to the Mass Salary Structure Upload page.',
     'Correctly redirects to Mass Salary Structure Upload page.',
     'Pass'],
    ['TC-A04', '"Recent Payroll Runs & Disbursal History" reflects true processed status',
     'Should show the real most-recent processed run, or an empty state if none exists / API fails.',
     'GET /api/v1/payroll/runs returns 404 on both local and hosted. Dashboard silently falls back to a fabricated row labelled "PUBLISHED" using estimated (not actual) figures instead of showing an empty/error state.',
     'Fail'],
    ['TC-A05', '"3. Live Calculation" step — employee-ready count',
     'Count shown should equal the organization\u2019s actual active/enrolled employee count.',
     'Hardcoded literal "19 Employees Ready" regardless of real headcount \u2014 seen mismatched against 2, 17 and 19 actual employees across different orgs/tests.',
     'Fail'],
    ['TC-A06', 'KPI cards reflect real-time processed payroll ("Total Outlay", "Net Take-Home")',
     'Figures should reflect an actual processed payroll run, not an estimate.',
     'Computed client-side from employee CTC master data. Displays confident numbers even when no payroll has actually been run for the period.',
     'Fail'],
    ['TC-A07', '"Active Payroll Processing Lifecycle" stepper accuracy',
     'Steps (Attendance Cutoff, LOP Ingest, Live Calculation, Lock & Disburse) should reflect real cycle state and be interactive.',
     'Static/decorative text ("Step 3 of 4 Ready", "Synced Cutoff: 25th", etc.), not wired to real attendance or cycle data. Step cards are not clickable.',
     'Fail'],
    ['TC-A08', '"Active Cycle: <Month Year>" badge accuracy',
     'Badge should reflect an actual open/active payroll cycle record.',
     'Badge just formats today\u2019s date client-side. Payroll Processing page independently shows 0 cycles configured in the same session.',
     'Fail'],
    ['TC-A09', 'Console / network health on page load',
     'No console errors; only intended API calls fire.',
     'Hosted build only: repeated WebSocket connection failures to ws://localhost:5000 (dev URL hardcoded into production bundle). No other JS errors on either environment.',
     'Fail'],
])

# ---------------------------------------------------------------------------
# MODULE B: PAYROLL MASTER SETTINGS
# ---------------------------------------------------------------------------
add_module_heading('B. Payroll Master Settings')

doc.add_heading('B1. Payroll Cycle', level=2)
add_table([
    ['TC-B1-01', 'Create / Update / Delete a Payroll Cycle record',
     'Record should be created, editable, and deletable without errors.',
     'CRUD operations work end-to-end; record created, updated, and deleted successfully.',
     'Pass'],
    ['TC-B1-02', 'Save field: Payroll Cycle Name',
     'Entered value persists after save and page reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B1-03', 'Save field: Daily Wages (main toggle)',
     'Toggle state persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B1-04', 'Save field: Payroll Calculation Start Date',
     'Entered value persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B1-05', 'Save field: CutOff Days for Payroll Calculations',
     'Entered value persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B1-06', 'Save field: Month dropdown (First / Current / Previous / Next)',
     'Selected value persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B1-07', 'Save field: Payroll Calculation Cap',
     'Entered value persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B1-08', 'Save field: Payroll Disbursement Date',
     'Entered value persists after save and reload.',
     'Value silently reverts to its previous default. Success toast shown regardless.',
     'Fail'],
    ['TC-B1-09', 'Save field: Total no. of days for Payroll calculation',
     'Selected value persists after save and reload.',
     'Reverts to blank ("Select") after reload. Success toast shown regardless.',
     'Fail'],
    ['TC-B1-10', 'Save field: "Daily wages include paid holidays" sub-checkbox',
     'Checkbox state persists after save and reload.',
     'Reverts to unchecked after reload.',
     'Fail'],
    ['TC-B1-11', 'Save field: "Daily wages include week off" sub-checkbox',
     'Checkbox state persists after save and reload.',
     'Reverts to unchecked after reload.',
     'Fail'],
    ['TC-B1-12', 'Save field: Tolerance (Enable Attendance Tolerance Minutes + minute value)',
     'Checkbox and minute value persist after save and reload.',
     'Reverts to disabled / blank after reload.',
     'Fail'],
    ['TC-B1-13', 'Save field: Active (Yes/No) toggle',
     'Selected state persists after save and reload.',
     'On new-record creation: reverts to "Yes" even when "No" was selected. On editing an existing record (hosted): saved correctly. Inconsistent between create and edit paths.',
     'Fail'],
])

doc.add_heading('B2. Payroll Component Catalog', level=2)
add_table([
    ['TC-B2-01', 'Create Earning Group with all fields set (name, round format, group function, configure/display on profile, editable, contributed by, active, recalculate on change, group for payslip, display order, disable arrear, display total, TDS same month, taxable)',
     'All 15 fields persist exactly as set after save and reload.',
     'All 15 fields persisted correctly. No issues.',
     'Pass'],
    ['TC-B2-02', 'Create Deduction Group with all fields set (same 15 fields as above)',
     'All 15 fields persist exactly as set after save and reload.',
     'All 15 fields persisted correctly. No issues.',
     'Pass'],
    ['TC-B2-03', 'Update / Delete a Component Group',
     'Group edits and deletion complete without errors.',
     'Group updated and deleted successfully.',
     'Pass'],
    ['TC-B2-04', 'Create Component: core fields (Name, Assigned Group, Non-Cashable, Based On Attendance, Active, Component Type, Amount, Boundary Type, Min/Max Amount)',
     'All fields persist after save and reload.',
     'All listed fields persisted correctly.',
     'Pass'],
    ['TC-B2-05', 'Create Component: Condition On + Operator',
     'Selected dropdown values persist after save and reload.',
     'Persist correctly.',
     'Pass'],
    ['TC-B2-06', 'Create Component: Gender filter',
     'Selected value (All/Male/Female) persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B2-07', 'Create Component: Effective From Date',
     'Entered date persists after save and reload.',
     'Reverts to blank after reload.',
     'Fail'],
    ['TC-B2-08', 'Create Component: Effective To Date',
     'Entered date persists after save and reload.',
     'Reverts to blank after reload.',
     'Fail'],
    ['TC-B2-09', 'Create Component: Condition Value1',
     'Entered value persists after save and reload.',
     'Reverts to blank after reload.',
     'Fail'],
    ['TC-B2-10', 'Create Component: Condition Value2',
     'Entered value persists after save and reload.',
     'Reverts to blank after reload.',
     'Fail'],
    ['TC-B2-11', 'Create Component: "[+] Months" selector',
     'Selected months persist after save and reload.',
     'Never persists \u2014 confirmed in source code that the "months" field is not included in the save payload at all, so it cannot be saved under any circumstance.',
     'Fail'],
    ['TC-B2-12', 'Component Update / Delete',
     'Component edits and deletion complete without errors.',
     'Component updated and deleted successfully.',
     'Pass'],
])

doc.add_heading('B3. Payroll Slab', level=2)
add_table([
    ['TC-B3-01', 'Create Slab with all fields set (Name, Department, Grade, Location(s), CTC Min/Max, Payroll Component(s), Payroll Cycle, Active)',
     'All fields persist exactly as set after save and reload.',
     'All fields persisted correctly. No save bugs found \u2014 matches the clean result of the Component Group form.',
     'Pass'],
    ['TC-B3-02', 'Update / Delete a Slab',
     'Slab edits and deletion complete without errors.',
     'Slab updated and deleted successfully.',
     'Pass'],
    ['TC-B3-03', 'Configure Statutory Rules (PF %, PT tiers, Employment Type) from the "Slabs & Statutory Rules" tab',
     'Tab should expose editable fields for PF rate, PT slab tiers, and Employment Type given its name.',
     'No UI exists for any of these. Every slab is saved with hardcoded defaults (PF fixed at 12%, a fixed 3-tier PT table, Employment Type always "Regular") regardless of org needs.',
     'Fail'],
])

doc.add_heading('B4. Payroll Settings (Approvals, Payslip, Loan, Bonus, ESIC, etc.)', level=2)
add_table([
    ['TC-B4-01', 'Payment Status Setting — edit a status label',
     'Edited label persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B4-02', 'Payroll Approval Setting — Approval Mode, "Require approval before publish" toggle, Approval Level name/role',
     'All values persist after save and reload.',
     'Persist correctly.',
     'Pass'],
    ['TC-B4-03', 'Process Payroll Tab Setting — toggle a workflow step on/off',
     'Toggle state persists after save and reload.',
     'Persists correctly.',
     'Pass'],
    ['TC-B4-04', 'Checklist Setting — mandatory flag + add new checklist item',
     'Changes persist after save and reload.',
     'Persist correctly.',
     'Pass'],
    ['TC-B4-05', 'Attendance & Pay Rules — Freeze Attendance Day, Mass Paid Days, Double Pay Inclusive, Sandwich Policy',
     'All four values persist after save and reload.',
     'All persist correctly.',
     'Pass'],
    ['TC-B4-06', 'ESIC Calculation Component — Calculation Base, Wage Ceiling',
     'Both values persist after save and reload.',
     'Both persist correctly.',
     'Pass'],
    ['TC-B4-07', 'Loan Setting — Max Loan, Max Tenure, Interest Rate, Min Service',
     'All four values persist after save and reload.',
     'All persist correctly.',
     'Pass'],
    ['TC-B4-08', 'Payslip Setting — 4 display toggles, footer note, 5 checkboxes, 6 custom labels',
     'All values persist after save and reload.',
     'All 16 fields persist correctly.',
     'Pass'],
    ['TC-B4-09', 'Bonus / Attendance Bonus / Night Allowance — enable toggle + associated numeric fields for each',
     'All values persist after save and reload.',
     'All persist correctly across all 3 sub-panels.',
     'Pass'],
])

# ---------------------------------------------------------------------------
# MODULE C: SALARY REVISION
# ---------------------------------------------------------------------------
add_module_heading('C. Salary Revision')
add_table([
    ['TC-C01', 'Create / Submit a Salary Revision request (Employee, Slab, Revision Type, Effective Date, Proposed CTC, Reason)',
     'All fields save exactly as entered and appear correctly in the Revision Register after reload.',
     'Employee, Slab, Current CTC, Proposed CTC and Hike % all save and display correctly. Effective Date and Revision Type do not round-trip correctly (see TC-C02 / TC-C05).',
     'Fail'],
    ['TC-C02', 'Effective Date accuracy after save',
     'Date entered in the picker (e.g. 01 Sep 2026) matches the date shown in the Register.',
     'Off by one day \u2014 entering 01 Sep 2026 results in "31 Aug 2026" being stored and displayed (timezone conversion bug).',
     'Fail'],
    ['TC-C03', 'Approve a pending Salary Revision',
     'Approve action succeeds; record status changes to "Approved" and the employee\u2019s salary structure is updated.',
     'Backend returns 403 Forbidden on the approve request, but the UI shows a green "approved successfully" toast and optimistically marks the row approved. A reload reveals the record is still "Pending Review" \u2014 the approval never actually happened.',
     'Fail'],
    ['TC-C04', 'Reject a pending Salary Revision',
     'Reject action succeeds; record status changes to "Rejected."',
     'Functions correctly \u2014 confirmed both in dedicated test and via 3 pre-existing "Rejected / Completed" records on hosted.',
     'Pass'],
    ['TC-C05', 'Revision Type value round-trips correctly',
     'The label selected in the dropdown (e.g. "Role Promotion") is what gets stored and displayed.',
     'Stored/displayed value is normalized to a different, shorter string (e.g. "promotion") than what was selected.',
     'Fail'],
    ['TC-C06', 'KPI counters (Pending Approvals / Approved Revisions / Total Revisions) update correctly',
     'Counts should update immediately and correctly after create/approve/reject actions.',
     'Counts update correctly and match the Register table contents after each action.',
     'Pass'],
    ['TC-C07', 'Salary hike / CTC breakdown uses the employee\u2019s actual assigned slab structure',
     'Basic / HRA / Special Allowance split in the hike calculator should reflect the real configured slab component percentages.',
     'Formula is a fixed hardcoded split (Basic 50% / HRA 40% of Basic / balance as Special Allowance) applied to every revision regardless of the actual slab\u2019s configured components.',
     'Fail'],
])

# ---------------------------------------------------------------------------
# MODULE D: PAYROLL PROCESSING
# ---------------------------------------------------------------------------
add_module_heading('D. Payroll Processing')
add_table([
    ['TC-D01', 'Salary slab assignment during payroll processing run',
     'Should be possible to assign an employee\u2019s actual configured monthly slab during processing.',
     'Slab shown/assignable during processing was a dummy placeholder \u2014 unable to assign the real monthly slab from the slab structure.',
     'Fail'],
    ['TC-D02', 'Lock & Publish a payroll run',
     'Lock and Publish actions complete successfully and update run status.',
     'Lock and Publish completed successfully.',
     'Pass'],
    ['TC-D03', 'Generate Payslip from a processed run',
     'Payslip generates successfully for processed employees.',
     'Payslip generated successfully.',
     'Pass'],
])

# ---------------------------------------------------------------------------
# MODULE E: PAYROLL MANAGEMENT (Payslip Management)
# ---------------------------------------------------------------------------
add_module_heading('E. Payroll Management (Payslip Management)')
add_table([
    ['TC-E01', 'Create and edit a payslip for an individual employee',
     'Payslip can be generated for a specific employee and edited afterward.',
     'Payslip created successfully for the selected employee; editing also works.',
     'Pass'],
])

# ---------------------------------------------------------------------------
# MODULE F: MASS SALARY STRUCTURE UPLOAD
# ---------------------------------------------------------------------------
add_module_heading('F. Mass Salary Structure Upload')
add_table([
    ['TC-F01', 'Bulk-upload a salary slab CSV and assign to multiple employees',
     'Upload processes successfully and assigns the slab to all matched employees.',
     'Bulk upload and multi-employee assignment worked successfully.',
     'Pass'],
    ['TC-F02', 'Upload log correctly flags rows that do not match existing employees',
     'Log should list any rows in the CSV that could not be matched to an employee record.',
     'Log correctly flagged 2 employees in the uploaded file that did not match existing records.',
     'Pass'],
])

# ---------------------------------------------------------------------------
# MODULE G: PAYROLL REPORTS
# ---------------------------------------------------------------------------
add_module_heading('G. Payroll Reports')
add_table([
    ['TC-G01', 'Report figures reflect real, current payroll data',
     'Report values should change based on actual processed payroll / slab data, not a fixed hardcoded source.',
     'Data appears static \u2014 most likely because the slab used is a hardcoded template rather than the real assigned structure for the 17 employees in the org.',
     'Fail'],
    ['TC-G02', 'Employee count displayed on Report KPIs',
     'KPI should show the correct count of employees included in the report.',
     'No employees are shown on the KPI card at all.',
     'Fail'],
])

# ---------------------------------------------------------------------------
# MODULE H: EMPLOYEE SALARY STRUCTURE (Profile → Payroll tab)
# ---------------------------------------------------------------------------
add_module_heading('H. Employee Salary Structure (Profile → Payroll Tab)')
add_table([
    ['TC-H01', 'Add a Pay Structure directly from an employee\u2019s profile',
     'New structure saves successfully and appears in the Payroll Detail table with correct Slab, CTC, Gross, Net and Effective Date.',
     '"New pay structure saved successfully" toast shown; table correctly displays Slab Template (monthly), Annual CTC (\u20b94,80,000), Monthly Gross (\u20b920,000), Effective From and Active status.',
     'Pass'],
    ['TC-H02', 'Net Take-Home reflects statutory deductions (PF/PT) on the assigned structure',
     'Net Take-Home should be less than Monthly Gross once PF/PT deductions are applied, consistent with the deduction logic used elsewhere in the app.',
     'Net Take-Home (\u20b920,000) is shown identical to Monthly Gross (\u20b920,000) \u2014 no statutory deduction appears to be applied on this screen.',
     'Fail'],
])

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
doc.add_page_break()
doc.add_heading('Summary Scorecard', level=1)

summary_cols = ['Module', 'Total TCs', 'Pass', 'Fail']
summary_rows = [
    ('A. Payroll Dashboard', 9, 1, 8),
    ('B1. Payroll Cycle', 13, 7, 6),
    ('B2. Component Catalog', 12, 7, 5),
    ('B3. Payroll Slab', 3, 2, 1),
    ('B4. Payroll Settings', 9, 9, 0),
    ('C. Salary Revision', 7, 2, 5),
    ('D. Payroll Processing', 3, 2, 1),
    ('E. Payroll Management', 1, 1, 0),
    ('F. Mass Salary Structure', 2, 2, 0),
    ('G. Payroll Reports', 2, 0, 2),
    ('H. Employee Salary Structure', 2, 1, 1),
]
total_tc = sum(r[1] for r in summary_rows)
total_pass = sum(r[2] for r in summary_rows)
total_fail = sum(r[3] for r in summary_rows)

table = doc.add_table(rows=1, cols=4)
table.style = 'Table Grid'
table.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr = table.rows[0].cells
for i, c in enumerate(summary_cols):
    hdr[i].text = c
    for p in hdr[i].paragraphs:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    set_cell_shading(hdr[i], '1F4E78')

for mod, tot, p_, f_ in summary_rows:
    row_cells = table.add_row().cells
    row_cells[0].text = mod
    row_cells[1].text = str(tot)
    row_cells[2].text = str(p_)
    row_cells[3].text = str(f_)
    for i in (1, 2, 3):
        for p in row_cells[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER

row_cells = table.add_row().cells
row_cells[0].text = 'TOTAL'
row_cells[1].text = str(total_tc)
row_cells[2].text = str(total_pass)
row_cells[3].text = str(total_fail)
for i in range(4):
    for p in row_cells[i].paragraphs:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
    set_cell_shading(row_cells[i], 'D9D9D9')

set_col_widths(table, [6.0, 3.0, 3.0, 3.0])

doc.add_paragraph()
note = doc.add_paragraph(
    f'Overall: {total_tc} test cases executed \u2014 {total_pass} Pass, {total_fail} Fail '
    f'({round(total_pass/total_tc*100)}% pass rate). '
    'The two most severe findings are: (1) the "Approve" action on Salary Revision reports success to the '
    'user while the backend actually rejects it (403) and nothing is saved; and (2) the Payroll Dashboard '
    'fabricates a "PUBLISHED" payroll status when its backing API fails, rather than showing an empty/error state.'
)
note.runs[0].italic = True
note.runs[0].font.size = Pt(9)

out_path = 'D:/shakyadita_projects/apponexthrms/scratchpad/Payroll_Manual_Testing_TestCases.docx'
doc.save(out_path)
print('SAVED:', out_path)

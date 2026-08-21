# -*- coding: utf-8 -*-
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

MEDIA = 'D:/shakyadita_projects/apponexthrms/scratchpad/docx_extract/word/media/'

def set_cell_shading(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

doc = Document()
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(10)

title = doc.add_heading('Payroll Module — Screenshot-Based Test Cases', level=0)
sub = doc.add_paragraph('Apponext HRMS — one test case per screenshot, in the order tested')
sub.runs[0].italic = True
sub.runs[0].font.size = Pt(11)
meta = doc.add_paragraph('Tested by: Shakyadita  |  Org: Kosqu Technolab (hosted)  |  Date: 21 Aug 2026')
meta.runs[0].font.size = Pt(9)
meta.runs[0].font.color.rgb = RGBColor(0x60, 0x60, 0x60)
doc.add_paragraph()

STATUS_COLOR = {'Pass': '2E7D32', 'Fail': 'C62828', 'Partial': 'E0A800'}

def add_case(tc_id, test_case, expected, actual, status, image_file):
    p = doc.add_paragraph()
    run = p.add_run(f'{tc_id}   {test_case}')
    run.bold = True
    run.font.size = Pt(11)
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)

    table = doc.add_table(rows=3, cols=2)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    rows_data = [('Expected Result', expected), ('Actual Result', actual), ('Status', status)]
    for i, (label, val) in enumerate(rows_data):
        cells = table.rows[i].cells
        cells[0].text = label
        cells[0].width = Cm(3.0)
        for p_ in cells[0].paragraphs:
            for r in p_.runs:
                r.bold = True
                r.font.size = Pt(9)
        set_cell_shading(cells[0], 'F2F2F2')
        cells[1].text = str(val)
        cells[1].width = Cm(14.0)
        for p_ in cells[1].paragraphs:
            for r in p_.runs:
                r.font.size = Pt(9)
        if label == 'Status':
            set_cell_shading(cells[1], STATUS_COLOR.get(status, 'FFFFFF'))
            for p_ in cells[1].paragraphs:
                for r in p_.runs:
                    r.bold = True
                    r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # screenshot right after
    try:
        doc.add_picture(MEDIA + image_file, width=Inches(6.2))
        last_p = doc.paragraphs[-1]
        last_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    except Exception as e:
        doc.add_paragraph(f'[image missing: {image_file}]')
    doc.add_paragraph()

def add_section(text):
    doc.add_heading(text, level=1)

# ===========================================================================
# A. PAYROLL DASHBOARD
# ===========================================================================
add_section('A. Payroll Dashboard')

add_case('TC-A01', 'Load Payroll Dashboard',
    'Dashboard loads with KPI cards, lifecycle stepper and charts, no errors.',
    'Dashboard loaded correctly showing Total Outlay, Net Take-Home, Enrolled Staff, PF & Statutory, Next Disbursal cards and the Payroll Processing Lifecycle stepper.',
    'Pass', 'image1.png')

add_case('TC-A02', 'View Payroll Operations Hub (scrolled section)',
    'Quick-link operations hub renders correctly below the KPI cards.',
    'Operations Hub section rendered correctly with working quick-link cards.',
    'Pass', 'image2.png')

add_case('TC-A03', '"Mass Upload CSV" button navigation',
    'Clicking the button navigates to the Mass Salary Structure Upload page.',
    'Correctly redirected to the Mass Salary Structure Upload page.',
    'Pass', 'image3.png')

add_case('TC-A04', '"Run Payroll Pipeline" button navigation',
    'Clicking the button navigates to the Payroll Processing page.',
    'Correctly redirected to the Payroll Processing page with filters visible.',
    'Pass', 'image4.png')

# ===========================================================================
# B1. PAYROLL CYCLE
# ===========================================================================
add_section('B1. Payroll Cycle')

add_case('TC-B1-01', 'Open / view an existing Payroll Cycle record',
    'Edit form loads and displays the correct existing cycle values.',
    'Form loaded correctly with the existing cycle\u2019s values populated.',
    'Pass', 'image5.png')

add_case('TC-B1-02', 'Create a new Payroll Cycle',
    'Cycle is created and a success confirmation is shown.',
    '"Cycle Saved" toast displayed; new cycle appeared in the cycle list.',
    'Pass', 'image6.png')

add_case('TC-B1-03', 'Update an existing Payroll Cycle',
    'Cycle updates and a success confirmation is shown.',
    '"Cycle Updated" toast displayed.',
    'Pass', 'image7.png')

add_case('TC-B1-04', 'Delete a Payroll Cycle',
    'Cycle is removed and a success confirmation is shown.',
    '"Cycle Deleted" toast displayed; cycle list returned to 0 records.',
    'Pass', 'image8.png')

# ===========================================================================
# B2. PAYROLL COMPONENT CATALOG — EARNING GROUP
# ===========================================================================
add_section('B2. Payroll Component Catalog — Earning Group')

add_case('TC-B2-01', 'Create an Earning Component Group',
    'Group is created and a success confirmation is shown.',
    '"Group Created" toast displayed for the new group.',
    'Pass', 'image9.png')

add_case('TC-B2-02', 'Create a Component inside the Earning Group',
    'Component is created and a success confirmation is shown.',
    '"Component Created" toast displayed ("basic salary").',
    'Pass', 'image10.png')

add_case('TC-B2-03', 'Update a Component in the Earning Group',
    'Component updates and a success confirmation is shown.',
    '"Component Updated" toast displayed.',
    'Pass', 'image11.png')

add_case('TC-B2-04', 'Delete a Component in the Earning Group',
    'Component is removed and a success confirmation is shown.',
    '"Component Deleted" toast displayed.',
    'Pass', 'image12.png')

add_case('TC-B2-05', 'Open a blank "Add New Group" form',
    'Form opens empty and ready for input.',
    'Form opened correctly with all fields blank/default.',
    'Pass', 'image13.png')

# ===========================================================================
# B2. PAYROLL COMPONENT CATALOG — DEDUCTION GROUP
# ===========================================================================
add_section('B2. Payroll Component Catalog — Deduction Group')

add_case('TC-B2-06', 'Create a Deduction Component Group',
    'Group is created and a success confirmation is shown.',
    '"Group Created" toast displayed \u2014 Group "tax" created successfully.',
    'Pass', 'image14.png')

add_case('TC-B2-07', 'Create a Component inside the Deduction Group',
    'Component is created and a success confirmation is shown.',
    '"Component Created" toast displayed \u2014 Component "tax cuts" created successfully.',
    'Pass', 'image15.png')

add_case('TC-B2-08', 'Update a Component\u2019s type (Value \u2192 Derived) in the Deduction Group',
    'Component updates and a success confirmation is shown; table reflects new type.',
    '"Component Updated" toast displayed; table correctly shows type changed to DERIVED.',
    'Pass', 'image16.png')

add_case('TC-B2-09', 'Delete a Component in the Deduction Group',
    'Component is removed from the table and a success confirmation is shown.',
    '"Component Deleted" toast displayed, but the "tax cuts" row is still visible in the table on the right \u2014 the list does not refresh immediately after deletion.',
    'Fail', 'image17.png')

# ===========================================================================
# B3. PAYROLL SLAB
# ===========================================================================
add_section('B3. Payroll Slab')

add_case('TC-B3-01', 'Create a Payroll Slab',
    'Slab is created and a success confirmation is shown.',
    '"Slab Saved" toast displayed for the "monthly" slab (CTC range \u20b950,000\u2013\u20b922,00,001).',
    'Pass', 'image18.png')

add_case('TC-B3-02', 'Update a Payroll Slab',
    'Slab updates and a success confirmation is shown; changed values reflect in the list.',
    '"Slab Updated" toast displayed; CTC max range correctly changed to \u20b918,10,001.',
    'Pass', 'image19.png')

add_case('TC-B3-03', 'Delete a Payroll Slab',
    'Slab is removed and a success confirmation is shown.',
    '"Slab Deleted" toast displayed; form reset to empty "Add Payroll Slab" state.',
    'Pass', 'image20.png')

# ===========================================================================
# B4. PAYROLL SETTINGS
# ===========================================================================
add_section('B4. Payroll Settings')

add_case('TC-B4-01', 'Load Payroll Settings tab (clean state)',
    'Settings load with Save button disabled until a change is made.',
    'Settings loaded correctly; "Save Settings" button greyed out with no pending changes.',
    'Pass', 'image21.png')

add_case('TC-B4-02', 'Edit Payslip Setting fields (mid-edit state)',
    '"Unsaved changes" indicator appears while editing, before save.',
    '"Unsaved changes" badge correctly appeared while toggles/fields were being edited.',
    'Pass', 'image22.png')

# ===========================================================================
# C. SALARY REVISION
# ===========================================================================
add_section('C. Salary Revision')

add_case('TC-C01', 'Load Salary Revision page (clean state)',
    'Page loads with KPI cards at 0 and an empty register.',
    'Loaded correctly \u2014 Pending/Approved/Total all 0, "No salary revision requests recorded yet."',
    'Pass', 'image23.png')

add_case('TC-C02', 'Fill Create Salary Revision form and verify live CTC breakdown',
    'Basic/HRA/Special Allowance/Net Take-Home recalculate correctly for the entered hike.',
    'Correctly recalculated: \u20b96,00,000 \u2192 +15% \u2192 \u20b96,90,000/yr, with Current vs Proposed breakdown matching (Basic 50%, HRA 40% of Basic, Special Allowance, PF & PT deductions, Net Take-Home).',
    'Pass', 'image24.png')

add_case('TC-C03', 'Submit a Salary Revision Request (Admin)',
    'Request appears in the register with "Pending Review" status; KPI counts update.',
    'Register correctly shows Aaqib Sheikh with Pending Review status; Pending Approvals = 1, Total Revisions = 1.',
    'Pass', 'image25.png')

add_case('TC-C04', 'Approve a pending Salary Revision',
    'Approve action completes with a success confirmation.',
    '"Salary revision for Aaqib Sheikh approved successfully!" toast displayed.',
    'Pass', 'image26.png')

add_case('TC-C05', 'Reject a pending Salary Revision',
    'Reject action completes with a success confirmation; status and KPI counts update.',
    '"Salary revision for Pranali Patil rejected." toast displayed; status correctly changed to "Rejected / Completed"; Pending Approvals count updated from 2 to 1.',
    'Pass', 'image27.png')

add_case('TC-C06', 'Non-admin (HR) user submits a Salary Revision request',
    'Request should be submitted and become visible for Admin review \u2014 either in the HR user\u2019s own register or flagged as pending for the admin.',
    'Toast confirms "Salary revision request for Aaqib Sheikh (+15.00% Hike) submitted for Admin approval," but the Salary Revision Register shows "0 Records" / "No salary revision requests recorded yet." and all KPI cards show 0 immediately after submission \u2014 the request is not visible anywhere, including to the submitting HR user.',
    'Fail', 'image28.png')

add_case('TC-C07', 'Verify Salary Revision Register after multiple approve/reject actions',
    'All processed requests should be visible with correct statuses and counts.',
    'Register correctly lists all 4 processed requests (2\u00d7 Aaqib Sheikh, Pranali Patil, +1 more), each showing "Rejected / Completed" with correct CTC and hike values.',
    'Pass', 'image29.png')

add_case('TC-C08', 'Reload Salary Revision page and re-verify Register persistence',
    'Register data should persist and match the prior state after a fresh page load.',
    'Confirmed on reload \u2014 Total Revisions = 4, all records and statuses matched the pre-reload state.',
    'Pass', 'image30.png')

# ===========================================================================
# D. PAYROLL PROCESSING
# ===========================================================================
add_section('D. Payroll Processing')

add_case('TC-D01', 'Open Payroll Processing \u2014 Process Payroll filters',
    'Filters load correctly (Cycle, Month, Company, Department, Pay Slab, Employee, etc.).',
    'All filters loaded correctly with real org data (2 Companies, 10 Officers, 10 total Employees, etc.).',
    'Pass', 'image31.png')

add_case('TC-D02', 'View Payroll Register after filtering (Pay Slab column)',
    'Each employee\u2019s actual assigned monthly slab should be shown.',
    'Every one of the 17 employees shows the same generic "Standard Pay Slab" \u2014 a dummy/placeholder value, not each employee\u2019s real assigned slab (e.g. Aaqib Sheikh\u2019s actual "monthly" slab from Salary Revision).',
    'Fail', 'image32.png')

add_case('TC-D03', 'Process Payroll (Step 1)',
    'Payroll calculates successfully with a confirmation to review the register.',
    '"Payroll Processed" toast displayed \u2014 "Salaries calculated. Review the register, then lock the figures."',
    'Pass', 'image33.png')

add_case('TC-D04', 'Lock Payroll figures (Step 2)',
    'Figures freeze successfully with a confirmation, ready to publish.',
    '"Payroll Locked" toast displayed \u2014 Run #8 shows "1. Processed\u2713 2. Locked\u2713 3. Publish Payslips."',
    'Pass', 'image34.png')

add_case('TC-D05', 'Publish Payslips (Step 3)',
    'Payslips publish successfully and become visible to employees.',
    '"Payslips Published" toast displayed \u2014 "Payslips are now visible to employees." Run #8 shows all 3 steps complete.',
    'Pass', 'image35.png')

add_case('TC-D06', 'Generate an individual Payslip from a processed run',
    'Payslip preview should show correctly calculated Gross/Deductions/Net figures.',
    '"Payslip Ready" toast confirms generation for Nishikant Vetal, but the "Official Statement" preview modal shows \u20b9NaN for Earnings & Allowances, Total Statutory Deductions, and Net Monthly Take-Home Pay.',
    'Fail', 'image36.png')

add_case('TC-D07', 'Download / print the generated Payslip as PDF',
    'Downloaded PDF should show correct calculated figures, matching the payroll register.',
    'PDF is correct: Gross Earnings \u20b93,537, Statutory Deductions \u20b9453, Net Take-Home \u20b93,084, with a full accurate Basic/HRA/Special Allowance/PF/PT/ESIC breakdown.',
    'Pass', 'image37.png')

# ===========================================================================
# E. PAYROLL MANAGEMENT (PAYSLIP MANAGEMENT)
# ===========================================================================
add_section('E. Payroll Management (Payslip Management)')

add_case('TC-E01', 'View generated payslip in Payslip Management list',
    'Payslip should list with correct Gross/Deductions/Net figures and visibility toggle.',
    'Correctly listed \u2014 Nishikant Vetal, PS-202608-149, Gross \u20b94,167, Deductions -\u20b91,108, Net \u20b93,059, Visible.',
    'Pass', 'image38.png')

add_case('TC-E02', 'Edit & customize an individual payslip',
    'Edit modal should open pre-filled with the employee\u2019s current payslip figures, editable.',
    '"Edit & Customize Official Payslip" modal opened correctly, pre-filled with employee/bank info and editable earnings/deductions fields.',
    'Pass', 'image39.png')

add_case('TC-E03', 'Delete / remove a payslip card',
    'Payslip is removed and a success confirmation is shown.',
    '"Payslip card removed for Nishikant Vetal" toast displayed; count updated to "0 Payslips Available."',
    'Pass', 'image40.png')

add_case('TC-E04', 'Download Payroll Register as Excel/CSV',
    'File download completes with a success confirmation.',
    '"Download Complete" toast displayed \u2014 "Payroll Excel/CSV sheet downloaded successfully."',
    'Pass', 'image41.png')

add_case('TC-E05', 'View Payroll Runs history',
    'Historical runs should list with correct employee count, gross pay, and net disbursal.',
    'Correctly listed 2 runs \u2014 #RUN-008 (15 Staff, \u20b97,11,667 gross) and #RUN-007 (2 Staff, \u20b960,000 gross), both Published.',
    'Pass', 'image42.png')

# ===========================================================================
# F. MASS SALARY STRUCTURE UPLOAD
# ===========================================================================
add_section('F. Mass Salary Structure Upload')

add_case('TC-F01', 'Browse and select a salary CSV file for upload',
    'System file picker opens and allows selecting a CSV file.',
    'File picker opened correctly, filtered to relevant file types.',
    'Pass', 'image43.png')

add_case('TC-F02', 'Upload a salary structure CSV',
    'File parses successfully with a confirmation of records loaded.',
    '"Loaded 20 employee records from spreadsheet!" toast displayed.',
    'Pass', 'image44.png')

add_case('TC-F03', 'Preview loaded records and validate employee matching',
    'Rows should be validated against real employee records, flagging any that don\u2019t match.',
    'Correctly validated \u2014 2 rows marked "Valid" (matched EMP001, EMP002), remaining rows correctly flagged "Not Found" for unmatched identifiers.',
    'Pass', 'image45.png')

add_case('TC-F04', 'Bulk-assign a salary slab to selected staff',
    'Slab assignment completes successfully with a confirmation.',
    '"Successfully assigned salary slab to 17 employees!" toast displayed.',
    'Pass', 'image46.png')

add_case('TC-F05', 'View Mass Salary Component Upload Log',
    'Log should list past uploads with row counts and success/failure status.',
    'Log correctly listed both upload attempts, each showing "Completed (2 failed)" \u2014 matching the 2 unmatched employee rows identified during validation.',
    'Pass', 'image47.png')

# ===========================================================================
# G. PAYROLL REPORTS
# ===========================================================================
add_section('G. Payroll Reports')

add_case('TC-G01', 'Load Payroll Reports \u2014 KPI cards',
    'KPI cards (Paid Headcount, Monthly Gross Outlay, Bank Disbursal, Statutory Compliance) should reflect the org\u2019s real 17 employees.',
    'All KPI cards show 0 (0 Staff, \u20b90 Gross Outlay, \u20b90 Bank Disbursal, \u20b90 Statutory) despite 17 real active employees existing in the org; CTC Master table also reports "No payroll records found matching current criteria for 2026-08."',
    'Fail', 'image48.png')

add_case('TC-G02', 'View CTC Master report table',
    'Table should show each employee\u2019s real assigned slab and CTC figures.',
    'Table does list all employees correctly by name/code/department, but every single employee shows the identical hardcoded "Standard Pay Slab" with the same \u20b94,167 Monthly Gross / \u20b950,000 Annual CTC \u2014 not their real individually assigned structure.',
    'Fail', 'image49.png')

# ===========================================================================
# H. EMPLOYEE SALARY STRUCTURE (Profile → Payroll tab)
# ===========================================================================
add_section('H. Employee Salary Structure (Profile \u2192 Payroll Tab)')

add_case('TC-H01', 'View existing Pay Structure on employee profile',
    'Payroll Detail table should show correct Slab, Annual CTC, Monthly Gross, Net Take-Home, and status.',
    'Table displays correctly \u2014 Slab: monthly, Annual CTC \u20b950,000, Monthly Gross \u20b94,167 (matches \u20b950,000 \u00f7 12), Effective From 21 Aug 2026, Status Active.',
    'Pass', 'image50.png')

add_case('TC-H02', 'Open "Add/Edit Pay Structure" modal and review the dynamic breakup',
    'Modal opens with Annual CTC input and component-wise earning/deduction breakdown, editable.',
    '"Payroll Breakup [Dynamic Structure]" modal opened correctly for the "monthly" slab, showing Annual CTC Input, Basic Salary, and Tax component fields tied to the slab\u2019s 4 assigned components.',
    'Pass', 'image51.png')

add_case('TC-H03', 'Update Pay Structure with a new Annual CTC (\u20b960,000)',
    'Structure updates and a success confirmation is shown; table reflects new CTC.',
    '"Pay structure updated successfully" toast shown; table correctly reflects the new Annual CTC of \u20b960,000.',
    'Pass', 'image52.png')

add_case('TC-H03b', 'Delete a Pay Structure record',
    'Record is removed/marked deleted with a success confirmation.',
    '"Structure deleted successfully" toast displayed; row remains visible in the table with Status correctly updated to "Deleted" (soft-delete, preserved for history).',
    'Pass', 'image53.png')

add_case('TC-H04', 'Reload employee profile after deleting Pay Structure',
    'Deleted structure should no longer appear as an active record after a fresh page load.',
    'Confirmed on reload \u2014 table correctly shows "No structure records found."',
    'Pass', 'image54.png')

add_case('TC-H05', 'Add a new Pay Structure from employee profile',
    'New structure saves successfully with correct Annual CTC and Slab Template.',
    '"New pay structure saved successfully" toast shown; table correctly shows Slab: monthly, Annual CTC \u20b94,80,000, Effective From 21 Aug 2026, Status Active.',
    'Pass', 'image55.png')

out_path = 'D:/shakyadita_projects/apponexthrms/scratchpad/Payroll_Screenshot_TestCases.docx'
doc.save(out_path)
print('SAVED:', out_path)

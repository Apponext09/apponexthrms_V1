# -*- coding: utf-8 -*-
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import copy

DOC_PATH = r"D:\shakyadita_projects\apponexthrms\Payroll_QA_Test_Manual.docx"
IMG_DIR = r"D:\shakyadita_projects\apponexthrms\scratchpad\qa_round3"

GREEN = RGBColor(0x1E, 0x7E, 0x34)
RED = RGBColor(0xC0, 0x30, 0x30)
AMBER = RGBColor(0xB4, 0x6C, 0x00)
GREY = RGBColor(0x55, 0x55, 0x55)
CAPTION_SIZE = Pt(9)
BODY_SIZE = Pt(11)

doc = docx.Document(DOC_PATH)

# Find anchor: the "Appendix" Heading 1 paragraph - all new content gets
# inserted immediately before it, so the Appendix remains the closing
# section (matching the existing document's structure/intent).
anchor = None
for p in doc.paragraphs:
    if p.style.name == 'Heading 1' and p.text.strip().startswith('Appendix'):
        anchor = p
        break
if anchor is None:
    raise RuntimeError("Could not find Appendix heading anchor")

def insert_before_anchor(new_p):
    anchor._p.addprevious(new_p._p)

def add_heading1(text):
    p = doc.add_paragraph()
    p.style = doc.styles['Heading 1']
    p.add_run(text)
    insert_before_anchor(p)
    return p

def add_heading2(text):
    p = doc.add_paragraph()
    p.style = doc.styles['Heading 2']
    p.add_run(text)
    insert_before_anchor(p)
    return p

def add_para(text, bold=False, italic=False, color=None, size=BODY_SIZE):
    p = doc.add_paragraph()
    p.style = doc.styles['Normal']
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    r.font.size = size
    if color:
        r.font.color.rgb = color
    insert_before_anchor(p)
    return p

def add_labeled_para(label, body):
    """e.g. 'Root cause: ' bold + normal body text, matching existing doc style."""
    p = doc.add_paragraph()
    p.style = doc.styles['Normal']
    r1 = p.add_run(label)
    r1.bold = False
    r1.font.size = BODY_SIZE
    r2 = p.add_run(body)
    r2.font.size = BODY_SIZE
    insert_before_anchor(p)
    return p

def add_result(status, note=""):
    """status: 'PASS' | 'FAIL' | 'PARTIAL'"""
    color = {'PASS': GREEN, 'FAIL': RED, 'PARTIAL': AMBER}.get(status, GREY)
    p = doc.add_paragraph()
    p.style = doc.styles['Normal']
    r1 = p.add_run('Result: ')
    r1.bold = True
    r1.font.size = Pt(12)
    r2 = p.add_run(status + (f" — {note}" if note else ""))
    r2.bold = True
    r2.font.size = Pt(12)
    r2.font.color.rgb = color
    insert_before_anchor(p)
    return p

def add_empty():
    p = doc.add_paragraph()
    insert_before_anchor(p)
    return p

def add_image(filename, caption, width_in=6.0):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(rf"{IMG_DIR}\{filename}", width=Inches(width_in))
    insert_before_anchor(p)

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = cap.add_run(caption)
    r.italic = True
    r.font.size = CAPTION_SIZE
    r.font.color.rgb = GREY
    insert_before_anchor(cap)
    add_empty()

def add_table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = doc.styles['Light Grid Accent 1']
    t.autofit = True
    hdr_cells = t.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = ''
        p = hdr_cells[i].paragraphs[0]
        r = p.add_run(h)
        r.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        r.font.size = Pt(10)
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ''
            p = cells[i].paragraphs[0]
            r = p.add_run(str(val))
            r.font.size = Pt(9.5)
    # Move the table's underlying element before anchor. python-docx tables
    # are appended to doc.element.body directly (not via add_paragraph), so
    # we move the table's XML element itself.
    anchor._p.addprevious(t._tbl)
    add_empty()
    return t


# =============================================================================
# PART 1 — PAYROLL MASTER SETTINGS FEATURE GUIDE
# =============================================================================

add_heading1("Payroll Master Settings — Feature Guide")

add_para(
    "This section documents every field in the two core panels of Payroll Master "
    "Settings → Components Catalog: the Earning/Deduction Group panel (left side) and "
    "the Component Definition \u201cUpdate Component Information\u201d panel (right side, opened by "
    "clicking a component's pencil icon). Descriptions below are grounded in the actual "
    "source (server/src/modules/payroll/controllers/PayrollController.ts and "
    "client/src/features/payroll/pages/PayrollSettingsPage.tsx) and verified live against "
    "the running UI on " + "2026-08-17" + ". Fields are marked either "
)
p = doc.paragraphs[-1]
r = p.add_run("FUNCTIONAL")
r.bold = True
r.font.color.rgb = GREEN
r.font.size = BODY_SIZE
r2 = p.add_run(" (actually changes what payroll calculates or how the record behaves) or ")
r2.font.size = BODY_SIZE
r3 = p.add_run("COSMETIC / INFORMATIONAL")
r3.bold = True
r3.font.color.rgb = GREY
r3.font.size = BODY_SIZE
r4 = p.add_run(" (labeling, sorting, or display-only) — this distinction matters because several fields in this UI look like they drive calculation but do not.")
r4.font.size = BODY_SIZE
insert_before_anchor(p)
add_empty()

add_heading2("Screenshots")

add_image("01_component_groups_list.png",
          "Components Catalog tab, Earning Group list view. The Earning/Deduction toggle sits at the top of the left panel; the right panel shows a quick per-group component table with inline Edit/Delete icons.")
add_image("02_group_edit_panel.png",
          "Earning Group edit panel (left side), opened via the group's pencil icon — every group-level field described below is visible here, with the Earning/Deduction toggle still visible above it.")
add_image("03_component_definition_panel_top.png",
          "\u201cUpdate Component Information\u201d panel (right side), opened by clicking a component's pencil icon in the quick table. Top section: Component Name, Assign to Component Group, Non-Cashable/Based On Attendance/Active toggles, Component Type, and the Formula Expression editor.")
add_image("04_component_definition_panel_conditions.png",
          "Lower half of the same panel, scrolled down: Boundary Type/Min/Max, Effective dates, and the collapsible Condition Setting section (Condition On / Operator / Value1 / Value2 / Months / Gender) plus Employment Setting (Grade/Department/Location/Employee).")

add_heading2("Earning / Deduction Group Panel — Field Reference")
add_para(
    "Location: Payroll Master Settings → Components Catalog tab → left panel. The "
    "Earning/Deduction toggle at the top switches which set of groups you are viewing and "
    "editing; groups are the buckets that individual components (e.g. \u201cBasic 50%\u201d, \u201cHRA 25%\u201d) "
    "get assigned into. Backed by the payroll_component_groups table, wired through "
    "PayrollController.createComponentGroup / updateComponentGroup."
)

add_table(
    ["Field", "What it does", "Type"],
    [
        ("Group Name", "The label shown for this group everywhere it appears — payslips, the component table, reports (e.g. \u201cBasic\u201d, \u201cAllowances\u201d, \u201cStatutory Deductions\u201d).", "Functional (identity) / Cosmetic (label)"),
        ("Round Format", "Rounding rule (Round / Round two decimal / Round Up / Round Down) applied to the group's computed total before it's used downstream.", "Functional"),
        ("Group Function", "How multiple components inside this group combine into one group total: Sum adds every component's value; Max takes the single largest; Min the smallest.", "Functional"),
        ("Configure On Profile", "Whether this group's value can be configured/edited from an employee's profile page.", "Functional (controls UI access elsewhere)"),
        ("Display On Profile", "Whether this group's value is shown at all on an employee's profile page.", "Cosmetic / display-only"),
        ("Is Editable", "Whether HR can manually override this group's computed value per employee (an escape hatch for one-off adjustments).", "Functional"),
        ("Contributed By", "Employee or Employer — which side of CTC this group's amount counts against. Relevant for employer-contribution items like PF/ESI where the employer's share shouldn't reduce take-home pay.", "Functional"),
        ("Active", "Whether this group is currently in use. Inactive groups and their components are excluded from processing.", "Functional"),
        ("Recalculate Payroll On Change", "Whether changing this group's configuration forces already-processed payroll to be recalculated.", "Functional"),
        ("Group For Payslip", "Which payslip section (e.g. Earnings, Deductions, Other Earnings) this group's total is printed under.", "Cosmetic / display-only"),
        ("Display Order", "Sort position among other groups, in lists and on the payslip.", "Cosmetic / display-only"),
        ("Disable Arrear", "Whether retroactive arrear adjustments are blocked for this group (useful for one-time/non-recurring groups where a backdated recalculation wouldn't make sense).", "Functional"),
        ("Display Total On Process", "Whether the group's subtotal is shown as its own line on the Process Payroll register.", "Cosmetic / display-only"),
        ("TDS deducted same month", "Whether TDS on this group's amount is withheld in the same month it's earned, versus deferred/averaged across the remaining months of the financial year.", "Functional"),
        ("Taxable", "Whether this group's amount counts toward taxable income for TDS purposes at all.", "Functional"),
    ]
)

add_heading2("Component Definition Panel — Field Reference (\u201cUpdate Component Information\u201d)")
add_para(
    "Location: same tab, right panel — opened by clicking any component's pencil icon. "
    "Backed by the payroll_components table, wired through PayrollController's "
    "createComponentDefinition / updateComponentDefinition."
)

add_table(
    ["Field", "What it does", "Type"],
    [
        ("Component Name", "The actual line-item name, e.g. \u201cBasic 50%\u201d, \u201cHRA\u201d, \u201cConveyance\u201d.", "Functional (identity)"),
        ("Assign to Component Group", "Links this component into one of the groups on the left panel (e.g. assigns \u201cBasic 50%\u201d into the \u201cBasic\u201d group), so its value rolls up into that group's total.", "Functional"),
        ("Non-Cashable Item", "Flags the component as a benefit-in-kind (e.g. a meal card, insurance premium paid on the employee's behalf) rather than a cash payment.", "Functional (affects downstream reporting/tax treatment)"),
        ("Based On Attendance", "Whether this component scales down proportionally for LOP (Loss of Pay) / unpaid-leave days in the month. Confirmed live in the payroll engine's LOP-scaling logic (PayrollService.ts).", "Functional"),
        ("Active", "Whether this component is currently applied during payroll processing. Inactive components are skipped entirely.", "Functional"),
        ("Component Type — Value", "A flat, fixed amount entered directly (the Amount (\u20b9) field appears).", "Functional"),
        ("Component Type — Derived", "Computed from a Formula Expression instead of a fixed amount (see caveat below).", "Functional"),
        ("Component Type — Module", "Shows a \u201cModule Integration Source\u201d dropdown (Overtime / Loan / Expense & Travel Claims) instead of a formula or amount — intended to source the value from another module rather than a formula. No Amount or Formula field is shown for this type.", "Functional (selector) — verify module wiring separately per source"),
        ("Formula Expression", "Only meaningful when Component Type = Derived. See the dedicated caveat section below — this is the single most important field to understand correctly.", "Functional, but with real limits"),
        ("Boundary Type (Min/Max)", "Choose / Fixed / Range — governs whether Minimum/Maximum Amount fields are enforced as a floor/ceiling on the computed value.", "Functional"),
        ("Minimum / Maximum Amount", "The actual floor/ceiling values when Boundary Type is Range.", "Functional"),
        ("Effective From / To Date", "Date window during which this component is applied.", "Functional"),
        ("Condition On / Operator / Value1 / Value2", "An eligibility condition (e.g. \u201cBasic Pay > 15000\u201d) that gates whether this component applies to a given employee.", "Functional"),
        ("[+] Months", "Restricts the component to specific calendar months (e.g. a festival bonus that should only ever appear in October).", "Functional"),
        ("Gender", "Restricts eligibility to All / Male / Female.", "Functional"),
        ("Employment Setting — Grade / Department / Location / Employee", "Further eligibility targeting, scoping the component to specific grades, departments, locations, or named employees.", "Functional"),
    ]
)

add_heading2("Critical Caveat: What the Formula Expression Actually Understands")
add_para(
    "The Formula Expression field looks like a free-form calculator, but it is not a full "
    "expression evaluator. PayrollService.ts's resolveComponentOverrides parses simple "
    "percentage-shaped formulas — a single number multiplied or divided against exactly one "
    "of [BASIC], [GROSS], or [CTC] — such as \u201c(50 * [CTC]) / 100\u201d or \u201c[BASIC] * 0.40\u201d. Anything "
    "written beyond that shape (multiple variables combined, nested arithmetic across two "
    "different bases, etc.) will not compute as literally written; the parser falls back to "
    "whatever bare percentage it can extract."
)
add_para(
    "Only [BASIC], [GROSS], and [CTC] are read by the calculation engine. The variable "
    "buttons that used to also offer EPF_EPS_WAGES, SALARY_DAYS, and ATTENDANCE_DAYS have "
    "been removed from this screen, because nothing on the backend ever read them — a "
    "formula built from those tokens silently fell back to whatever bare percentage the "
    "regex parser could salvage, producing a number that had nothing to do with what the "
    "formula visually said. What remains on screen ([BASIC], [GROSS], [CTC], and the basic "
    "operators/percentages) is now an honest reflection of what actually computes."
)

add_heading2("Verified Live: Editing Eligibility Fields on an EXISTING Component Now Saves")
add_labeled_para(
    "What was tested: ",
    "opened the existing \u201cBasic 50%\u201d component (id 2) in edit mode, changed Gender from "
    "\u201cAll\u201d to \u201cMale\u201d, set Condition On = \u201cBasic Pay\u201d, Operator = \u201c>\u201d, Value1 = 15000, and clicked "
    "Update — this specifically exercises the previously-reported bug where editing these "
    "fields on an EXISTING component silently failed to save (only creating a brand-new "
    "component would persist them)."
)
add_image("06_component_before_save_gender_condition.png", "Gender set to Male and the condition fields filled in, immediately before clicking Update.")
add_labeled_para(
    "Server confirmation: ",
    "the PUT to /payroll/component-definitions/2 returned HTTP 200. A direct authenticated "
    "GET of the same component after a full page reload returned "
    "genderFilter: \"Male\", conditionOn: \"Basic Pay\", conditionOperator: \">\", "
    "conditionValue1: \"15000\" — all four values genuinely persisted server-side, not just "
    "echoed back in the save response."
)
add_image("08_component_reopened_top.png", "Component reopened after a full page reload.")
add_image("09_component_reopened_conditions.png", "Condition Setting section after reload — the Gender selector visually shows \u201c\u2713 All\u201d, not \u201cMale\u201d, despite the server holding \u201cMale\u201d.")
add_result("PARTIAL",
    "the underlying save bug is genuinely fixed — edits to an existing component's eligibility fields now persist server-side, confirmed by direct API read after reload. "
    "However, a separate, already-documented display-only bug remains: the edit form's Gender selector does not reflect a previously-saved value when reopening the component "
    "(it shows \u201cAll\u201d regardless of the true saved value). This is the same issue as \u201cN1\u201d in the prior QA pass — it has not been fixed by this round's changes. "
    "No data loss occurs; it is purely that the form fails to display the true saved state on reopen, which could mislead an admin reviewing an existing component's eligibility rules."
)
add_empty()


# =============================================================================
# PART 2 — ROUND 3
# =============================================================================

add_heading1("Round 3 — Settlement Management Fixes & New Validations")
add_para(
    "This round covers a new batch of fixes to Settlement Management (Full & Final "
    "Settlement, exit requests, gratuity/leave-encashment calculation) and newly-added "
    "client-side validation on Process Payroll's Filter and \u201c1. Process Payroll\u201d actions. "
    "Testing was performed live via Playwright + Chromium against the running app, "
    "cross-checked directly against the MySQL database and raw API responses where the UI "
    "alone wasn't conclusive. Screenshots are in scratchpad/qa_round3/."
)
add_empty()

# ---- R1 ----
add_heading2("R1. Exit Request Flow — Reason Now Persists Server-Side, but the Admin Queue Still Can't Show It")
add_labeled_para(
    "What was checked: ",
    "submitted an exit request for EMP014 (Vivaan Iyer, employee id 173) via Team Exit "
    "Settlements (/manager/settlements), with a distinctive test reason "
    "\u201cQA_ROUND3_TEST_REASON_EXIT_98765\u201d."
)
add_image("11_exit_request_form_filled.png", "Exit request form filled in with the distinctive test reason before submitting.")
add_image("12_exit_request_submitted.png", "Confirmation after submitting.")
add_labeled_para(
    "Server confirmation: ",
    "a direct database read of the new record shows status = \"exit_requested\" and "
    "settlement_notes = \"QA_ROUND3_TEST_REASON_EXIT_98765\" — the reason is genuinely "
    "saved, and the status is correctly set so the record is now findable by HR's "
    "dedicated exit-request query. This part of the fix is real."
)
add_labeled_para(
    "But on the admin side: ",
    "opening Exit Settlements (FnF) → Pending tab shows the new record, but its "
    "\u201cResignation comment\u201d column reads the literal placeholder text \u201ctest\u201d, not the "
    "real reason — because FullFinalSettlement.tsx renders "
    "item.resignation_comment || item.reason || 'test', and neither of the first two "
    "field names exists on the API response (the real field is settlementNotes / "
    "settlement_notes). The same problem affects the row's employee identity: every row "
    "in this table displays as the generic fallback \u201cEmployee #1\u201d with an identical "
    "hardcoded duration/date, because getEmployeeName reads settlement.employee_name and "
    "settlement.employee_id (snake_case), which don't exist on the camelCased API "
    "response either."
)
add_image("13_fnf_pending_tab_baseline.png", "Pending tab after the exit request: both rows show generic \u201cEmployee #1\u201d identity and the literal fallback text \u201ctest\u201d for Resignation comment, regardless of what was actually submitted or for whom.")
add_result("PARTIAL",
    "the historical bug that made the reason field always empty is fixed at the data layer — it now genuinely saves. But the admin's Pending Exit Requests view (Exit Settlements → Pending tab) still cannot surface the real reason or the real employee for any record, because it reads field names that don't match the actual API response shape. An admin reviewing this screen today cannot tell who requested an exit or why."
)
add_para("Aside (not one of the 8 items, observed in passing): the Team Exit Settlements page's own \u201cTeam Member\u201d dropdown shows \u201cEMP #171 ()\u201d style placeholders instead of real names, for the same snake_case/camelCase field-name mismatch reason. Selecting by dropdown position still works correctly; only the display text is affected.", italic=True, color=GREY, size=Pt(10))
add_empty()

# ---- R2 ----
add_heading2("R2. Full & Final Settlement — Real Calculated Figures, No More Fabricated Numbers")
add_labeled_para(
    "What was checked: ",
    "created a new FnF settlement for EMP013 (Diya Kapoor, employee id 172) via \u201c+ "
    "Initialize Exit FnF Settlement\u201d, which now auto-calculates immediately on creation."
)
add_image("14_create_fnf_form.png", "Initialize form with EMP013 selected.")
add_image("15_create_fnf_result_banner.png", "Result after Create FnF Record.")
add_labeled_para(
    "Server confirmation (direct API read of the calculate response): ",
    "basicMonthly = 12500, tenureYears = 0, leaveBalanceDays = 0, gratuityAmount = \u20b90.00, "
    "leaveEncashmentAmount = \u20b90.00, with an explicit dataWarnings entry: \u201cNo leave balance "
    "records found for this employee \u2014 leave encashment defaulted to 0 days. Verify "
    "manually before finalizing.\u201d"
)
add_labeled_para(
    "Why this confirms the fix (and why the figures are still \u20b90 here): ",
    "the key regression this round targeted was a hardcoded flat \u20b935,000 fallback silently "
    "standing in for the employee's real basic salary whenever the lookup failed. That's "
    "gone — basicMonthly here is 12,500, a real, employee-specific number read from the "
    "salary structure, not a fabricated flat figure. The \u20b90 outcomes are separately, "
    "honestly explained: tenureYears = 0 because this organization's employee data has no "
    "one with meaningful tenure (EMP013 joined the day before this test — checked directly "
    "in the employees table, along with every other EMP012\u2013EMP021 test employee), so "
    "gratuity is correctly not payable under the 5-year statutory threshold; and this "
    "organization's leave_balances table has zero rows for any employee at all (checked "
    "directly), so leave encashment is correctly zero and the API says so explicitly via "
    "dataWarnings rather than silently presenting a fake number."
)
add_result("PASS",
    "with an environment caveat: no employee in this org currently has \u22655 years' tenure or any leave balance record, so a nonzero payout could not be demonstrated end-to-end. The fix itself — real, structure-derived basicMonthly instead of a flat fallback, and transparent dataWarnings instead of silent fabrication — is directly confirmed via the API response."
)
add_empty()

# ---- R3 ----
add_heading2("R3. Approving a Non-Submitted Settlement Is Now Blocked \u2014 But With No Visible Message")
add_labeled_para(
    "What was checked: ",
    "clicked \u201cApprove\u201d (green check icon) on a Pending-tab settlement that was never "
    "moved to \u2018submitted\u2019 status. Note: this admin UI has no \u201cSubmit for Approval\u201d action "
    "anywhere — every record reachable here is \u2018draft\u2019 or \u2018exit_requested\u2019, so this check "
    "happens naturally on the very first Approve click, with no special setup needed."
)
add_image("17_approve_not_submitted_result.png", "Immediately after clicking Approve on a non-submitted record: the row correctly remains in Pending (not falsely approved), but no error message is visible anywhere on screen.")
add_labeled_para(
    "Server confirmation: ",
    "the PUT/POST to .../admin-approve returned HTTP 400 with message \u201cSettlement must "
    "be in submitted status for admin approval\u201d — the false-success bug (previously: any "
    "click showed a success toast and removed the row regardless of the real API result) "
    "is genuinely fixed; the row stays exactly where it was."
)
add_labeled_para(
    "But no message reaches the screen: ",
    "handleApproveFnF does call setFormError(...) on failure, but the JSX that renders "
    "formError/formSuccess in FullFinalSettlement.tsx is nested inside "
    "{showForm && (...)} — i.e. it only renders while the \u201cInitialize Exit FnF Settlement\u201d "
    "creation form happens to be open. During normal browsing of the Pending list (form "
    "closed), the error is computed and stored in React state but never displayed. To the "
    "admin, clicking Approve on an ineligible record looks like nothing happened at all."
)
add_result("PARTIAL",
    "the dangerous half of the bug (false success) is genuinely fixed \u2014 no more incorrectly-approved settlements. The promised \u201cclear validation message\u201d does not reach the screen in the normal Pending-list view."
)
add_empty()

# ---- R4 ----
add_heading2("R4. Reject / Reverse Now Moves the Record to a Real \u201cReverse\u201d Tab")
add_labeled_para(
    "What was checked: ",
    "clicked \u201cReverse Request\u201d (circular-arrow icon) on the same Pending record used in "
    "R3, then checked the Reverse tab."
)
add_image("18_after_reverse_action.png", "Pending tab immediately after the Reverse action \u2014 the row is gone.")
add_image("19_reverse_tab.png", "Reverse tab now shows the record, instead of it vanishing back to looking like a fresh draft.")
add_labeled_para(
    "Server confirmation: ",
    "the admin-reject call returned HTTP 200; a direct database read confirms status = "
    "\"rejected\" (previously this reset to \u2018draft\u2019 \u2014 indistinguishable from a record that "
    "was never touched, and the Reverse tab was permanently empty as a result)."
)
add_result("PASS", "the record correctly disappears from Pending and correctly appears under Reverse with a rejected status, matching the fix description exactly.")
add_empty()

# ---- R5 ----
add_heading2("R5. Summary Tiles vs. List Contents \u2014 Now Consistent")
add_labeled_para(
    "What was checked: ",
    "compared the four summary tiles (Total FnF Records / Pending Approvals / Approved "
    "Settlements / Closed & Paid) against the actual row counts of their corresponding "
    "tabs, at three points: baseline, after the blocked-approve + reverse actions in R3/R4, "
    "and after a fresh page reload."
)
add_image("16_tiles_vs_pending_list.png", "Baseline: Total=2, Pending=2, matching the 2 visible Pending rows.")
add_image("20_tiles_vs_lists_after.png", "After the Reverse action: Total=2 (unchanged), Pending=1 (matches the 1 remaining Pending row).")
add_image("39_pending_after_full_reload.png", "After a further Create (3rd record) and a full page reload: Total=3, Pending=2 \u2014 cross-checked directly against the database (2 \u2018draft\u2019 + 1 \u2018rejected\u2019 = 3 total, 2 draft records correctly counted as Pending, the 1 rejected record correctly excluded from Pending and counted under Reverse instead).")
add_result("PASS", "tiles and their corresponding list matched in every state checked, including after a full page reload \u2014 no repeat of the tiles-vs-list mismatch pattern found previously in Payroll Runs / Loan Requests.")
add_empty()

# ---- R6/R7 ----
add_heading2("R6 & R7. New Validations on Process Payroll (Filter and \u201c1. Process Payroll\u201d)")
add_labeled_para(
    "What was checked (Filter button): ",
    "(a) clicked Filter with Generate Payroll On left at \u201c- Select -\u201d; (b) attempted to "
    "leave Payroll Cycle empty; (c) cleared the Month field with the other two fields valid."
)
add_image("22_filter_missing_generateOn.png", "(a) \u201cMissing Selection \u2014 Choose \u2018Generate Payroll On\u2019 before filtering.\u201d \u2014 clear toast shown.")
add_image("24_filter_missing_month.png", "(c) \u201cMissing Month \u2014 Select a Month / Period before filtering.\u201d \u2014 clear toast shown.")
add_labeled_para(
    "On (b), Payroll Cycle: ",
    "could not be tested as a true empty state. A useEffect on this page "
    "(\u201cif (activeCycles.length > 0 && !cycleId) setCycleId(firstId)\u201d) immediately "
    "repopulates the field with the organization's only active cycle the instant it "
    "becomes empty. This was confirmed directly: selecting the blank \u201c- Select -\u201d option "
    "and re-reading the field 800ms later shows it snapped straight back to the cycle's "
    "id. In an org with at least one active cycle (true here), the \u201cMissing Payroll "
    "Cycle\u201d toast is source-verified (identical guard clause, same order, same pattern as "
    "the other two checks) but not reachable through the live UI."
)
add_labeled_para(
    "Regression check \u2014 no premature auto-load: ",
    "on first page load, before Filter was ever clicked, the Payroll Register correctly "
    "showed 0 employees / a loading indicator rather than any data — confirming the "
    "\u201cenabled: filtered && !!cycleId && !!payrollMonth\u201d gating actually prevents the "
    "register from auto-fetching on mount or on dropdown changes until Filter is pressed."
)
add_image("21_process_payroll_landing.png", "Initial page load \u2014 Payroll Register shows 0 Employees / \u201cLoading register...\u201d, not stale or auto-fetched data, before Filter is clicked.")
add_result("PASS",
    "for the Generate-On and Month checks (both showed a clear, correctly-worded toast); the Cycle-missing check is unreachable live in this environment (source-verified only) due to the auto-fill effect described above."
)
add_empty()

add_labeled_para(
    "What was checked (\u201c1. Process Payroll\u201d button): ",
    "the org's only existing Payroll Cycle already had a published run, which disables "
    "this button entirely (['completed','locked','published'].includes(activeRunStatus) "
    "\u2014 correct, expected behavior, not a bug). To test the button's own validations "
    "without touching that real published run, a brand-new zero-run cycle "
    "(\u201cQA_ROUND3_TEST_CYCLE\u201d) was created via legitimate in-app flow (Payroll Master "
    "Settings → Cycles), then selected on the Process Payroll page, where the button "
    "correctly becomes enabled and reads \u201c1. Process Payroll\u201d."
)
add_image("29_new_cycle_form.png", "New zero-run test cycle being created, to test the Process Payroll button without disturbing the real published run.")
add_image("32_process_missing_generateOn_newcycle.png", "\u201cMissing Selection \u2014 Choose \u2018Generate Payroll On\u2019 before processing.\u201d")
add_image("33_process_missing_month_newcycle.png", "\u201cMissing Month \u2014 Please select a Month / Period before processing.\u201d")
add_result("PASS",
    "both the Generate-On and Month checks showed clear, correctly-worded toasts, identical in behavior to the Filter button. The Cycle-missing check is, for the same auto-fill reason as R6, unreachable live but source-verified (handleProcessPayroll's guard clauses are line-for-line the same shape as the Filter button's). No real payroll run was processed as a side effect of this test \u2014 the fields were restored to a valid state without clicking Process again."
)
add_empty()

# ---- R8 ----
add_heading2("R8. Component / Group Save Errors Are Real, Not Swallowed")
add_labeled_para(
    "What was checked: ",
    "used Playwright network interception to force the save request for both a Component "
    "edit and a Group edit to fail with a genuine HTTP 500, then attempted to save each, "
    "to confirm the success path isn't fake and a real failure surfaces honestly."
)
add_image("36_component_edit_forced_failure_toast.png", "Component edit, save request forced to fail (HTTP 500): a genuine \u201cSave Error \u2014 Failed to save Component\u201d toast appears.")
add_image("38_group_edit_forced_failure_toast.png", "Group edit, save request forced to fail (HTTP 500): a genuine \u201cSave Error \u2014 Failed to save Component Group\u201d toast appears.")
add_labeled_para(
    "Additional check: ",
    "after the forced Component failure, the page was reloaded and the component list "
    "re-inspected \u2014 the attempted edit was confirmed NOT persisted (no partial/ghost "
    "write reached the database), consistent with the request having genuinely failed "
    "rather than the failure being cosmetic."
)
add_result("PASS",
    "both edit forms show a real, correctly-worded error toast on genuine failure, and no data is written when the save fails. One UX nuance worth flagging: the edit panel closes immediately when Update is clicked (the code doesn't wait for the save to resolve before calling setIsEditingComponent(false) / closing the group form), so on a slow or failing connection the panel disappears a moment before the error toast appears \u2014 a brief, potentially confusing gap, though it doesn't affect data integrity."
)
add_empty()

doc.save(DOC_PATH)
print("Document saved successfully.")
print("Total paragraphs now:", len(doc.paragraphs))
print("Total tables now:", len(doc.tables))
print("Total inline shapes now:", len(doc.inline_shapes))

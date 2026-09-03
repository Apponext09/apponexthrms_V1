# -*- coding: utf-8 -*-
"""
Builds Payroll_User_Manual.docx for AppOneXT HRMS.
"""
import docx
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.enum.section import WD_SECTION

IMG = r"D:\shakyadita_projects\apponexthrms\scratchpad\user_manual\{}"
OUT = r"d:\shakyadita_projects\apponexthrms\Payroll_User_Manual.docx"

NAVY = RGBColor(0x1B, 0x2A, 0x4A)
BLUE = RGBColor(0x2A, 0x5C, 0x9E)
GREEN = RGBColor(0x1E, 0x7A, 0x3C)
AMBER = RGBColor(0xB8, 0x5C, 0x00)
GREY = RGBColor(0x55, 0x55, 0x55)

doc = Document()

# ---------- base style ----------
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(11)
normal.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

for i in range(1, 4):
    h = doc.styles[f'Heading {i}']
    h.font.name = 'Calibri'
    h.font.color.rgb = NAVY
    h.font.bold = True
h1 = doc.styles['Heading 1']
h1.font.size = Pt(20)
h2 = doc.styles['Heading 2']
h2.font.size = Pt(14)
h3 = doc.styles['Heading 3']
h3.font.size = Pt(12)

def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)

def add_page_break():
    doc.add_page_break()

def add_pic(name, width=6.3, caption=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(IMG.format(name), width=Inches(width))
    if caption:
        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = cap.add_run(caption)
        r.italic = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = GREY

def callout(title, body_lines, kind="verified"):
    """kind: 'verified' (green) or 'warning' (amber)"""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    color = "E4F3E8" if kind == "verified" else "FCEFD9"
    border_color = "1E7A3C" if kind == "verified" else "B85C00"
    set_cell_shading(cell, color)
    # borders
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        el = OxmlElement(f'w:{edge}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), '12' if edge == 'left' else '4')
        el.set(qn('w:color'), border_color)
        borders.append(el)
    tcPr.append(borders)
    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_after = Pt(4)
    r0 = p0.add_run(title)
    r0.bold = True
    r0.font.size = Pt(11)
    r0.font.color.rgb = RGBColor(0x1E, 0x7A, 0x3C) if kind == "verified" else RGBColor(0xB8, 0x5C, 0x00)
    for line in body_lines:
        p = cell.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(line)
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    doc.add_paragraph()

def field_table(rows, headers=("Field", "What it does")):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Light Grid Accent 1'
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ''
        r = hdr[i].paragraphs[0].add_run(h)
        r.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(hdr[i], "1B2A4A")
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ''
            r = cells[i].paragraphs[0].add_run(str(val))
            r.font.size = Pt(10)
    doc.add_paragraph()

# =========================================================================
# TITLE PAGE
# =========================================================================
for _ in range(4):
    doc.add_paragraph()
title_p = doc.add_paragraph()
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title_p.add_run("AppOneXT HRMS")
r.font.size = Pt(18)
r.font.color.rgb = BLUE
r.bold = True

title_p2 = doc.add_paragraph()
title_p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = title_p2.add_run("Payroll Module — User Manual")
r2.font.size = Pt(32)
r2.font.color.rgb = NAVY
r2.bold = True

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r3 = sub.add_run("A complete operating guide for administrators running payroll — Setup, Processing,\nPayslips, and Employee Visibility")
r3.font.size = Pt(13)
r3.font.color.rgb = GREY
r3.italic = True

for _ in range(3):
    doc.add_paragraph()

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
mr = meta.add_run("Prepared: 17 August 2026\nScope: Payroll Master Settings, Component Definitions, Pay Slabs, Slab Assignment,\nEmployee Salary Structures, Payroll Processing, Payslip Generation, Employee Visibility")
mr.font.size = Pt(11)
mr.font.color.rgb = GREY

for _ in range(2):
    doc.add_paragraph()

note = doc.add_paragraph()
note.alignment = WD_ALIGN_PARAGRAPH.CENTER
nr = note.add_run("Every workflow in this manual was walked through live on a running instance of the "
                   "system using real test employees, and screenshotted step by step. Sections marked "
                   "\u2713 Verified Working were confirmed end-to-end, including reloading the page and "
                   "re-checking the database. Sections with a \u26A0 Note for Administrator box describe "
                   "something that did not behave as expected \u2014 read those before relying on that feature.")
nr.font.size = Pt(10)
nr.italic = True
nr.font.color.rgb = GREY

add_page_break()

# =========================================================================
# TABLE OF CONTENTS
# =========================================================================
doc.add_heading("Table of Contents", level=1)
toc_items = [
    "1. Payroll Cycle",
    "2. Pay Components",
    "3. Component Groups",
    "4. Employee / Condition Settings",
    "5. Pay Slabs",
    "6. Assign Slab to Employee",
    "7. Editing Salary Structure from the Employee Profile",
    "8. Payroll Process",
    "9. Payslip Generation",
    "10. Employee-Side Visibility",
    "Quick Reference — The Full Monthly Workflow",
]
for item in toc_items:
    p = doc.add_paragraph(item)
    p.paragraph_format.space_after = Pt(6)
    p.runs[0].font.size = Pt(12)
add_page_break()

print("TOC done")

# =========================================================================
# SECTION 1 — PAYROLL CYCLE
# =========================================================================
doc.add_heading("1. Payroll Cycle", level=1)
doc.add_paragraph(
    "The Payroll Cycle is the master timetable payroll runs against. It defines when a pay "
    "period starts, when attendance stops counting for that period, when salaries get "
    "disbursed, and how many days are used as the denominator when converting a monthly "
    "salary into a per-day rate for Loss of Pay (LOP) calculations. Every payroll run "
    "belongs to exactly one cycle, and a cycle must exist before you can process payroll "
    "for anyone."
)
doc.add_paragraph("Navigate to: Payroll → Payroll Master Settings → Cycles tab.")

add_pic("01a-cycles-list.png", caption="Payroll Master Settings → Cycles. The left panel lists every "
        "configured cycle; the right panel edits whichever one is selected.")

doc.add_heading("Fields", level=2)
field_table([
    ("Payroll Cycle (name)", "A free-text label for the cycle, e.g. “Monthly cycle”. Purely identifying — has no effect on calculations."),
    ("Daily wages (toggle)", "Switches the cycle into a daily-wage mode for workers paid per day worked rather than a fixed monthly salary. Reveals two sub-options."),
    ("– Include Paid Holidays", "When Daily Wages is on, decides whether paid holidays inside the period count as paid days for the daily-rate calculation."),
    ("– Include Week Off", "When Daily Wages is on, decides whether weekly off days count as paid days for the daily-rate calculation."),
    ("Payslip Frequency", "Monthly, Bi-monthly, Semi-Monthly, Weekly, or Bi-Weekly. This is the most consequential field on the form: it sets the divisor used to turn a monthly salary into a per-day rate for LOP — 30 days for Monthly, 7 for Weekly, 14 for Bi-Weekly, 15 for Semi-Monthly. Get this wrong and every LOP deduction for the cycle is wrong."),
    ("Payroll Calculation Start Date", "The day of the month the pay period begins (e.g. “1” = periods start on the 1st)."),
    ("CutOff Days for Payroll Calculations", "The day of the month attendance/leave data stops being pulled in for that period’s calculation. Anything logged after the cutoff rolls into the next cycle."),
    ("Month (offset)", "Whether the cutoff/attendance window is read from the Current, Previous, or Next calendar month relative to the run — also has First/Last options. Matters for cycles that straddle month boundaries."),
    ("[+] Tolerance → Enable Attendance Tolerance Minutes", "An optional grace window (in minutes) before a late check-in counts against attendance for payroll purposes."),
    ("Payroll Disbursement Date", "The day of the month salaries are credited — shown to employees as their pay date."),
    ("Total no. of days for Payroll calculation", "Overrides the LOP divisor discussed above with an explicit choice: 7 Days (Weekly), 14 Days (Bi-Weekly), 15 Days (Semi-Monthly), 30, Month-Days, WorkDays, WorkDays-Holidays, WorkDays-Weekends, Payroll-Month-Days, or Custom-Month-Days."),
    ("Payroll Calculation Cap", "An upper ceiling amount the calculation engine will not exceed for a payroll run."),
    ("Active", "Yes/No — inactive cycles are hidden from the Payroll Cycle picker used everywhere else (Process Payroll, Assign Slab, Payslip generation)."),
], headers=("Field", "What it does / how it affects payroll math"))

add_pic("01c-cycle-tolerance-expanded.png", width=6.0, caption="The collapsible [+] Tolerance panel, expanded.")

doc.add_heading("Creating and editing a cycle", level=2)
doc.add_paragraph(
    "Click “+ Add New Master Payroll” in the left panel to create a cycle, or click an "
    "existing cycle to edit it. Fill in the fields above and click Update (or the + button "
    "when creating new). A green “Updated successfully” toast confirms the save request "
    "was accepted by the server — but see the note below before trusting every field on that toast."
)

add_pic("01e-test-cycle-edited-value.png", caption="Editing a test cycle: Payroll Calculation Cap changed to 555555 before saving.")
add_pic("01g-test-cycle-after-reload.png", caption="The same cycle immediately after saving and reloading the page — "
        "Payroll Calculation Cap has reverted to its old value of 3.00.")

callout("⚠ Note for Administrator — Cap Amount does not save", [
    "Payroll Calculation Cap was changed, saved (server responded 200 “success”), and the page "
    "reloaded to confirm. The value silently reverted — network inspection showed the server’s "
    "own save-confirmation response omits the cap_amount field entirely, meaning the update endpoint "
    "does not currently persist it.",
    "The “Total no. of days for Payroll calculation” dropdown has a related, smaller issue: after "
    "saving and reopening a cycle, it displays as blank (“Select”) even though the underlying value "
    "is still stored correctly — it is a display-only glitch, not a data-loss issue.",
    "Everything else on this form — Cycle Name, Frequency, Start Date, Cutoff Day, Disbursement "
    "Date, Month offset, and Active — was independently tested (changed, saved, reloaded) and "
    "persisted correctly.",
], kind="warning")

add_page_break()

print("Section 1 done")

# =========================================================================
# SECTION 2 — PAY COMPONENTS
# =========================================================================
doc.add_heading("2. Pay Components", level=1)
doc.add_paragraph(
    "A component is a single line item on a salary — Basic, HRA, Provident Fund, "
    "Professional Tax, and so on. Every earning and deduction an employee ever sees is "
    "built from components defined here. Navigate to: Payroll → Payroll Master Settings → "
    "Components Catalog."
)

add_pic("02a-components-catalog-earning.png", caption="Components Catalog — Earning tab. Components are organised into "
        "groups (Basic, HRA, Adjustment, …); each group can hold more than one component.")

doc.add_heading("The three Component Types", level=2)
field_table([
    ("Value", "A flat, manually-entered amount — e.g. a fixed ₹500 Conveyance allowance. No formula, no dependency on CTC or other components."),
    ("Derived", "Computed from a formula typed into the Formula Expression box, e.g. Basic = 50% of CTC."),
    ("Module", "Computed by the system itself from a built-in calculation module (e.g. Overtime = OT Rate × Hours, or Salary Days from the attendance engine) rather than a user-editable formula."),
], headers=("Type", "What it means"))

add_pic("03a-value-type-component.png", caption="A Value-type component (“Basic”) — just a flat Amount field, no formula.")
add_pic("03g-module-type-component.png", caption="A Module-type component (“Salary Days”) — driven by a built-in "
        "Module Integration Source, here “Overtime Module (OT Rate x Hours)”.")

doc.add_heading("The Formula Expression editor", level=2)
add_pic("02e-derived-formula-editor.png", caption="The Formula Setting panel for “Basic 50%”, a Derived component. "
        "Formula shown: (50 * CTC) / 100.")
doc.add_paragraph(
    "For a Derived component, the “CLICK TO APPEND VARIABLE / OPERATOR” palette is the "
    "toolbox you are meant to build formulas with. It only offers three variables — "
    "[BASIC], [GROSS], [CTC] — the four arithmetic operators, parentheses, and three preset "
    "constants (0.50, 0.005, 0.12). Built from just those buttons, a formula is always a "
    "simple percentage of one of those three figures, e.g. (50 * CTC) / 100."
)
callout("⚠ Note for Administrator — the palette undersells what the engine can actually do", [
    "The button palette only offers simple percentage math. In practice, though, the calculation "
    "engine underneath is more capable than the palette suggests: the live Provident Fund component "
    "in this system uses the hand-typed formula Math.round(Math.min(BASIC,15000) * 0.12) — a capped, "
    "rounded 12% of Basic — and it evaluates correctly (verified against the database: an employee "
    "with Basic = ₹20,000 was correctly deducted ₹1,800 PF, i.e. 12% of the ₹15,000 statutory ceiling, "
    "not 12% of the full ₹20,000).",
    "So the real limitation is discoverability, not capability: a formula built only from the on-screen "
    "buttons can only ever be a flat percentage of Basic/Gross/CTC. Anything more advanced (capping, "
    "rounding, conditional logic) currently has to be typed in by hand by someone comfortable with "
    "JavaScript-style expressions — there is no button for it, and no in-app documentation telling an "
    "administrator this is possible or how the syntax works.",
], kind="warning")

add_page_break()

print("Section 2 done")

# =========================================================================
# SECTION 3 — COMPONENT GROUPS
# =========================================================================
doc.add_heading("3. Component Groups", level=1)
doc.add_paragraph(
    "A Component Group is the container a component (or several alternate components) "
    "lives inside — “Basic” the group might hold both a flat-Value “Basic” component and "
    "a Derived “Basic 50%” component as two selectable versions of the same line item. "
    "Group-level settings control how that line item behaves on the payslip and on the "
    "employee’s profile. Open it from the pencil icon next to a group name in the "
    "Components Catalog."
)

add_pic("03b-group-edit-attempt.png", caption="The Basic group’s configuration panel, fully populated.")

doc.add_heading("Fields", level=2)
field_table([
    ("Group Name", "The label shown everywhere this group appears (register columns, payslip, profile)."),
    ("Round Format", "Round / Round two decimal / Round Up / Round Down — how the computed amount is rounded before display."),
    ("Group Function", "Max / Sum / Min — how to combine multiple components inside the group if more than one is active for an employee at once."),
    ("Configure On Profile", "Whether this group can be configured from an employee’s own profile page."),
    ("Display On Profile", "Whether the group’s value is shown on the employee profile at all."),
    ("Is Editable", "Whether an admin can hand-type an override value for this group per employee."),
    ("Contributed By", "Employee and/or Employer — who the contribution is attributed to (relevant for PF/ESI-style split contributions)."),
    ("Active", "Whether the group is currently in use; inactive groups are excluded from new slabs."),
    ("Recalculate Payroll On Change", "If Yes, editing this group’s value on an already-processed run triggers a recalculation of the run."),
    ("Group For Payslip", "Earnings or Deductions — which half of the payslip this group prints under."),
    ("Display Order", "Numeric sort order controlling where the group appears relative to other groups."),
    ("Disable Arrear", "Whether arrear (backdated adjustment) amounts are suppressed for this group."),
    ("Display Total On Process", "Whether a running total for the group is shown on the Payroll Register during processing."),
    ("TDS deducted same month", "Whether TDS attributable to this group is deducted in the same month it’s earned rather than deferred."),
    ("Taxable", "Whether this group’s amount counts toward taxable income."),
], headers=("Field", "What it controls"))

add_page_break()

print("Section 3 done")

# =========================================================================
# SECTION 4 — EMPLOYEE / CONDITION SETTINGS
# =========================================================================
doc.add_heading("4. Employee / Condition Settings", level=1)
doc.add_paragraph(
    "Below the formula editor, every component definition has an eligibility section that "
    "restricts who the component applies to. This is what lets you have, for example, a "
    "Meal Allowance that only applies to a specific department, or a component that only "
    "kicks in once an employee has crossed a threshold number of working days."
)

add_pic("02g-condition-setting-section.png", caption="Condition Setting and Employment Setting panels, at the bottom of "
        "a component’s edit form.")

doc.add_heading("Fields", level=2)
field_table([
    ("Gender", "All / Male / Female — restricts the component to employees of a given gender."),
    ("Condition On", "The value the numeric condition is evaluated against — Gross Pay, Basic Pay, Gross (Total Earnings), LOP Days, or Working Days."),
    ("Operator", "Greater than, Less than, Equals, Greater/Less-than-or-Equal, or Between (range) — how Condition On is compared to Value1/Value2."),
    ("Value1 / Value2", "The threshold(s) the operator compares against. Value2 is only used for “Between (range)”."),
    ("[+] Months", "Restricts the component to specific calendar months."),
    ("[+] Grade / [+] Department / [+] Location", "Targets the component to specific grades, departments, or office locations."),
    ("[+] Employee", "Targets the component to specific, individually-named employees rather than a broad category."),
], headers=("Field", "What it controls"))

callout("✓ Verified working — Condition Settings persist correctly", [
    "This area of the form was reported broken in an earlier build. It was re-tested directly: the "
    "Gender filter, Condition On, Operator, and Value1 fields on a live component were changed, saved, "
    "and the page was fully reloaded. The server’s save-confirmation response echoed back every "
    "changed field correctly (condition_on: \"Days\", condition_operator: \">\", condition_value1: "
    "\"10\", gender_filter: \"Female\"), and the reloaded form showed the new values selected. The "
    "fields were then reverted to their original state and re-verified the same way. Genuinely fixed.",
], kind="verified")

doc.add_paragraph(
    "One practical caution when using Gender or Condition On/Operator/Value filters: if a broadly-used "
    "component (like the main Basic formula) is accidentally scoped to only one gender or one "
    "condition, every employee who falls outside that filter will simply get ₹0 for that component "
    "with no warning on the payslip. Double-check eligibility filters on any component that is meant "
    "to apply company-wide."
)

add_page_break()

print("Section 4 done")

# =========================================================================
# SECTION 5 — PAY SLABS
# =========================================================================
doc.add_heading("5. Pay Slabs", level=1)
doc.add_paragraph(
    "A Pay Slab is a reusable CTC-band template: a bundle of components (Basic, HRA, PF, "
    "ESI, Professional Tax, TDS, …) plus a min/max annual CTC range it applies to. Instead "
    "of picking components individually for every employee, you assign them a slab and the "
    "slab’s component set and formulas take over. Navigate to: Payroll → Payroll Master "
    "Settings → Slabs & Statutory Rules."
)

add_pic("05a-slabs-list.png", caption="The “Monthly” slab: Department = account, Grade = team lead, "
        "CTC range ₹3,00,000–₹6,00,000, with 11 of the available components checked (Basic 50%, HRA, "
        "HRA 25%, PF, and others visible by scrolling).")

doc.add_heading("Fields", level=2)
field_table([
    ("Payroll Slab Name", "The label used when assigning this slab to employees."),
    ("Department / Grade", "Required targeting fields — which department and grade this slab is intended for."),
    ("Location", "Optional — restrict the slab to specific office locations, or leave unrestricted."),
    ("CTC (Min / Max)", "The annual CTC band this slab covers, set with sliders or direct entry."),
    ("Payroll Component", "A checklist of every component in the catalog — tick the ones this slab should compute for an employee assigned to it."),
    ("Payroll Cycle", "Which cycle this slab’s payroll runs against."),
    ("Active", "Whether the slab is currently assignable."),
], headers=("Field", "What it does"))

doc.add_paragraph(
    "Verified: the components ticked in the slab editor (Basic 50%, HRA, HRA 25%, PF, ESI, "
    "Professional Tax, TDS in this case) match what actually computed for employees carrying that "
    "slab through Payroll Process — see Section 8. One caveat worth knowing: a component can still "
    "appear on an employee’s payslip even if it isn’t ticked in the slab, if it was added directly to "
    "their individual salary structure at assignment time (see the Special Allowance example in "
    "Section 9) — the slab’s component list is a starting template, not a hard ceiling."
)

add_page_break()

# =========================================================================
# SECTION 6 — ASSIGN SLAB TO EMPLOYEE
# =========================================================================
doc.add_heading("6. Assign Slab to Employee", level=1)
doc.add_paragraph(
    "This is the bulk tool for putting employees onto a slab — typically used for new hires "
    "or when moving a group of staff onto a revised structure. Navigate to: Payroll → "
    "Payroll Processing → Assign Slab tab."
)

add_pic("06j-assign-slab-before.png", caption="Assign Slab tab: filter by department/grade/location, tick staff, "
        "pick a Target Salary Slab and an Annual CTC, then click Assign on a row (or bulk-assign selected staff).")

doc.add_paragraph(
    "To assign: pick the Target Salary Slab at the top, enter the Offered Annual CTC (₹) for the row "
    "you want, and click ✓ Assign on that employee’s row (or tick several employees and use "
    "🚀 Assign Slabs to Selected for a bulk assignment)."
)

add_pic("06l-assign-slab-after.png", caption="After clicking Assign — the action reports success, and the employee’s "
        "profile now shows the new slab and CTC (see below).")

callout("✓ Verified working, with one display caveat", [
    "Assigning a slab through this screen genuinely works: assigning Diya Kapoor (EMP013) a new CTC "
    "of ₹3,50,000 correctly created an active salary structure with Basic = ₹14,584/month and HRA = "
    "₹5,834/month (both exactly the slab’s formula applied to the new CTC) — confirmed by re-fetching "
    "her profile from a fresh page load.",
    "However, the CURRENT SLAB column on this screen is unreliable — it displayed “⚠ Unassigned” for "
    "every employee tested, including employees confirmed (via their own profile) to have an active, "
    "correctly-computed salary structure already assigned. Don’t use this column to judge whether "
    "someone has a structure; check the employee’s own Payroll Detail tab instead (Section 7).",
], kind="warning")

add_page_break()

print("Section 5-6 done")

# =========================================================================
# SECTION 7 — EDITING SALARY STRUCTURE FROM EMPLOYEE PROFILE
# =========================================================================
doc.add_heading("7. Editing Salary Structure from the Employee Profile", level=1)
doc.add_paragraph(
    "Besides bulk-assigning a slab, you can open any individual employee and edit their "
    "salary structure directly. Go to Employees → (select employee) → Payroll Detail tab."
)

add_pic("07j-arjun-payroll-detail.png", caption="An employee’s Payroll Detail tab. One structure row is listed — "
        "“Monthly”, Active — with View, Edit (pencil), and Delete actions.")

doc.add_paragraph(
    "If more than one structure row is ever listed here, the one to trust is the row marked "
    "Status: Active — that is the one Payroll Process reads from. Historical/superseded "
    "structures remain listed for record-keeping but are not Active."
)

doc.add_paragraph("Clicking the pencil (Edit Pay Structure) opens this dialog:")
add_pic("07l-arjun-edit-structure-form.png", caption="The Payroll Structure edit dialog — Monthly Gross / CTC Input, "
        "Effective From, Arrear Pay Month, and per-component override boxes for Basic, HRA, PF, ESI, "
        "Professional Tax and TDS.")

doc.add_heading("The critical question: does editing here actually change what Payroll Process reads?", level=2)
callout("⚠ Note for Administrator — this edit dialog does not save. At all.", [
    "This was tested directly and conclusively, and the answer needs to be blunt: editing a salary "
    "structure from an employee’s profile does NOT update the active structure that Payroll Process "
    "reads from — the save silently does nothing.",
    "Test performed: opened the Edit Pay Structure dialog for an employee whose active structure had "
    "CTC ₹4,80,000 / Basic ₹20,000 / HRA ₹8,000. Changed the Monthly Gross/CTC Input to a new, "
    "distinctive value and clicked Update Structure. The server responded HTTP 200 “success”. A "
    "completely fresh page load immediately afterward — and again several minutes later — showed the "
    "employee’s active structure completely unchanged: same CTC, same Basic, same HRA, and critically "
    "the record’s own “last updated” timestamp had not moved at all from before the edit.",
    "In other words, this is not a case of the edit landing on a stale/historical record instead of "
    "the live one (which would at least explain the behaviour) — the edit did not persist anywhere. "
    "The dialog accepts input, shows no error, and reports success, but the underlying salary "
    "structure is left completely untouched.",
    "Until this is fixed, use the Assign Slab bulk tool (Section 6) to change an employee’s CTC/slab — "
    "that path was independently verified to work correctly. Do not rely on this profile-level edit "
    "dialog for anything that needs to actually take effect.",
], kind="warning")

add_page_break()

print("Section 7 done")

# =========================================================================
# SECTION 8 — PAYROLL PROCESS
# =========================================================================
doc.add_heading("8. Payroll Process — Correctness for a Real Employee", level=1)
doc.add_paragraph(
    "This is where the month’s actual payroll gets calculated. Navigate to: Payroll → "
    "Payroll Processing → Process Payroll tab. The workflow is three numbered steps: "
    "1. Process Payroll → 2. Lock Figures → 3. Publish Payslips."
)
doc.add_paragraph(
    "Set Generate Payroll On (usually “Attendance”), pick the Payroll Cycle and Month/Period, "
    "optionally narrow by Company/Location/Department/Employee, then click Filter to load the "
    "register."
)

add_pic("08q-qacycle-register.png", caption="Filters set and register loaded for a single test employee (Arjun "
        "Menon, EMP020) on a fresh, never-processed cycle. The three action buttons are live.")

callout("⚠ Note for Administrator — the Employee filter only limits the screen, not the run", [
    "Filtering the register down to a single employee and clicking “1. Process Payroll” does not "
    "process only that employee — it processes every active employee in the organisation. In this "
    "test, filtering to one person and clicking Process produced a run covering all 18 staff "
    "(confirmed on the Payroll Runs tab afterward). If you are using the Employee filter to safely "
    "test one person’s numbers before running the whole company, be aware it will not limit the blast "
    "radius — it only limits what’s displayed on screen.",
], kind="warning")

doc.add_heading("Running the workflow", level=2)
doc.add_paragraph(
    "Click 1. Process Payroll, wait for the “Processed ✓” confirmation, then 2. Lock Figures, "
    "then 3. Publish Payslips. Each step is confirmed with a toast and the pill next to the "
    "button turns solid with a checkmark."
)
add_pic("08x-AFTER-publish.png", caption="All three steps complete — Run #30, status PUBLISHED. "
        "“Payslips Published — Payslips are now visible to employees.”")

doc.add_heading("Checking the numbers", level=2)
doc.add_paragraph(
    "Test employee: Arjun Menon (EMP020) — CTC ₹4,80,000/year, expected Basic ₹20,000/month "
    "(50% of CTC), PF capped at 12% of the ₹15,000 statutory ceiling = ₹1,800, Professional "
    "Tax ₹200 (flat, once gross exceeds ₹15,000)."
)
add_pic("08z-register-scrolled-right.png", caption="The published register, scrolled to show PT, PF, Total "
        "Deduction, Net Salary and CTC for Arjun Menon.")

callout("⚠ Note for Administrator — the on-screen Register under-reports several columns", [
    "The Payroll Register grid shown above and during processing displayed PF as ₹0 and HRA as "
    "₹8,000, with Total Deduction ₹200 and Net Salary ₹27,800 — and this persisted through Process, "
    "Lock, Publish, and even a completely fresh page reload afterward. Taken at face value, that "
    "reads as “PF is not being deducted for this employee.”",
    "Direct inspection of the database record behind this exact run (payroll_run_employees, plus its "
    "linked earnings/deductions rows) tells a different story: the true, stored, published figures are "
    "Basic ₹20,000, HRA ₹10,000, a Special Allowance component of ₹10,000 (not shown as a register "
    "column at all), PF ₹1,800, PT ₹200 — Gross ₹40,000, Total Deductions ₹2,000, Net ₹38,000. The "
    "system’s own processing notes for this record literally read: “Processed: Basic=₹20000, "
    "HRA=₹10000, PF=₹1800, PT=₹200, ESIC=₹0, LoanEMI=₹0, LOP=0d”.",
    "So the calculation itself is correct — PF, HRA and the Special Allowance are all computed and "
    "stored correctly. The bug is that the Payroll Register screen does not reliably display those "
    "already-correct figures back to the administrator. This matters because an administrator "
    "reviewing the register before publishing (the normal “sanity check before it goes out” moment) "
    "could see PF at ₹0 and reasonably — but wrongly — conclude PF isn’t being withheld, when it "
    "actually is. Treat the generated payslip (Section 9) as the source of truth over the on-screen "
    "register for HRA, PF, and any Special Allowance-type component.",
], kind="warning")

add_page_break()

print("Section 8 done")

# =========================================================================
# SECTION 9 — PAYSLIP GENERATION
# =========================================================================
doc.add_heading("9. Payslip Generation", level=1)
doc.add_paragraph(
    "Once a run is processed (and ideally locked/published), individual payslips are "
    "generated from Payroll → Payslip Management. Pick the employee and the Salary Month, "
    "then click Generate Payslip."
)

doc.add_heading("The month picker and the run’s month can disagree — read this before generating", level=2)
callout("⚠ Note for Administrator — “Current Month” in the picker is not reliable", [
    "Generating a payslip for an employee’s just-published run, using the Salary Month the screen "
    "itself suggests (“August 2026 (Current Month)”), failed with: “No processed payroll found for "
    "this employee in this month. Run Payroll Process for this cycle first, then generate the "
    "payslip” — even though that exact employee’s payroll had just been processed, locked, and "
    "published minutes earlier.",
    "Cause: the payroll run’s stored month, once correctly formatted, is one calendar month earlier "
    "than what the Month/Period and Salary Month pickers display and pre-select as “current.” "
    "Selecting the PRECEDING month in the Salary Month dropdown (in this case, July instead of the "
    "suggested August) generated the payslip successfully on the first try.",
    "If Generate Payslip tells you no processed payroll exists for an employee you just ran payroll "
    "for, try the previous calendar month in the Salary Month field before assuming the run failed.",
], kind="warning")

add_pic("09p-july-after-generate.png", caption="Payslip generated successfully for Arjun Menon, July 2026 — "
        "Gross ₹40,000, Deductions ₹2,000, Net ₹38,000, with the full earnings and deductions breakdown below.")

doc.add_heading("Does the payslip match what Payroll Process actually computed?", level=2)
callout("✓ Verified — the payslip is accurate. It's the register screen (Section 8) that misleads.", [
    "This is the check that matters most, and the answer is reassuring once you look past the register "
    "screen’s display bug: the generated payslip’s figures — Basic ₹20,000, HRA ₹10,000, Special "
    "Allowance ₹10,000, PF ₹1,800, Professional Tax ₹200, Gross ₹40,000, Net ₹38,000 — match the "
    "authoritative processed-payroll record exactly, component for component, down to the rupee. The "
    "payslip generator reads the same underlying processed-run data the system itself describes in "
    "its own audit notes for that run.",
    "The apparent mismatch against Section 8’s on-screen register (which showed PF ₹0 and HRA ₹8,000) "
    "is therefore not the payslip drifting from reality — it is the register display under-reporting "
    "reality. The payslip can be trusted as the accurate, final record of what an employee was paid.",
], kind="verified")

doc.add_heading("A second, separate issue: the payslip list doesn’t show what you just generated", level=2)
callout("⚠ Note for Administrator — “Monthly Salary Statements” list stays empty", [
    "Notice in the screenshot above: directly below the “0 Statements / No Payslips Generated for July "
    "2026” list, the actual generated payslip is shown in full underneath. The list widget at the top "
    "of the Payslip Management page never reflects newly generated payslips — confirmed this isn’t a "
    "one-off by checking every month in the dropdown and directly in the database (the payslip exists, "
    "correctly, and is not deleted).",
    "This doesn’t affect the payslip’s validity — it exists, it’s correct, it’s locked — but "
    "administrators should use the individual Generate screen’s own confirmation panel (or the "
    "employee’s own payslip view) to confirm a payslip exists, rather than this summary list.",
], kind="warning")

add_page_break()

print("Section 9 done")

# =========================================================================
# SECTION 10 — EMPLOYEE-SIDE VISIBILITY
# =========================================================================
doc.add_heading("10. Employee-Side Visibility", level=1)
doc.add_paragraph(
    "The last question is whether an employee, logging in themselves, actually sees their "
    "own correct payslip and salary structure — not just what the admin portal shows."
)

doc.add_paragraph(
    "This build of the system does not expose an employee self-service login or an "
    "“impersonate / view as employee” option inside the Organization Admin portal used for "
    "this manual — there is no lower-privilege login screen or account-switch control "
    "available to test the employee’s own eyes-on view directly. As a fallback, the "
    "employee-facing API route the client app would call for this (/payroll/my-salary-"
    "structure) was checked directly:"
)
add_pic("10b-my-salary-structure-as-admin.png", width=4.5, caption="Navigating to /payroll/my-salary-structure "
        "while logged in as the Organization Admin returns a client-side “Page not found” — this route is not "
        "wired up for the admin role in this build, which is expected since the admin account is not itself "
        "an employee record.")

callout("⚠ Note for Administrator — employee self-service view could not be directly verified", [
    "No employee-portal login or admin “view as employee” option was found in this build, so the "
    "actual employee-facing screens (My Payslip, My Salary Structure) could not be walked through "
    "end-to-end the way every other section in this manual was.",
    "What was confirmed instead: the underlying data is correctly scoped per employee at the database "
    "level — every payslip and salary-structure record checked throughout this manual (Sections 7–9) "
    "was correctly tied to the specific employee_id it belonged to, with no cross-employee bleed "
    "observed in any query. If and when a genuine employee login becomes available for testing, this "
    "section should be re-verified by actually signing in as an employee and confirming the Basic/HRA/"
    "PF/Net figures they see match Section 9’s payslip exactly.",
], kind="warning")

add_page_break()

print("Section 10 done")

# =========================================================================
# QUICK REFERENCE
# =========================================================================
doc.add_heading("Quick Reference — The Full Monthly Workflow", level=1)
doc.add_paragraph(
    "Everything above in one place, in the order you’ll actually use it."
)

doc.add_heading("Set up once, when the organisation first goes live", level=2)
setup_steps = [
    ("1. Payroll Cycle", "Payroll Master Settings → Cycles. Create the cycle(s) your organisation pays on "
     "(Monthly, Bi-Weekly, etc.), setting Start Date, Cutoff Day, Disbursement Date and Payslip Frequency correctly — "
     "Frequency sets the LOP divisor for the whole cycle."),
    ("2. Pay Components", "Payroll Master Settings → Components Catalog. Define every earning and deduction line "
     "item the organisation needs, with the right Component Type (Value / Derived / Module) and formula."),
    ("3. Component Groups", "Configure each group’s rounding, taxability, payslip placement, and profile visibility."),
    ("4. Pay Slabs", "Payroll Master Settings → Slabs & Statutory Rules. Build the CTC-band templates and tick the "
     "components each one should include."),
]
for title, body in setup_steps:
    p = doc.add_paragraph()
    r = p.add_run(title + " — ")
    r.bold = True
    p.add_run(body)
    p.paragraph_format.space_after = Pt(8)

doc.add_heading("Every pay period", level=2)
period_steps = [
    ("1. Assign Slab (new hires / structure changes)", "Payroll Processing → Assign Slab. Bulk-assign or "
     "individually assign a slab and CTC to any employee who needs one. This is the reliable path for changing "
     "an employee’s pay — the individual profile’s Edit Pay Structure dialog does not currently save (Section 7)."),
    ("2. Filter", "Payroll Processing → Process Payroll. Set Generate Payroll On, Payroll Cycle, and Month/Period, "
     "then click Filter to load the register. Remember: any filtering here only limits what you SEE, not who gets processed."),
    ("3. Process", "Click “1. Process Payroll”. Cross-check figures against each employee’s expected Basic/HRA/PF/PT — "
     "trust the generated payslip over the on-screen register if the two ever disagree (Section 8)."),
    ("4. Lock", "Click “2. Lock Figures” once you’re confident the numbers are right."),
    ("5. Publish", "Click “3. Publish Payslips” to make payroll official and visible."),
    ("6. Generate / Send Payslips", "Payslip Management. Select each employee and the correct Salary Month — if "
     "the “Current Month” option 404s with “no processed payroll found,” try the previous calendar month "
     "(Section 9) — then Generate Payslip."),
]
for title, body in period_steps:
    p = doc.add_paragraph()
    r = p.add_run(title + " — ")
    r.bold = True
    p.add_run(body)
    p.paragraph_format.space_after = Pt(8)

doc.add_heading("Everything flagged for the administrator, in one place", level=2)
issues = [
    "Payroll Cycle: Cap Amount does not save (Section 1).",
    "Pay Components: the Formula Expression palette only exposes simple percentage math, though the engine can "
    "evaluate more, if hand-typed (Section 2).",
    "Assign Slab: the Current Slab status column is unreliable — always check the employee’s own profile instead (Section 6).",
    "Employee Profile → Edit Pay Structure: does not save at all. Use Assign Slab instead (Section 7).",
    "Payroll Process: the on-screen Register under-reports PF, HRA, and omits Special Allowance-type components "
    "for at least some employees — trust the generated payslip instead (Section 8).",
    "Payslip Generation: the “Current Month” suggested in the Salary Month picker is frequently one month ahead "
    "of the run’s actual stored month — try the previous month if generation 404s (Section 9).",
    "Payslip Management: the Monthly Salary Statements list does not display newly generated payslips, even "
    "though they exist and are correct (Section 9).",
    "Employee self-service view could not be directly tested — no employee login/impersonation was available "
    "in this build (Section 10).",
]
for issue in issues:
    p = doc.add_paragraph(style='List Bullet')
    p.add_run(issue)

doc.save(OUT)
print("DOCX saved:", OUT)

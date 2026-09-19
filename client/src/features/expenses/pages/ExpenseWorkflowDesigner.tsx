import { GitBranch, Plus } from "lucide-react";
import {
  expenseError,
  expenseUi as ui,
  ExpenseWorkflowDialog,
} from "./ExpenseWorkflowUi";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/config/api";
import { expenseApi } from "../api/expenseApi";
import { validateClientExpenseWorkflow } from "../constants/expense.global.validation";

const step = () => ({
  stepName: "Team lead review",
  approverType: "team_lead",
  isMandatory: true,
  fallback: "",
  canReturn: true,
  finance: false,
});
const initial = () => ({
  name: "",
  requestType: "expense_claim",
  departmentId: "",
  employeeIds: [],
  reportingManagerIds: [],
  targetRole: "all",
  priority: 0,
  minAmount: 0,
  maxAmount: 10000000,
  isActive: true,
  levels: [step()],
});
const control = ui.input;
export function ExpenseWorkflowDesigner() {
  const [workflows, setWorkflows] = useState<any[]>([]),
    [options, setOptions] = useState<any>({
      employees: [],
      departments: [],
      roles: [],
    });
  const [draft, setDraft] = useState<any>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const [w, o] = await Promise.all([
        expenseApi.getWorkflows(),
        apiClient.get("/expenses/workflow-options"),
      ]);
      setWorkflows(w);
      setOptions(o.data.data);
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.error?.message ||
          "Unable to load workflow configuration",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    setError("");
    const validation = validateClientExpenseWorkflow(draft, options.employees || []);
    if (!validation.isValid) {
      setError(validation.errorMessage || "Correct the highlighted workflow configuration.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        departmentId: Number(draft.departmentId) || null,
      };
      if (draft.id) await expenseApi.updateWorkflow(draft.id, payload);
      else await expenseApi.createWorkflow(payload);
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(expenseError(e, "Unable to save workflow"));
    } finally {
      setSaving(false);
    }
  };
  const changeStep = (index: number, values: any) =>
    setDraft({
      ...draft,
      levels: draft.levels.map((l: any, i: number) =>
        i === index ? { ...l, ...values } : l,
      ),
    });
  const employees = options.employees || [];
  const employeeLabel = (e: any) =>
    `${e.firstName} ${e.lastName || ""} (${e.employeeCode})`;
  const workflowProblem = (workflow: any) => {
    const validation = validateClientExpenseWorkflow(workflow, employees);
    return validation.isValid ? "" : validation.errorMessage || "Invalid workflow configuration";
  };
  return (
    <div className="space-y-5 text-xs text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-balance flex items-center gap-2">
            <GitBranch className="size-5 text-blue-600" />
            Approval Workflows
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-pretty">
            All claimants, including CEO and HR, follow a published workflow.
            Each request keeps its submitted workflow version.
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setDraft(initial());
          }}
          className={ui.primary}
        >
          <Plus className="size-4" />
          Create workflow
        </button>
      </div>

      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading…</p>
      ) : !workflows.length ? (
        <p>
          No workflows configured. Create and publish one for each request type
          before submitting.
        </p>
      ) : (
        workflows.map((w) => (
          <div key={w.id} className={ui.card + " p-5"}>
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold">{w.name}</h3>
                <p>
                  {w.requestType.replace(/_/g, " ")} · v{w.versionNumber} ·{" "}
                  {w.isActive ? "Published" : w.status} · priority{" "}
                  {w.priority || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-pretty">
                  {w.levels.map((l: any) => l.stepName).join(" → ")}
                </p>
                {workflowProblem(w) && (
                  <p role="alert" className="mt-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 text-pretty">
                    Needs correction: {workflowProblem(w)}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDraft({ ...initial(), ...w });
                    setError("");
                  }}
                  className={ui.secondary}
                >
                  Edit / publish
                </button>
                <button
                  onClick={async () => {
                    if (
                      !await window.appConfirm(
                        "Archive this workflow for new requests? Existing requests keep their saved sequence.",
                      )
                    )
                      return;
                    try {
                      await expenseApi.deleteWorkflow(w.id);
                      await load();
                    } catch (e: any) {
                      setError(
                        e.response?.data?.message ||
                          e.response?.data?.error?.message ||
                          "Archive failed",
                      );
                    }
                  }}
                  className={ui.secondary}
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      {draft && (
        <ExpenseWorkflowDialog
          open
          onClose={() => {
            if (!saving) setDraft(null);
          }}
          title={draft.id ? "Edit approval workflow" : "New approval workflow"}
          description="Choose who submits, resolve their own team lead, and define every required approval step."
        >
          <section className="space-y-5">
            <div className="grid md:grid-cols-2 gap-3">
              <label className={ui.label}>
                Name
                <input
                  className={`${control} block w-full`}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label className={ui.label}>
                Request type
                <select
                  className={`${control} block w-full`}
                  value={draft.requestType}
                  onChange={(e) =>
                    setDraft({ ...draft, requestType: e.target.value })
                  }
                >
                  {[
                    "expense_claim",
                    "travel_request",
                    "travel_advance",
                    "mileage_claim",
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.label}>
                Department
                <select
                  className={`${control} block w-full`}
                  value={draft.departmentId || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, departmentId: e.target.value })
                  }
                >
                  <option value="">All departments</option>
                  {options.departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.label}>
                Submitter role
                <select
                  className={`${control} block w-full`}
                  value={draft.targetRole || "all"}
                  onChange={(e) =>
                    setDraft({ ...draft, targetRole: e.target.value })
                  }
                >
                  <option value="all">All roles</option>
                  {[
                    "employee",
                    "team_lead",
                    "manager",
                    "ceo",
                    "hr",
                    "finance",
                  ].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.label}>
                Workflow applies to employees (empty means all)
                <select
                  multiple
                  className={`${control} block w-full`}
                  value={(draft.employeeIds || []).map(String)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      employeeIds: Array.from(e.target.selectedOptions, (o) =>
                        Number(o.value),
                      ),
                    })
                  }
                >
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {employeeLabel(e)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.label}>
                Filter by claimant&apos;s reporting manager (optional)
                <button
                  type="button"
                  className={`${ui.secondary} self-start`}
                  disabled={!(draft.reportingManagerIds || []).length}
                  onClick={() => setDraft({ ...draft, reportingManagerIds: [] })}
                >
                  Clear reporting-manager filter
                </button>
                <select
                  multiple
                  className={`${control} block w-full`}
                  value={(draft.reportingManagerIds || []).map(String)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      reportingManagerIds: Array.from(
                        e.target.selectedOptions,
                        (o) => Number(o.value),
                      ),
                    })
                  }
                >
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {employeeLabel(e)}
                    </option>
                  ))}
                </select>
                <span className="font-normal text-slate-500 dark:text-slate-400 text-pretty">
                  This filters who may submit; it does not select an approver.
                  Leave it empty for CEO, Organization Admin, or HR
                  employee-specific workflows unless that employee actually
                  reports to the selected manager.
                </span>
              </label>
              <label className={ui.label}>
                Minimum amount
                <input
                  type="number"
                  min={0}
                  className={`${control} block w-full`}
                  value={draft.minAmount}
                  onChange={(e) =>
                    setDraft({ ...draft, minAmount: Number(e.target.value) })
                  }
                />
              </label>
              <label className={ui.label}>
                Maximum amount
                <input
                  type="number"
                  min={0}
                  className={`${control} block w-full`}
                  value={draft.maxAmount ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      maxAmount:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className={ui.label}>
                Priority (higher wins)
                <input
                  type="number"
                  className={`${control} block w-full`}
                  value={draft.priority || 0}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: Number(e.target.value) })
                  }
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) =>
                    setDraft({ ...draft, isActive: e.target.checked })
                  }
                />{" "}
                Publish for new requests
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-pretty">
              All selected scopes must match. Matching workflows with equal
              priority block submission until the conflict is resolved. Use
              higher priority for an employee-specific workflow.
            </p>
            {draft.levels.map((l: any, i: number) => (
              <fieldset
                key={i}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
              >
                <legend>Step {i + 1}</legend>
                <div className="flex flex-wrap gap-3">
                  <input
                    aria-label={`Step ${i + 1} name`}
                    className={control}
                    value={l.stepName}
                    onChange={(e) =>
                      changeStep(i, { stepName: e.target.value })
                    }
                  />
                  <select
                    aria-label={`Step ${i + 1} approver`}
                    className={control}
                    value={l.approverType}
                    onChange={(e) =>
                      changeStep(i, {
                        approverType: e.target.value,
                        fallback: "",
                      })
                    }
                  >
                    <option value="team_lead">
                      Claimant’s team lead (direct reporting manager)
                    </option>
                    <option value="reporting_manager">
                      Claimant’s direct reporting manager
                    </option>
                    <option value="specific_user">Named user account</option>
                    <option value="user_role">
                      Configured role group (existing)
                    </option>
                    <option value="manager_chain">
                      Claimant’s lead’s reporting manager
                    </option>
                    <option value="specific_employee">Specific employee</option>
                    <option value="department_head">
                      Claimant’s department head
                    </option>
                    <option value="role">Configured role group</option>
                  </select>
                  {l.approverType === "specific_user" && (
                    <select
                      aria-label="Named user approver"
                      className={control}
                      value={l.approverId || ""}
                      onChange={(e) =>
                        changeStep(i, { approverId: Number(e.target.value) })
                      }
                    >
                      <option value="">Choose user account</option>
                      {(options.users || []).map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                  )}
                  {l.approverType === "specific_employee" && (
                    <select
                      aria-label="Specific employee approver"
                      className={control}
                      value={l.employeeId || ""}
                      onChange={(e) =>
                        changeStep(i, { employeeId: Number(e.target.value) })
                      }
                    >
                      <option value="">Choose employee</option>
                      {employees.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {employeeLabel(e)}
                        </option>
                      ))}
                    </select>
                  )}
                  {["role", "user_role"].includes(l.approverType) && (
                    <>
                      <select
                        aria-label="Approver role"
                        className={control}
                        value={l.roleCode || ""}
                        onChange={(e) =>
                          changeStep(i, {
                            roleCode: e.target.value,
                            approverRoleId: null,
                          })
                        }
                      >
                        <option value="">Choose role</option>
                        {options.roles
                          .filter(
                            (r: any) =>
                              !["team_lead", "manager"].includes(r.code),
                          )
                          .map((r: any) => (
                            <option key={r.id} value={r.code}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                      <select
                        aria-label="Role department scope"
                        className={control}
                        value={l.departmentId || ""}
                        onChange={(e) =>
                          changeStep(i, {
                            departmentId: Number(e.target.value) || null,
                          })
                        }
                      >
                        <option value="">Organization role group</option>
                        {options.departments.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button
                    disabled={draft.levels.length === 1}
                    className={control}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        levels: draft.levels.filter(
                          (_: any, index: number) => index !== i,
                        ),
                      })
                    }
                  >
                    Remove step
                  </button>
                </div>
                {l.approverType === "specific_employee" && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 text-pretty">
                    Select one exact employee for this step. A CEO, Organization
                    Admin, or HR employee may select themselves and approve only
                    this explicitly assigned step; the request then continues to
                    the next workflow step.
                  </p>
                )}
                <label className={ui.label}>
                  Approval rule
                  <select
                    className={control}
                    value={l.approvalMode || "any_one_person"}
                    onChange={(e) =>
                      changeStep(i, { approvalMode: e.target.value })
                    }
                  >
                    <option value="any_one_person">
                      Any one assigned approver
                    </option>
                    <option value="all_people">All assigned approvers</option>
                  </select>
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className={ui.label}>
                    <input
                      type="checkbox"
                      checked={Boolean(l.finance)}
                      onChange={(e) =>
                        changeStep(i, { finance: e.target.checked })
                      }
                    />{" "}
                    Finance verification / amount adjustment
                  </label>
                  <label className={ui.label}>
                    <input
                      type="checkbox"
                      checked={l.canReturn !== false}
                      onChange={(e) =>
                        changeStep(i, { canReturn: e.target.checked })
                      }
                    />{" "}
                    May return for correction
                  </label>
                  {[
                    "team_lead",
                    "reporting_manager",
                    "manager_chain",
                    "specific_employee",
                  ].includes(l.approverType) && (
                    <label className={ui.label}>
                      <input
                        type="checkbox"
                        checked={l.fallback === "primary_manager_when_on_leave"}
                        onChange={(e) =>
                          changeStep(i, {
                            fallback: e.target.checked
                              ? "primary_manager_when_on_leave"
                              : "",
                          })
                        }
                      />{" "}
                      When approver has approved full-day leave, assign their
                      reporting manager
                    </label>
                  )}
                </div>
              </fieldset>
            ))}
            <button
              className={control}
              onClick={() =>
                setDraft({
                  ...draft,
                  levels: [
                    ...draft.levels,
                    {
                      ...step(),
                      stepName: "Approval",
                      approverType: "specific_employee",
                    },
                  ],
                })
              }
            >
              Add step
            </button>
            {error && (
              <p role="alert" className={ui.error}>
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                disabled={saving}
                onClick={() => setDraft(null)}
                className={control}
              >
                Cancel
              </button>
              <button disabled={saving} onClick={save} className={ui.primary}>
                {saving
                  ? "Saving…"
                  : draft.isActive
                    ? "Save and publish"
                    : "Save draft"}
              </button>
            </div>
          </section>
        </ExpenseWorkflowDialog>
      )}
    </div>
  );
}

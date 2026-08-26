import { useState } from 'react';
import { Pencil, Mail, AlertTriangle, Bell, X, ArrowDown, FileText, Sliders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ReportingOfficerSettingsModal } from './modals/ReportingOfficerSettingsModal';
import { MergeTemplateModal } from './modals/MergeTemplateModal';
import { NotifyBackdatedApproverModal } from './modals/NotifyBackdatedApproverModal';
import { NotificationActionModal } from './modals/NotificationActionModal';
import type { CustomStepField } from './modals/CustomizeStepFieldsModal';
import { StepFormPermissionsModal } from './StepFormPermissionsModal';
import { StepTargetModal } from './StepTargetModal';
import type { StepTargetType } from './StepTargetModal';
import type { StepFormPermissions, EscalationConfig, NotificationConfig } from '../../hooks/useWorkflowSettings';

export interface StepItemData {
  tempId: string;
  id?: number;
  step_number: number;
  step_name: string;
  approver_type: 'reporting_officer' | 'employee' | 'department' | 'role' | 'system';
  approver_id?: number | null;
  approver_role_id?: number | null;
  approver_department_id?: number | null;
  approver_name?: string;
  isApplicantsReportingOfficer?: boolean;
  mergeTemplate?: string;
  notifyBackdatedApprover?: boolean;
  customFields?: CustomStepField[];
  formPermissions?: StepFormPermissions;
  escalationConfig?: EscalationConfig;
  notificationConfig?: NotificationConfig;
}

interface Props {
  step: StepItemData;
  roles?: Array<{ id: number; name: string; display_name?: string; code?: string }>;
  departments?: Array<{ id: number; name: string }>;
  employees?: Array<{ id: number; fullName?: string; full_name?: string }>;
  globalHiddenIcons?: string[];
  onHideGlobalIcon?: (iconKey: string, iconLabel: string) => void;
  onUpdate: (tempId: string, updates: Partial<StepItemData>) => void;
  onDelete: (tempId: string) => void;
  onMoveDown?: () => void;
  showMoveDown?: boolean;
}

export function WorkflowStepCard({
  step,
  roles = [],
  departments = [],
  employees = [],
  globalHiddenIcons = [],
  onHideGlobalIcon,
  onUpdate,
  onDelete,
  onMoveDown,
  showMoveDown = true,
}: Props) {
  // Modal states for action icons
  const [targetEditOpen, setTargetEditOpen] = useState(false);
  const [roSettingsOpen, setRoSettingsOpen] = useState(false);
  const [mergeTemplateOpen, setMergeTemplateOpen] = useState(false);
  const [formPermOpen, setFormPermOpen] = useState(false);
  const [backdatedOpen, setBackdatedOpen] = useState(false);
  const [notifActionOpen, setNotifActionOpen] = useState(false);
  const [notifFocusSection, setNotifFocusSection] = useState<'escalation' | 'notifications'>('notifications');

  const allHidden = globalHiddenIcons;
  const isReportingOfficerStep = step.approver_type === 'reporting_officer';
  const isSystemStep = step.approver_type === 'system';

  const hasRoSetting = !!step.isApplicantsReportingOfficer;
  const hasMergeTemplate = !!step.mergeTemplate;
  const hasFormPerms = Object.values(step.formPermissions ?? {}).some(Boolean);
  const hasBackdatedSetting = !!step.notifyBackdatedApprover;
  const hasEscalation = !!(step.escalationConfig?.ifNotApprovedWithinDays || step.escalationConfig?.scheduledDayOfMonth);
  const hasNotification = Object.values(step.notificationConfig ?? {}).some(
    (v: any) => v?.recipients?.length > 0
  );

  const customFields = (step.customFields ?? []).filter(
    (f) => !f.targetStep || f.targetStep === 'all' || f.targetStep === step.approver_type
  );

  // Derive title & sublabel matching exact user screenshot
  let title = 'Reporting Officer';
  if (step.approver_type === 'role') title = 'Role';
  else if (step.approver_type === 'employee') title = 'User';
  else if (step.approver_type === 'department') title = 'Department';
  else if (step.approver_type === 'system') title = 'System';

  let subLabel = step.approver_name || '';
  if (!subLabel) {
    if (step.approver_type === 'system') {
      subLabel = 'System Auto Approval';
    } else if (step.approver_type === 'role' && step.approver_role_id) {
      const r = roles.find((x) => x.id === step.approver_role_id);
      subLabel = r?.display_name || r?.name || '';
    } else if (step.approver_type === 'department' && step.approver_department_id) {
      const d = departments.find((x) => x.id === step.approver_department_id);
      subLabel = d?.name || '';
    } else if (step.approver_type === 'employee' && step.approver_id) {
      const e = employees.find((x) => x.id === step.approver_id);
      subLabel = e?.fullName || e?.full_name || '';
    }
  }

  const openNotificationAction = (section: 'escalation' | 'notifications') => {
    setNotifFocusSection(section);
    setNotifActionOpen(true);
  };

  const handleTargetConfirm = ({ targetId, targetName }: { targetId: number; targetName: string }) => {
    const updates: Partial<StepItemData> = {
      approver_name: targetName,
    };
    if (step.approver_type === 'employee') updates.approver_id = targetId;
    if (step.approver_type === 'department') updates.approver_department_id = targetId;
    if (step.approver_type === 'role') updates.approver_role_id = targetId;

    onUpdate(step.tempId, updates);
  };

  const handleDoubleClickIcon = (iconKey: string, iconLabel: string) => {
    if (onHideGlobalIcon) {
      onHideGlobalIcon(iconKey, iconLabel);
    }
  };

  const handleCustomFieldValueChange = (fieldId: string, val: any) => {
    const updatedFields = (step.customFields ?? []).map((f) =>
      f.id === fieldId ? { ...f, value: val } : f
    );
    onUpdate(step.tempId, { customFields: updatedFields });
  };

  return (
    <div className="relative flex gap-3 items-stretch">
      {/* Timeline line + move button */}
      <div className="flex flex-col items-center">
        {showMoveDown && (
          <button
            onClick={onMoveDown}
            className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xs flex-shrink-0 transition-colors"
            title="Move down"
          >
            <ArrowDown size={14} className="stroke-[3]" />
          </button>
        )}
        {!showMoveDown && <div className="w-7 h-7" />}
        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
      </div>

      {/* Step card */}
      <div className="flex-1 mb-3 border rounded-xl bg-white dark:bg-gray-800/80 shadow-2xs hover:bg-gray-50/50 transition-colors overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-medium text-foreground tracking-tight">{title}</h4>
            {!isReportingOfficerStep && subLabel && (
              <p className="text-xs font-semibold text-muted-foreground mt-1 truncate">{subLabel}</p>
            )}
          </div>

          {/* Action icons bar */}
          {!isSystemStep && (
            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
              {/* Icon 1: Reporting Officer Settings OR Pencil Edit */}
              {!allHidden.includes('edit') && (
                isReportingOfficerStep ? (
                  <button
                    title="Reporting Officer Settings (Double click to hide)"
                    onClick={() => setRoSettingsOpen(true)}
                    onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickIcon('edit', 'RO Settings'); }}
                    className={`p-1 rounded transition-colors ${
                      hasRoSetting ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Pencil size={14} />
                      <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-blue-600 text-white px-0.5 rounded">✓</span>
                    </div>
                  </button>
                ) : (
                  <button
                    title="Edit Target (Double click to hide)"
                    onClick={() => setTargetEditOpen(true)}
                    onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickIcon('edit', 'Edit Target'); }}
                    className="p-1 rounded text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )
              )}

              {/* Icon 2: Merge Template details ([W] Icon) */}
              {!allHidden.includes('merge') && (
                <button
                  title="Merge Template details (Double click to hide)"
                  onClick={() => setMergeTemplateOpen(true)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickIcon('merge', 'Merge Template'); }}
                  className={`p-1 rounded transition-colors ${
                    hasMergeTemplate ? 'text-purple-600 font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center font-serif text-[11px] font-extrabold border border-current px-0.5 rounded h-4 leading-none">
                    W
                  </div>
                </button>
              )}

              {/* Icon 3: Form Permissions (Document Sheet) */}
              {!allHidden.includes('form') && (
                <button
                  title="Form Permissions (Double click to hide)"
                  onClick={() => setFormPermOpen(true)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickIcon('form', 'Form Permissions'); }}
                  className={`p-1 rounded transition-colors ${
                    hasFormPerms ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText size={14} />
                </button>
              )}

              {/* Icon 4: Mail / Notify Backdated Approver */}
              {!isReportingOfficerStep && !allHidden.includes('backdated') && (
                <button
                  title="Notify Backdated Approver Setting (Double click to hide)"
                  onClick={() => setBackdatedOpen(true)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickIcon('backdated', 'Notify Backdated'); }}
                  className={`p-1 rounded transition-colors ${
                    hasBackdatedSetting ? 'text-emerald-600 font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Mail size={14} />
                </button>
              )}

              {/* Icon 5: Escalation / Conditions (Alert Triangle ⚠) */}
              {!allHidden.includes('escalation') && (
                <button
                  title="Escalation / Conditions (Double click to hide)"
                  onClick={() => openNotificationAction('escalation')}
                  onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickIcon('escalation', 'Escalation'); }}
                  className={`p-1 rounded transition-colors ${
                    hasEscalation ? 'text-amber-600 font-bold' : 'text-gray-600 hover:text-amber-700'
                  }`}
                >
                  <AlertTriangle size={14} />
                </button>
              )}

              {/* Icon 6: Notification Action (Bell 🔔) */}
              {!allHidden.includes('notification') && (
                <button
                  title="Notification Action (Double click to hide)"
                  onClick={() => openNotificationAction('notifications')}
                  onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickIcon('notification', 'Notifications'); }}
                  className={`p-1 rounded transition-colors ${
                    hasNotification ? 'text-yellow-600 font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bell size={14} />
                </button>
              )}

              {/* Icon 7: Remove Step (✕) */}
              <button
                title="Remove step"
                onClick={() => onDelete(step.tempId)}
                className="p-1 rounded text-gray-600 hover:text-red-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Custom Fields Section if added via 3 dots */}
        {customFields.length > 0 && (
          <div className="px-5 py-3 border-t bg-gray-50/60 dark:bg-gray-900/40 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
              <Sliders size={13} className="text-blue-600" />
              <span>Customized Fields & Data</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {customFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <span>{field.label}</span>
                    {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.fieldType === 'text' && (
                    <Input
                      placeholder={`Enter ${field.label}...`}
                      value={(field.value as string) || ''}
                      onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-gray-800"
                    />
                  )}

                  {field.fieldType === 'number' && (
                    <Input
                      type="number"
                      placeholder="0"
                      value={(field.value as number) ?? ''}
                      onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-gray-800"
                    />
                  )}

                  {field.fieldType === 'date' && (
                    <Input
                      type="date"
                      value={(field.value as string) || ''}
                      onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-gray-800"
                    />
                  )}

                  {field.fieldType === 'checkbox' && (
                    <div className="flex items-center gap-2 h-8">
                      <Checkbox
                        id={`cb-${field.id}`}
                        checked={!!field.value}
                        onCheckedChange={(v) => handleCustomFieldValueChange(field.id, !!v)}
                      />
                      <label htmlFor={`cb-${field.id}`} className="text-xs font-medium cursor-pointer text-gray-700 dark:text-gray-300">
                        Enable {field.label}
                      </label>
                    </div>
                  )}

                  {field.fieldType === 'select' && (
                    <select
                      value={(field.value as string) || ''}
                      onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                      className="w-full h-8 text-xs border rounded-md px-2 bg-white dark:bg-gray-800 font-medium"
                    >
                      <option value="">Select {field.label}...</option>
                      {(field.options ?? []).map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status indicators */}
        {(hasRoSetting || hasMergeTemplate || hasFormPerms || hasBackdatedSetting || hasNotification || hasEscalation) && (
          <div className="px-5 pb-2.5 flex gap-1 flex-wrap">
            {hasRoSetting && <Badge variant="secondary" className="text-[10px] h-4 bg-blue-100 text-blue-700">Applicant RO</Badge>}
            {hasMergeTemplate && <Badge variant="secondary" className="text-[10px] h-4 bg-purple-100 text-purple-700">Merge Template</Badge>}
            {hasFormPerms && <Badge variant="secondary" className="text-[10px] h-4 bg-indigo-100 text-indigo-700">Form Perms</Badge>}
            {hasBackdatedSetting && <Badge variant="secondary" className="text-[10px] h-4 bg-emerald-100 text-emerald-700">Backdated Approver</Badge>}
            {hasNotification && <Badge variant="secondary" className="text-[10px] h-4 bg-yellow-100 text-yellow-700">Notifications</Badge>}
            {hasEscalation && <Badge variant="secondary" className="text-[10px] h-4 bg-amber-100 text-amber-700">Escalation</Badge>}
          </div>
        )}
      </div>

      {/* Target Selection / Edit Modal */}
      {!isReportingOfficerStep && (
        <StepTargetModal
          open={targetEditOpen}
          type={step.approver_type as StepTargetType}
          onClose={() => setTargetEditOpen(false)}
          employees={employees}
          departments={departments}
          roles={roles}
          onConfirm={handleTargetConfirm}
        />
      )}

      {/* Modal 1: Reporting Officer Settings */}
      {isReportingOfficerStep && (
        <ReportingOfficerSettingsModal
          open={roSettingsOpen}
          onClose={() => setRoSettingsOpen(false)}
          initialValue={step.isApplicantsReportingOfficer}
          onSave={(v) => onUpdate(step.tempId, { isApplicantsReportingOfficer: v })}
        />
      )}

      {/* Modal 2: Merge Template details */}
      <MergeTemplateModal
        open={mergeTemplateOpen}
        onClose={() => setMergeTemplateOpen(false)}
        initialValue={step.mergeTemplate}
        onSave={(tmpl) => onUpdate(step.tempId, { mergeTemplate: tmpl })}
      />

      {/* Modal 3: Form Permissions */}
      <StepFormPermissionsModal
        open={formPermOpen}
        onClose={() => setFormPermOpen(false)}
        initialValues={step.formPermissions}
        stepName={step.step_name}
        onSave={(fp) => onUpdate(step.tempId, { formPermissions: fp })}
      />

      {/* Modal 4: Notify Backdated Approver Setting */}
      {!isReportingOfficerStep && (
        <NotifyBackdatedApproverModal
          open={backdatedOpen}
          onClose={() => setBackdatedOpen(false)}
          initialValue={step.notifyBackdatedApprover}
          onSave={(v) => onUpdate(step.tempId, { notifyBackdatedApprover: v })}
        />
      )}

      {/* Modal 5 & 6: Notification Action (Escalation & Notifications) */}
      <NotificationActionModal
        open={notifActionOpen}
        onClose={() => setNotifActionOpen(false)}
        departments={departments}
        employees={employees}
        initialEscalation={step.escalationConfig}
        initialNotification={step.notificationConfig}
        focusSection={notifFocusSection}
        onSave={(esc, notif) => onUpdate(step.tempId, { escalationConfig: esc, notificationConfig: notif })}
      />
    </div>
  );
}

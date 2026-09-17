import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FetchRecipientModal } from './FetchRecipientModal';
import type { RecipientSelection } from './FetchRecipientModal';
import type { EscalationConfig, NotificationConfig } from '../../../hooks/useWorkflowSettings';
import { apiClient as api } from '@/config/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  departments?: Array<{ id: number; name: string }>;
  employees?: Array<{ id: number; fullName?: string; full_name?: string; employeeCode?: string; employee_code?: string }>;
  initialEscalation?: EscalationConfig;
  initialNotification?: NotificationConfig;
  focusSection?: 'escalation' | 'notifications';
  onSave: (escalation: EscalationConfig, notification: NotificationConfig) => void;
}

const DEFAULT_MERGE_CODES = [
  '[#REPORTING_OFFICER#]',
  '[#INDIRECT_REPORTING_OFFICER#]',
  '[#EMPLOYEE#]',
  '[#EMPLOYEE_NAME#]',
  '[#DEPARTMENT#]',
];

export function NotificationActionModal({
  open,
  onClose,
  departments = [],
  employees = [],
  initialEscalation,
  initialNotification,
  focusSection = 'notifications',
  onSave,
}: Props) {
  // Escalation state
  const [ifNotApprovedDays, setIfNotApprovedDays] = useState<string>('');
  const [remindAfterDays, setRemindAfterDays] = useState<string>('');
  const [scheduledDay, setScheduledDay] = useState<string>('');
  const [escalationApprovalType, setEscalationApprovalType] = useState<'manual' | 'auto'>('manual');
  const [escalationRecipient, setEscalationRecipient] = useState<RecipientSelection | null>(null);

  // Notification state
  const [approveRecipient, setApproveRecipient] = useState<RecipientSelection | null>(null);
  const [rejectRecipient, setRejectRecipient] = useState<RecipientSelection | null>(null);

  // Active recipient fetch target
  const [activeFetchTarget, setActiveFetchTarget] = useState<'escalation' | 'approve' | 'reject' | null>(null);

  // Dynamic Merge Codes state from DB table
  const [dbMergeCodes, setDbMergeCodes] = useState<string[]>(DEFAULT_MERGE_CODES);
  const [loadingCodes, setLoadingCodes] = useState(false);

  useEffect(() => {
    if (initialEscalation) {
      setIfNotApprovedDays(initialEscalation.ifNotApprovedWithinDays ? String(initialEscalation.ifNotApprovedWithinDays) : '');
      setRemindAfterDays(initialEscalation.remindEveryDays ? String(initialEscalation.remindEveryDays) : '');
      setScheduledDay(initialEscalation.scheduledDayOfMonth ? String(initialEscalation.scheduledDayOfMonth) : '');
      setEscalationApprovalType(initialEscalation.approvalMode || 'manual');
    } else {
      setIfNotApprovedDays('');
      setRemindAfterDays('');
      setScheduledDay('');
      setEscalationApprovalType('manual');
    }

    if (open) {
      fetchDbMergeCodes();
    }
  }, [open, initialEscalation, initialNotification]);

  const fetchDbMergeCodes = async () => {
    setLoadingCodes(true);
    try {
      const res = await api.get('/settings/merge-codes?pageSize=200');
      const items = res.data?.data ?? res.data ?? [];
      if (Array.isArray(items) && items.length > 0) {
        const codes = items
          .filter((it: any) => {
            const raw = it.is_active ?? it.isActive ?? 'Yes';
            return raw === 'Yes' || raw === 'yes' || raw === true || raw === 1 || raw === '1';
          })
          .map((it: any) => it.merge_code || it.code)
          .filter(Boolean);
        if (codes.length > 0) {
          setDbMergeCodes(codes);
          setLoadingCodes(false);
          return;
        }
      }
      setDbMergeCodes(DEFAULT_MERGE_CODES);
    } catch {
      setDbMergeCodes(DEFAULT_MERGE_CODES);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleCopyMergeCode = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    toast.success(`Copied merge code: ${codeStr}`);
  };

  const handleRecipientConfirm = (selection: RecipientSelection) => {
    if (activeFetchTarget === 'escalation') {
      setEscalationRecipient(selection);
    } else if (activeFetchTarget === 'approve') {
      setApproveRecipient(selection);
    } else if (activeFetchTarget === 'reject') {
      setRejectRecipient(selection);
    }
    setActiveFetchTarget(null);
  };

  const handleSave = () => {
    const esc: EscalationConfig = {
      ifNotApprovedWithinDays: ifNotApprovedDays ? Number(ifNotApprovedDays) : undefined,
      remindEveryDays: remindAfterDays ? Number(remindAfterDays) : undefined,
      scheduledDayOfMonth: scheduledDay ? Number(scheduledDay) : undefined,
      approvalMode: escalationApprovalType,
    };

    const notif: NotificationConfig = {
      approve: approveRecipient ? { recipients: [] } : undefined,
      reject: rejectRecipient ? { recipients: [] } : undefined,
    };

    onSave(esc, notif);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border rounded-lg bg-background shadow-lg">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="text-base font-medium text-foreground">
              Notification Action
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Escalation Section */}
            {focusSection === 'escalation' && (
              <div className="border rounded-md overflow-hidden bg-background">
                {/* Header card bar */}
                <div className="px-4 py-2.5 bg-[#f4f4f4] dark:bg-muted/40 border-b flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="text-sm">?</span>
                  <span>Escalation</span>
                </div>

                <div className="p-5 space-y-5">
                  {/* Line 1 */}
                  <div className="flex items-center gap-2 text-sm text-foreground flex-wrap">
                    <span>If not approved within</span>
                    <Input
                      type="number"
                      value={ifNotApprovedDays}
                      onChange={(e) => setIfNotApprovedDays(e.target.value)}
                      className="w-24 h-8 text-xs border-b border-t-0 border-x-0 rounded-none text-center bg-transparent focus-visible:ring-0 focus:border-primary"
                    />
                    <span>days.</span>
                    <span className="ml-2">Remind After every</span>
                    <Input
                      type="number"
                      value={remindAfterDays}
                      onChange={(e) => setRemindAfterDays(e.target.value)}
                      className="w-24 h-8 text-xs border-b border-t-0 border-x-0 rounded-none text-center bg-transparent focus-visible:ring-0 focus:border-primary"
                    />
                    <span>day.</span>
                  </div>

                  {/* OR */}
                  <div className="text-center font-bold text-xs text-foreground py-1">OR</div>

                  {/* Line 2 */}
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <span>Schedule Approval on</span>
                    <Input
                      type="number"
                      value={scheduledDay}
                      onChange={(e) => setScheduledDay(e.target.value)}
                      className="w-20 h-8 text-xs border-b border-t-0 border-x-0 rounded-none text-center bg-transparent focus-visible:ring-0 focus:border-primary"
                    />
                    <span>Day of Month.</span>
                  </div>

                  {/* Manual / Auto Approve choices */}
                  <div className="flex gap-4 pt-2">
                    <div
                      onClick={() => setEscalationApprovalType('manual')}
                      className={`flex items-center w-40 border rounded-sm cursor-pointer transition-colors overflow-hidden ${
                        escalationApprovalType === 'manual' ? 'border-gray-400 font-bold' : 'border-gray-300'
                      }`}
                    >
                      <div className={`w-6 h-8 ${escalationApprovalType === 'manual' ? 'bg-[#3c8dbc]' : 'bg-[#d2d6de]'}`} />
                      <span className="text-xs px-3 text-foreground">Manual</span>
                    </div>

                    <div
                      onClick={() => setEscalationApprovalType('auto')}
                      className={`flex items-center w-44 border rounded-sm cursor-pointer transition-colors overflow-hidden ${
                        escalationApprovalType === 'auto' ? 'border-gray-400 font-bold' : 'border-gray-300'
                      }`}
                    >
                      <div className={`w-6 h-8 ${escalationApprovalType === 'auto' ? 'bg-[#3c8dbc]' : 'bg-[#d2d6de]'}`} />
                      <span className="text-xs px-3 text-foreground">Auto Approve</span>
                    </div>
                  </div>

                  {/* [+] Add Recipient Button */}
                  <div className="pt-2 space-y-2">
                    <Button
                      size="sm"
                      onClick={() => setActiveFetchTarget('escalation')}
                      className="bg-[#337ab7] hover:bg-[#286090] text-white font-semibold h-8 text-xs px-3.5 rounded-sm"
                    >
                      [+] Add Recipient
                    </Button>
                    {escalationRecipient && (
                      <span className="ml-2 text-xs font-semibold text-green-600">? Recipient configured</span>
                    )}

                    {/* Dynamic Merge Codes list from DB table */}
                    <div className="text-xs text-muted-foreground pt-1 flex flex-wrap items-center gap-1.5 font-mono">
                      <span>Use Merge Codes:</span>
                      {loadingCodes && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                      {!loadingCodes && dbMergeCodes.map((codeStr, i) => (
                        <span
                          key={i}
                          onClick={() => handleCopyMergeCode(codeStr)}
                          className="font-bold text-foreground hover:text-primary cursor-pointer hover:underline transition-colors"
                          title="Click to copy merge code"
                        >
                          {codeStr}{i < dbMergeCodes.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {focusSection !== 'escalation' && (
              <div className="space-y-4">
                {/* Approve Card */}
                <div className="border rounded-md overflow-hidden bg-background">
                  <div className="px-4 py-2.5 bg-[#f4f4f4] dark:bg-muted/40 border-b flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="text-sm">?</span>
                    <span>Approve</span>
                  </div>

                  <div className="p-5 space-y-3">
                    <Button
                      size="sm"
                      onClick={() => setActiveFetchTarget('approve')}
                      className="bg-[#337ab7] hover:bg-[#286090] text-white font-semibold h-8 text-xs px-3.5 rounded-sm"
                    >
                      [+] Add Recipient
                    </Button>
                    {approveRecipient && (
                      <span className="ml-2 text-xs font-semibold text-green-600">? Approve Recipient configured</span>
                    )}

                    {/* Dynamic Merge Codes list from DB table */}
                    <div className="text-xs text-muted-foreground pt-1 flex flex-wrap items-center gap-1.5 font-mono">
                      <span>Use Merge Codes:</span>
                      {loadingCodes && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                      {!loadingCodes && dbMergeCodes.map((codeStr, i) => (
                        <span
                          key={i}
                          onClick={() => handleCopyMergeCode(codeStr)}
                          className="font-bold text-foreground hover:text-primary cursor-pointer hover:underline transition-colors"
                          title="Click to copy merge code"
                        >
                          {codeStr}{i < dbMergeCodes.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reject Card */}
                <div className="border rounded-md overflow-hidden bg-background">
                  <div className="px-4 py-2.5 bg-[#f4f4f4] dark:bg-muted/40 border-b flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="text-sm">?</span>
                    <span>Reject</span>
                  </div>

                  <div className="p-5 space-y-3">
                    <Button
                      size="sm"
                      onClick={() => setActiveFetchTarget('reject')}
                      className="bg-[#337ab7] hover:bg-[#286090] text-white font-semibold h-8 text-xs px-3.5 rounded-sm"
                    >
                      [+] Add Recipient
                    </Button>
                    {rejectRecipient && (
                      <span className="ml-2 text-xs font-semibold text-green-600">? Reject Recipient configured</span>
                    )}

                    {/* Dynamic Merge Codes list from DB table */}
                    <div className="text-xs text-muted-foreground pt-1 flex flex-wrap items-center gap-1.5 font-mono">
                      <span>Use Merge Codes:</span>
                      {loadingCodes && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                      {!loadingCodes && dbMergeCodes.map((codeStr, i) => (
                        <span
                          key={i}
                          onClick={() => handleCopyMergeCode(codeStr)}
                          className="font-bold text-foreground hover:text-primary cursor-pointer hover:underline transition-colors"
                          title="Click to copy merge code"
                        >
                          {codeStr}{i < dbMergeCodes.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t flex justify-between items-center bg-muted/10">
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold px-5 h-8 rounded-md text-xs"
            >
              Fetch
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="bg-[#dd4b39] hover:bg-[#c9302c] text-white font-bold px-5 h-8 rounded-md text-xs"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Fetch Recipient Modal */}
      <FetchRecipientModal
        open={!!activeFetchTarget}
        onClose={() => setActiveFetchTarget(null)}
        departments={departments}
        employees={employees}
        onConfirm={handleRecipientConfirm}
      />
    </>
  );
}

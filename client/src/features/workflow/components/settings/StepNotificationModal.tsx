import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronDown, ChevronRight, Mail, Check, X, CircleDot, Plus } from 'lucide-react';
import { FetchRecipientModal } from './modals/FetchRecipientModal';
import type { EscalationConfig, NotificationConfig, EscalationRecipient } from '../../hooks/useWorkflowSettings';

type Tab = 'escalation' | 'notification';
type NotificationEvent = 'application' | 'approve' | 'reject' | 'cancel';

interface Props {
  open: boolean;
  onClose: () => void;
  stepName?: string;
  initialEscalation?: EscalationConfig;
  initialNotification?: NotificationConfig;
  onSave: (escalation: EscalationConfig, notification: NotificationConfig) => void;
}

const NOTIFICATION_EVENTS: Array<{ key: NotificationEvent; label: string; icon: React.ReactNode }> = [
  { key: 'application', label: 'Application', icon: <Mail size={14} /> },
  { key: 'approve', label: 'Approve', icon: <Check size={14} className="text-green-600" /> },
  { key: 'reject', label: 'Reject', icon: <X size={14} className="text-red-500" /> },
  { key: 'cancel', label: 'Cancel', icon: <CircleDot size={14} /> },
];

const MERGE_CODES = ['[#REPORTING_OFFICER#]', '[#INDIRECT_REPORTING_OFFICER#]', '[#EMPLOYEE#]'];

export function StepNotificationModal({ open, onClose, stepName, initialEscalation = {}, initialNotification = {}, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('notification');
  const [escalation, setEscalation] = useState<EscalationConfig>(initialEscalation);
  const [notification, setNotification] = useState<NotificationConfig>(initialNotification);
  const [expandedEvent, setExpandedEvent] = useState<NotificationEvent | null>('application');
  const [recipientModalEvent, setRecipientModalEvent] = useState<NotificationEvent | null>(null);

  const handleEscalationChange = (field: keyof EscalationConfig, value: any) => {
    setEscalation(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRecipient = (event: NotificationEvent) => {
    setRecipientModalEvent(event);
  };

  const handleRecipientFetch = (recipients: EscalationRecipient[]) => {
    if (!recipientModalEvent) return;
    setNotification(prev => ({
      ...prev,
      [recipientModalEvent]: {
        ...prev[recipientModalEvent],
        recipients,
      },
    }));
    setRecipientModalEvent(null);
  };

  const handleSave = () => {
    onSave(escalation, notification);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Notification Action {stepName ? `— ${stepName}` : ''}
            </DialogTitle>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setActiveTab('notification')}
              className={`text-sm px-3 py-1 rounded-t font-medium transition-colors ${
                activeTab === 'notification'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('escalation')}
              className={`text-sm px-3 py-1 rounded-t font-medium transition-colors ${
                activeTab === 'escalation'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Escalation
            </button>
          </div>

          {/* Notification Events Tab */}
          {activeTab === 'notification' && (
            <div className="space-y-1 max-h-[55vh] overflow-y-auto">
              {NOTIFICATION_EVENTS.map(({ key, label, icon }) => {
                const isExpanded = expandedEvent === key;
                const eventRecipients = notification[key]?.recipients ?? [];
                return (
                  <div key={key} className="border rounded-md overflow-hidden">
                    <button
                      onClick={() => setExpandedEvent(isExpanded ? null : key)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors text-left"
                    >
                      {icon}
                      <span>{label}</span>
                      {eventRecipients.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground mr-1">
                          {eventRecipients.length} recipient{eventRecipients.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {isExpanded ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 border-t bg-muted/20 space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 bg-blue-600 text-white hover:bg-blue-700 border-0"
                          onClick={() => handleAddRecipient(key)}
                        >
                          <Plus size={12} />
                          Add Recipient
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Use Merge Codes:{' '}
                          {MERGE_CODES.map((code, i) => (
                            <span key={i} className="font-mono text-[11px]">
                              {code}{i < MERGE_CODES.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                        {eventRecipients.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {eventRecipients.map((r, idx) => (
                              <div key={idx} className="capitalize">• {r.type.replace(/_/g, ' ')}{r.userIds?.length ? ` (${r.userIds.length} users)` : ''}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Escalation Tab */}
          {activeTab === 'escalation' && (
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Approval Mode</Label>
                <RadioGroup
                  value={escalation.approvalMode ?? 'manual'}
                  onValueChange={v => handleEscalationChange('approvalMode', v)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="manual" id="esc-manual" />
                    <Label htmlFor="esc-manual" className="text-sm">Manual</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="auto" id="esc-auto" />
                    <Label htmlFor="esc-auto" className="text-sm">Auto Approve</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">If not approved within (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-8 text-sm"
                    value={escalation.ifNotApprovedWithinDays ?? ''}
                    onChange={e => handleEscalationChange('ifNotApprovedWithinDays', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g. 3"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Remind every (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-8 text-sm"
                    value={escalation.remindEveryDays ?? ''}
                    onChange={e => handleEscalationChange('remindEveryDays', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g. 1"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">OR: Schedule approval on day of month</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="h-8 text-sm max-w-[120px]"
                  value={escalation.scheduledDayOfMonth ?? ''}
                  onChange={e => handleEscalationChange('scheduledDayOfMonth', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 15"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t">
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
              Fetch
            </Button>
            <Button variant="destructive" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested Recipient Picker */}
      {recipientModalEvent && (
        <FetchRecipientModal
          open={true}
          onClose={() => setRecipientModalEvent(null)}
          onConfirm={() => setRecipientModalEvent(null)}
        />
      )}
    </>
  );
}



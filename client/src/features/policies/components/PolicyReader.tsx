import React, { useState } from 'react';
import type { RolePolicyRecord, PolicyVersionRecord } from '../types/policy';
import { PolicyStatusBadge } from './PolicyStatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Download,
  History,
  Edit,
  UserCheck,
  CheckCircle2,
  FileText,
  Building2,
  Users,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface PolicyReaderProps {
  policy: RolePolicyRecord;
  canManage?: boolean;
  onEdit?: (policy: RolePolicyRecord) => void;
  onManageAssignment?: (policy: RolePolicyRecord) => void;
  onViewVersionHistory?: (policy: RolePolicyRecord) => void;
  onAcknowledge?: (policy: RolePolicyRecord) => void;
  onClose?: () => void;
}

export const PolicyReader: React.FC<PolicyReaderProps> = ({
  policy,
  canManage = false,
  onEdit,
  onManageAssignment,
  onViewVersionHistory,
  onAcknowledge,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'assignment' | 'acknowledgement' | 'audit'>('content');

  const handleDownload = () => {
    toast.success('Downloading Policy Document', {
      description: `${policy.documentRef || 'POL-000'} - ${policy.title}.pdf`,
    });
  };

  return (
    <div className="bg-card text-foreground border border-border rounded-xl shadow-lg overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
      
      {/* Left Information Panel */}
      <div className="lg:w-1/3 bg-muted/20 border-r border-border p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-5">
          {onClose && (
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Policy Information</span>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Policy Header Icon & Name */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto sm:mx-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pb-1">
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {policy.documentRef || `POL-${String(policy.id).padStart(3, '0')}`}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                  {policy.version || 'v1.0'}
                </Badge>
              </div>
              <h2 className="text-base font-bold text-foreground leading-tight">{policy.title}</h2>
            </div>
            <PolicyStatusBadge status={policy.status} />
          </div>

          {/* Metadata Cards */}
          <div className="space-y-2.5 text-xs font-medium pt-2 border-t border-border">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Category</span>
              <span className="font-bold text-foreground">{policy.category || 'HR Policies'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Effective Date</span>
              <span className="font-bold text-foreground">
                {policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : 'Immediate'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Review Date</span>
              <span className="font-bold text-foreground">
                {policy.reviewDate ? new Date(policy.reviewDate).toLocaleDateString() : 'Annual'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Version Number</span>
              <span className="font-bold text-primary font-mono">{policy.version || 'v1.0'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Issued By</span>
              <span className="font-bold text-foreground">HR Governance Board</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Your Status</span>
              <span className={`font-bold ${policy.policyAccepted ? 'text-emerald-500' : 'text-amber-500'}`}>
                {policy.policyAccepted ? 'Acknowledged' : 'Pending Sign-Off'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {policy.allowDownload !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="w-full text-xs font-bold gap-1.5 h-9"
              >
                <Download className="w-3.5 h-3.5 text-primary" /> Download Policy (PDF)
              </Button>
            )}

            {onViewVersionHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewVersionHistory(policy)}
                className="w-full text-xs font-bold gap-1.5 h-9"
              >
                <History className="w-3.5 h-3.5 text-slate-500" /> View Version History
              </Button>
            )}
          </div>
        </div>

        {/* Admin Manage Actions */}
        {canManage && (
          <div className="pt-4 border-t border-border space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Administrative Controls</div>
            <div className="grid grid-cols-2 gap-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onEdit(policy)}
                  className="text-xs font-bold h-8 gap-1 bg-primary"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Policy
                </Button>
              )}
              {onManageAssignment && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onManageAssignment(policy)}
                  className="text-xs font-bold h-8 gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-primary" /> Assignment
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Main Content Area */}
      <div className="lg:w-2/3 p-6 sm:p-8 flex flex-col justify-between space-y-6">
        
        {/* Tab Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
            <Button
              type="button"
              variant={activeTab === 'content' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('content')}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Policy Content
            </Button>
            <Button
              type="button"
              variant={activeTab === 'assignment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('assignment')}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Target Scope
            </Button>
            {canManage && (
              <Button
                type="button"
                variant={activeTab === 'acknowledgement' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('acknowledgement')}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Acknowledgements
              </Button>
            )}
            {canManage && (
              <Button
                type="button"
                variant={activeTab === 'audit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('audit')}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Audit Log
              </Button>
            )}
          </div>

          {/* Tab 1: Policy Content Document */}
          {activeTab === 'content' && (
            <div className="space-y-6 font-sans">
              <div className="text-center space-y-1 pb-4 border-b-2 border-primary/30">
                <span className="text-[10px] font-extrabold text-primary tracking-widest uppercase">
                  ApponextHRMS Official Governance Document
                </span>
                <h1 className="text-lg sm:text-xl font-black uppercase text-foreground leading-tight">
                  {policy.title}
                </h1>
              </div>

              {policy.description && (
                <p className="text-xs italic text-muted-foreground bg-muted/30 p-3.5 rounded-xl border-l-4 border-primary leading-relaxed">
                  {policy.description}
                </p>
              )}

              <div className="space-y-5 pt-2">
                {policy.sections && policy.sections.length > 0 ? (
                  policy.sections.map((sec, idx) => (
                    <div key={sec.id || idx} className="space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {sec.title}
                      </h3>
                      <div className="text-xs leading-relaxed text-muted-foreground pl-5 whitespace-pre-line">
                        {sec.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No detailed content sections defined.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Assignment Scope */}
          {activeTab === 'assignment' && (
            <div className="space-y-4 text-xs font-medium">
              <div className="font-bold text-foreground">Target Role & Department Scope:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" /> Assigned Roles
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(policy.assignedRoles || [policy.roleCode]).map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px] uppercase font-bold">
                        {r.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary" /> Assigned Target Types
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(policy.assignments || []).map((a, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] uppercase font-bold">
                        {a.targetType}: {a.targetId}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Acknowledgements Summary (Admin View) */}
          {activeTab === 'acknowledgement' && (
            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-center justify-between">
                <div className="font-bold text-foreground">Employee Acknowledgement Tracking:</div>
                <Badge variant="outline" className="text-emerald-500 font-bold">
                  {policy.acknowledgementPercentage ?? 100}% Acknowledged
                </Badge>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/20 text-muted-foreground space-y-1">
                <p>
                  Acknowledged Count: <strong>{policy.acknowledgedCount ?? 0}</strong> employees.
                </p>
                <p>
                  Pending Count: <strong>{policy.pendingCount ?? 0}</strong> employees.
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Audit Log */}
          {activeTab === 'audit' && (
            <div className="space-y-3 text-xs">
              <div className="font-bold text-foreground">Policy Governance Audit Log:</div>
              <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-2 text-muted-foreground">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span>Initial Policy Creation</span>
                  <span className="font-bold text-foreground">{policy.createdAt ? new Date(policy.createdAt).toLocaleDateString() : 'System'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Latest Version Published ({policy.version || 'v1.0'})</span>
                  <span className="font-bold text-foreground">{policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : 'System'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Employee Acknowledgement Button */}
        {!policy.policyAccepted && onAcknowledge && (
          <div className="pt-4 border-t border-border">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Mandatory Role Acknowledgement Required
                </div>
                <p className="text-[11px] text-muted-foreground">
                  You must confirm that you have read and agreed to the compliance rules in this policy.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onAcknowledge(policy)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 gap-1.5 shrink-0 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Read & Acknowledge
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

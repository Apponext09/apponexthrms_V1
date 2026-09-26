import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { policiesApi } from '../api/policiesApi';
import type { PolicyAcknowledgementReportItem, PolicyAcknowledgementReportSummary } from '../types/policy';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Search,
  Download,
  Printer,
  Bell,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users,
  Shield,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export const PolicyAcknowledgementReportPage: React.FC = () => {
  const navigate = useNavigate();

  const [dynamicRoles, setDynamicRoles] = useState<Array<{ id: string | number; name: string; code: string }>>([]);

  useEffect(() => {
    policiesApi.getTargetOptions().then((res) => {
      if (res && Array.isArray(res.roles)) {
        setDynamicRoles(res.roles);
      }
    }).catch(() => {});
  }, []);

  const [summary, setSummary] = useState<PolicyAcknowledgementReportSummary>({
    totalEmployees: 0,
    acknowledged: 0,
    pending: 0,
    notApplicable: 0,
  });

  const [reportRows, setReportRows] = useState<PolicyAcknowledgementReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [policyFilter, setPolicyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadReportData = async () => {
    try {
      setLoading(true);
      const data = await policiesApi.getAcknowledgementReport({
        policyId: policyFilter !== 'all' ? Number(policyFilter) : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      setSummary(data.summary);
      setReportRows(data.report);
    } catch (err) {
      console.error('Failed to load acknowledgement report:', err);
      toast.error('Failed to load policy acknowledgement report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [policyFilter, roleFilter, statusFilter]);

  const handleSendReminder = async (item: PolicyAcknowledgementReportItem) => {
    try {
      await policiesApi.sendReminder(item.policyId);
      toast.success('Reminder notification sent!', {
        description: `Sent reminder to ${item.employeeName} for policy "${item.policyName}".`,
      });
    } catch (err) {
      toast.error('Failed to send reminder notification.');
    }
  };

  const handleExportCSV = () => {
    if (reportRows.length === 0) {
      toast.error('No report data to export.');
      return;
    }

    const headers = ['Employee Name', 'Email', 'Role', 'Department', 'Policy Name', 'Document Ref', 'Version', 'Status', 'Acknowledged Date', 'Comments'];
    const csvRows = [headers.join(',')];

    reportRows.forEach((r) => {
      const row = [
        `"${r.employeeName}"`,
        `"${r.email}"`,
        `"${r.role}"`,
        `"${r.department}"`,
        `"${r.policyName}"`,
        `"${r.documentRef}"`,
        `"${r.version}"`,
        `"${r.status}"`,
        `"${r.acknowledgedDate ? new Date(r.acknowledgedDate).toLocaleString() : 'N/A'}"`,
        `"${r.comments || ''}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `policy_acknowledgement_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV Report Downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRows = reportRows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employeeName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.policyName.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/policies/manage')}
              className="h-7 w-7 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Policy Acknowledgement Report
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 pl-9">
            Audit compliance records, track employee sign-offs, and send automated reminders to pending staff.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="font-bold text-xs gap-1.5 h-9">
            <Download className="w-3.5 h-3.5 text-primary" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="font-bold text-xs gap-1.5 h-9">
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Report
          </Button>
        </div>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" /> Total Employees
            </div>
            <div className="text-xl font-black text-foreground">{summary.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Acknowledged
            </div>
            <div className="text-xl font-black text-emerald-600">{summary.acknowledged}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Sign-Off
            </div>
            <div className="text-xl font-black text-amber-600">{summary.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-slate-500" /> Not Applicable
            </div>
            <div className="text-xl font-black text-slate-600">{summary.notApplicable}</div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Status Filter */}
            {[
              { id: 'all', label: 'All Status' },
              { id: 'acknowledged', label: '✓ Signed / Acknowledged Only' },
              { id: 'pending', label: '⏳ Pending Only' },
            ].map((st) => (
              <Button
                key={st.id}
                type="button"
                variant={statusFilter === st.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st.id)}
                className={`h-8 rounded-lg text-xs font-bold ${
                  statusFilter === st.id && st.id === 'acknowledged'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }`}
              >
                {st.label}
              </Button>
            ))}

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
            >
              <option value="all">All Roles</option>
              {dynamicRoles.map((r) => (
                <option key={r.code || r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            placeholder="Search employee name, email, or policy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs max-w-xs bg-background"
          />
        </div>
      </div>

      {/* Report Table View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl space-y-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-muted-foreground">Generating acknowledgement report...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border rounded-xl space-y-3 text-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No Records Found</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              There are no policy acknowledgement entries matching your filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-2xs overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-medium">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                <th className="p-3.5">Employee Name</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Policy Name</th>
                <th className="p-3.5">Effective Date</th>
                <th className="p-3.5">Sign-Off Status</th>
                <th className="p-3.5">Signature Provider</th>
                <th className="p-3.5">Signed Timestamp</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRows.map((r, idx) => {
                const isAck = r.status.toLowerCase() === 'acknowledged';
                const isSigned = r.signatureStatus === 'SIGNED';

                return (
                  <tr key={`${r.employeeId}_${r.policyId}_${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{r.employeeName}</div>
                      <div className="text-[10px] text-muted-foreground">{r.email}</div>
                    </td>

                    <td className="p-3.5 font-bold text-foreground whitespace-nowrap">
                      {r.department}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{r.policyName}</div>
                      <div className="text-[10px] font-mono text-primary">{r.documentRef} ({r.version})</div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : 'Immediate'}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {isSigned ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold gap-1 px-2 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Digitally Signed
                        </Badge>
                      ) : isAck ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold gap-1 px-2 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Signed & Acknowledged
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold gap-1 px-2 py-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Sign-Off
                        </Badge>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {r.signatureProvider ? (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800">
                          {r.signatureProvider}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                      {r.signedAt ? new Date(r.signedAt).toLocaleString() : r.acknowledgedDate ? new Date(r.acknowledgedDate).toLocaleString() : '—'}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.signatureId && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(policiesApi.getSignedDocumentUrl(r.signatureId!), '_blank')}
                              className="h-7 text-[10px] font-bold gap-1"
                              title="Download Signed PDF"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" /> PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(policiesApi.getSignedEvidenceUrl(r.signatureId!), '_blank')}
                              className="h-7 text-[10px] font-bold gap-1"
                              title="Download Evidence Certificate"
                            >
                              <Download className="w-3 h-3" /> Evidence
                            </Button>
                          </>
                        )}
                        {!isAck && !isSigned && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(r)}
                            className="h-7 text-[11px] font-bold gap-1"
                          >
                            <Bell className="w-3 h-3 text-amber-500" /> Remind
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      )}
    </div>
  );
};

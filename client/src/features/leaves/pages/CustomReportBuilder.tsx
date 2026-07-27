import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';
import { FileText, Download, Play, RefreshCw, BarChart4, Filter, Columns, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveType {
  id: number;
  leave_name: string;
  leave_code: string;
}

export function CustomReportBuilder() {
  const [entity, setEntity] = useState<'applications' | 'balances' | 'ledger'>('applications');
  const [fields, setFields] = useState<string[]>(['employeeName', 'leaveCode', 'startDate', 'endDate', 'totalDays', 'status']);
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterLeaveTypeId, setFilterLeaveTypeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  const [groupBy, setGroupBy] = useState('');
  const [aggregate, setAggregate] = useState('');

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch leave types for filter dropdown
    apiClient.get('/leaves/types')
      .then(res => {
        if (res.data?.data) {
          setLeaveTypes(res.data.data);
        }
      })
      .catch(err => console.error('Failed to load leave types', err));
  }, []);

  // Update default fields when entity changes
  useEffect(() => {
    if (entity === 'balances') {
      setFields(['employeeName', 'leaveCode', 'allocatedBalance', 'consumedBalance', 'pendingBalance', 'availableBalance']);
    } else if (entity === 'ledger') {
      setFields(['employeeName', 'leaveCode', 'transactionType', 'amount', 'effectiveDate', 'remarks']);
    } else {
      setFields(['employeeName', 'leaveCode', 'startDate', 'endDate', 'totalDays', 'status', 'reason']);
    }
    setGroupBy('');
    setAggregate('');
    setReportData([]);
  }, [entity]);

  const handleFieldToggle = (field: string) => {
    setFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleRunReport = async () => {
    setLoading(true);
    try {
      const filtersObj: any = {};
      if (filterEmployeeId) filtersObj.employeeId = parseInt(filterEmployeeId, 10);
      if (filterLeaveTypeId) filtersObj.leaveTypeId = parseInt(filterLeaveTypeId, 10);
      if (filterStatus) filtersObj.status = filterStatus;
      if (filterStartDate) filtersObj.startDate = filterStartDate;
      if (filterEndDate) filtersObj.endDate = filterEndDate;

      const params: any = {
        entity,
        fields: fields.join(','),
        filters: JSON.stringify(filtersObj)
      };

      if (groupBy && aggregate) {
        params.groupBy = groupBy;
        params.aggregate = aggregate;
      }

      const res = await apiClient.get('/leaves/reports/custom', { params });
      if (res.data?.success) {
        setReportData(res.data.data);
        toast.success(`Report executed. Found ${res.data.data.length} records.`);
      }
    } catch (err: any) {
      toast.error('Failed to execute custom report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data to export. Please run the report first.');
      return;
    }

    // Generate CSV content
    const headers = Object.keys(reportData[0]);
    const rows = reportData.map(row => 
      headers.map(header => {
        const val = row[header];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Download trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hrms_custom_leave_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported successfully!');
  };

  const fieldOptions: Record<string, { label: string; fieldName: string }[]> = {
    applications: [
      { label: 'Employee Name', fieldName: 'employeeName' },
      { label: 'Employee Code', fieldName: 'employeeCode' },
      { label: 'Employee Email', fieldName: 'employeeEmail' },
      { label: 'Leave Name', fieldName: 'leaveName' },
      { label: 'Leave Code', fieldName: 'leaveCode' },
      { label: 'Start Date', fieldName: 'startDate' },
      { label: 'End Date', fieldName: 'endDate' },
      { label: 'Total Days', fieldName: 'totalDays' },
      { label: 'Status', fieldName: 'status' },
      { label: 'Reason', fieldName: 'reason' },
      { label: 'Submitted At', fieldName: 'submittedAt' },
    ],
    balances: [
      { label: 'Employee Name', fieldName: 'employeeName' },
      { label: 'Employee Code', fieldName: 'employeeCode' },
      { label: 'Leave Name', fieldName: 'leaveName' },
      { label: 'Leave Code', fieldName: 'leaveCode' },
      { label: 'Allocated Quota', fieldName: 'allocatedBalance' },
      { label: 'Consumed Days', fieldName: 'consumedBalance' },
      { label: 'Pending Approval', fieldName: 'pendingBalance' },
      { label: 'Available Balance', fieldName: 'availableBalance' },
    ],
    ledger: [
      { label: 'Employee Name', fieldName: 'employeeName' },
      { label: 'Employee Code', fieldName: 'employeeCode' },
      { label: 'Leave Name', fieldName: 'leaveName' },
      { label: 'Leave Code', fieldName: 'leaveCode' },
      { label: 'Transaction Type', fieldName: 'transactionType' },
      { label: 'Credit/Debit Amount', fieldName: 'amount' },
      { label: 'Effective Date', fieldName: 'effectiveDate' },
      { label: 'Remarks/Note', fieldName: 'remarks' },
    ]
  };

  const getGroupByField = (f: string) => {
    if (f === 'status') return 'la.status';
    if (f === 'leaveCode') {
      if (entity === 'balances') return 'lt.leave_code';
      if (entity === 'ledger') return 'lt.leave_code';
      return 'lt.leave_code';
    }
    if (f === 'employeeCode') return 'e.employee_code';
    if (f === 'transactionType') return 'lle.transaction_type';
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-violet-600" /> Self-Service Custom Report Builder
          </h2>
          <p className="text-xs text-muted-foreground">Select entities, filter constraints, and customize layouts to generate custom exports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Entity & Fields */}
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Columns className="w-4 h-4 text-violet-500" /> 1. Query Dataset & Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Select Dataset</label>
                <select
                  value={entity}
                  onChange={(e) => setEntity(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
                >
                  <option value="applications">Leave Applications</option>
                  <option value="balances">Leave Quotas & Balances</option>
                  <option value="ledger">Leave Ledger Transactions</option>
                </select>
              </div>

              {/* Checkbox fields list */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Select Columns to Display</label>
                <div className="grid grid-cols-2 gap-2 border bg-muted/20 p-3 rounded-2xl max-h-[220px] overflow-y-auto">
                  {fieldOptions[entity].map((opt) => (
                    <label key={opt.fieldName} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fields.includes(opt.fieldName)}
                        onChange={() => handleFieldToggle(opt.fieldName)}
                        className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters Panel */}
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Filter className="w-4 h-4 text-violet-500" /> 2. Define Query Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Employee ID Filter (Optional)</label>
                <Input
                  placeholder="Enter numerical Employee ID"
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Leave Category</label>
                <select
                  value={filterLeaveTypeId}
                  onChange={(e) => setFilterLeaveTypeId(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
                >
                  <option value="">All Categories</option>
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.leave_name} ({t.leave_code})</option>
                  ))}
                </select>
              </div>

              {entity === 'applications' && (
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Application Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
                  >
                    <option value="">All Statuses</option>
                    <option value="submitted">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              {entity === 'applications' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">From Date</label>
                    <Input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">To Date</label>
                    <Input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aggregations */}
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <BarChart4 className="w-4 h-4 text-violet-500" /> 3. Grouping & Aggregation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Group By (Option)</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
                >
                  <option value="">No Grouping (Detail View)</option>
                  <option value={getGroupByField('leaveCode')}>Leave Code</option>
                  {entity === 'applications' && <option value={getGroupByField('status')}>Status</option>}
                  <option value={getGroupByField('employeeCode')}>Employee Code</option>
                  {entity === 'ledger' && <option value={getGroupByField('transactionType')}>Transaction Type</option>}
                </select>
              </div>

              {groupBy && (
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Aggregate Formula</label>
                  <select
                    value={aggregate}
                    onChange={(e) => setAggregate(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
                  >
                    <option value="">Select Formula...</option>
                    <option value="count">Count of Records</option>
                    <option value="sum_days">Sum of Days/Amount</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleRunReport}
                  disabled={loading || !!(groupBy && !aggregate)}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-11 rounded-xl shadow-md gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Execute Query
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  disabled={reportData.length === 0}
                  className="h-11 px-4 rounded-xl border border-violet-500/20 text-violet-600 hover:bg-violet-50"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right View Grid */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-3xl border shadow-sm min-h-[400px] flex flex-col bg-card/70 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between flex-shrink-0">
              <div>
                <CardTitle className="text-sm font-extrabold text-foreground">Query Execution Grid</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Results of the custom compiled leave report.</CardDescription>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 font-bold font-mono">
                {reportData.length} records
              </span>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0 min-h-0">
              {loading ? (
                <div className="h-full w-full flex flex-col items-center justify-center space-y-2 py-32">
                  <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                  <span className="text-xs font-bold text-muted-foreground">Running safe query parameters against database...</span>
                </div>
              ) : reportData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center space-y-3 py-32 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">No Query Output</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Select your parameters on the left and click "Execute Query".</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-muted/40 border-b text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                      <tr>
                        {Object.keys(reportData[0]).map((header) => (
                          <th key={header} className="p-3 border-r">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y text-foreground font-semibold">
                      {reportData.map((row, index) => (
                        <tr key={index} className="hover:bg-muted/10 transition-colors">
                          {Object.keys(row).map((header, colIndex) => {
                            const val = row[header];
                            return (
                              <td key={colIndex} className="p-3 border-r border-border font-medium text-foreground truncate max-w-[200px]" title={String(val)}>
                                {val === null || val === undefined ? '-' : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

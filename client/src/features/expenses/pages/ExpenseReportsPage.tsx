import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseClaim, ExpenseCategory } from '../api/expenseApi';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Building,
  User,
  Tag,
  RefreshCw
} from 'lucide-react';

export const ExpenseReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Filter controls
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [repRes, catRes] = await Promise.all([
        expenseApi.getReports({
          startDate,
          endDate,
          categoryId: selectedCategory,
          status: selectedStatus
        }),
        expenseApi.getCategories()
      ]);
      setReports(repRes || []);
      setCategories(catRes || []);
    } catch (err) {
      console.error('Failed to load expense reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, selectedCategory, selectedStatus]);

  const filteredReports = reports.filter((rawR: any) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const cNum = (rawR.claimNumber || rawR.claim_number || '').toLowerCase();
      const title = (rawR.title || '').toLowerCase();
      const fName = (rawR.firstName || rawR.first_name || '').toLowerCase();
      const lName = (rawR.lastName || rawR.last_name || '').toLowerCase();
      const dept = (rawR.departmentName || rawR.department_name || '').toLowerCase();
      const cat = (rawR.categoryName || rawR.category_name || '').toLowerCase();
      return (
        cNum.includes(q) ||
        title.includes(q) ||
        fName.includes(q) ||
        lName.includes(q) ||
        dept.includes(q) ||
        cat.includes(q)
      );
    }
    return true;
  });

  const totalClaimedSum = filteredReports.reduce((acc, r: any) => acc + Number(r.totalClaimedAmount ?? r.total_claimed_amount ?? 0), 0);
  const totalApprovedSum = filteredReports.reduce((acc, r: any) => acc + Number(r.totalApprovedAmount ?? r.total_approved_amount ?? 0), 0);
  const totalPaidSum = filteredReports.reduce((acc, r: any) => acc + Number(r.paidAmount ?? r.paid_amount ?? 0), 0);

  const exportToCSV = () => {
    if (filteredReports.length === 0) {
      alert('No report data to export.');
      return;
    }
    const headers = [
      'Claim #',
      'Employee Code',
      'Employee Name',
      'Department',
      'Title',
      'Category',
      'Claim Date',
      'Claimed Amount (INR)',
      'Approved Amount (INR)',
      'Paid Amount (INR)',
      'Status',
      'Payment Reference'
    ];

    const escapeCsvField = (field: any) => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredReports.map((rawR: any) => {
      const r = rawR;
      const cNum = r.claimNumber || r.claim_number || `EXP-${r.id}`;
      const empCode = r.employeeCode || r.employee_code || '';
      const fName = r.firstName || r.first_name || '';
      const lName = r.lastName || r.last_name || '';
      const empName = `${fName} ${lName}`.trim() || 'Employee';
      const dept = r.departmentName || r.department_name || '';
      const title = r.title || '';
      const cat = r.categoryName || r.category_name || 'General';
      const rawDate = r.claimDate || r.claim_date;
      const cDate = rawDate ? new Date(rawDate).toLocaleDateString() : '';
      const claimed = Number(r.totalClaimedAmount ?? r.total_claimed_amount ?? 0);
      const approved = Number(r.totalApprovedAmount ?? r.total_approved_amount ?? 0);
      const paid = Number(r.paidAmount ?? r.paid_amount ?? 0);
      const status = r.status || '';
      const payRef = r.paymentReference || r.payment_reference || '';

      return [
        escapeCsvField(cNum),
        escapeCsvField(empCode),
        escapeCsvField(empName),
        escapeCsvField(dept),
        escapeCsvField(title),
        escapeCsvField(cat),
        escapeCsvField(cDate),
        escapeCsvField(claimed),
        escapeCsvField(approved),
        escapeCsvField(paid),
        escapeCsvField(status),
        escapeCsvField(payRef)
      ];
    });

    const csvLines = [headers.map((h) => `"${h}"`).join(','), ...rows.map((row) => row.join(','))];
    const csvString = '\uFEFF' + csvLines.join('\r\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expense_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            Expense Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate detailed expense analytical reports with multi-criteria filters and CSV export
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-blue-500" />
          Report Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="pending_finance">Pending Finance</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Search Employee / Title</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Total Claimed Sum</span>
          <div className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
            ₹{totalClaimedSum.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Total Approved Sum</span>
          <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
            ₹{totalApprovedSum.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl">
          <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Total Paid Out</span>
          <div className="text-xl font-bold text-purple-900 dark:text-purple-100 mt-1">
            ₹{totalPaidSum.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Generating report...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No records match the report criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Claim #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Claimed</th>
                  <th className="py-3.5 px-4">Approved</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReports.map((rawR: any) => {
                  const r = rawR;
                  const cNum = r.claimNumber || r.claim_number || `EXP-${r.id}`;
                  const fName = r.firstName || r.first_name || '';
                  const lName = r.lastName || r.last_name || '';
                  const dept = r.departmentName || r.department_name || '';
                  const title = r.title || '';
                  const cat = r.categoryName || r.category_name || 'General';
                  const cDate = r.claimDate || r.claim_date;
                  const claimed = Number(r.totalClaimedAmount ?? r.total_claimed_amount ?? 0);
                  const approved = Number(r.totalApprovedAmount ?? r.total_approved_amount ?? 0);
                  const status = r.status || '';
                  const formattedDate = cDate ? new Date(cDate).toLocaleDateString() : 'N/A';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {cNum}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                        {dept && <span className="block text-[11px] text-slate-400">{dept}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-semibold">{title}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{cat}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{formattedDate}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{claimed.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{approved.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-slate-700 dark:text-slate-300">
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

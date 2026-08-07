import React, { useState, useEffect } from 'react';
import { usePayslip } from '../hooks/index';
import { PayslipSummary, EarningsDeductionsBreakdown } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, Calendar, FileText, Download, Printer, RefreshCcw, Sparkles, Bell, CheckCircle, XCircle, Plus, Trash2, Edit3, Eye, LayoutGrid, List, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getPayslipRequests, updatePayslipRequestStatus, PayslipRequest } from '../utils/payslipRequestQueue';
import { PayslipRequestForm } from '../components/PayslipRequestForm';
import { PayslipRequesterPanel, PayslipAdminApprovalPanel } from '../components/PayslipRequestSystem';
import apiClient from '@/lib/api';

const numberToWords = (amount: number): string => {
  const num = Math.round(Math.max(0, amount));
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
  if (num === 0) return 'Zero Only';
  const strNum = ('000000000' + num).slice(-9);
  const n: any = strNum.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return `${num} Only`;
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
  return `${str.trim()} Only`;
};

export const PayslipViewer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.some((r: string) =>
    ['super_admin', 'organization_admin', 'admin'].includes(r.toLowerCase())
  ) ?? false;

  const { payslips, isLoading, getPayslipDetails } = usePayslip();
  const [details, setDetails] = useState<any>(null);

  // Filter states: dept, status, search, month
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [empStatus, setEmpStatus] = useState<string>('all');
  const [empNameSearch, setEmpNameSearch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [viewMode, setViewMode] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');
  const [activeRoleScope, setActiveRoleScope] = useState<'admin' | 'hr' | 'manager' | 'team_lead' | 'employee'>('admin');
  const [generatedNotification, setGeneratedNotification] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [generatedPayslip, setGeneratedPayslip] = useState<any>(null);
  const [displayLayout, setDisplayLayout] = useState<'table' | 'grid'>('table');
  // ── Scope localStorage key to this user so payslips never leak across users ──
  const currentUserId = user?.id || (user as any)?.employeeId || 'unknown';
  const orgId = user?.organizationId || user?.id || 'default';
  const localStorageKey = `generated_payslips_org_${orgId}`;
  const visibilityKey = `payslip_visibility_org_${orgId}`;

  const [generatedList, setGeneratedList] = useState<any[]>(() => {
    try {
      const all = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
      let merged = Array.isArray(all) ? [...all] : [];

      // Check legacy user-scoped key if available and merge
      const legacyKey = `generated_payslips_${currentUserId}`;
      const legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
      if (Array.isArray(legacy) && legacy.length > 0) {
        for (const item of legacy) {
          const itemEmpId = String(item.employee_id || item.employeeId || '');
          const itemMonth = String(item.month || item.payslip_month || '');
          if (!merged.some(m => String(m.employee_id || m.employeeId) === itemEmpId && String(m.month || m.payslip_month) === itemMonth)) {
            merged.push(item);
          }
        }
        localStorage.setItem(localStorageKey, JSON.stringify(merged));
      }
      return merged;
    } catch {
      return [];
    }
  });

  const [hiddenPayslipIds, setHiddenPayslipIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(visibilityKey);
      if (saved) return JSON.parse(saved);
    } catch { }
    return {};
  });

  const togglePayslipVisibility = (id: string) => {
    setHiddenPayslipIds(prev => {
      const isCurrentlyHidden = !!prev[id];
      const updated = { ...prev, [id]: !isCurrentlyHidden };
      try {
        localStorage.setItem(visibilityKey, JSON.stringify(updated));
      } catch { }
      setGeneratedNotification(!isCurrentlyHidden ? '🙈 Payslip hidden from employee portal.' : '👁️ Payslip set to SHOWN (visible to employee).');
      setTimeout(() => setGeneratedNotification(null), 3000);
      return updated;
    });
  };
  const handleDeleteCard = (card: any) => {
    const cardId = String(card.id);
    const cardEmpId = String(card.employee_id || card.employeeId || '');
    const cardMonth = String(card.month || card.payslip_month || '');

    setGeneratedList(prev => {
      const updated = prev.filter(item => {
        const itemEmpId = String(item.employee_id || item.employeeId || '');
        const itemMonth = String(item.month || item.payslip_month || '');
        const itemId = String(item.id);
        if (itemId === cardId) return false;
        if (cardEmpId && cardMonth && itemEmpId === cardEmpId && itemMonth === cardMonth) return false;
        return true;
      });
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
      } catch { }
      return updated;
    });

    setGeneratedNotification(`🗑️ Payslip card removed for ${card.empName || card.employee_name || 'employee'}.`);
    setTimeout(() => setGeneratedNotification(null), 3000);
  };

  // Custom Edit & Manual Generate Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    empId: string;
    empName: string;
    empCode: string;
    designation: string;
    pfNo: string;
    uanNo: string;
    esicNo: string;
    pan: string;
    period: string;
    doj: string;
    accNo: string;
    bankName: string;
    paidDays: number;
    unpaidDays: number;
    paidLeave: number;
    basic: number;
    hra: number;
    special: number;
    childrenEducation: number;
    communication: number;
    lta: number;
    meal: number;
    standardAllowance: number;
    adjustment: number;
    incentives: number;
    bonus: number;
    pf: number;
    esi: number;
    pt: number;
    tds: number;
    absentDays: number;
    month: string;
  }>({
    empId: '',
    empName: 'Akanksha Sagar Nikam',
    empCode: 'T02',
    designation: 'BACK OFFICE EXECUTIVE',
    pfNo: '',
    uanNo: '',
    esicNo: '',
    pan: '',
    period: 'April 2025',
    doj: '05 May 2021',
    accNo: '',
    bankName: 'HDFC BANK',
    paidDays: 4,
    unpaidDays: 26,
    paidLeave: 0,
    basic: 2267,
    hra: 600,
    special: 0,
    childrenEducation: 27,
    communication: 133,
    lta: 133,
    meal: 27,
    standardAllowance: 533,
    adjustment: 0,
    incentives: 0,
    bonus: 0,
    pf: 272,
    esi: 0,
    pt: 0,
    tds: 0,
    absentDays: 0,
    month: '2026-07-01'
  });

  const handleOpenManualGenerate = () => {
    const targetEmpId = selectedEmpId || (employeeOptions[0] ? String(employeeOptions[0].id) : '1');
    const empObj = employeeOptions.find(e => String(e.id) === targetEmpId) || employeeOptions[0] || {};

    const basicVal = Number(empObj.basic_earned ?? empObj.basic ?? 0);
    const hraVal = Number(empObj.hra_earned ?? empObj.hra ?? (basicVal > 0 ? Math.round(basicVal * 0.40) : 0));
    const stdVal = Number(empObj.standard_allowance_earned ?? empObj.standard_allowance ?? 0);
    const mealVal = Number(empObj.meal_allowance_earned ?? empObj.meal_allowance ?? 0);
    const commVal = Number(empObj.communication_allowance_earned ?? empObj.communication_allowance ?? 0);
    const eduVal = Number(empObj.children_education_allowance_earned ?? empObj.children_education_allowance ?? 0);
    const ltaVal = Number(empObj.lta_earned ?? empObj.lta ?? 0);

    const pfVal = Number(empObj.pf ?? 0);
    const esiVal = Number(empObj.esi ?? empObj.esic ?? 0);
    const ptVal = Number(empObj.pt ?? (empObj.gross > 0 ? 200 : 0));

    setEditFormData({
      empId: targetEmpId,
      empName: empObj.name || 'Employee',
      empCode: empObj.code || `EMP-${targetEmpId}`,
      designation: empObj.designation || empObj.job_title || 'Employee',
      pfNo: empObj.pf_no || '',
      uanNo: empObj.uan_no || '',
      esicNo: empObj.esic_no || '',
      pan: empObj.pan || '',
      period: MONTHS_LABEL[selectedMonth] || selectedMonth,
      doj: empObj.date_of_joining ? String(empObj.date_of_joining).slice(0, 10) : '01 Jan 2024',
      accNo: empObj.account_no || '',
      bankName: empObj.bank_name || 'HDFC BANK',
      paidDays: Number(empObj.paid_days ?? 30),
      unpaidDays: Number(empObj.unpaid_days ?? 0),
      paidLeave: 0,
      basic: basicVal,
      hra: hraVal,
      special: 0,
      childrenEducation: eduVal,
      communication: commVal,
      lta: ltaVal,
      meal: mealVal,
      standardAllowance: stdVal,
      adjustment: 0,
      incentives: 0,
      bonus: 0,
      pf: pfVal,
      esi: esiVal,
      pt: ptVal,
      tds: 0,
      absentDays: Number(empObj.unpaid_days ?? 0),
      month: `${selectedMonth}-01`
    });
    setShowEditModal(true);
  };

  const handleOpenCardEdit = (card: any) => {
    const empId = String(card.employee_id || card.employeeId || card.id || '');
    const matchedProfile = employeeOptions.find((e: any) => String(e.id) === empId);

    const displayName = card.empName || card.employee_name || (matchedProfile ? `${matchedProfile.firstName || matchedProfile.first_name || ''} ${matchedProfile.lastName || matchedProfile.last_name || ''}`.trim() : '') || `Employee #${empId}`;
    const displayCode = card.empCode || card.employee_code || matchedProfile?.employee_code || matchedProfile?.code || `EMP-${empId}`;
    const displayDesig = card.designation || matchedProfile?.designation || matchedProfile?.job_title || 'Employee';

    setEditFormData({
      empId,
      empName: displayName,
      empCode: displayCode,
      designation: displayDesig,
      pfNo: card.pfNo || matchedProfile?.pf_no || '',
      uanNo: card.uanNo || matchedProfile?.uan_no || '',
      esicNo: card.esicNo || matchedProfile?.esic_no || '',
      pan: card.pan || matchedProfile?.pan || '',
      period: card.period || (MONTHS_LABEL[selectedMonth] || selectedMonth),
      doj: card.doj || (matchedProfile?.date_of_joining ? String(matchedProfile.date_of_joining).slice(0, 10) : ''),
      accNo: card.accNo || matchedProfile?.account_no || '',
      bankName: card.bankName || matchedProfile?.bank_name || '',
      paidDays: card.paidDays !== undefined ? card.paidDays : 30,
      unpaidDays: card.unpaidDays !== undefined ? card.unpaidDays : 0,
      paidLeave: card.paidLeave !== undefined ? card.paidLeave : 0,
      basic: Number(card.basic || 0),
      hra: Number(card.hra || 0),
      special: Number(card.special || 0),
      childrenEducation: Number(card.childrenEducation || 0),
      communication: Number(card.communication || 0),
      lta: Number(card.lta || 0),
      meal: Number(card.meal || 0),
      standardAllowance: Number(card.standardAllowance || 0),
      adjustment: Number(card.adjustment || 0),
      incentives: Number(card.incentives || 0),
      bonus: Number(card.bonus || 0),
      pf: Number(card.pf || 0),
      esi: Number(card.esi || 0),
      pt: Number(card.pt || 0),
      tds: Number(card.tds || 0),
      absentDays: Number(card.absentDays || 0),
      month: card.month || card.payslip_month || `${selectedMonth}-01`
    });
    setShowEditModal(true);
  };

  const handleDownloadPDF = (data: any) => {
    const name = data.employee_name || data.empName || editFormData.empName || 'Employee';
    const code = data.employee_code || data.empCode || editFormData.empCode || '';
    const designation = data.designation || editFormData.designation || 'Staff Member';
    const pfNo = data.pf_no || editFormData.pfNo || '';
    const uanNo = data.uan_no || editFormData.uanNo || '';
    const esicNo = data.esic_no || editFormData.esicNo || '';
    const pan = data.pan || editFormData.pan || '';
    const period = data.period || (MONTHS_LABEL[selectedMonth] || selectedMonth);
    const doj = data.date_of_joining || editFormData.doj || '';
    const accNo = data.account_no || editFormData.accNo || '';
    const bankName = data.bank_name || editFormData.bankName || '';
    const paidDays = data.paid_days !== undefined ? data.paid_days : (editFormData.paidDays ?? 30);
    const unpaidDays = data.unpaid_days !== undefined ? data.unpaid_days : (editFormData.unpaidDays ?? 0);
    const paidLeave = data.paid_leave !== undefined ? data.paid_leave : (editFormData.paidLeave ?? 0);

    const basic = Number(data.basic_earned ?? data.basic_salary ?? data.basic ?? editFormData.basic ?? 0);
    const hra = Number(data.hra_earned ?? data.hra ?? editFormData.hra ?? 0);
    const edu = Number(data.children_education_allowance_earned ?? editFormData.childrenEducation ?? 0);
    const comm = Number(data.communication_allowance_earned ?? editFormData.communication ?? 0);
    const lta = Number(data.lta_earned ?? editFormData.lta ?? 0);
    const meal = Number(data.meal_allowance_earned ?? editFormData.meal ?? 0);
    const std = Number(data.standard_allowance_earned ?? editFormData.standardAllowance ?? 0);
    const adj = Number(data.adjustment ?? editFormData.adjustment ?? 0);
    const inc = Number(data.incentives ?? editFormData.incentives ?? 0);
    const bon = Number(data.bonus ?? editFormData.bonus ?? 0);
    const spe = Number(data.special ?? editFormData.special ?? 0);

    const pf = Number(data.pf ?? editFormData.pf ?? 0);
    const esi = Number(data.esi ?? editFormData.esi ?? 0);
    const pt = Number(data.pt ?? editFormData.pt ?? 0);
    const tds = Number(data.tds ?? editFormData.tds ?? 0);

    const totEarn = basic + hra + edu + comm + lta + meal + std + bon + spe;
    const totGross = Number(data.gross_earned ?? data.gross_salary ?? (totEarn + adj + inc));
    const totDed = Number(data.total_deductions ?? (pf + esi + pt + tds));
    const net = Number(data.net_salary ?? Math.max(0, totGross - totDed));
    const words = numberToWords(net);

    const printWin = window.open('', '_blank', 'width=900,height=900');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${name} (${code})</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #0f172a; font-size: 13px; margin: 0; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 15px; }
          .company-name { font-size: 20px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; }
          .sub-title { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 4px; }
          .meta-table, .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .meta-table td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 12px; }
          .meta-label { font-weight: 700; color: #334155; width: 18%; background: #f8fafc; }
          .data-table th { background: #0284c7; color: #ffffff; padding: 8px; font-size: 12px; text-align: left; text-transform: uppercase; }
          .data-table td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 12px; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .totals-row td { background: #f1f5f9; font-weight: bold; }
          .net-pay-box { background: #0369a1; color: #ffffff; padding: 12px; border-radius: 6px; font-size: 16px; font-weight: 800; text-align: right; margin-top: 15px; }
          .rupees-words { margin-top: 10px; font-weight: bold; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          .footer-note { font-size: 11px; color: #64748b; font-style: italic; margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 10px; line-height: 1.5; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Human Resource Management System</div>
          <div class="sub-title">slip and Generate Particular Employee Paysli</div>
        </div>

        <table class="meta-table">
          <tr>
            <td class="meta-label">Name :</td>
            <td class="font-bold">${name}</td>
            <td class="meta-label">Emp Code :</td>
            <td class="font-bold">${code}</td>
            <td class="meta-label">Designation :</td>
            <td class="font-bold">${designation}</td>
          </tr>
          <tr>
            <td class="meta-label">PF No. :</td>
            <td>${pfNo}</td>
            <td class="meta-label">UAN No. :</td>
            <td>${uanNo}</td>
            <td class="meta-label">ESIC No. :</td>
            <td>${esicNo}</td>
          </tr>
          <tr>
            <td class="meta-label">PAN :</td>
            <td>${pan}</td>
            <td class="meta-label">Period :</td>
            <td>${period}</td>
            <td class="meta-label">Date of Joining :</td>
            <td>${doj}</td>
          </tr>
          <tr>
            <td class="meta-label">Account No. :</td>
            <td>${accNo}</td>
            <td class="meta-label">Employee Bank :</td>
            <td colspan="3">${bankName}</td>
          </tr>
          <tr>
            <td class="meta-label">Paid Days :</td>
            <td class="font-bold">${paidDays}</td>
            <td class="meta-label">Unpaid Days :</td>
            <td class="font-bold">${unpaidDays}</td>
            <td class="meta-label">Paid Leave :</td>
            <td class="font-bold">${paidLeave}</td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th>Earnings</th>
              <th class="text-right">Amount</th>
              <th>Deductions</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary</td>
              <td class="text-right">${basic.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td>Provident Fund (PF)</td>
              <td class="text-right">${pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>House Rent Allowance (HRA)</td>
              <td class="text-right">${hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td>Professional Tax (PT)</td>
              <td class="text-right">${pt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${spe > 0 ? `
            <tr>
              <td>Special Allowance</td>
              <td class="text-right">${spe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td>${esi > 0 ? 'ESI Contribution' : ''}</td>
              <td class="text-right">${esi > 0 ? esi.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
            </tr>
            ` : ''}
            <tr class="totals-row">
              <td class="font-bold">Total Earnings :</td>
              <td class="text-right font-bold">${totEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="font-bold">Total Deductions :</td>
              <td class="text-right font-bold">${totDed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Gross Earned</td>
              <td class="text-right">${totGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td>Adjustment</td>
              <td class="text-right">${adj.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td>Incentives</td>
              <td class="text-right">${inc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="2"></td>
            </tr>
            <tr class="totals-row">
              <td class="font-bold">Total Gross :</td>
              <td class="text-right font-bold">${totGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <div class="net-pay-box">
          Net Pay : ₹ ${net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <div class="rupees-words">
          RUPEES : ${words}
        </div>

        <div class="footer-note">
          * Document validity subject to Company's Stamp and Signature<br/>
          Trial Company, Mindspace, Suite No.3, Bldg. 03, 8th Floor, Airoli, Navi Mumbai, Thane, Maharashtra, 400708
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleSaveCustomPayslip = () => {
    const gross = editFormData.basic + editFormData.hra + editFormData.special + editFormData.bonus;
    const deductions = editFormData.pf + editFormData.esi + editFormData.pt + editFormData.tds;
    const net = gross - deductions;
    const psMonth = editFormData.month.length === 7 ? `${editFormData.month}-01` : editFormData.month;
    const psNum = `PS-${psMonth.slice(0, 7).replace('-', '')}-${editFormData.empId}`;

    const customCard = {
      id: Number(editFormData.empId) * 1000 + Date.now(),
      employee_id: editFormData.empId,
      payslip_number: psNum,
      month: psMonth,
      empName: editFormData.empName,
      empCode: editFormData.empCode,
      basic: editFormData.basic,
      gross: gross,
      deductions: deductions,
      net: net,
      bonus: editFormData.bonus,
      pf: editFormData.pf,
      esi: editFormData.esi,
      pt: editFormData.pt,
      tds: editFormData.tds,
      isCustomEdited: true
    };

    setGeneratedList(prev => {
      const filtered = prev.filter(
        item => !(String(item.employee_id || item.employeeId) === String(editFormData.empId) && String(item.month || item.payslip_month).slice(0, 7) === psMonth.slice(0, 7))
      );
      const updated = [customCard, ...filtered];
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
      } catch { }
      return updated;
    });

    apiClient.post('/payroll/payslips', {
      employeeId: editFormData.empId,
      payslipNumber: psNum,
      month: psMonth,
      basicSalary: editFormData.basic,
      grossSalary: gross,
      totalDeductions: deductions,
      netSalary: net
    }).catch(() => { });

    setShowEditModal(false);
    setGeneratedNotification(`✅ Custom edited payslip saved & published for ${editFormData.empName} (${editFormData.empCode})! Net Salary: ₹${net.toLocaleString('en-IN')}`);
    setTimeout(() => setGeneratedNotification(null), 5000);
  };



  const MONTHS_LABEL: Record<string, string> = {
    '2026-08': 'August 2026', '2026-07': 'July 2026', '2026-06': 'June 2026', '2026-05': 'May 2026',
    '2026-04': 'April 2026', '2026-03': 'March 2026', '2026-02': 'February 2026', '2026-01': 'January 2026',
  };



  // Live Organization Employees List for Dropdown Select
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);

  // ── One-time cleanup: remove old unsecured global key on mount ──────────
  useEffect(() => {
    if (localStorage.getItem('generated_payslips') !== null) {
      localStorage.removeItem('generated_payslips');
    }
  }, []);

  const orgKey = `salary_structures_${user?.organizationId || user?.id || user?.email || 'unknown'}`;

  useEffect(() => {
    // 1. Fetch live organization employees, salary structures, and mappings
    Promise.all([
      apiClient.get('/employees').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures/mappings').catch(() => ({ data: [] }))
    ]).then(([empRes, structRes, mappingRes]: any[]) => {
      const list = empRes.data?.data || empRes.data || [];
      const structures = structRes.data?.data || structRes.data || [];
      const mappings = mappingRes.data?.data || mappingRes.data || [];

      // Read locally saved structures and assigned mappings for this org
      let localStructures: any[] = [];
      let localAssigned: any[] = [];
      try {
        const saved = localStorage.getItem(orgKey);
        if (saved) localStructures = JSON.parse(saved);
        const savedAssigned = localStorage.getItem(`${orgKey}_assigned_employees`);
        if (savedAssigned) localAssigned = JSON.parse(savedAssigned);
      } catch { }

      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => {
          const codeStr = String(e.employee_code || e.code || '');
          const nameStr = String(e.name || e.full_name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase();

          // Lookup assigned salary structure for this employee
          const foundStruct =
            structures.find((s: any) => String(s.employee_id || s.empId || s.employeeId) === String(e.id) || (s.employee_code && s.employee_code === codeStr)) ||
            localStructures.find((s: any) => String(s.empId || s.employee_id) === String(e.id) || (s.empCode && s.empCode === codeStr)) ||
            mappings.find((m: any) => String(m.empId || m.employee_id || m.emp_id || m.id) === String(e.id) || (m.employee_code && m.employee_code === codeStr)) ||
            localAssigned.find((a: any) => String(a.id || a.empId || a.employee_id) === String(e.id) || (a.code && a.code === codeStr));

          let gross: number | null = null;
          let basic: number | null = null;
          let net: number | null = null;
          let pf: number = 0;
          let esi: number = 0;
          let tds: number = 0;

          const hasSalaryStructure = !!foundStruct || !!e.gross_salary || !!e.gross || !!e.annual_ctc || !!e.basic_salary || !!e.salary_structure_id || !!e.salaryStructureId;

          if (foundStruct) {
            let rawGross = foundStruct.grossMonthly ?? foundStruct.gross_monthly ?? foundStruct.grossSalary ?? foundStruct.gross;
            if (typeof rawGross === 'string') rawGross = parseFloat(rawGross.replace(/[^0-9.]/g, ''));
            if (rawGross && !isNaN(rawGross)) gross = Number(rawGross);

            let rawBasic = foundStruct.basicMonthly ?? foundStruct.basic_monthly ?? foundStruct.baseSalary ?? foundStruct.basic;
            if (typeof rawBasic === 'string') rawBasic = parseFloat(rawBasic.replace(/[^0-9.]/g, ''));
            if (rawBasic && !isNaN(rawBasic)) basic = Number(rawBasic);

            let rawNet = foundStruct.netTakeHome ?? foundStruct.net_take_home ?? foundStruct.netSalary ?? foundStruct.net;
            if (typeof rawNet === 'string') rawNet = parseFloat(rawNet.replace(/[^0-9.]/g, ''));
            if (rawNet && !isNaN(rawNet)) net = Number(rawNet);

            let rawPf = foundStruct.pfDeduction ?? foundStruct.pf_deduction;
            if (typeof rawPf === 'string') rawPf = parseFloat(rawPf.replace(/[^0-9.]/g, ''));
            if (rawPf && !isNaN(rawPf)) pf = Number(rawPf);

            let rawEsi = foundStruct.esiDeduction ?? foundStruct.esi_deduction;
            if (typeof rawEsi === 'string') rawEsi = parseFloat(rawEsi.replace(/[^0-9.]/g, ''));
            if (rawEsi && !isNaN(rawEsi)) esi = Number(rawEsi);

            let rawTds = foundStruct.tdsDeduction ?? foundStruct.tds_deduction;
            if (typeof rawTds === 'string') rawTds = parseFloat(rawTds.replace(/[^0-9.]/g, ''));
            if (rawTds && !isNaN(rawTds)) tds = Number(rawTds);

            if (!gross && foundStruct.annualCtc) gross = Math.round(Number(foundStruct.annualCtc) / 12);
            if (!basic && gross) basic = Math.round(gross * 0.50);
          }

          if (gross === null || isNaN(gross)) {
            gross = Number(
              e.gross_salary ??
              e.gross ??
              e.grossMonthly ??
              (e.annual_ctc ? Math.round(e.annual_ctc / 12) : null) ??
              0
            );
          }

          if (basic === null || isNaN(basic)) {
            basic = Number(
              e.basic_salary ??
              e.basic ??
              e.basicMonthly ??
              (gross ? Math.round(gross * 0.50) : 0)
            );
          }

          if (net === null || isNaN(net)) {
            net = Number(e.net_salary ?? e.net_take_home ?? e.netTakeHome ?? (gross ? Math.round(gross * 0.90) : 0));
          }

          if ((!gross || gross === 0) && (e.ctc || e.annual_ctc)) {
            gross = Math.round(Number(e.ctc || e.annual_ctc) / 12);
            basic = Math.round(gross * 0.50);
            net = Math.round(gross * 0.90);
          }

          const isAssigned = hasSalaryStructure || (gross !== null && gross > 0);

          return {
            id: e.id,
            name: e.name || e.full_name || e.fullName || `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email || `Employee #${e.id}`,
            code: e.employee_code || e.code || `EMP-${e.id}`,
            department: e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General',
            basic: basic || 0,
            gross: gross || 0,
            net: net || (gross ? Math.max(0, gross - (pf + esi + tds)) : 0),
            pf,
            esi,
            tds,
            hasSalaryStructure: isAssigned,
            status: e.status || 'active'
          };
        });

        setEmployeeOptions(formatted);
      } else {
        setEmployeeOptions([]);
      }
    }).catch(() => {
      setEmployeeOptions([]);
    });

    // 2. Fetch live departments from server API
    apiClient.get('/settings/departments').then((res: any) => {
      const depts = res.data?.data || res.data || [];
      if (Array.isArray(depts) && depts.length > 0) {
        const names = depts.map((d: any) => d.name || d.department_name).filter(Boolean);
        setDbDepartments(names);
      }
    }).catch(() => { });
  }, [user, orgKey]);

  // Compute final unique real departments dynamically
  const uniqueDepartments = Array.from(
    new Set([
      ...dbDepartments,
      ...employeeOptions.map(e => e.department).filter(Boolean)
    ])
  ).sort();

  const handleViewPayslip = async (payslipId: number) => {
    const payslipDetails = await getPayslipDetails(payslipId);
    setDetails(payslipDetails);
  };

  const handleGenerateMyPayslip = () => {
    const activeUserId = String(user?.id || (user as any)?.employeeId || '');
    handleGenerateForEmployee(activeUserId);
  };

  const handleGenerateForEmployee = async (overrideEmpId?: string) => {
    const empIdToUse = overrideEmpId || selectedEmpId;
    if (!empIdToUse) {
      alert('Please select a particular employee from the dropdown list first.');
      return;
    }
    // Find selected employee dynamically from employee roster
    const emp = employeeOptions.find(e => String(e.id) === String(empIdToUse));
    if (!emp) {
      alert('Selected employee not found.');
      return;
    }

    if (!emp.hasSalaryStructure || !emp.gross || emp.gross === 0) {
      alert(`⚠️ Salary Structure is NOT assigned to ${emp.name}. Please assign a Salary Structure in 'Salary Structure Management' first before generating payslip.`);
      return;
    }

    const psMonth = `${selectedMonth}-01`;
    const monthLabel = new Date(psMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // ── 1. Fetch attendance for this employee from existing read-only API ──────
    const workingDaysInMonth = 26; // Standard working days (exclude Sundays)
    let daysPresent = workingDaysInMonth;
    let daysAbsent = 0;
    let halfDays = 0;
    let lateArrivals = 0;

    try {
      const attRes = await apiClient.get('/attendance/history', {
        params: { employeeId: emp.id, month: selectedMonth, pageSize: 100 }
      });
      const records: any[] = attRes.data?.data || attRes.data || [];
      if (records.length > 0) {
        // Count distinct working days with attendance records
        const presentDays = records.filter((r: any) =>
          r.status === 'present' || r.status === 'PRESENT' || r.check_in_time
        ).length;
        const halfDayRecs = records.filter((r: any) =>
          r.status === 'half_day' || r.status === 'HALF_DAY'
        ).length;
        const lateRecs = records.filter((r: any) =>
          r.is_late === true || r.status === 'late' || r.status === 'LATE'
        ).length;
        if (presentDays > 0) {
          daysPresent = presentDays + (halfDayRecs * 0.5);
          daysAbsent = Math.max(0, workingDaysInMonth - daysPresent - (halfDayRecs * 0.5));
          halfDays = halfDayRecs;
          lateArrivals = lateRecs;
        }
      }
    } catch {
      // If attendance fetch fails, assume full attendance (no LOP)
      daysPresent = workingDaysInMonth;
      daysAbsent = 0;
    }

    // ── 2. Attendance & Salary Calculation Engine ────────────────────────────────
    const monthlyGross = Number(emp.gross ?? (emp.basic ? Math.round(emp.basic * 2) : 10000));
    const fullBasic = Number(emp.basic ?? Math.round(monthlyGross * 0.50));
    const perDayGross = Math.round(monthlyGross / workingDaysInMonth);
    const perDayBasic = Math.round(fullBasic / workingDaysInMonth);

    // Loss of Pay (LOP) = per-day rate × days absent
    const lop = Math.round(perDayGross * daysAbsent);

    // Earned Basic & Earned Gross based on days present
    const effectiveBasic = Math.round((fullBasic / workingDaysInMonth) * daysPresent);
    const hra = Math.round(effectiveBasic * 0.40);
    const gross = Math.max(0, Math.round((monthlyGross / workingDaysInMonth) * daysPresent));
    const special = Math.max(0, gross - effectiveBasic - hra);

    // ── 3. Statutory Deductions ───────────────────────────────────────────────
    const pf = Math.round(Math.min(effectiveBasic, 15000) * 0.12); // PF capped at ₹15,000 basic
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;   // ESI only if gross ≤ ₹21,000
    const professionalTax = gross > 15000 ? 200 : (gross > 0 ? 150 : 0);              // State-wise PT slab
    const tds = gross > 50000 ? Math.round(gross * 0.05) : 0;      // TDS estimated 5% if above 50K

    const totalDed = pf + esi + professionalTax + tds;
    const netActual = gross - totalDed;

    const psNum = `PS-${selectedMonth.replace('-', '')}-${emp.id}`;

    setGeneratedPayslip({
      emp,
      attendance: { workingDaysInMonth, daysPresent, daysAbsent, halfDays, lateArrivals, perDaySalary: perDayGross, lop },
      payslip: {
        payslip_number: psNum,
        payslip_month: psMonth,
        gross_salary: gross,
        total_deductions: totalDed,
        net_salary: netActual,
        basic_salary: effectiveBasic
      },
      earnings: [
        ...(effectiveBasic > 0 ? [{ name: 'Basic Pay', amount: effectiveBasic }] : []),
        ...(hra > 0 ? [{ name: 'House Rent Allowance (HRA)', amount: hra }] : []),
        ...(special > 0 ? [{ name: 'Special Allowance', amount: special }] : []),
        ...(lop > 0 ? [{ name: `LOP Deduction (${daysAbsent} days absent)`, amount: -lop }] : []),
      ],
      deductions: [
        ...(pf > 0 ? [{ name: `Provident Fund (PF)`, amount: pf }] : []),
        ...(esi > 0 ? [{ name: `ESI Contribution`, amount: esi }] : []),
        ...(professionalTax > 0 ? [{ name: 'Professional Tax (PT)', amount: professionalTax }] : []),
        ...(tds > 0 ? [{ name: 'Income Tax / TDS', amount: tds }] : []),
      ]
    });

    const newSummaryCard = {
      id: Number(emp.id) * 1000 + Date.now(),
      employee_id: emp.id,
      payslip_number: psNum,
      month: psMonth,
      empName: emp.name,
      empCode: emp.code,
      basic: effectiveBasic,
      gross: gross,
      deductions: totalDed,
      net: netActual
    };

    setGeneratedList(prev => {
      const filtered = prev.filter(
        item => !(String(item.employee_id || item.employeeId) === String(emp.id) && String(item.month || item.payslip_month) === String(psMonth))
      );
      const updated = [newSummaryCard, ...filtered];
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
      } catch { }
      return updated;
    });

    apiClient.post('/payroll/payslips', {
      employeeId: emp.id,
      payslipNumber: psNum,
      month: psMonth,
      basicSalary: effectiveBasic,
      grossSalary: gross,
      totalDeductions: totalDed,
      netSalary: netActual
    }).catch(() => { });

    setDetails(null);
    const numberToWords = (amount: number): string => {
    const num = Math.round(Math.max(0, amount));
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    if (num === 0) return 'Zero Only';
    const strNum = ('000000000' + num).slice(-9);
    const n: any = strNum.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return `${num} Only`;
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
    return `${str.trim()} Only`;
  };

  const handleDownloadPDF = (payslip: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const empName = payslip.employee_name || payslip.empName || payslip.name || 'Akanksha Sagar Nikam';
    const empCode = payslip.employee_code || payslip.empCode || payslip.code || 'T02';
    const designation = payslip.designation || payslip.job_title || 'BACK OFFICE EXECUTIVE';
    const period = payslip.period || (payslip.month ? new Date(payslip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'April 2025');
    const doj = payslip.doj || payslip.date_of_joining || '05 May 2021';
    const pfNo = payslip.pf_no || payslip.pfNo || '';
    const uanNo = payslip.uan_no || payslip.uanNo || '';
    const esicNo = payslip.esic_no || payslip.esicNo || '';
    const pan = payslip.pan || payslip.pan_number || '';
    const bankName = payslip.bank_name || payslip.bankName || 'HDFC BANK';
    const accNo = payslip.account_no || payslip.accountNo || '';
    const paidDays = payslip.paid_days !== undefined ? payslip.paid_days : 30;
    const unpaidDays = payslip.unpaid_days !== undefined ? payslip.unpaid_days : 0;
    const paidLeave = payslip.paid_leave !== undefined ? payslip.paid_leave : 0;

    const basicEarned = Number(payslip.basic_earned || payslip.basicSalary || payslip.basic_salary || 0);
    const hraEarned = Number(payslip.hra_earned || payslip.hra || 0);
    const specialEarned = Number(payslip.special_earned || payslip.special_allowance || payslip.special || 0);

    const grossEarned = Number(payslip.gross_earned || payslip.gross_salary || payslip.grossSalary || (basicEarned + hraEarned + specialEarned));

    const pf = Number(payslip.pf || payslip.pf_deduction || 272);
    const esic = Number(payslip.esic || payslip.esi_deduction || 0);
    const pt = Number(payslip.pt || payslip.pt_deduction || 0);

    const totalDeductions = Number(payslip.total_deductions || payslip.totalDeductions || (pf + esic + pt));
    const netPay = Number(payslip.net_salary || payslip.netSalary || (grossEarned - totalDeductions));
    const rupeesInWords = numberToWords(netPay);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${payslip.payslip_number || empCode}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; }
            .header-strip { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; }
            .company-name { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; }
            .doc-title { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 4px; }
            
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            .meta-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
            .lbl { font-weight: 700; color: #334155; width: 15%; background-color: #f8fafc; }
            .val { width: 18%; color: #0f172a; font-weight: 600; }
            
            .breakdown-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            .breakdown-table th { background-color: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; }
            .breakdown-table td { padding: 7px 10px; border: 1px solid #cbd5e1; }
            .num { text-align: right; font-weight: 600; }

            .summary-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .net-row { font-size: 16px; font-weight: 800; color: #1d4ed8; border-top: 2px solid #93c5fd; padding-top: 8px; margin-top: 4px; }
            .words-row { margin-top: 8px; font-weight: 700; color: #0f172a; font-style: italic; font-size: 13px; }

            .footer-note { margin-top: 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
            .address-note { font-weight: 600; color: #475569; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header-strip">
            <div class="company-name">ApponextHRMS Official Payslip</div>
            <div class="doc-title">PAYSLIP FOR THE MONTH OF ${period.toUpperCase()}</div>
          </div>

          <table class="meta-table">
            <tr>
              <td class="lbl">Name :</td>
              <td class="val" colspan="3">${empName}</td>
              <td class="lbl">Emp Code :</td>
              <td class="val">${empCode}</td>
              <td class="lbl">Designation :</td>
              <td class="val">${designation}</td>
            </tr>
            <tr>
              <td class="lbl">PF No. :</td>
              <td class="val">${pfNo}</td>
              <td class="lbl">UAN No. :</td>
              <td class="val">${uanNo}</td>
              <td class="lbl">ESIC No. :</td>
              <td class="val" colspan="3">${esicNo}</td>
            </tr>
            <tr>
              <td class="lbl">PAN :</td>
              <td class="val">${pan}</td>
              <td class="lbl">Period :</td>
              <td class="val">${period}</td>
              <td class="lbl">Date of Joining :</td>
              <td class="val" colspan="3">${doj}</td>
            </tr>
            <tr>
              <td class="lbl">Account No. :</td>
              <td class="val">${accNo}</td>
              <td class="lbl">Employee Bank :</td>
              <td class="val" colspan="5">${bankName}</td>
            </tr>
            <tr>
              <td class="lbl">Paid Days :</td>
              <td class="val">${paidDays}</td>
              <td class="lbl">Unpaid Days :</td>
              <td class="val">${unpaidDays}</td>
              <td class="lbl">Paid Leave :</td>
              <td class="val" colspan="3">${paidLeave}</td>
            </tr>
          </table>

          <table class="breakdown-table">
            <thead>
              <tr>
                <th style="width: 50%;">Earnings</th>
                <th class="num" style="width: 16%;">Amount (₹)</th>
                <th style="width: 18%;">Deductions</th>
                <th class="num" style="width: 16%;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td class="num">${basicEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>Provident Fund (PF)</td>
                <td class="num">${pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>House Rent Allowance (HRA)</td>
                <td class="num">${hraEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>Professional Tax (PT)</td>
                <td class="num">${pt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${specialEarned > 0 ? `
              <tr>
                <td>Special Allowance</td>
                <td class="num">${specialEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>${esic > 0 ? 'ESI Contribution' : ''}</td>
                <td class="num">${esic > 0 ? esic.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-row">
              <span>Total Earnings :</span>
              <span class="num">${grossEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>Gross Earned :</span>
              <span class="num">${grossEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>Adjustment :</span>
              <span class="num">0.00</span>
            </div>
            <div class="summary-row">
              <span>Incentives :</span>
              <span class="num">0.00</span>
            </div>
            <div class="summary-row" style="font-weight: 700;">
              <span>Total Gross :</span>
              <span class="num">${grossEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row" style="font-weight: 700;">
              <span>Total Deductions :</span>
              <span class="num">${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row net-row">
              <span>Net Pay :</span>
              <span class="num">₹${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="words-row">
              RUPEES : ${rupeesInWords}
            </div>
          </div>

          <div class="footer-note">
            <div>* Document validity subject to Company's Stamp and Signature</div>
            <div class="address-note">Trial Company, Mindspace, Suite No.3, Bldg. 03, 8th Floor, Airoli, Navi Mumbai, Thane, Maharashtra, 400708</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  setGeneratedNotification(`✅ Payslip generated for ${emp.name} (${emp.code}) — ${monthLabel} | Days Present: ${daysPresent}/${workingDaysInMonth}${lop > 0 ? ` | LOP: ₹${lop.toLocaleString('en-IN')}` : ''}`);
    setTimeout(() => setGeneratedNotification(null), 7000);
  };

  const loggedInEmpId = user?.employeeId || (user as any)?.employee_id || user?.id;

  // Filter payslips based on emp status, name, month, and role permissions
  const filteredPayslips = payslips.filter((p: any) => {
    // If regular employee or in "My Payslips" mode, restrict strictly to logged-in employee's ID
    if (!isAdmin || viewMode === 'my') {
      const pEmpId = p.employee_id || p.employeeId;
      if (pEmpId && loggedInEmpId && String(pEmpId) !== String(loggedInEmpId)) {
        return false;
      }
    }

    const matchesMonth = selectedMonth ? (p.payslip_month || '').startsWith(selectedMonth) : true;
    const matchesName = empNameSearch && isAdmin
      ? String(p.employee_id || '').includes(empNameSearch) || String(p.payslip_number || '').toLowerCase().includes(empNameSearch.toLowerCase())
      : true;
    return matchesMonth && matchesName;
  });

  const selectClassName = "flex h-8 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer shadow-2xs";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">
              {isAdmin ? 'Payslip Management' : 'My Payslips & Monthly Statements'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Generate individual employee payslips using department and month filters or manage approval requests.' : 'View and download your official monthly salary payslips.'}
            </p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {generatedNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between">
          <span className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            {generatedNotification}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setGeneratedNotification(null)}>Dismiss</Button>
        </div>
      )}

      {/* ── Tab Bar (non-admin only) ──────────────────────────────────── */}
      {/* ── Sub-Tabs Navigation Bar ──────────────────────────────────── */}

      <Card className="border border-border/80 shadow-xs bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                {isAdmin ? 'Generate Particular Employee Payslip (Filter by Dept, Employee Name & Month)' : 'Select Statement Month'}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isAdmin ? 'Filter employees by department and status, pick a month, and generate official employee payslips instantly.' : 'Select month to view and download your payslips.'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary bg-primary/10">
              {filteredPayslips.length} Payslips Available
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-3`}>

            {isAdmin && (
              <>
                {/* 1. Department Filter */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    Filter Department
                  </Label>
                  <select
                    value={selectedDept}
                    onChange={(e) => { setSelectedDept(e.target.value); setSelectedEmpId(''); }}
                    className={selectClassName}
                  >
                    <option value="all">All Departments</option>
                    {uniqueDepartments.map((dept, idx) => (
                      <option key={idx} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Employee Status */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    Emp Status
                  </Label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="probation">Probation</option>
                    <option value="notice">Notice Period</option>
                    <option value="onleave">On Leave</option>
                  </select>
                </div>

                {/* 3. Particular Employee Dropdown */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-primary flex items-center gap-1">
                    <Search className="w-3.5 h-3.5 text-primary" />
                    Select Particular Employee *
                  </Label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => { setSelectedEmpId(e.target.value); setEmpNameSearch(e.target.value); }}
                    className={`${selectClassName} border-primary/50 font-bold bg-background text-foreground`}
                  >
                    <option value="">— Select Particular Employee —</option>
                    {employeeOptions
                      .filter(emp => {
                        const matchesDept = selectedDept === 'all' || (emp.department && emp.department.toLowerCase().includes(selectedDept.toLowerCase()));
                        const matchesStatus = empStatus === 'all' || (emp.status && emp.status.toLowerCase() === empStatus.toLowerCase());
                        return matchesDept && matchesStatus;
                      })
                      .map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.code}) — {emp.department} {!emp.hasSalaryStructure ? ' ⚠️ [No Salary Structure]' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}

            {/* 4. Select Month */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Salary Month *
              </Label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={selectClassName}
              >
                <option value="2026-07">July 2026 (Current Month)</option>
                <option value="2026-06">June 2026</option>
                <option value="2026-05">May 2026</option>
                <option value="2026-04">April 2026</option>
                <option value="2026-03">March 2026</option>
                <option value="2026-02">February 2026</option>
                <option value="2026-01">January 2026</option>
              </select>
            </div>
          </div>

          {/* 5. Generation Option Buttons (Automatic & Manual Edit) */}
          {isAdmin && (
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-end gap-2">
              <Button
                onClick={() => handleGenerateForEmployee()}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs flex items-center justify-center gap-1.5 px-3"
                title="Automatically calculate and generate payslip based on attendance and salary structure"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Automatic Generate
              </Button>

              <Button
                onClick={() => handleOpenManualGenerate()}
                variant="outline"
                className="h-8 text-xs border border-border text-foreground hover:bg-muted font-bold shadow-xs flex items-center justify-center gap-1.5 px-3"
                title="Customize/edit figures (Basic, HRA, Allowances, PF, Tax, etc.) before generating"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" />
                Edit & Custom Generate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslips Layout & Summary Header Strip */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-card border border-border/80 p-3 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Monthly Salary Statements</span>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
            {filteredPayslips.length} Statements
          </Badge>
        </div>
      </div>

      {/* Payslips Summary Cards Grid / Table with Show/Hide Employee Visibility Toggle */}
      <div>
        {(() => {
          const userEmailClean = (user?.email || '').toLowerCase();
          const activeUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Employee';
          const activeUserNameClean = activeUserName.toLowerCase();
          const activeUserCodeClean = ((user as any)?.employeeCode || '').toLowerCase();

          const matchedEmpInRoster = employeeOptions.find((e: any) => {
            const eEmail = String(e.email || '').toLowerCase();
            const eName = String(e.name || '').toLowerCase();
            const eCode = String(e.code || '').toLowerCase();

            if (String(e.id) === String((user as any)?.employeeId) || String(e.id) === String(user?.id)) return true;
            if (userEmailClean && eEmail === userEmailClean) return true;
            if (activeUserCodeClean && eCode === activeUserCodeClean) return true;
            if (activeUserNameClean && eName === activeUserNameClean) return true;
            return false;
          });

          const activeUserId = matchedEmpInRoster?.id || (user as any)?.employeeId || user?.id || 1;
          const activeUserCode = matchedEmpInRoster?.code || (user as any)?.employeeCode || `EMP-${activeUserId}`;

          const activeUserGross = Number(
            matchedEmpInRoster?.gross ??
            (user as any)?.gross_salary ??
            (user as any)?.grossSalary ??
            (user as any)?.gross ??
            10000
          );
          const activeUserBasic = Number(
            matchedEmpInRoster?.basic ??
            (user as any)?.basic_salary ??
            (user as any)?.basicSalary ??
            (user as any)?.basic ??
            Math.round(activeUserGross * 0.50)
          );
          const activeUserDeductions = Math.round(Math.min(activeUserBasic, 15000) * 0.12) + (activeUserGross > 15000 ? 200 : 150) + 500 + Math.round(activeUserGross * 0.05);
          const activeUserNet = activeUserGross - activeUserDeductions;

          const isDemoAdmin = user?.email === 'kot@gmail.com';

          const baseList = filteredPayslips.filter((p: any) => {
            if (isAdmin) return true;
            const pEmpId = String(p.employee_id || p.employeeId || '');
            const pEmail = String(p.email || '').toLowerCase();
            return pEmpId === String(activeUserId) || pEmpId === String(user?.id) || (userEmailClean && pEmail === userEmailClean);
          });

          // ── Filter generatedList to only show payslips belonging to this user or organization
          const scopedGeneratedList = isAdmin
            ? generatedList
            : generatedList.filter((item: any) => {
              const itemEmpId = String(item.employee_id || item.employeeId || '');
              const itemCode = String(item.empCode || item.employee_code || '').toLowerCase();
              const itemName = String(item.empName || item.employee_name || '').toLowerCase();
              const itemEmail = String(item.email || '').toLowerCase();

              if (itemEmpId && (itemEmpId === String(activeUserId) || itemEmpId === String(user?.id))) return true;
              if (userEmailClean && itemEmail && itemEmail === userEmailClean) return true;
              if (activeUserCodeClean && itemCode && itemCode === activeUserCodeClean) return true;
              if (activeUserNameClean && itemName && itemName === activeUserNameClean) return true;
              return false;
            });

          const combinedList = [...scopedGeneratedList, ...baseList];

          // ── Strictly filter by selectedMonth so only payslips of that month are shown
          const monthFilteredList = combinedList.filter((item: any) => {
            const itemMonth = String(item.month || item.payslip_month || '');
            return !selectedMonth || itemMonth.startsWith(selectedMonth) || itemMonth.includes(selectedMonth);
          });

          // Deduplicate by (employee_id + month) so double cards NEVER appear
          const deduplicatedList: any[] = [];
          const seenKeys = new Set<string>();

          for (const item of monthFilteredList) {
            const itemEmpId = String(item.employee_id || item.employeeId || '');
            const itemCode = String(item.empCode || item.employee_code || '').toLowerCase();
            const normEmpKey = itemEmpId || itemCode || String(item.id || '');
            const normalizedMonth = String(item.month || item.payslip_month || selectedMonth).slice(0, 7);
            const key = `${normEmpKey}_${normalizedMonth}`;

            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              deduplicatedList.push(item);
            }
          }

          const selectedEmpObj = employeeOptions.find(e => String(e.id) === String(selectedEmpId));
          const targetName = (selectedEmpObj?.name || '').toLowerCase();
          const targetCode = (selectedEmpObj?.code || '').toLowerCase();

          const displayList = (selectedEmpId && isAdmin)
            ? deduplicatedList.filter((item: any) => {
              const itemEmpId = String(item.employee_id || item.employeeId || '');
              return itemEmpId === String(selectedEmpId);
            })
            : deduplicatedList;

          const finalCards = displayList.filter((item: any) => {
            const itemEmpId = String(item.employee_id || item.employeeId || '');
            const matchedEmp = employeeOptions.find((e: any) => String(e.id) === itemEmpId);

            // Hide payslip cards for employees without an assigned salary structure
            if (matchedEmp && matchedEmp.hasSalaryStructure === false) {
              return false;
            }

            if (isAdmin) return true;
            const itemMonth = String(item.month || item.payslip_month || selectedMonth);
            const itemKey = String(item.id);
            const comboKey = `${itemEmpId}_${itemMonth}`;

            // Hidden if admin specifically hid it via toggle
            const isHidden = hiddenPayslipIds[itemKey] === true || hiddenPayslipIds[comboKey] === true;
            return !isHidden;
          });

          if (finalCards.length === 0) {
            const monthLabel = MONTHS_LABEL[selectedMonth] || selectedMonth;
            return (
              <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border space-y-2">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                <div className="font-bold text-foreground text-sm">
                  No Payslips Generated for {monthLabel}
                </div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isAdmin
                    ? `No payslips have been generated for ${monthLabel} yet. Select an employee above and click 'Automatic Generate' to create one.`
                    : `Your payslip for ${monthLabel} has not been published by HR/Admin yet. Please check back after monthly payroll processing.`}
                </p>
              </div>
            );
          }

          if (displayLayout === 'table') {
            return (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                        <tr>
                          <th className="px-4 py-3">Employee Details</th>
                          <th className="px-4 py-3">Payslip Ref & Month</th>
                          <th className="px-4 py-3 text-right">Gross Salary</th>
                          <th className="px-4 py-3 text-right">Deductions</th>
                          <th className="px-4 py-3 text-right">Net Take-Home</th>
                          {isAdmin && <th className="px-4 py-3">Visibility</th>}
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {finalCards.map((sample: any) => {
                          const empNameStr = sample.empName || sample.employee_name || '';
                          const empCodeStr = sample.empCode || sample.employee_code || '';
                          const empIdStr = String(sample.employee_id || sample.employeeId || sample.id || '');
                          const itemMonth = String(sample.month || sample.payslip_month || selectedMonth);
                          const itemKey = String(sample.id);
                          const comboKey = `${empIdStr}_${itemMonth}`;

                          const isHidden = hiddenPayslipIds[itemKey] === true || hiddenPayslipIds[comboKey] === true;

                          const handleToggleVisibility = () => {
                            togglePayslipVisibility(itemKey);
                            togglePayslipVisibility(comboKey);
                          };

                          const matchedProfile = employeeOptions.find((e: any) => String(e.id) === empIdStr);

                          const cardGross = Number(matchedProfile?.gross ?? sample.gross ?? sample.gross_salary ?? 10000);
                          const cardBasic = Number(matchedProfile?.basic ?? sample.basic ?? sample.basic_salary ?? Math.round(cardGross * 0.50));
                          const cardDeductions = Math.round(Math.min(cardBasic, 15000) * 0.12) + (cardGross > 15000 ? 200 : 150) + 500 + Math.round(cardGross * 0.05);
                          const cardNet = cardGross - cardDeductions;
                          const displayName = matchedProfile?.name || empNameStr || 'Employee';
                          const displayCode = matchedProfile?.code || empCodeStr || `EMP-${sample.id}`;
                          const psRef = sample.payslip_number || sample.payslipNumber || `PS-${sample.id}`;
                          const formattedMonth = new Date(sample.month || sample.payslip_month || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                          return (
                            <tr key={sample.id} className="hover:bg-muted/20 transition-colors text-xs">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-foreground">{displayName}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{displayCode} {matchedProfile?.department ? `• ${matchedProfile.department}` : ''}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-mono text-[11px] font-bold text-primary">{psRef}</div>
                                <div className="text-[10px] text-muted-foreground font-semibold">{formattedMonth}</div>
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-foreground">
                                ₹{cardGross.toLocaleString('en-IN')}
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-rose-600">
                                −₹{cardDeductions.toLocaleString('en-IN')}
                              </td>

                              <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                                ₹{cardNet.toLocaleString('en-IN')}
                              </td>

                              {isAdmin && (
                                <td className="px-4 py-3">
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!isHidden}
                                      onChange={handleToggleVisibility}
                                      className="w-3.5 h-3.5 rounded text-primary accent-primary cursor-pointer"
                                    />
                                    <Badge className={!isHidden ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px] px-1.5" : "bg-amber-50 text-amber-700 border-amber-200 font-bold text-[9px] px-1.5"}>
                                      {!isHidden ? "Visible" : "Hidden"}
                                    </Badge>
                                  </label>
                                </td>
                              )}

                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDetails({
                                      payslip: { payslip_number: psRef, payslip_month: sample.month, gross_salary: cardGross, total_deductions: cardDeductions, net_salary: cardNet, basic_salary: cardBasic },
                                      earnings: [
                                        ...(cardBasic > 0 ? [{ name: 'Basic Salary', amount: cardBasic }] : []),
                                        ...(Math.round(cardBasic * 0.40) > 0 ? [{ name: 'House Rent Allowance (HRA)', amount: Math.round(cardBasic * 0.40) }] : []),
                                        ...(Math.max(0, cardGross - cardBasic - Math.round(cardBasic * 0.40)) > 0 ? [{ name: 'Special Allowance', amount: Math.max(0, cardGross - cardBasic - Math.round(cardBasic * 0.40)) }] : [])
                                      ],
                                      deductions: [
                                        ...(Math.round(Math.min(cardBasic, 15000) * 0.12) > 0 ? [{ name: 'Provident Fund (PF)', amount: Math.round(Math.min(cardBasic, 15000) * 0.12) }] : []),
                                        ...((cardGross > 15000 ? 200 : (cardGross > 0 ? 150 : 0)) > 0 ? [{ name: 'Professional Tax (PT)', amount: cardGross > 15000 ? 200 : (cardGross > 0 ? 150 : 0) }] : []),
                                        ...(cardGross > 50000 ? [{ name: 'TDS Tax Withholding', amount: Math.round(cardGross * 0.05) }] : [])
                                      ]
                                    })}
                                    className="h-7 px-2 text-[10px] font-bold"
                                    title="View Detailed Statement"
                                  >
                                    <Eye className="w-3 h-3 mr-1" /> View
                                  </Button>

                                  <Button
                                    size="sm"
                                    onClick={() => handleDownloadPDF({
                                      id: empIdStr,
                                      employee_id: empIdStr,
                                      employee_name: displayName,
                                      employee_code: displayCode,
                                      designation: matchedProfile?.designation || matchedProfile?.job_title,
                                      bank_name: matchedProfile?.bank_name || matchedProfile?.bankName,
                                      account_no: matchedProfile?.account_no || matchedProfile?.accountNo,
                                      uan_no: matchedProfile?.uan_no || matchedProfile?.uanNo,
                                      esic_no: matchedProfile?.esic_no || matchedProfile?.esicNo,
                                      pan: matchedProfile?.pan,
                                      pf_no: matchedProfile?.pf_no,
                                      payslip_number: psRef,
                                      payslip_month: sample.month,
                                      gross_salary: cardGross,
                                      net_salary: cardNet,
                                      basic_salary: cardBasic
                                    })}
                                    className="h-7 px-2 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                                    title="Download PDF Payslip"
                                  >
                                    <Download className="w-3 h-3 mr-1" /> PDF
                                  </Button>

                                  {isAdmin && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleOpenCardEdit(sample)}
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        title="Edit figures"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteCard(sample)}
                                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                        title="Delete statement"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {finalCards.map((sample: any) => {
                const empNameStr = sample.empName || sample.employee_name || '';
                const empCodeStr = sample.empCode || sample.employee_code || '';
                const empIdStr = String(sample.employee_id || sample.employeeId || sample.id || '');
                const itemMonth = String(sample.month || sample.payslip_month || selectedMonth);
                const itemKey = String(sample.id);
                const comboKey = `${empIdStr}_${itemMonth}`;

                const isHidden = hiddenPayslipIds[itemKey] === true || hiddenPayslipIds[comboKey] === true;

                const handleToggleVisibility = () => {
                  togglePayslipVisibility(itemKey);
                  togglePayslipVisibility(comboKey);
                };

                const matchedProfile = employeeOptions.find((e: any) =>
                  String(e.id) === empIdStr
                );

                const isEdited = sample.isCustomEdited === true;
                const cardGross = isEdited ? Number(sample.gross || sample.gross_salary || 0) : Number(matchedProfile?.gross || sample.gross_salary || sample.grossSalary || sample.gross || 0);
                const cardBasic = isEdited ? Number(sample.basic || sample.basic_salary || 0) : Number(matchedProfile?.basic || sample.basic_salary || sample.basicSalary || sample.basic || Math.round(cardGross * 0.50));
                const cardNet = isEdited ? Number(sample.net || sample.net_salary || 0) : Number(matchedProfile?.net || sample.net_salary || sample.netSalary || sample.netTakeHome || sample.net || Math.round(cardGross * 0.90));
                const cardDeductions = isEdited ? Number(sample.deductions || sample.total_deductions || 0) : Number((matchedProfile?.gross && matchedProfile?.net) ? (cardGross - matchedProfile.net) : (sample.total_deductions ?? sample.totalDeductions ?? (cardGross - cardNet)));
                const displayName = matchedProfile?.name || empNameStr || 'Employee';
                const displayCode = matchedProfile?.code || empCodeStr || `EMP-${sample.id}`;

                return (
                  <div key={sample.id} className="space-y-1.5 border rounded-xl p-2 bg-card border-border/80 shadow-2xs">
                    {isAdmin && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 rounded-lg border border-border/60">
                        <label htmlFor={`chk-${sample.id}`} className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-foreground">
                          <input
                            id={`chk-${sample.id}`}
                            type="checkbox"
                            checked={!isHidden}
                            onChange={handleToggleVisibility}
                            className="w-3.5 h-3.5 rounded text-primary accent-primary cursor-pointer"
                          />
                          <span>Show to User</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <Badge className={!isHidden ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px] px-1.5" : "bg-amber-50 text-amber-700 border-amber-200 font-bold text-[9px] px-1.5"}>
                            {!isHidden ? "Visible" : "Hidden"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenCardEdit(sample)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit payslip figures"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCard(sample)}
                            className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete card"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCard(sample)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    <PayslipSummary
                      isAdmin={isAdmin}
                      payslipNumber={sample.payslip_number || sample.payslipNumber || `PS-${sample.id}`}
                      month={new Date(sample.month || sample.payslip_month || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      empName={displayName}
                      empCode={displayCode}
                      basicSalary={cardBasic}
                      grossSalary={cardGross}
                      totalDeductions={cardDeductions}
                      netSalary={cardNet}
                      onView={() => setDetails({
                        payslip: { payslip_number: sample.payslip_number, payslip_month: sample.month, gross_salary: cardGross, total_deductions: cardDeductions, net_salary: cardNet, basic_salary: cardBasic },
                        earnings: [
                          { name: 'Basic Salary', amount: cardBasic },
                          { name: 'House Rent Allowance (HRA)', amount: Math.round(cardBasic * 0.40) },
                          { name: 'Special Allowance', amount: Math.max(0, cardGross - cardBasic - Math.round(cardBasic * 0.40) - 2850) },
                          { name: 'Conveyance & Medical Allowances', amount: Math.min(2850, Math.max(0, cardGross - cardBasic - Math.round(cardBasic * 0.40))) }
                        ],
                        deductions: [
                          { name: 'Provident Fund (PF)', amount: Math.round(Math.min(cardBasic, 15000) * 0.12) },
                          { name: 'ESI Contribution', amount: cardGross <= 21000 ? Math.round(cardGross * 0.0075) : 0 },
                          { name: 'Professional Tax (PT)', amount: cardGross > 15000 ? 200 : 150 },
                          { name: 'TDS Tax Withholding', amount: Math.max(0, cardDeductions - Math.round(Math.min(cardBasic, 15000) * 0.12) - (cardGross <= 21000 ? Math.round(cardGross * 0.0075) : 0) - (cardGross > 15000 ? 200 : 150)) }
                        ]
                      })}
                      onDownload={() => handleDownloadPDF({ payslip_number: sample.payslip_number, payslip_month: sample.month, gross_salary: cardGross, net_salary: cardNet, basic_salary: cardBasic })}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
      {generatedPayslip && (
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="bg-muted/20 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                📄 Payslip: {generatedPayslip.emp.name} ({generatedPayslip.emp.code}) — {new Date(generatedPayslip.payslip.payslip_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Ref: {generatedPayslip.payslip.payslip_number} &bull; Full earnings &amp; statutory deductions breakdown
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(generatedPayslip.payslip)} className="h-8 text-xs font-bold gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedPayslip(null)} className="h-8 text-xs text-muted-foreground">✕ Close</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* ── Attendance Summary ────────────────────────────────── */}
            {generatedPayslip.attendance && (
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  📅 Attendance Summary — Per-Day Salary: ₹{generatedPayslip.attendance.perDaySalary.toLocaleString('en-IN')}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border">
                    <div className="text-xs text-slate-500 font-medium">Working Days</div>
                    <div className="text-xl font-extrabold text-slate-800 dark:text-white">{generatedPayslip.attendance.workingDaysInMonth}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200">
                    <div className="text-xs text-emerald-600 font-medium">Days Present</div>
                    <div className="text-xl font-extrabold text-emerald-700">{generatedPayslip.attendance.daysPresent}</div>
                  </div>
                  <div className={`rounded-lg p-3 border ${generatedPayslip.attendance.daysAbsent > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200' : 'bg-white dark:bg-slate-800'}`}>
                    <div className={`text-xs font-medium ${generatedPayslip.attendance.daysAbsent > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Days Absent</div>
                    <div className={`text-xl font-extrabold ${generatedPayslip.attendance.daysAbsent > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{generatedPayslip.attendance.daysAbsent}</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200">
                    <div className="text-xs text-amber-600 font-medium">Half Days</div>
                    <div className="text-xl font-extrabold text-amber-700">{generatedPayslip.attendance.halfDays}</div>
                  </div>
                  <div className={`rounded-lg p-3 border ${generatedPayslip.attendance.lop > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className={`text-xs font-medium ${generatedPayslip.attendance.lop > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>LOP Deduction</div>
                    <div className={`text-xl font-extrabold ${generatedPayslip.attendance.lop > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {generatedPayslip.attendance.lop > 0 ? `₹${generatedPayslip.attendance.lop.toLocaleString('en-IN')}` : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Salary Summary ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Gross Earnings</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">₹{generatedPayslip.payslip.gross_salary.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl p-4 border border-rose-200">
                <div className="text-xs text-rose-600 font-semibold uppercase tracking-wide">Total Deductions</div>
                <div className="text-2xl font-extrabold text-rose-700 mt-1">₹{generatedPayslip.payslip.total_deductions.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200">
                <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Net Take-Home Pay</div>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">₹{generatedPayslip.payslip.net_salary.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <EarningsDeductionsBreakdown
              isAdmin={isAdmin}
              earnings={generatedPayslip.earnings}
              deductions={generatedPayslip.deductions}
              totalEarnings={Number(generatedPayslip.payslip.gross_salary)}
              totalDeductions={Number(generatedPayslip.payslip.total_deductions)}
              netSalary={Number(generatedPayslip.payslip.net_salary)}
            />
          </CardContent>
        </Card>
      )}

      {/* Payslip Detailed Breakup (from payslips list click) */}
      {details && !generatedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-3xl border border-border/80 bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <CardHeader className="bg-muted/20 border-b border-border/60 flex flex-row items-center justify-between py-3 px-6">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  📄 Official Statement: {details.payslip.payslip_number}
                </CardTitle>
                <CardDescription className="text-xs">
                  Full earnings &amp; statutory deductions breakdown
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(details.payslip)} className="h-8 text-xs font-bold gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDetails(null)} className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground">
                  ✕ Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 overflow-y-auto">
              <EarningsDeductionsBreakdown
                isAdmin={isAdmin}
                earnings={details.earnings}
                deductions={details.deductions}
                totalEarnings={Number(details.payslip.gross_salary)}
                totalDeductions={Number(details.payslip.total_deductions)}
                netSalary={Number(details.payslip.net_salary)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Edit & Generate Payslip Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-3xl border border-border/80 bg-card shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  Edit &amp; Customize Official Payslip — {editFormData.empName}
                </CardTitle>
                <CardDescription className="text-xs">
                  Modify any employee or financial figures below. All totals and Rupees in Words will update in real time.
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowEditModal(false)} className="h-7 w-7 p-0 rounded-full">
                <XCircle className="w-4 h-4 text-muted-foreground" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                {/* 1. Header & Employee Information */}
                <div className="border border-border/80 rounded-xl p-3 bg-muted/20 space-y-3">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/60 pb-1">
                    Employee &amp; Bank Information
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px] font-bold">Employee Name *</Label>
                      <Input
                        type="text"
                        value={editFormData.empName || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, empName: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Emp Code *</Label>
                      <Input
                        type="text"
                        value={editFormData.empCode || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, empCode: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Designation *</Label>
                      <Input
                        type="text"
                        value={editFormData.designation || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">PF No.</Label>
                      <Input
                        type="text"
                        value={editFormData.pfNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, pfNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">UAN No.</Label>
                      <Input
                        type="text"
                        value={editFormData.uanNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, uanNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">ESIC No.</Label>
                      <Input
                        type="text"
                        value={editFormData.esicNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, esicNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">PAN Number</Label>
                      <Input
                        type="text"
                        value={editFormData.pan || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, pan: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Statement Period</Label>
                      <Input
                        type="text"
                        value={editFormData.period || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, period: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Date of Joining</Label>
                      <Input
                        type="text"
                        value={editFormData.doj || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, doj: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Account No.</Label>
                      <Input
                        type="text"
                        value={editFormData.accNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, accNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Employee Bank</Label>
                      <Input
                        type="text"
                        value={editFormData.bankName || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, bankName: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/40">
                    <div>
                      <Label className="text-[11px] font-bold">Paid Days</Label>
                      <Input
                        type="number"
                        value={editFormData.paidDays ?? 4}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, paidDays: Number(e.target.value) }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Unpaid Days</Label>
                      <Input
                        type="number"
                        value={editFormData.unpaidDays ?? 26}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, unpaidDays: Number(e.target.value) }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Paid Leave</Label>
                      <Input
                        type="number"
                        value={editFormData.paidLeave ?? 0}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, paidLeave: Number(e.target.value) }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Earnings & Deductions Breakdown Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Earnings */}
                  <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/20 space-y-2">
                    <div className="font-extrabold text-emerald-700 uppercase tracking-wider text-[11px] border-b border-emerald-200 pb-1">
                      Earnings Components (₹)
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">Basic Earned</span>
                        <Input
                          type="number"
                          value={editFormData.basic}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, basic: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">HRA Earned</span>
                        <Input
                          type="number"
                          value={editFormData.hra}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, hra: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-rose-200 rounded-xl p-3 bg-rose-50/20 space-y-2">
                    <div className="font-extrabold text-rose-700 uppercase tracking-wider text-[11px] border-b border-rose-200 pb-1">
                      Deductions &amp; Tax (₹)
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">Provident Fund (PF)</span>
                        <Input
                          type="number"
                          value={editFormData.pf}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, pf: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">ESIC</span>
                        <Input
                          type="number"
                          value={editFormData.esi}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, esi: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">Professional Tax (PT)</span>
                        <Input
                          type="number"
                          value={editFormData.pt}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, pt: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Live Computed Summary Preview */}
                {(() => {
                  const basic = Number(editFormData.basic || 0);
                  const hra = Number(editFormData.hra || 0);
                  const edu = Number(editFormData.childrenEducation || 0);
                  const comm = Number(editFormData.communication || 0);
                  const lta = Number(editFormData.lta || 0);
                  const meal = Number(editFormData.meal || 0);
                  const std = Number(editFormData.standardAllowance || 0);
                  const adj = Number(editFormData.adjustment || 0);
                  const inc = Number(editFormData.incentives || 0);

                  const totEarn = basic + hra + edu + comm + lta + meal + std;
                  const totGross = totEarn + adj + inc;
                  const totDed = Number(editFormData.pf || 0) + Number(editFormData.esi || 0) + Number(editFormData.pt || 0);
                  const net = Math.max(0, totGross - totDed);
                  const words = numberToWords(net);

                  return (
                    <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2 font-mono">
                      <div className="flex justify-between items-center text-xs border-b border-slate-700 pb-2">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Real-time Calculation Summary</span>
                        <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded">
                          Net Pay: ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">TOTAL EARNINGS</span>
                          <span className="font-extrabold text-emerald-400 text-xs">₹{totEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">TOTAL GROSS</span>
                          <span className="font-extrabold text-emerald-300 text-xs">₹{totGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">TOTAL DEDUCTIONS</span>
                          <span className="font-extrabold text-rose-400 text-xs">-₹{totDed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">NET TAKE-HOME</span>
                          <span className="font-black text-blue-400 text-xs">₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 font-sans italic border-t border-slate-800 pt-1.5">
                        <span className="font-bold text-amber-400">RUPEES:</span> {words}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Action Buttons */}
                <div className="pt-2 flex justify-between items-center gap-2 border-t border-border/60">
                  <div className="text-[10px] text-muted-foreground italic">
                    * Document validity subject to Company's Stamp and Signature
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} className="h-8 text-xs">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveCustomPayslip();
                        const basic = Number(editFormData.basic || 0);
                        const hra = Number(editFormData.hra || 0);
                        const edu = Number(editFormData.childrenEducation || 0);
                        const comm = Number(editFormData.communication || 0);
                        const lta = Number(editFormData.lta || 0);
                        const meal = Number(editFormData.meal || 0);
                        const std = Number(editFormData.standardAllowance || 0);
                        const adj = Number(editFormData.adjustment || 0);
                        const inc = Number(editFormData.incentives || 0);
                        const totEarn = basic + hra + edu + comm + lta + meal + std;
                        const totGross = totEarn + adj + inc;
                        const totDed = Number(editFormData.pf || 0) + Number(editFormData.esi || 0) + Number(editFormData.pt || 0);
                        const net = Math.max(0, totGross - totDed);

                        handleDownloadPDF({
                          employee_name: editFormData.empName,
                          employee_code: editFormData.empCode,
                          designation: editFormData.designation,
                          pf_no: editFormData.pfNo,
                          uan_no: editFormData.uanNo,
                          esic_no: editFormData.esicNo,
                          pan: editFormData.pan,
                          period: editFormData.period,
                          date_of_joining: editFormData.doj,
                          account_no: editFormData.accNo,
                          bank_name: editFormData.bankName,
                          paid_days: editFormData.paidDays,
                          unpaid_days: editFormData.unpaidDays,
                          paid_leave: editFormData.paidLeave,
                          basic_earned: basic,
                          hra_earned: hra,
                          children_education_allowance_earned: edu,
                          communication_allowance_earned: comm,
                          lta_earned: lta,
                          meal_allowance_earned: meal,
                          standard_allowance_earned: std,
                          gross_earned: totGross,
                          pf: editFormData.pf,
                          esic: editFormData.esi,
                          pt: editFormData.pt,
                          total_deductions: totDed,
                          net_salary: net,
                        });
                      }}
                      className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Save &amp; Print Custom Payslip
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PayslipViewer;

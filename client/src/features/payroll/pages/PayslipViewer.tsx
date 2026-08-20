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
import { showToast } from '@/components/ui/toast';
import { formatPayrollDate } from '@/lib/utils';

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

// Formats a 'YYYY-MM' key for any year — a fixed 2026-only lookup table
// went stale the moment the app crossed into the next year/month and kept
// mislabeling the current month.
const formatMonthLabel = (ym: string): string => {
  const [y, m] = (ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const MONTHS_LABEL: Record<string, string> = new Proxy({}, {
  get: (_target, prop: string) => formatMonthLabel(prop),
}) as Record<string, string>;

// Rolling window of the current month plus the previous N months, so the
// "Salary Month" dropdown always centers on today instead of a hardcoded year.
const getRecentMonthOptions = (count = 12) => {
  const now = new Date();
  const options: { value: string; label: string; isCurrent: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: formatMonthLabel(value), isCurrent: i === 0 });
  }
  return options;
};

interface PayslipSetting {
  showCompanyLogo?: boolean;
  showBankDetails?: boolean;
  showLeaveBalance?: boolean;
  showAttendanceSummary?: boolean;
  footerNote?: string;
  hideComponentIfZero?: boolean;
  displayActualValuesGross?: boolean;
  displayCumulativeValues?: boolean;
  displayTotalAmount?: boolean;
  enableLandscapeFormat?: boolean;
  labelGrossSalary?: string;
  labelGrossEarnedSalary?: string;
  labelCumulativeSalary?: string;
  labelEarningComponent?: string;
  labelDeductionComponent?: string;
  employeeSignatureFieldName?: string;
}

interface PayslipDocData {
  name: string; code: string; designation: string;
  pfNo: string; uanNo: string; esicNo: string; pan: string;
  period: string; doj: string; accNo: string; bankName: string;
  paidDays: number | string; unpaidDays: number | string; paidLeave: number | string;
  leaveBalance?: number | string;
  basic: number; hra: number; cea: number; comm: number; lta: number; meal: number; std: number;
  adj: number; inc: number;
  pf: number; esic: number; pt: number;
  grossActual?: number;
  cumulativeGross?: number;
  companyLogoUrl?: string;
}

/**
 * Shared payslip template that dynamically applies all configured Payslip Settings
 */
function buildPayslipHtmlDoc(d: PayslipDocData, s?: PayslipSetting): string {
  const totalEarnings = d.basic + d.hra + d.cea + d.comm + d.lta + d.meal + d.std;
  const grossEarned = totalEarnings;
  const totalGross = grossEarned + d.adj + d.inc;
  const totalDeductions = d.pf + d.esic + d.pt;
  const netPay = Math.max(0, totalGross - totalDeductions);
  const words = numberToWords(netPay);
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

  // Custom labels from settings
  const labelGrossSalary = (s?.labelGrossSalary || '').trim() || 'Gross Earnings';
  const labelGrossEarned = (s?.labelGrossEarnedSalary || '').trim() || 'Gross Total Earnings';
  const labelCumulative = (s?.labelCumulativeSalary || '').trim() || 'Cumulative Salary';
  const labelEarnings = (s?.labelEarningComponent || '').trim() || 'Earnings & Allowances';
  const labelDeductions = (s?.labelDeductionComponent || '').trim() || 'Statutory & Other Deductions';
  const labelSignature = (s?.employeeSignatureFieldName || '').trim() || 'Authorized Signatory';
  const footerNote = s?.footerNote || 'This is a system-generated payslip. Computerized signature verified.';

  const hideZero = Boolean(s?.hideComponentIfZero);
  const showBank = s?.showBankDetails !== false;
  const showAttendance = s?.showAttendanceSummary !== false;
  const showLeave = Boolean(s?.showLeaveBalance);
  const showLogo = s?.showCompanyLogo !== false;
  const isLandscape = Boolean(s?.enableLandscapeFormat);
  const showActualGross = Boolean(s?.displayActualValuesGross);
  const showCumulative = Boolean(s?.displayCumulativeValues);
  const showTotalAmount = Boolean(s?.displayTotalAmount);

  // Cumulative YTD estimate
  const cumulativeVal = d.cumulativeGross || (totalGross * 5);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${d.name} (${d.code})</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
          size: ${isLandscape ? 'landscape' : 'portrait'};
          margin: 10mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #f8fafc;
          color: #0f172a;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .payslip-wrapper {
          max-width: ${isLandscape ? '1020px' : '840px'};
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        /* Top Brand Header */
        .header {
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
        }
        .brand-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .brand-title span { color: #0284c7; font-weight: 700; font-size: 11px; text-transform: uppercase; background: #e0f2fe; padding: 2px 8px; border-radius: 6px; margin-left: 6px; }
        .payslip-badge {
          text-align: right;
        }
        .payslip-badge h2 {
          font-size: 13px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .payslip-badge p {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }

        /* Employee Metadata Grid */
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(${isLandscape ? '5' : '4'}, 1fr);
          gap: 12px;
          padding: 16px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .meta-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .meta-val {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
        }

        /* Top Metric Cards */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(${showActualGross || showCumulative ? (showCumulative && showActualGross ? '5' : '4') : '3'}, 1fr);
          gap: 14px;
          padding: 18px 24px 14px;
        }
        .kpi-card {
          border-radius: 10px;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .kpi-card.gross {
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }
        .kpi-card.deductions {
          background: #fff1f2;
          border: 1px solid #fecdd3;
        }
        .kpi-card.net {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }
        .kpi-card.cumulative {
          background: #faf5ff;
          border: 1px solid #e9d5ff;
        }
        .kpi-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .kpi-card.gross .kpi-title { color: #64748b; }
        .kpi-card.deductions .kpi-title { color: #e11d48; }
        .kpi-card.net .kpi-title { color: #16a34a; }
        .kpi-card.cumulative .kpi-title { color: #7e22ce; }

        .kpi-amount {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .kpi-card.gross .kpi-amount { color: #0f172a; }
        .kpi-card.deductions .kpi-amount { color: #e11d48; }
        .kpi-card.net .kpi-amount { color: #16a34a; }
        .kpi-card.cumulative .kpi-amount { color: #7e22ce; }

        /* Side-by-Side Breakdown Panels */
        .breakdown-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 0 24px 18px;
        }
        .panel {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          overflow: hidden;
        }
        .panel-header {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
        }
        .panel-header h3 {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .panel-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .panel-badge.green {
          background: #dcfce7;
          color: #15803d;
        }
        .panel-badge.rose {
          background: #ffe4e6;
          color: #be123c;
        }

        .panel-list {
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 12px;
          border-radius: 6px;
          font-size: 11.5px;
        }
        .item-row:nth-child(odd) {
          background: #f8fafc;
        }
        .item-row .label {
          color: #334155;
          font-weight: 600;
        }
        .item-row .val-green {
          color: #059669;
          font-weight: 700;
          font-family: monospace;
          font-size: 12px;
        }
        .item-row .val-rose {
          color: #e11d48;
          font-weight: 700;
          font-family: monospace;
          font-size: 12px;
        }

        .total-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          margin-top: 4px;
          border-top: 1px solid #e2e8f0;
          font-weight: 800;
          font-size: 12px;
        }
        .total-row .label { color: #0f172a; }
        .total-row .val-green { color: #059669; font-size: 13px; font-family: monospace; }
        .total-row .val-rose { color: #e11d48; font-size: 13px; font-family: monospace; }

        /* Monthly Take-Home Pay Banner */
        .takehome-banner {
          margin: 0 24px 18px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .banner-left h4 {
          font-size: 11px;
          font-weight: 800;
          color: #1d4ed8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .banner-left p {
          font-size: 10.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .banner-words {
          font-size: 10px;
          color: #1e40af;
          font-weight: 700;
          margin-top: 3px;
          text-transform: uppercase;
        }
        .banner-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .banner-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }
        .banner-amount {
          font-size: 22px;
          font-weight: 900;
          color: #1e3a8a;
          letter-spacing: -0.5px;
        }

        /* Footer */
        .footer {
          padding: 14px 24px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }
        .sign-box {
          text-align: center;
          padding-top: 24px;
          border-top: 1px dashed #94a3b8;
          width: 170px;
          font-weight: 700;
          color: #334155;
        }

        @media print {
          body { background: #fff; padding: 0; }
          .payslip-wrapper { border: none; box-shadow: none; max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="payslip-wrapper">
        <!-- Header -->
        <div class="header">
          <div>
            ${showLogo ? `
              <div class="brand-title">
                ${d.companyLogoUrl ? `<img src="${d.companyLogoUrl}" alt="Company Logo" style="max-height: 38px; max-width: 160px; object-fit: contain;" />` : `Apponext <span>HRMS Enterprise</span>`}
              </div>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                Trial Company • Mindspace, Suite No.3, Bldg. 03, Airoli, Navi Mumbai, Maharashtra
              </div>
            ` : `
              <div class="brand-title" style="font-size: 18px;">
                Salary Statement &amp; Payslip
              </div>
            `}
          </div>
          <div class="payslip-badge">
            <h2>Salary Payslip</h2>
            <p>Pay Period: ${d.period}</p>
          </div>
        </div>

        <!-- Employee Info Grid -->
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Employee Name</span>
            <span class="meta-val">${d.name}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Employee Code</span>
            <span class="meta-val">${d.code}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Designation</span>
            <span class="meta-val">${d.designation}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Date of Joining</span>
            <span class="meta-val">${d.doj || '—'}</span>
          </div>

          ${showBank ? `
            <div class="meta-item">
              <span class="meta-label">Bank Name</span>
              <span class="meta-val">${d.bankName || 'HDFC Bank'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Bank Account No</span>
              <span class="meta-val">${d.accNo || '—'}</span>
            </div>
          ` : ''}

          <div class="meta-item">
            <span class="meta-label">PAN / UAN</span>
            <span class="meta-val">${d.pan || '—'} / ${d.uanNo || '—'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">PF / ESIC No</span>
            <span class="meta-val">${d.pfNo || '—'} / ${d.esicNo || '—'}</span>
          </div>

          ${showAttendance ? `
            <div class="meta-item">
              <span class="meta-label">Payable Days</span>
              <span class="meta-val">${d.paidDays} Days</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Unpaid / LOP Days</span>
              <span class="meta-val">${d.unpaidDays} Days</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Paid Leaves</span>
              <span class="meta-val">${d.paidLeave} Days</span>
            </div>
          ` : ''}

          ${showLeave ? `
            <div class="meta-item">
              <span class="meta-label">Leave Balance</span>
              <span class="meta-val" style="color: #0284c7;">${d.leaveBalance || '12.0'} Available</span>
            </div>
          ` : ''}

          <div class="meta-item">
            <span class="meta-label">Payment Mode</span>
            <span class="meta-val">Bank Transfer</span>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="kpi-row">
          ${showActualGross ? `
            <div class="kpi-card gross">
              <div class="kpi-title">Actual Gross (Monthly)</div>
              <div class="kpi-amount">₹${fmt(d.grossActual || totalGross)}</div>
            </div>
          ` : ''}

          <div class="kpi-card gross">
            <div class="kpi-title">${labelGrossSalary}</div>
            <div class="kpi-amount">₹${fmt(totalGross)}</div>
          </div>

          ${showCumulative ? `
            <div class="kpi-card cumulative">
              <div class="kpi-title">${labelCumulative}</div>
              <div class="kpi-amount">₹${fmt(cumulativeVal)}</div>
            </div>
          ` : ''}

          <div class="kpi-card deductions">
            <div class="kpi-title">${labelDeductions}</div>
            <div class="kpi-amount">₹${fmt(totalDeductions)}</div>
          </div>
          <div class="kpi-card net">
            <div class="kpi-title">Net Take-Home Pay</div>
            <div class="kpi-amount">₹${fmt(netPay)}</div>
          </div>
        </div>

        <!-- Side-by-Side Earnings & Deductions Panels -->
        <div class="breakdown-row">
          <!-- Earnings -->
          <div class="panel">
            <div class="panel-header">
              <h3>💵 ${labelEarnings}</h3>
              <span class="panel-badge green">₹${fmt(totalGross)}</span>
            </div>
            <div class="panel-list">
              ${(!hideZero || d.basic > 0) ? `
                <div class="item-row">
                  <span class="label">Basic Salary</span>
                  <span class="val-green">₹${fmt(d.basic)}</span>
                </div>` : ''}
              ${(!hideZero || d.hra > 0) ? `
                <div class="item-row">
                  <span class="label">House Rent Allowance (HRA)</span>
                  <span class="val-green">₹${fmt(d.hra)}</span>
                </div>` : ''}
              ${(!hideZero || d.std > 0) ? `
                <div class="item-row">
                  <span class="label">Special Allowance</span>
                  <span class="val-green">₹${fmt(d.std)}</span>
                </div>` : ''}
              ${(!hideZero || d.cea > 0) ? `
                <div class="item-row">
                  <span class="label">Children Education Allowance</span>
                  <span class="val-green">₹${fmt(d.cea)}</span>
                </div>` : ''}
              ${(!hideZero || d.comm > 0) ? `
                <div class="item-row">
                  <span class="label">Communication Allowance</span>
                  <span class="val-green">₹${fmt(d.comm)}</span>
                </div>` : ''}
              ${(!hideZero || d.lta > 0) ? `
                <div class="item-row">
                  <span class="label">Leave Travel Allowance (LTA)</span>
                  <span class="val-green">₹${fmt(d.lta)}</span>
                </div>` : ''}
              ${(!hideZero || d.meal > 0) ? `
                <div class="item-row">
                  <span class="label">Meal Allowance</span>
                  <span class="val-green">₹${fmt(d.meal)}</span>
                </div>` : ''}
              ${(!hideZero || d.adj > 0) ? `
                <div class="item-row">
                  <span class="label">Adjustments</span>
                  <span class="val-green">₹${fmt(d.adj)}</span>
                </div>` : ''}
              ${(!hideZero || d.inc > 0) ? `
                <div class="item-row">
                  <span class="label">Incentives / Bonus</span>
                  <span class="val-green">₹${fmt(d.inc)}</span>
                </div>` : ''}

              <div class="total-row">
                <span class="label">${labelGrossEarned}</span>
                <span class="val-green">₹${fmt(totalGross)}</span>
              </div>
            </div>
          </div>

          <!-- Deductions -->
          <div class="panel">
            <div class="panel-header">
              <h3>🛡️ ${labelDeductions}</h3>
              <span class="panel-badge rose">−₹${fmt(totalDeductions)}</span>
            </div>
            <div class="panel-list">
              ${(!hideZero || d.pf > 0) ? `
                <div class="item-row">
                  <span class="label">PF Employee (12%)</span>
                  <span class="val-rose">−₹${fmt(d.pf)}</span>
                </div>` : ''}
              ${(!hideZero || d.pt > 0) ? `
                <div class="item-row">
                  <span class="label">Professional Tax (PT)</span>
                  <span class="val-rose">−₹${fmt(d.pt)}</span>
                </div>` : ''}
              ${(!hideZero || d.esic > 0) ? `
                <div class="item-row">
                  <span class="label">ESIC Deduction</span>
                  <span class="val-rose">−₹${fmt(d.esic)}</span>
                </div>` : ''}

              <div class="total-row">
                <span class="label">Total Deductions</span>
                <span class="val-rose">−₹${fmt(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Take-Home Pay Banner -->
        <div class="takehome-banner">
          <div class="banner-left">
            <h4>${showTotalAmount ? 'Total Net Take-Home Pay' : 'Monthly Take–Home Pay'}</h4>
            <p>Calculated after statutory deductions &amp; active component inclusions</p>
            <div class="banner-words">RUPEES: ${words}</div>
          </div>
          <div class="banner-right">
            <span class="banner-check">✓</span>
            <span class="banner-amount">₹${fmt(netPay)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div>
            * ${footerNote}<br/>
            Contact HR: hr@apponexthrms.com • www.apponexthrms.com
          </div>
          <div class="sign-box">
            ${labelSignature}
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(() => { window.print(); }, 250);
        };
      </script>
    </body>
    </html>
  `;
}

export const PayslipViewer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.some((r: string) =>
    ['super_admin', 'organization_admin', 'admin'].includes(r.toLowerCase())
  ) ?? false;

  const { payslips, isLoading, getPayslipDetails, refetch } = usePayslip();
  const [details, setDetails] = useState<any>(null);
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);
  // Filter states: dept, status, search, month
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [empStatus, setEmpStatus] = useState<string>('all');
  const [empNameSearch, setEmpNameSearch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');
  const [activeRoleScope, setActiveRoleScope] = useState<'admin' | 'hr' | 'manager' | 'team_lead' | 'employee'>('admin');
  const [generatedNotification, setGeneratedNotification] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [generatedPayslip, setGeneratedPayslip] = useState<any>(null);
  const [displayLayout, setDisplayLayout] = useState<'table' | 'grid'>('table');
  const [payslipSetting, setPayslipSetting] = useState<PayslipSetting>({
    showCompanyLogo: true,
    showBankDetails: true,
    showLeaveBalance: false,
    showAttendanceSummary: true,
    footerNote: 'This is a system-generated payslip.',
    hideComponentIfZero: false,
    displayActualValuesGross: false,
    displayCumulativeValues: false,
    displayTotalAmount: false,
    enableLandscapeFormat: false,
    labelGrossSalary: '',
    labelGrossEarnedSalary: '',
    labelCumulativeSalary: '',
    labelEarningComponent: '',
    labelDeductionComponent: '',
    employeeSignatureFieldName: ''
  });
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
    const bon = Number(data.bonus ?? editFormData.bonus ?? 0);
    const spe = Number(data.special ?? editFormData.special ?? 0);
    const esi = Number(data.esi ?? data.esic ?? editFormData.esi ?? 0);
    const tds = Number(data.tds ?? editFormData.tds ?? 0);

    const grossVal = Number(
      data.gross_salary ?? data.grossSalary ?? data.gross ?? data.grossEarned ?? ((editFormData.basic || 0) + (editFormData.hra || 0) + (editFormData.special || 0))
    );
    let basicVal = Number(
      data.basic_earned ?? data.basic_salary ?? data.basicSalary ?? data.basic ?? editFormData.basic ?? 0
    );
    if (!basicVal && grossVal > 0) basicVal = Math.round(grossVal * 0.50);

    let hraVal = Number(data.hra_earned ?? data.hra ?? editFormData.hra ?? 0);
    if (!hraVal && basicVal > 0) hraVal = Math.round(basicVal * 0.40);

    const ceaVal = Number(data.children_education_allowance_earned ?? editFormData.childrenEducation ?? 0);
    const commVal = Number(data.communication_allowance_earned ?? editFormData.communication ?? 0);
    const ltaVal = Number(data.lta_earned ?? editFormData.lta ?? 0);
    const mealVal = Number(data.meal_allowance_earned ?? editFormData.meal ?? 0);

    let stdVal = Number(
      data.standard_allowance_earned ??
      data.special_earned ??
      data.special_allowance ??
      editFormData.standardAllowance ??
      editFormData.special ??
      0
    ) + bon + spe;
    if (!stdVal && grossVal > 0) {
      stdVal = Math.max(0, grossVal - (basicVal + hraVal + ceaVal + commVal + ltaVal + mealVal));
    }

    let pfVal = Number(data.pf ?? data.pf_deduction ?? editFormData.pf ?? 0);
    if (!pfVal && basicVal > 0) pfVal = Math.min(1800, Math.round(basicVal * 0.12));

    let ptVal = Number(data.pt ?? data.pt_deduction ?? editFormData.pt ?? 0);
    if (!ptVal && grossVal > 0) ptVal = grossVal > 15000 ? 200 : (grossVal > 0 ? 150 : 0);

    let esicVal = esi;
    if (!esicVal && grossVal > 0 && grossVal <= 21000) esicVal = Math.round(grossVal * 0.0075);

    const docData: PayslipDocData = {
      name: data.employee_name || data.empName || data.name || editFormData.empName || 'Employee',
      code: data.employee_code || data.empCode || data.code || editFormData.empCode || '',
      designation: data.designation || editFormData.designation || 'Staff Member',
      pfNo: data.pf_no || data.pfNo || data.pf_number || editFormData.pfNo || '—',
      uanNo: data.uan_no || data.uanNo || data.uan || editFormData.uanNo || '—',
      esicNo: data.esic_no || data.esicNo || data.esic || editFormData.esicNo || '—',
      pan: data.pan || data.pan_number || editFormData.pan || '—',
      period: data.period || (data.month ? formatMonthLabel(data.month) : (MONTHS_LABEL[selectedMonth] || selectedMonth)),
      doj: formatPayrollDate(data.date_of_joining || data.doj || editFormData.doj),
      accNo: data.account_no || data.accountNo || editFormData.accNo || '—',
      bankName: data.bank_name || data.bankName || editFormData.bankName || 'HDFC Bank',
      paidDays: data.paid_days !== undefined ? data.paid_days : (editFormData.paidDays ?? 30),
      unpaidDays: data.unpaid_days !== undefined ? data.unpaid_days : (editFormData.unpaidDays ?? 0),
      paidLeave: data.paid_leave !== undefined ? data.paid_leave : (editFormData.paidLeave ?? 0),
      basic: basicVal,
      hra: hraVal,
      cea: ceaVal,
      comm: commVal,
      lta: ltaVal,
      meal: mealVal,
      std: stdVal,
      adj: Number(data.adjustment ?? editFormData.adjustment ?? 0),
      inc: Number(data.incentives ?? editFormData.incentives ?? 0),
      pf: pfVal,
      esic: esicVal,
      pt: ptVal + tds
    };

    try {
      const htmlDoc = buildPayslipHtmlDoc(docData, payslipSetting);
      const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank', 'width=950,height=950');
      if (!printWin) {
        // Fallback for pop-up blocked: use hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        setTimeout(() => {
          try { iframe.contentWindow?.print(); } catch {}
          setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 60000);
        }, 300);
      }
    } catch (e) {
      console.error('Error opening payslip PDF:', e);
    }
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

  // ── One-time cleanup: remove old unsecured global key on mount ──────────
  useEffect(() => {
    if (localStorage.getItem('generated_payslips') !== null) {
      localStorage.removeItem('generated_payslips');
    }
  }, []);

  const orgKey = `salary_structures_${user?.organizationId || user?.id || user?.email || 'unknown'}`;

  useEffect(() => {
    // 1. Fetch live organization employees, salary structures, mappings, and payslip settings
    Promise.all([
      apiClient.get('/employees').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures/mappings').catch(() => ({ data: [] })),
      apiClient.get('/payroll/settings').catch(() => ({ data: null }))
    ]).then(([empRes, structRes, mappingRes, settingsRes]: any[]) => {
      const settingsData = settingsRes?.data?.data || settingsRes?.data;
      if (settingsData?.payslipSetting) {
        setPayslipSetting(settingsData.payslipSetting);
      }
      
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
            ...e,
            id: e.id,
            name: e.name || e.full_name || e.fullName || `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email || `Employee #${e.id}`,
            code: e.employee_code || e.code || `EMP-${e.id}`,
            department: e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General',
            designation: e.designation || e.job_title || e.designation_name || 'Staff Member',
            bank_name: e.bank_name || e.bankName || e.salary_bank_name || 'HDFC Bank',
            account_no: e.account_no || e.accountNo || e.bank_account_no || '—',
            uan_no: e.uan_no || e.uanNo || e.uan || '—',
            esic_no: e.esic_no || e.esicNo || e.esic || '—',
            pan: e.pan || e.pan_number || e.panNumber || '—',
            pf_no: e.pf_no || e.pf_number || e.pfNo || '—',
            date_of_joining: e.date_of_joining || e.doj || e.joining_date || '',
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

  // Only offer statuses that genuinely exist on real employee records — a
  // hardcoded option nobody actually has (e.g. "On Leave") silently matches
  // zero employees.
  const uniqueEmployeeStatuses = Array.from(
    new Set(employeeOptions.map(e => e.status).filter(Boolean))
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
      showToast.error('Missing Employee', 'Please select a particular employee from the dropdown list first.');
      return;
    }
    // Find selected employee dynamically from employee roster
    const emp = employeeOptions.find(e => String(e.id) === String(empIdToUse));
    if (!emp) {
      showToast.error('Employee Not Found', 'Selected employee not found in the roster.');
      return;
    }

    // No local calculation here — this pulls whatever Payroll Process already
    // computed for this employee/month (payroll_run_employees) and just
    // renders/saves the payslip from that. If nothing was processed yet, the
    // backend says so instead of us inventing numbers.
    try {
      const res = await apiClient.post('/payroll/payslips/generate-from-process', {
        employeeId: emp.id,
        month: selectedMonth
      });
      const result = res.data?.data;
      const payslip = result?.payslip || {};
      const earnings = (result?.earnings || []).map((e: any) => ({
        name: e.formulaUsed || e.formula_used || 'Earning',
        amount: Number(e.actualValue ?? e.actual_value ?? 0)
      })).filter((e: any) => e.amount !== 0);
      const deductions = (result?.deductions || []).map((d: any) => ({
        name: d.componentName || d.component_name || 'Deduction',
        amount: Number(d.actualValue ?? d.actual_value ?? 0)
      })).filter((d: any) => d.amount !== 0);

      const grossVal = Number(payslip.grossSalary ?? payslip.gross_salary ?? emp.gross ?? 0);
      const totalDed = Number(payslip.totalDeductions ?? payslip.total_deductions ?? 0);
      const netVal = Number(payslip.netSalary ?? payslip.net_salary ?? emp.net ?? 0);
      const basicVal = Number(payslip.basicSalary ?? payslip.basic_salary ?? emp.basic ?? 0);
      const psNumber = payslip.payslipNumber ?? payslip.payslip_number ?? `PS-${selectedMonth.replace('-', '')}-${emp.id}`;
      const psMonth = payslip.payslipMonth ?? payslip.payslip_month ?? `${selectedMonth}-01`;

      const newCard = {
        id: payslip.id || Number(emp.id) * 1000 + Date.now(),
        employee_id: emp.id,
        payslip_number: psNumber,
        month: psMonth,
        empName: emp.name,
        empCode: emp.code,
        designation: emp.designation,
        basic: basicVal,
        gross: grossVal,
        deductions: totalDed,
        net: netVal,
        ctc: payslip.ctc || (grossVal * 12)
      };

      setGeneratedList(prev => {
        const filtered = prev.filter(
          item => !(String(item.employee_id || item.employeeId) === String(emp.id) && String(item.month || item.payslip_month).slice(0, 7) === selectedMonth)
        );
        const updated = [newCard, ...filtered];
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      handleDownloadPDF({
        employee_id: emp.id,
        employee_name: emp.name,
        employee_code: emp.code,
        designation: emp.designation,
        bank_name: emp.bank_name || emp.bankName,
        account_no: emp.account_no || emp.accountNo,
        uan_no: emp.uan_no || emp.uanNo,
        esic_no: emp.esic_no || emp.esicNo,
        pan: emp.pan,
        pf_no: emp.pf_no,
        date_of_joining: emp.date_of_joining || emp.doj,
        payslip_number: psNumber,
        payslip_month: psMonth,
        month: psMonth,
        gross_salary: grossVal,
        total_deductions: totalDed,
        net_salary: netVal,
        basic_salary: basicVal
      });

      setDetails(result);
      showToast.success('Payslip Ready 🎉', `Generated official Payslip for ${emp.name}.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not generate payslip';
      showToast.error('Nothing to Generate', msg);
      return;
    }

    setGeneratedNotification(`✅ Payslip generated for ${emp.name} (${emp.code}) — ${MONTHS_LABEL[selectedMonth] || selectedMonth}, calculated from the assigned pay slab & structure.`);
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

  const userEmailClean = (user?.email || '').toLowerCase();
  const activeUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Employee';
  const activeUserNameClean = activeUserName.toLowerCase();
  const activeUserCodeClean = ((user as any)?.employeeCode || '').toLowerCase();

  const userEmpId = String((user as any)?.employeeId || (user as any)?.employee_id || '');

  const matchedEmpInRoster = employeeOptions.find((e: any) => {
    const eEmail = String(e.email || '').toLowerCase();
    const eName = String(e.name || '').toLowerCase();
    const eCode = String(e.code || '').toLowerCase();

    if (userEmpId && String(e.id) === userEmpId) return true;
    if (userEmailClean && eEmail === userEmailClean) return true;
    if (activeUserCodeClean && eCode === activeUserCodeClean) return true;
    if (activeUserNameClean && eName === activeUserNameClean) return true;
    return false;
  });

  const activeUserId = matchedEmpInRoster?.id || userEmpId || 1;

  const baseList = filteredPayslips.filter((p: any) => {
    if (isAdmin) return true;
    const pEmpId = String(p.employee_id || p.employeeId || '');
    const pEmail = String(p.email || '').toLowerCase();
    return pEmpId === String(activeUserId) || (userEmailClean && pEmail === userEmailClean);
  });

  const scopedGeneratedList = isAdmin
    ? generatedList
    : generatedList.filter((item: any) => {
      const itemEmpId = String(item.employee_id || item.employeeId || '');
      const itemCode = String(item.empCode || item.employee_code || '').toLowerCase();
      const itemName = String(item.empName || item.employee_name || '').toLowerCase();
      const itemEmail = String(item.email || '').toLowerCase();

      if (itemEmpId && itemEmpId === String(activeUserId)) return true;
      if (userEmailClean && itemEmail && itemEmail === userEmailClean) return true;
      if (activeUserCodeClean && itemCode && itemCode === activeUserCodeClean) return true;
      if (activeUserNameClean && itemName && itemName === activeUserNameClean) return true;
      return false;
    });

  const combinedList = [...scopedGeneratedList, ...baseList];

  const targetYm = selectedMonth ? selectedMonth.slice(0, 7) : '';
  const monthFilteredList = combinedList.filter((item: any) => {
    if (!targetYm) return true;
    const rawMonth = String(item.month || item.payslip_month || item.period || item.payslip_number || '');
    const match = rawMonth.match(/(\d{4})[-/]?(\d{2})/);
    if (match) {
      const itemYm = `${match[1]}-${match[2]}`;
      return itemYm === targetYm;
    }
    return rawMonth.toLowerCase().includes(targetYm) || rawMonth.startsWith(targetYm);
  });

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

  const displayList = (selectedEmpId && isAdmin)
    ? deduplicatedList.filter((item: any) => {
      const itemEmpId = String(item.employee_id || item.employeeId || '');
      return itemEmpId === String(selectedEmpId);
    })
    : deduplicatedList;

  const finalCards = displayList.filter((item: any) => {
    const itemEmpId = String(item.employee_id || item.employeeId || '');
    const matchedEmp = employeeOptions.find((e: any) => String(e.id) === itemEmpId);

    if (matchedEmp && matchedEmp.hasSalaryStructure === false) {
      return false;
    }

    if (isAdmin) return true;
    const itemMonth = String(item.month || item.payslip_month || selectedMonth);
    const itemKey = String(item.id);
    const comboKey = `${itemEmpId}_${itemMonth}`;

    const isHidden = hiddenPayslipIds[itemKey] === true || hiddenPayslipIds[comboKey] === true;
    return !isHidden;
  });

  const finalCardsCount = finalCards.length;

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
              {finalCardsCount} Payslips Available
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
                    <option value="all">All Statuses ({uniqueEmployeeStatuses.length})</option>
                    {uniqueEmployeeStatuses.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
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
                          {emp.name}
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
                {getRecentMonthOptions(12).map(m => (
                  <option key={m.value} value={m.value}>{m.label}{m.isCurrent ? ' (Current Month)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Generation Option Buttons (Automatic & Manual Edit) */}
          {isAdmin && (
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-end gap-2">
              <Button
                onClick={() => handleGenerateForEmployee()}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs flex items-center justify-center gap-1.5 px-3"
                title="Pulls this employee's already-processed figures from Payroll Process and generates their payslip"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Payslip
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
            {finalCardsCount} Statements
          </Badge>
        </div>
      </div>

      {/* Payslips Summary Cards Grid / Table with Show/Hide Employee Visibility Toggle */}
      <div>
        {(() => {
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
                                    className="h-7 px-2 text-[10px] font-bold"
                                    title="View / Print PDF Statement"
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
                      onView={() => handleDownloadPDF({
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
                        payslip_number: sample.payslip_number || sample.payslipNumber || `PS-${sample.id}`,
                        payslip_month: sample.month,
                        gross_salary: cardGross,
                        net_salary: cardNet,
                        basic_salary: cardBasic
                      })}
                      onDownload={() => handleDownloadPDF({
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
                        payslip_number: sample.payslip_number || sample.payslipNumber || `PS-${sample.id}`,
                        payslip_month: sample.month,
                        gross_salary: cardGross,
                        net_salary: cardNet,
                        basic_salary: cardBasic
                      })}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Payslip Detailed Breakup (from payslips list click) */}
      {details && (
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

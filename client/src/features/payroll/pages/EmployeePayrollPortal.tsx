import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  CreditCard,
  Building,
  UserX
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PayslipViewer } from './PayslipViewer';
import { EmployeeLoanRequest } from '../components/EmployeeLoanRequest';
import { MySettlementPage } from './MySettlementPage';

export const EmployeePayrollPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'payslips' | 'loans' | 'settlement'>('payslips');

  useEffect(() => {
    if (urlTab === 'loans' || urlTab === 'payslips' || urlTab === 'settlement') {
      setActiveTab(urlTab as any);
    }
  }, [urlTab]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/90 backdrop-blur-md border border-border/70 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">Employee Self-Service Financial Portal</h1>
              <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-[10px] font-bold">My Financials</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              View monthly payslips and request salary advances or loans. Expense claims live under Expense Management.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card/80 backdrop-blur-md border border-border/70 p-1.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { key: 'payslips', label: 'My Payslips', icon: FileText },
            { key: 'loans', label: 'Advances & Loans', icon: CreditCard },
            { key: 'settlement', label: 'My Exit Settlement', icon: UserX },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'settlement' && <MySettlementPage />}
        {activeTab === 'payslips' && <PayslipViewer />}
        {activeTab === 'loans' && <EmployeeLoanRequest />}
      </div>
    </div>
  );
};

export default EmployeePayrollPortal;

import React from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Sparkles, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function IDCardPage() {
  const { user } = useAuthStore();
  const { employee } = useEmployee(user?.employeeId || 0);

  const empName = employee ? `${employee.firstName} ${employee.lastName}` : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`;
  const empCode = employee?.employeeCode || '#EMP12345';
  const designation = employee?.designation || 'Software Engineer';
  const department = employee?.department || 'Engineering';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success('Downloading high-resolution Digital ID card PDF...');
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-foreground">Digital ID Card</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* ID Card Wrapper */}
      <div className="relative group perspective-1000 flex justify-center py-6">
        <div className="w-80 h-[480px] bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-white/20">
          {/* Glassmorphic overlay card decoration */}
          <div className="absolute -right-20 -top-20 bg-white/10 w-60 h-60 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 bg-violet-500/20 w-60 h-60 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top Header */}
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-1.5">
              <div className="h-7 w-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-xs">
                A
              </div>
              <span className="font-extrabold text-xs tracking-wider uppercase text-white/95">Apponext HRMS</span>
            </div>
            <Shield className="w-5 h-5 text-white/80" />
          </div>

          {/* User Details & Photo */}
          <div className="flex flex-col items-center text-center mt-6 relative z-10">
            {/* Avatar Circle */}
            <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur border-2 border-white/40 flex items-center justify-center text-3xl font-extrabold shadow-inner relative group">
              <span className="absolute top-0.5 right-0.5 text-amber-400"><Sparkles className="w-4 h-4" /></span>
              {empName.split(' ').map(w => w[0]).join('').toUpperCase()}
            </div>
            
            <h3 className="text-xl font-bold tracking-tight mt-4 text-white">{empName}</h3>
            <p className="text-xs text-violet-200 uppercase tracking-widest font-semibold mt-1">{designation}</p>
            <p className="text-[10px] text-white/60 font-semibold">{department}</p>
          </div>

          {/* Metadata & QR Mockup */}
          <div className="mt-6 border-t border-white/10 pt-4 flex justify-between items-center relative z-10">
            <div className="space-y-2">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/50 block">Employee Code</span>
                <span className="text-xs font-mono font-bold">{empCode}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/50 block">Expiry Date</span>
                <span className="text-xs font-bold">12 / 2030</span>
              </div>
            </div>
            {/* QR Mock */}
            <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-md border border-white/25 flex items-center justify-center">
              <svg className="w-14 h-14 text-slate-800" viewBox="0 0 100 100">
                <rect x="0" y="0" width="25" height="25" />
                <rect x="75" y="0" width="25" height="25" />
                <rect x="0" y="75" width="25" height="25" />
                <rect x="10" y="10" width="5" height="5" fill="white" />
                <rect x="85" y="10" width="5" height="5" fill="white" />
                <rect x="10" y="85" width="5" height="5" fill="white" />
                <rect x="35" y="15" width="10" height="5" />
                <rect x="55" y="15" width="5" height="15" />
                <rect x="35" y="45" width="30" height="10" />
                <rect x="45" y="65" width="20" height="15" />
                <rect x="75" y="75" width="10" height="10" />
              </svg>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="text-[9px] text-center text-white/40 tracking-wider font-semibold border-t border-white/5 pt-3 mt-4">
            CONFIDENTIAL • ISSUED FOR INTERNAL USE ONLY
          </div>
        </div>
      </div>
    </div>
  );
}

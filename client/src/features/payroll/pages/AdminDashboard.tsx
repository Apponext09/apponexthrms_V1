import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePayrollDashboard } from '../hooks/index';

export const AdminDashboard: React.FC = () => {
  const { stats, isLoading } = usePayrollDashboard();

  if (isLoading) {
    return <div className="p-4">Loading stats...</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payroll Admin Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold">{stats.totalEmployees}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Payroll Cost (Monthly)</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.payrollCost)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">PF Contribution</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.pfContribution)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Tax Deducted</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.taxDeducted)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Deduction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>PF</span>
                <span className="font-medium">{formatCurrency(stats.pfContribution)}</span>
              </div>
              <div className="flex justify-between">
                <span>ESI</span>
                <span className="font-medium">{formatCurrency(stats.esiContribution)}</span>
              </div>
              <div className="flex justify-between">
                <span>TDS</span>
                <span className="font-medium">{formatCurrency(stats.taxDeducted)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Total</span>
                <span className="font-bold">{formatCurrency(stats.totalDeductions)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>PF Returns Filed</span>
                <span className={stats.complianceStatus.pfFiled ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {stats.complianceStatus.pfFiled ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ESI Returns Filed</span>
                <span className={stats.complianceStatus.esiFiled ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {stats.complianceStatus.esiFiled ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax Certificates Generated</span>
                <span className={stats.complianceStatus.taxCertificates === 'Generated' ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}>
                  {stats.complianceStatus.taxCertificates}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Attendance Synced</span>
                <span className={stats.complianceStatus.attendanceSynced ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {stats.complianceStatus.attendanceSynced ? "✓ Yes" : "✗ No"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;



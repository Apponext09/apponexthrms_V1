import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payroll Admin Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold">250</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Payroll Cost (Monthly)</p>
              <p className="text-3xl font-bold">₹1.25Cr</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">PF Contribution</p>
              <p className="text-3xl font-bold">₹31L</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Tax Deducted</p>
              <p className="text-3xl font-bold">₹25L</p>
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
                <span className="font-medium">₹31,00,000</span>
              </div>
              <div className="flex justify-between">
                <span>ESI</span>
                <span className="font-medium">₹2,50,000</span>
              </div>
              <div className="flex justify-between">
                <span>TDS</span>
                <span className="font-medium">₹25,00,000</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Total</span>
                <span className="font-bold">₹58,50,000</span>
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
                <span className="text-green-600 font-medium">✓ Yes</span>
              </div>
              <div className="flex justify-between">
                <span>ESI Returns Filed</span>
                <span className="text-green-600 font-medium">✓ Yes</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Certificates Generated</span>
                <span className="text-yellow-600 font-medium">Pending</span>
              </div>
              <div className="flex justify-between">
                <span>Attendance Synced</span>
                <span className="text-green-600 font-medium">✓ Yes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;



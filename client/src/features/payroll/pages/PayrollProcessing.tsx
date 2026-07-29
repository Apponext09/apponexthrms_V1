import React from 'react';
import { Payroll10StepFlow } from '../components/Payroll10StepFlow';

export const PayrollProcessing: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <Payroll10StepFlow />
    </div>
  );
};

export default PayrollProcessing;

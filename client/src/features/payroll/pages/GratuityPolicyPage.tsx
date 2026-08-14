import React from 'react';
import { GratuityConfiguration } from '../components/GratuityConfiguration';

export const GratuityPolicyPage: React.FC = () => {
  return (
    <div className="space-y-4 pb-12">
      <GratuityConfiguration />
    </div>
  );
};

export default GratuityPolicyPage;

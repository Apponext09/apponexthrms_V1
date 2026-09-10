import React, { useState } from 'react';
import { OTRuleForm } from './OTRuleForm';
import { Sidebar } from './Sidebar';

export const OTRulePage: React.FC = () => {
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column - Sidebar (4 cols) */}
      <div className="lg:col-span-4">
        <Sidebar
          selectedRuleId={selectedRuleId}
          onSelect={(id) => setSelectedRuleId(id)}
          onNew={() => setSelectedRuleId(null)}
        />
      </div>

      {/* Right Column - Form (8 cols) */}
      <div className="lg:col-span-8">
        <OTRuleForm
          ruleId={selectedRuleId ?? undefined}
          onSaved={(id) => setSelectedRuleId(id)}
          onCancel={() => setSelectedRuleId(null)}
        />
      </div>
    </div>
  );
};

export default OTRulePage;

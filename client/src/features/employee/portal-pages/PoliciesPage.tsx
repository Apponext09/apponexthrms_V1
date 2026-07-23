import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ShieldCheck, Scale } from 'lucide-react';
import { toast } from 'sonner';

export default function PoliciesPage() {
  const policies = [
    { title: 'Code of Professional Conduct', desc: 'Guidelines for professional integrity, workplace ethics, and behavior standards.', category: 'General' },
    { title: 'Annual Leave Policy 2026', desc: 'Rules regarding leave accruals, short break leaves, sick leaves, and approvals.', category: 'Leaves' },
    { title: 'Corporate Travel & Expense limits', desc: 'Defined budgets and reimbursable criteria for domestic and international client visits.', category: 'Finances' },
    { title: 'Prevention of Sexual Harassment (POSH)', desc: 'Zero tolerance rules, complaint filings structure, and support committees list.', category: 'General' },
  ];

  const [selectedCat, setSelectedCat] = useState('All');
  const filteredPolicies = policies.filter(p => selectedCat === 'All' || p.category === selectedCat);

  const handleDownload = (title: string) => {
    toast.success(`Downloading policy document: "${title}"...`);
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Company Policies</h2>
          <p className="text-xs text-muted-foreground">Access official manuals, compliance guidelines, and HR frameworks.</p>
        </div>
      </div>

      {/* Category Selectors */}
      <div className="flex gap-2">
        {['All', 'General', 'Leaves', 'Finances'].map((cat) => (
          <Button
            key={cat}
            variant={selectedCat === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCat(cat)}
            className="rounded-lg font-bold text-xs"
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPolicies.map((p, i) => (
          <Card key={i} className="border rounded-2xl shadow-sm hover:border-violet-600 transition-colors">
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-start space-y-0">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{p.category}</span>
                <CardTitle className="text-sm font-bold text-foreground mt-1 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-violet-500" /> {p.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              <Button 
                onClick={() => handleDownload(p.title)}
                className="w-full py-5 bg-muted hover:bg-violet-50 text-foreground hover:text-violet-700 font-bold text-xs gap-1.5 rounded-xl border"
              >
                <Download className="w-4 h-4" /> Download Manual PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

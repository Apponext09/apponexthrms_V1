import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ShieldCheck, Scale, Shield } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Company Policies
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Compliance
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access official manuals, compliance guidelines, and HR policy frameworks.
          </p>
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
            className={`h-8 rounded-lg font-bold text-xs ${
              selectedCat === cat ? 'bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPolicies.map((p, i) => (
          <Card key={i} className="border border-border/80 rounded-xl shadow-2xs bg-card hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60 flex flex-row justify-between items-start space-y-0">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{p.category}</span>
                <CardTitle className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-primary shrink-0" /> {p.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              <Button 
                onClick={() => handleDownload(p.title)}
                className="w-full h-9 bg-muted/60 hover:bg-primary/10 text-foreground hover:text-primary font-bold text-xs gap-1.5 rounded-lg border border-border/70"
              >
                <Download className="w-3.5 h-3.5" /> Download Policy PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

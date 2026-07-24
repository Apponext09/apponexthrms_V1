import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, Landmark, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxDeclarationPage() {
  const [declarations, setDeclarations] = useState({
    section80C: '150000',
    hraRent: '120000',
    section80D: '25000',
    otherIncome: '0',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Tax investment declaration saved as draft.');
  };

  const handleSubmitProof = () => {
    toast.success('Investment proofs submitted to HR for approval.');
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tax & Investment Declaration</h2>
          <p className="text-xs text-muted-foreground">Declare investments under Section 80C, 80D, and HRA for tax optimization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form entry */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Landmark className="w-4.5 h-4.5 text-violet-500" /> Investment Declarations FY 2026-27
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="sec80c">Section 80C (PPF, ELSS, LIC, etc. - Max 1.5L)</Label>
                    <Input
                      id="sec80c"
                      type="number"
                      value={declarations.section80C}
                      onChange={(e) => setDeclarations({ ...declarations, section80C: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sec80d">Section 80D (Medical Insurance premium)</Label>
                    <Input
                      id="sec80d"
                      type="number"
                      value={declarations.section80D}
                      onChange={(e) => setDeclarations({ ...declarations, section80D: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hra">Annual House Rent Paid (HRA Exemption)</Label>
                    <Input
                      id="hra"
                      type="number"
                      value={declarations.hraRent}
                      onChange={(e) => setDeclarations({ ...declarations, hraRent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="other">Other Income / Loss on House Property</Label>
                    <Input
                      id="other"
                      type="number"
                      value={declarations.otherIncome}
                      onChange={(e) => setDeclarations({ ...declarations, otherIncome: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="outline" className="font-bold">Save Draft</Button>
                  <Button type="button" onClick={handleSubmitProof} className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                    Submit Declarations
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Upload proofs */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileUp className="w-4.5 h-4.5 text-violet-500" /> Upload Verification Proofs
              </CardTitle>
              <CardDescription>Upload files/receipts for declared values.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-violet-600 transition-colors">
                <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <span className="text-xs font-bold text-foreground block">Select Files / Receipts</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">PDF, PNG, JPG up to 10MB</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border flex gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-normal">
                  All submitted tax proofs are securely encrypted. Verification takes up to 7-10 working days.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

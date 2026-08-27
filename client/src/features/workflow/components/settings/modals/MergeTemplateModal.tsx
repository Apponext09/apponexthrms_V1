import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient as api } from '@/config/api';
import { Code, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  initialValue?: string;
  onSave: (mergeTemplate: string) => void;
}

const DEFAULT_MERGE_CODES = [
  { code: '[#REPORTING_OFFICER#]', name: 'Reporting Officer', desc: 'Direct Reporting Manager' },
  { code: '[#INDIRECT_REPORTING_OFFICER#]', name: 'Indirect RO', desc: 'Secondary Manager' },
  { code: '[#EMPLOYEE#]', name: 'Employee', desc: 'Applicant Employee' },
  { code: '[#EMPLOYEE_NAME#]', name: 'Employee Name', desc: 'Full Name of Employee' },
  { code: '[#DEPARTMENT#]', name: 'Department', desc: 'Employee Department' },
  { code: '[#DESIGNATION#]', name: 'Designation', desc: 'Job Title / Role' },
  { code: '[#COMPANY_NAME#]', name: 'Company Name', desc: 'Organization / Company Name' },
];

export function MergeTemplateModal({ open, onClose, initialValue = '', onSave }: Props) {
  const [mergeTemplate, setMergeTemplate] = useState(initialValue);
  const [mergeCodes, setMergeCodes] = useState<Array<{ code: string; name: string; desc: string }>>(DEFAULT_MERGE_CODES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMergeTemplate(initialValue);
    if (open) {
      fetchMergeCodes();
    }
  }, [open, initialValue]);

  const fetchMergeCodes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/merge-codes');
      const items = res.data?.data ?? res.data ?? [];
      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((it: any) => ({
          code: it.merge_code || it.code || `[#${it.module_name || 'CODE'}#]`,
          name: it.sub_module_name || it.module_name || it.name || 'Merge Tag',
          desc: it.description || '',
        }));
        setMergeCodes(mapped);
      }
    } catch {
      setMergeCodes(DEFAULT_MERGE_CODES);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCode = (codeStr: string) => {
    if (mergeTemplate.includes(codeStr)) return;
    setMergeTemplate((prev) => (prev ? `${prev} ${codeStr}` : codeStr));
  };

  const handleSave = () => {
    onSave(mergeTemplate);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-base font-bold text-foreground">
            Merge Template details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Merge Template Input */}
          <div className="space-y-1.5">
            <Label htmlFor="merge-template-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Merge Template
            </Label>
            <Input
              id="merge-template-input"
              value={mergeTemplate}
              onChange={(e) => setMergeTemplate(e.target.value)}
              placeholder="e.g. [#REPORTING_OFFICER#] Approval Template..."
              className="h-10 text-sm font-mono"
            />
          </div>

          {/* Merge Codes Table / Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Code size={13} className="text-primary" />
                Available Merge Codes
              </Label>
              {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
            </div>

            <div className="border rounded-lg overflow-hidden bg-muted/10 max-h-52 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                    <th className="px-3 py-2">Merge Code</th>
                    <th className="px-3 py-2">Tag Name</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mergeCodes.map((mc, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-primary">{mc.code}</td>
                      <td className="px-3 py-2 text-muted-foreground">{mc.name}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectCode(mc.code)}
                          className="h-6 text-[10px] font-bold px-2 py-0"
                        >
                          + Insert
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-start pt-3 border-t">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

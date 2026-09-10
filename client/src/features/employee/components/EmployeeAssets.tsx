import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Package, Loader2, Undo2 } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import {
  useEmployeeAssets,
  useAllocateAsset,
  useReturnAsset,
} from '../hooks/useAssets';

interface EmployeeAssetsProps {
  employeeId?: number;
}

export function EmployeeAssets({ employeeId }: EmployeeAssetsProps) {
  const id = employeeId || 0;
  const { allocations, isLoading } = useEmployeeAssets(id);
  const { allocateAsset, isLoading: isAllocating } = useAllocateAsset();
  const { returnAsset } = useReturnAsset();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    assetId: '',
    allocationDate: new Date().toISOString().split('T')[0],
    conditionAtAllocation: 'good' as 'good' | 'fair' | 'poor',
    notes: '',
  });

  const handleAllocate = async () => {
    if (!form.assetId) {
      showToast.error('Asset ID is required');
      return;
    }
    try {
      await allocateAsset({
        employeeId: id,
        assetId: Number(form.assetId),
        allocationDate: form.allocationDate,
        conditionAtAllocation: form.conditionAtAllocation,
        notes: form.notes || undefined,
      });
      showToast.success('Asset allocated');
      setOpen(false);
      setForm({
        assetId: '',
        allocationDate: new Date().toISOString().split('T')[0],
        conditionAtAllocation: 'good',
        notes: '',
      });
    } catch (err: any) {
      showToast.error(err?.response?.data?.message || 'Failed to allocate asset');
    }
  };

  const handleReturn = async (allocationId: number) => {
    try {
      await returnAsset({
        allocationId,
        data: { returnDate: new Date().toISOString().split('T')[0], conditionAtReturn: 'good' },
      });
      showToast.success('Asset returned');
    } catch {
      showToast.error('Failed to return asset');
    }
  };

  return (
    <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
      <CardHeader className="flex flex-row justify-between items-center pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 mb-4">
        <div>
          <CardTitle className="text-sm font-bold">Assets</CardTitle>
          <CardDescription className="text-xs">Allocated assets and equipment</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs font-semibold gap-1.5 px-3"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          Allocate Asset
        </Button>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Loading allocated assets...</div>
        ) : allocations.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center">
            No assets allocated to this employee.
          </div>
        ) : (
          <div className="space-y-2.5">
            {allocations.map((a: any) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 border border-border/60 rounded-lg bg-card text-xs hover:border-border/90 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted/60 text-muted-foreground shrink-0">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground">Asset #{a.assetId}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Allocated {a.allocationDate ? new Date(a.allocationDate).toLocaleDateString() : '-'}
                      {a.notes ? ` · ${a.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.returnDate ? (
                    <Badge className="text-[10px] font-bold py-0.5 px-2 bg-muted text-muted-foreground">
                      Returned {new Date(a.returnDate).toLocaleDateString()}
                    </Badge>
                  ) : (
                    <>
                      <Badge className="text-[10px] font-bold py-0.5 px-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Active
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => handleReturn(a.id)}
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Return
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Asset</DialogTitle>
            <DialogDescription>Assign an available asset to this employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assetId">Asset ID</Label>
              <Input
                id="assetId"
                type="number"
                className="mt-1"
                value={form.assetId}
                onChange={(e) => setForm((p) => ({ ...p, assetId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="allocationDate">Allocation Date</Label>
              <Input
                id="allocationDate"
                type="date"
                className="mt-1"
                value={form.allocationDate}
                onChange={(e) => setForm((p) => ({ ...p, allocationDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.conditionAtAllocation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, conditionAtAllocation: e.target.value as any }))
                }
              >
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                className="mt-1"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isAllocating}>
              Cancel
            </Button>
            <Button onClick={handleAllocate} disabled={isAllocating} className="gap-2">
              {isAllocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

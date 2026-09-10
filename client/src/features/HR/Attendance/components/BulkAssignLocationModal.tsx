import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  Users,
  Search
} from 'lucide-react';
import { AdminLocation } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface BulkAssignLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployeeIds: string[];
  totalSelectedCount: number;
  adminLocations: AdminLocation[];
  onApplyBulk: (locationIdsToAppend: string[], overwriteMode: boolean) => void;
}

export const BulkAssignLocationModal: React.FC<BulkAssignLocationModalProps> = ({
  isOpen,
  onClose,
  selectedEmployeeIds,
  totalSelectedCount,
  adminLocations,
  onApplyBulk,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const filteredLocations = (adminLocations || []).filter(loc =>
    (loc?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (loc?.city || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleToggleLocation = (id: string) => {
    if (selectedLocationIds.includes(id)) {
      setSelectedLocationIds(selectedLocationIds.filter(item => item !== id));
    } else {
      setSelectedLocationIds([...selectedLocationIds, id]);
    }
  };

  const handleSubmit = () => {
    if (selectedLocationIds.length === 0) return;
    onApplyBulk(selectedLocationIds, overwriteExisting);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-card border border-border/80 shadow-lg rounded-xl">
        <div className="bg-muted/20 border-b border-border/60 p-4 pr-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Bulk Assign Locations
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                Assigning permitted branches to <span className="font-bold text-foreground">{totalSelectedCount} selected employees</span>.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search admin locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs bg-background border-border"
            />
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {filteredLocations.map((loc) => {
              const isSelected = selectedLocationIds.includes(loc.id);
              return (
                <div
                  key={loc.id}
                  onClick={() => handleToggleLocation(loc.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/60 hover:border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-foreground">{loc.name}</span>
                      <p className="text-[10px] text-muted-foreground">{loc.city} • {loc.address}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] capitalize font-semibold">
                    {loc.type.replace('_', ' ')}
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 bg-muted/20 rounded-lg border border-border/60 flex items-center gap-2.5">
            <Checkbox
              id="overwrite"
              checked={overwriteExisting}
              onCheckedChange={(c) => setOverwriteExisting(!!c)}
            />
            <label htmlFor="overwrite" className="text-xs text-foreground cursor-pointer select-none">
              <span className="font-bold">Replace existing locations</span>
              <span className="block text-[10px] text-muted-foreground">
                Overwrites existing location access. If unchecked, appends new locations.
              </span>
            </label>
          </div>
        </div>

        <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={selectedLocationIds.length === 0}
            onClick={handleSubmit}
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Apply to {totalSelectedCount} Employees
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

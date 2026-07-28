import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  X,
  Users,
  Search,
  Shield,
  Layers
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
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
        <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Bulk Assign Attendance Locations
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs mt-0.5">
                Assigning permitted branches & client sites to <span className="font-bold text-white underline decoration-rose-300">{totalSelectedCount} selected employees</span>.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search admin locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {filteredLocations.map((loc) => {
              const isSelected = selectedLocationIds.includes(loc.id);
              return (
                <div
                  key={loc.id}
                  onClick={() => handleToggleLocation(loc.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/20'
                      : 'border-border/60 hover:border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-foreground">{loc.name}</span>
                      <p className="text-[11px] text-muted-foreground">{loc.city} • {loc.address}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {loc.type.replace('_', ' ')}
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
            <Checkbox
              id="overwrite"
              checked={overwriteExisting}
              onCheckedChange={(c) => setOverwriteExisting(!!c)}
            />
            <label htmlFor="overwrite" className="text-xs text-foreground cursor-pointer select-none">
              <span className="font-semibold">Replace existing assigned locations</span>
              <span className="block text-[11px] text-muted-foreground">
                If checked, overwrites existing location access for these employees. Otherwise, appends new locations.
              </span>
            </label>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={selectedLocationIds.length === 0}
            onClick={handleSubmit}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm"
          >
            Apply to {totalSelectedCount} Employees
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

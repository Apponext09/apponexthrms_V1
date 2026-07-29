import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  X,
  Search,
  Radio,
  Globe,
  Navigation,
  SlidersHorizontal,
  UserCheck
} from 'lucide-react';
import { AdminLocation, EmployeeLocationAccess } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssignLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeLocationAccess | null;
  adminLocations: AdminLocation[];
  onSave: (updatedEmployee: EmployeeLocationAccess) => void;
}

export const AssignLocationModal: React.FC<AssignLocationModalProps> = ({
  isOpen,
  onClose,
  employee,
  adminLocations,
  onSave,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [primaryLocationId, setPrimaryLocationId] = useState<string>('');
  const [allowRemotePunch, setAllowRemotePunch] = useState(false);
  const [allowFieldPunch, setAllowFieldPunch] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (employee) {
      setSelectedLocationIds(employee.assignedLocationIds || []);
      setPrimaryLocationId(employee.primaryLocationId || (employee.assignedLocationIds?.[0] || ''));
      setAllowRemotePunch(employee.allowRemotePunch ?? false);
      setAllowFieldPunch(employee.allowFieldPunch ?? false);
      setNotes(employee.notes || '');
    }
  }, [employee]);

  if (!employee) return null;

  const fn = employee.firstName || employee.email || 'E';
  const ln = employee.lastName || '';
  const initials = `${fn[0] || 'E'}${ln[0] || ''}`.toUpperCase();

  const filteredLocations = (adminLocations || []).filter(loc =>
    (loc?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (loc?.city || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (loc?.code || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleToggleLocation = (locationId: string) => {
    if (selectedLocationIds.includes(locationId)) {
      const nextSelected = selectedLocationIds.filter(id => id !== locationId);
      setSelectedLocationIds(nextSelected);
      if (primaryLocationId === locationId) {
        setPrimaryLocationId(nextSelected[0] || '');
      }
    } else {
      const nextSelected = [...selectedLocationIds, locationId];
      setSelectedLocationIds(nextSelected);
      if (!primaryLocationId) {
        setPrimaryLocationId(locationId);
      }
    }
  };

  const handleSave = () => {
    if (!employee) return;
    const updated: EmployeeLocationAccess = {
      ...employee,
      assignedLocationIds: selectedLocationIds,
      primaryLocationId: primaryLocationId || selectedLocationIds[0] || '',
      allowRemotePunch,
      allowFieldPunch,
      notes,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-card border border-border/80 shadow-lg rounded-xl">
        {/* Header */}
        <div className="bg-muted/20 border-b border-border/60 p-4 pr-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border shrink-0">
              <AvatarImage src={employee.avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold text-foreground">
                  {employee.firstName} {employee.lastName}
                </DialogTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] font-bold">
                  {employee.employeeCode}
                </Badge>
              </div>
              <DialogDescription className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1.5">
                <span>{employee.designation}</span>
                <span>•</span>
                <span className="font-semibold text-foreground">{employee.department}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Settings Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Allow Remote Punch</p>
                  <p className="text-[10px] text-muted-foreground">WFH / Work From Anywhere</p>
                </div>
              </div>
              <Switch checked={allowRemotePunch} onCheckedChange={setAllowRemotePunch} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Allow Field Punch</p>
                  <p className="text-[10px] text-muted-foreground">Flexible GPS Check-in</p>
                </div>
              </div>
              <Switch checked={allowFieldPunch} onCheckedChange={setAllowFieldPunch} />
            </div>
          </div>

          {/* Location Assignment Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Permitted Branch Locations
              </h4>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                {selectedLocationIds.length} Selected
              </Badge>
            </div>

            {/* Search filter for locations */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search branches by name, city, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs bg-background border-border"
              />
            </div>

            {/* Location Cards List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {filteredLocations.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                  No branch locations found matching "{searchTerm}"
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isSelected = selectedLocationIds.includes(loc.id);
                  const isPrimary = primaryLocationId === loc.id;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleToggleLocation(loc.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border/60 hover:border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-border bg-background'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground truncate">
                              {loc.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              {loc.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {loc.address}, {loc.city} • Radius: {loc.radiusMeters}m
                          </p>
                        </div>
                      </div>

                      {/* Primary Selection */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryLocationId(loc.id);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                            isPrimary
                              ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                              : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                          }`}
                        >
                          <Radio className="w-2.5 h-2.5" />
                          {isPrimary ? 'Primary' : 'Set Primary'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              HR Allocation Notes (Optional)
            </label>
            <Input
              placeholder="e.g. Client site allocation notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Save Permitted Locations
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

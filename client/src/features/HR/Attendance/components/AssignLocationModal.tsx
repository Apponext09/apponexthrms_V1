import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Building2,
  CheckCircle2,
  X,
  Search,
  Shield,
  Briefcase,
  Info,
  Radio,
  Globe,
  Navigation,
  Sliders
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
      // Don't remove if it's the primary location without choosing another primary first
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
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white/40 shadow-md">
              <AvatarImage src={employee.avatarUrl} />
              <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  {employee.firstName} {employee.lastName}
                </DialogTitle>
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {employee.employeeCode}
                </Badge>
              </div>
              <DialogDescription className="text-white/90 text-xs mt-1 flex flex-wrap items-center gap-2">
                <span>{employee.designation}</span>
                <span>•</span>
                <span className="font-semibold">{employee.department}</span>
                <span>•</span>
                <span className="opacity-90">Manager: {employee.reportingManager || 'Department Head'}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Settings Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/60">
            <div className="flex items-center justify-between gap-3 p-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Allow Remote Punch</p>
                  <p className="text-[11px] text-muted-foreground">WFH / Work From Anywhere</p>
                </div>
              </div>
              <Switch checked={allowRemotePunch} onCheckedChange={setAllowRemotePunch} />
            </div>

            <div className="flex items-center justify-between gap-3 p-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Allow Field / Client Punch</p>
                  <p className="text-[11px] text-muted-foreground">Flexible GPS Client Check-in</p>
                </div>
              </div>
              <Switch checked={allowFieldPunch} onCheckedChange={setAllowFieldPunch} />
            </div>
          </div>

          {/* Location Assignment Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  Permitted Branch Locations
                </h4>
                <p className="text-xs text-muted-foreground">
                  Select branches & client sites created by Admin where this employee can mark attendance.
                </p>
              </div>
              <Badge variant="outline" className="border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-950/40">
                {selectedLocationIds.length} Selected
              </Badge>
            </div>

            {/* Search filter for locations */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search branches by name, city, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Location Cards List */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {filteredLocations.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl">
                  No branch locations found matching "{searchTerm}"
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isSelected = selectedLocationIds.includes(loc.id);
                  const isPrimary = primaryLocationId === loc.id;

                  return (
                    <motion.div
                      key={loc.id}
                      whileHover={{ scale: 1.005 }}
                      onClick={() => handleToggleLocation(loc.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/20'
                          : 'border-border/60 hover:border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'border-muted-foreground/40 bg-background'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {loc.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              {loc.code}
                            </span>
                            {loc.type === 'head_office' && (
                              <Badge className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                Head Office
                              </Badge>
                            )}
                            {loc.type === 'client_site' && (
                              <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Client Site
                              </Badge>
                            )}
                            {loc.type === 'remote_zone' && (
                              <Badge className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                Field Zone
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
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
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                            isPrimary
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <Radio className="w-3 h-3" />
                          {isPrimary ? 'Primary Branch' : 'Set as Primary'}
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              HR Remarks / Client Site Allocation Note (Optional)
            </label>
            <Input
              placeholder="e.g. Assigned to TCS Client Site for Q3 project deployment until Dec 2026..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Attendance punches will be validated against selected geofences.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold text-xs shadow-md"
            >
              Save Permitted Locations
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

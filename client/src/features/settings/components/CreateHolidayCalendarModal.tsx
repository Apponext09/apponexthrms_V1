import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Calendar, Loader2, Building2, MapPin, Globe } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';

interface CreateHolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (calendar: any) => void;
  calendarToEdit?: any | null;
}

export function CreateHolidayCalendarModal({
  isOpen,
  onClose,
  onSuccess,
  calendarToEdit,
}: CreateHolidayCalendarModalProps) {
  const { selectedCompanyId } = useCompanyStore();
  const currentYear = new Date().getFullYear();

  const [calendarName, setCalendarName] = useState('');
  const [calendarYear, setCalendarYear] = useState<number>(currentYear);
  const [companyId, setCompanyId] = useState<string>('');
  const [regionId, setRegionId] = useState<string>('all');
  const [locationId, setLocationId] = useState<string>('all');
  const [description, setDescription] = useState('');

  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Year options: -1 year to +4 years
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
      if (calendarToEdit) {
        setCalendarName(calendarToEdit.calendar_name || calendarToEdit.name || '');
        setCalendarYear(Number(calendarToEdit.calendar_year || calendarToEdit.year) || currentYear);
        setCompanyId(calendarToEdit.company_id ? String(calendarToEdit.company_id) : '');
        setRegionId(calendarToEdit.region_id ? String(calendarToEdit.region_id) : 'all');
        setLocationId(calendarToEdit.location_id ? String(calendarToEdit.location_id) : 'all');
        setDescription(calendarToEdit.description || '');
      } else {
        setCalendarName('');
        setCalendarYear(currentYear);
        setCompanyId(selectedCompanyId ? String(selectedCompanyId) : '');
        setRegionId('all');
        setLocationId('all');
        setDescription('');
      }
      setConflictError(null);
    }
  }, [isOpen, calendarToEdit, selectedCompanyId]);

  const loadDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const [compRes, locRes] = await Promise.all([
        apiClient.get('/settings/companies').catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/locations?pageSize=100').catch(() => ({ data: { data: [] } })),
      ]);

      const compList = Array.isArray(compRes.data?.data)
        ? compRes.data.data
        : Array.isArray(compRes.data)
        ? compRes.data
        : [];

      const locList = Array.isArray(locRes.data?.data)
        ? locRes.data.data
        : Array.isArray(locRes.data)
        ? locRes.data
        : [];

      setCompanies(compList);
      setLocations(locList.filter((l: any) => l.status !== 'inactive' && l.status !== 'Inactive' && l.is_active !== 'No' && l.isActive !== 'No'));

      // Default company if not selected
      if (!companyId && compList.length > 0) {
        setCompanyId(String(compList[0].company_id || compList[0].id));
      }
    } catch (e) {
      console.error('Error loading companies/locations for holiday modal:', e);
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    const trimmedName = calendarName.trim();
    if (!trimmedName) {
      showToast.error('Validation Error', 'Calendar Name is required.');
      return;
    }

    if (!calendarYear || isNaN(calendarYear) || calendarYear < 1900 || calendarYear > 2100) {
      showToast.error('Validation Error', 'A valid 4-digit year is required.');
      return;
    }

    if (!companyId) {
      showToast.error('Validation Error', 'Please select a Company.');
      return;
    }

    const payload: any = {
      calendar_name: trimmedName,
      calendar_year: Number(calendarYear),
      company_id: Number(companyId),
      region_id: regionId && regionId !== 'all' ? Number(regionId) : null,
      location_id: locationId && locationId !== 'all' ? Number(locationId) : null,
      description: description.trim() || null,
      status: calendarToEdit?.status || 'Draft',
    };

    try {
      setSaving(true);

      let res;
      if (calendarToEdit?.id) {
        res = await apiClient.put(`/master/holiday-calendars/${calendarToEdit.id}`, payload);
      } else {
        res = await apiClient.post('/master/holiday-calendars', payload);
      }

      if (res.data?.success) {
        showToast.success(
          calendarToEdit ? 'Calendar Updated' : 'Calendar Created',
          calendarToEdit
            ? `Holiday calendar "${trimmedName}" updated successfully.`
            : `Holiday calendar "${trimmedName}" created as Draft.`
        );
        onSuccess(res.data.data);
        onClose();
      } else {
        showToast.error('Operation Failed', res.data?.message || 'Unable to save calendar.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || 'Failed to save holiday calendar.';

      if (status === 409) {
        setConflictError(
          'A holiday calendar already exists for this Company / Region / Location and Year combination.'
        );
      } else {
        showToast.error('Save Failed', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-6 rounded-2xl bg-background dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <DialogHeader className="space-y-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-white">
                {calendarToEdit ? 'Edit Holiday Calendar' : 'Create Holiday Calendar'}
              </DialogTitle>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configure yearly holiday schedule and geographic scope (Draft by default).
              </p>
            </div>
          </div>
        </DialogHeader>

        {conflictError && (
          <div className="p-3.5 mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Duplicate Scope Conflict</span>
              {conflictError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* Calendar Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Calendar Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. India Corporate Holidays 2027"
              value={calendarName}
              onChange={(e) => {
                setCalendarName(e.target.value);
                if (conflictError) setConflictError(null);
              }}
              className="h-10 text-sm rounded-xl border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {/* Year & Company (2 Col) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Calendar Year <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(calendarYear)}
                onValueChange={(val) => {
                  setCalendarYear(Number(val));
                  if (conflictError) setConflictError(null);
                }}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((yr) => (
                    <SelectItem key={yr} value={String(yr)}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                Company <span className="text-red-500">*</span>
              </Label>
              <Select
                value={companyId}
                onValueChange={(val) => {
                  setCompanyId(val);
                  if (conflictError) setConflictError(null);
                }}
                disabled={loadingDropdowns}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder={loadingDropdowns ? 'Loading...' : 'Select Company'} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => {
                    const cid = String(c.company_id || c.id);
                    const cname = c.name || c.company_name || 'Unnamed Company';
                    return (
                      <SelectItem key={cid} value={cid}>
                        {cname}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Region & Location (2 Col) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Region */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-neutral-400" />
                Region <span className="text-neutral-400 font-normal text-[11px]">(Optional)</span>
              </Label>
              <Select
                value={regionId}
                onValueChange={(val) => {
                  setRegionId(val);
                  if (conflictError) setConflictError(null);
                }}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions (Default)</SelectItem>
                  <SelectItem value="1">North Region</SelectItem>
                  <SelectItem value="2">West Region</SelectItem>
                  <SelectItem value="3">South Region</SelectItem>
                  <SelectItem value="4">East Region</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                Location <span className="text-neutral-400 font-normal text-[11px]">(Optional)</span>
              </Label>
              <Select
                value={locationId}
                onValueChange={(val) => {
                  setLocationId(val);
                  if (conflictError) setConflictError(null);
                }}
                disabled={loadingDropdowns}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder={loadingDropdowns ? 'Loading...' : 'All Locations'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations (Default)</SelectItem>
                  {locations.map((loc: any) => {
                    const lid = String(loc.id);
                    const lname = loc.name || loc.location_name || 'Unnamed Location';
                    return (
                      <SelectItem key={lid} value={lid}>
                        {lname}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Description / Notes <span className="text-neutral-400 font-normal text-[11px]">(Optional)</span>
            </Label>
            <Input
              placeholder="e.g. Official gazetted and festival holiday schedule for FY 2027"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 text-sm rounded-xl border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold rounded-xl border-neutral-200 dark:border-neutral-800"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-10 px-5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : calendarToEdit ? (
                'Update Calendar'
              ) : (
                'Save as Draft'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

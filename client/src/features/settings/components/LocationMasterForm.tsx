import React, { useState } from 'react';
import {
  Plus, X, Info, MapPin, Phone, Search, Building2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Mail, User, Loader2, Edit2, AlertCircle, RotateCcw,
  Globe, Coins, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '../hooks/useLocations';
import { useCompanies } from '../hooks/useCompanies';
import { showToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const WORLD_COUNTRIES = [
  'India',
  'Afghanistan',
  'Australia',
  'Bangladesh',
  'Canada',
  'China',
  'France',
  'Germany',
  'Indonesia',
  'Italy',
  'Japan',
  'Malaysia',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Pakistan',
  'Philippines',
  'Singapore',
  'South Africa',
  'Sri Lanka',
  'Switzerland',
  'Thailand',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam'
];

const CURRENCIES = [
  { code: 'INR', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', label: 'USD ($) - US Dollar' },
  { code: 'EUR', label: 'EUR (€) - Euro' },
  { code: 'GBP', label: 'GBP (£) - British Pound' },
  { code: 'AED', label: 'AED (AED) - UAE Dirham' },
  { code: 'SGD', label: 'SGD ($) - Singapore Dollar' },
  { code: 'AUD', label: 'AUD ($) - Australian Dollar' },
  { code: 'CAD', label: 'CAD ($) - Canadian Dollar' },
];

export interface LocationRecordItem {
  id: string | number;
  officeType: string | null;
  locationName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  country: string | null;
  zipCode: string | null;
  postalArea: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  currencyFormat: string | null;
  locationMail: string | null;
  contactName: string | null;
  contactNumber: string | null;
  companyId: number | null;
  isActive: 'Yes' | 'No';
}

interface LocationMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: any) => void;
}

export function LocationMasterForm({ onCancel, onSave }: LocationMasterFormProps) {
  // ── Real API Data ────────────────────────────────────────────────────────────
  const { data: locationsData, isLoading: locationsLoading, refetch: refetchLocations } = useLocations(1, 1000, '', '', 'all');
  const { data: companiesData = [], isLoading: companiesLoading } = useCompanies();
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();
  const deleteLocationMutation = useDeleteLocation();

  // Right Side Search & Filter State
  const [displaySearch, setDisplaySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Form State (Left Side)
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [officeType, setOfficeType] = useState('Choose');
  const [locationName, setLocationName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [country, setCountry] = useState('India');
  const [zipCode, setZipCode] = useState('');
  const [postalArea, setPostalArea] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [formState, setFormState] = useState('Maharashtra');
  const [currencyFormat, setCurrencyFormat] = useState('- Select -');
  const [locationMail, setLocationMail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Company Accordion
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Active Toggle — stored as 'Yes'/'No'
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Field-wise Validation Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Dedicated Handlers with Real-Time Error Clearing
  const handleOfficeTypeChange = (val: string) => {
    setOfficeType(val);
    clearFieldError('officeType');
  };

  const handleLocationNameChange = (val: string) => {
    setLocationName(val);
    clearFieldError('locationName');
  };

  const handleAddress1Change = (val: string) => {
    setAddressLine1(val);
    clearFieldError('addressLine1');
  };

  const handleAddress2Change = (val: string) => {
    setAddressLine2(val);
    clearFieldError('addressLine2');
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    clearFieldError('country');
    if (val.toLowerCase() === 'india' && zipCode) {
      const clean = zipCode.replace(/\D/g, '').slice(0, 6);
      setZipCode(clean);
    }
  };

  const handleZipCodeChange = (val: string) => {
    const isIndia = !country || country.toLowerCase() === 'india';
    let clean = val;
    if (isIndia) {
      clean = val.replace(/\D/g, '').slice(0, 6);
    } else {
      clean = val.slice(0, 10);
    }
    setZipCode(clean);
    clearFieldError('zipCode');
  };

  const handlePostalAreaChange = (val: string) => {
    setPostalArea(val);
    clearFieldError('postalArea');
  };

  const handleCityChange = (val: string) => {
    setCity(val);
    clearFieldError('city');
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    clearFieldError('district');
  };

  const handleStateChange = (val: string) => {
    setFormState(val);
    clearFieldError('formState');
  };

  const handleCurrencyFormatChange = (val: string) => {
    setCurrencyFormat(val);
    clearFieldError('currencyFormat');
  };

  const handleLocationMailChange = (val: string) => {
    setLocationMail(val.trim());
    clearFieldError('locationMail');
  };

  const handleContactNameChange = (val: string) => {
    setContactName(val);
    clearFieldError('contactName');
  };

  const handleContactNumberChange = (val: string) => {
    const clean = val.replace(/[^0-9+\s\-()]/g, '').slice(0, 16);
    setContactNumber(clean);
    clearFieldError('contactNumber');
  };

  const handleSelectForEdit = (item: any) => {
    setEditingId(item.id);
    setLocationName(item.locationName || item.location_name || item.name || '');
    setOfficeType(item.officeType || item.office_type || item.type || 'Choose');
    setAddressLine1(item.addressLine1 || item.address_line1 || item.address_line_1 || item.addressLine_1 || item.address || '');
    setAddressLine2(item.addressLine2 || item.address_line2 || item.address_line_2 || item.addressLine_2 || '');
    setCountry(item.country || 'India');
    setZipCode(item.zipCode || item.zip_code || item.postal_code || item.postalCode || item.pincode || '');
    setPostalArea(item.postalArea || item.postal_area || '');
    setCity(item.city || '');
    setDistrict(item.district || '');
    setFormState(item.state || item.province || '');
    setCurrencyFormat(item.currencyFormat || item.currency_format || item.default_currency_format || item.currency || '- Select -');
    setLocationMail(item.locationMail || item.location_mail || item.email || '');
    setContactName(item.contactName || item.contact_name || '');
    setContactNumber(item.contactNumber || item.contact_number || item.phone || item.contact || '');
    const compId = item.companyId || item.company_id;
    setSelectedCompanyId(compId ? String(compId) : '');
    const isInactive = item.isActive === 'No' || item.is_active === 'No' || item.status === 'inactive' || item.status === 'Inactive';
    setIsActive(isInactive ? 'No' : 'Yes');
    setErrors({});
    setSubmitError(null);
  };

  const handleResetForm = () => {
    setEditingId(null);
    setOfficeType('Choose');
    setLocationName('');
    setAddressLine1('');
    setAddressLine2('');
    setCountry('India');
    setZipCode('');
    setPostalArea('');
    setCity('');
    setDistrict('');
    setFormState('Maharashtra');
    setCurrencyFormat('- Select -');
    setLocationMail('');
    setContactName('');
    setContactNumber('');
    setSelectedCompanyId('');
    setIsActive('Yes');
    setErrors({});
    setSubmitError(null);
  };

  const resetForm = () => {
    handleResetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const newErrors: Record<string, string> = {};

    // 1. Office Type validation
    if (!officeType || officeType === 'Choose') {
      newErrors.officeType = 'Please select an Office Type.';
    }

    // 2. Location Name validation
    if (!locationName.trim()) {
      newErrors.locationName = 'Location Name is required.';
    } else if (locationName.trim().length < 2) {
      newErrors.locationName = 'Location Name must be at least 2 characters.';
    } else if (locationName.trim().length > 100) {
      newErrors.locationName = 'Location Name cannot exceed 100 characters.';
    }

    // 3. Address Line 1 validation
    if (!addressLine1.trim()) {
      newErrors.addressLine1 = 'Address Line 1 is required.';
    } else if (addressLine1.trim().length < 3) {
      newErrors.addressLine1 = 'Address Line 1 must be at least 3 characters.';
    }

    // 4. Country validation
    if (!country.trim()) {
      newErrors.country = 'Country is required.';
    }

    // 5. ZIP Code validation (India 6-digit strict rule)
    if (!zipCode.trim()) {
      newErrors.zipCode = 'ZIP / PIN Code is required.';
    } else {
      const isIndia = !country || country.toLowerCase() === 'india';
      if (isIndia) {
        if (!/^\d{6}$/.test(zipCode.trim())) {
          newErrors.zipCode = 'PIN Code must be exactly 6 digits (e.g. 400708).';
        }
      } else if (!/^[A-Za-z0-9\s-]{3,10}$/.test(zipCode.trim())) {
        newErrors.zipCode = 'Invalid Postal / ZIP Code format (3-10 characters).';
      }
    }

    // 6. Postal Area validation
    if (!postalArea.trim()) {
      newErrors.postalArea = 'Postal Area is required.';
    } else if (postalArea.trim().length < 2) {
      newErrors.postalArea = 'Postal Area must be at least 2 characters.';
    }

    // 7. District validation
    if (!district.trim()) {
      newErrors.district = 'District is required.';
    } else if (district.trim().length < 2) {
      newErrors.district = 'District must be at least 2 characters.';
    }

    // 8. State validation
    if (!formState.trim()) {
      newErrors.formState = 'State is required.';
    } else if (formState.trim().length < 2) {
      newErrors.formState = 'State must be at least 2 characters.';
    }

    // 9. Default Currency Format validation
    if (!currencyFormat || currencyFormat === '- Select -') {
      newErrors.currencyFormat = 'Please select a Default Currency Format.';
    }

    // 10. Location Mail validation (Optional, but if filled, validate format)
    if (locationMail.trim()) {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(locationMail.trim())) {
        newErrors.locationMail = 'Please enter a valid Location Email address.';
      }
    }

    // 11. Contact Number validation (Optional, but if filled, validate digits length)
    if (contactNumber.trim()) {
      const digitsOnly = contactNumber.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        newErrors.contactNumber = 'Contact Number must contain 10-15 digits (e.g. +91 9876543210).';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      showToast.error('Validation Error', firstError);
      return;
    }

    setErrors({});

    try {
      const payload = {
        locationName: locationName.trim(),
        officeType: officeType === 'Choose' ? null : officeType,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        country: country.trim(),
        zipCode: zipCode.trim(),
        postalArea: postalArea.trim(),
        city: city.trim() || null,
        district: district.trim(),
        state: formState.trim(),
        currencyFormat: currencyFormat === '- Select -' ? null : currencyFormat,
        locationMail: locationMail.trim() || null,
        contactName: contactName.trim() || null,
        contactNumber: contactNumber.trim() || null,
        companyId: selectedCompanyId ? parseInt(selectedCompanyId, 10) : null,
        isActive,
      };

      if (editingId) {
        const result = await updateLocationMutation.mutateAsync({ id: editingId, data: payload as any });
        if (onSave) onSave(result);
        showToast.success('Location Updated', `${locationName} updated successfully.`);
      } else {
        const result = await createLocationMutation.mutateAsync(payload as any);
        if (onSave) onSave(result);
        showToast.success('Location Created', `${locationName} created successfully.`);
      }
      await refetchLocations();
      resetForm();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save location. Please try again.';
      setSubmitError(errMsg);
      showToast.error('Save Failed', errMsg);
    }
  };

  // Map server records to display format
  const serverLocations = (locationsData?.items || locationsData?.data || []) as any[];

  const filteredDisplayList = serverLocations.filter(item => {
    const itemActive = item.isActive === 'Yes' || item.is_active === 'Yes' || item.status === 'active';
    if (statusFilter === 'Active' && !itemActive) return false;
    if (statusFilter === 'Inactive' && itemActive) return false;
    const itemType = item.officeType || item.office_type;
    if (typeFilter !== 'All' && itemType !== typeFilter) return false;
    if (displaySearch.trim()) {
      const q = displaySearch.toLowerCase();
      const name = (item.locationName || item.location_name || item.name || '').toLowerCase();
      const cityVal = (item.city || '').toLowerCase();
      const stateVal = (item.state || '').toLowerCase();
      const countryVal = (item.country || '').toLowerCase();
      const postal = (item.postalArea || item.postal_area || '').toLowerCase();
      const contactNo = (item.contactNumber || item.contact_number || '').toLowerCase();
      const contactNm = (item.contactName || item.contact_name || '').toLowerCase();
      if (!name.includes(q) && !cityVal.includes(q) && !stateVal.includes(q) && !countryVal.includes(q) && !postal.includes(q) && !contactNo.includes(q) && !contactNm.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout: Left Form (lg:col-span-7), Right Display List (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Add / Edit Location Form (lg:col-span-7)                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-6">
          {/* Form Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  {editingId ? `Edit Location` : 'Add Location'}
                  {editingId ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      {isActive === 'Yes' ? 'Active' : 'Inactive'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      New
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Configure office location profile, address, regional parameters, and company assignment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetForm}
                title="Reset Form"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 1: Office Classification & Name */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>1. Classification & Identification</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Office Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Office Type <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-muted-foreground">Classification</span>
                  </label>
                  <select
                    value={officeType}
                    onChange={(e) => handleOfficeTypeChange(e.target.value)}
                    className={cn(
                      "w-full h-10 px-3 text-xs border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium",
                      errors.officeType ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10" : "border-input"
                    )}
                  >
                    <option value="Choose">Choose Office Type</option>
                    <option value="Head Office">Head Office</option>
                    <option value="Branch Office">Branch Office</option>
                    <option value="Regional Office">Zonal Office</option>
                  </select>
                  {errors.officeType && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.officeType}
                    </p>
                  )}
                </div>

                {/* Location Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Location Name <span className="text-rose-500">*</span></span>
                    {locationName && <span className="text-[10px] text-muted-foreground">{locationName.length} chars</span>}
                  </label>
                  <Input
                    type="text"
                    value={locationName}
                    onChange={(e) => handleLocationNameChange(e.target.value)}
                    placeholder="e.g. Airoli Office / Corporate HQ"
                    className={cn(
                      "text-xs h-10 bg-background rounded-xl transition-all",
                      errors.locationName && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.locationName && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.locationName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Physical Address & Location */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>2. Address & Geographical Details</span>
              </div>

              {/* Address Line 1 & Line 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Address Line 1 <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => handleAddress1Change(e.target.value)}
                    placeholder="Building, Street, Suite No."
                    className={cn(
                      "text-xs h-10 bg-background rounded-xl transition-all",
                      errors.addressLine1 && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.addressLine1 && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.addressLine1}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Address Line 2
                  </label>
                  <Input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => handleAddress2Change(e.target.value)}
                    placeholder="Landmark, Area, Floor"
                    className="text-xs h-10 bg-background rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Country, State, District */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className={cn(
                      "w-full h-10 px-3 text-xs border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium",
                      errors.country ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10" : "border-input"
                    )}
                  >
                    {WORLD_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.country}
                    </p>
                  )}
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className={cn(
                      "text-xs h-10 bg-background rounded-xl transition-all",
                      errors.formState && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.formState && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.formState}
                    </p>
                  )}
                </div>

                {/* District */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    placeholder="e.g. Thane / Mumbai"
                    className={cn(
                      "text-xs h-10 bg-background rounded-xl transition-all",
                      errors.district && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.district && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.district}
                    </p>
                  )}
                </div>
              </div>

              {/* City, ZIP Code, Postal Area */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    City
                  </label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    placeholder="e.g. Navi Mumbai / Pune"
                    className="text-xs h-10 bg-background rounded-xl transition-all"
                  />
                </div>

                {/* ZIP / PIN Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>ZIP / PIN Code <span className="text-rose-500">*</span></span>
                    {(!country || country.toLowerCase() === 'india') && (
                      <span className="text-[10px] text-muted-foreground font-mono">6 Digits ({zipCode.length}/6)</span>
                    )}
                  </label>
                  <Input
                    type="text"
                    value={zipCode}
                    maxLength={(!country || country.toLowerCase() === 'india') ? 6 : 10}
                    onChange={(e) => handleZipCodeChange(e.target.value)}
                    placeholder={(!country || country.toLowerCase() === 'india') ? "e.g. 400708" : "Postal Code"}
                    className={cn(
                      "text-xs h-10 font-mono bg-background rounded-xl transition-all",
                      errors.zipCode && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.zipCode && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.zipCode}
                    </p>
                  )}
                </div>

                {/* Postal Area */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Postal Area <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={postalArea}
                    onChange={(e) => handlePostalAreaChange(e.target.value)}
                    placeholder="e.g. Airoli, Bandra"
                    className={cn(
                      "text-xs h-10 bg-background rounded-xl transition-all",
                      errors.postalArea && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.postalArea && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.postalArea}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Regional Currency & Contact Info */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-primary" />
                <span>3. Currency & Official Contact</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Default Currency Format */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Default Currency Format <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={currencyFormat}
                    onChange={(e) => handleCurrencyFormatChange(e.target.value)}
                    className={cn(
                      "w-full h-10 px-3 text-xs border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium",
                      errors.currencyFormat ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10" : "border-input"
                    )}
                  >
                    <option value="- Select -">- Select Currency -</option>
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                  {errors.currencyFormat && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.currencyFormat}
                    </p>
                  )}
                </div>

                {/* Location Mail */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Location Mail
                  </label>
                  <Input
                    type="email"
                    value={locationMail}
                    onChange={(e) => handleLocationMailChange(e.target.value)}
                    placeholder="location@company.com"
                    className={cn(
                      "text-xs h-10 bg-background rounded-xl transition-all",
                      errors.locationMail && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.locationMail && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.locationMail}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Contact Person Name
                  </label>
                  <Input
                    type="text"
                    value={contactName}
                    onChange={(e) => handleContactNameChange(e.target.value)}
                    placeholder="e.g. Branch Manager / Location Admin"
                    className="text-xs h-10 bg-background rounded-xl transition-all"
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Contact Number</span>
                    <span className="text-[10px] text-muted-foreground font-mono">10-15 digits</span>
                  </label>
                  <Input
                    type="text"
                    value={contactNumber}
                    maxLength={16}
                    onChange={(e) => handleContactNumberChange(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={cn(
                      "text-xs h-10 bg-background rounded-xl transition-all",
                      errors.contactNumber && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                    )}
                  />
                  {errors.contactNumber && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.contactNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: Company Accordion */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>4. Company Assignment</span>
              </div>

              <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsCompanyExpanded(!isCompanyExpanded)}
                  className="w-full p-3.5 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between font-semibold text-foreground text-xs"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Assign to Company</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {companiesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {isCompanyExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isCompanyExpanded && (
                  <div className="p-4 bg-background border-t border-border/60 space-y-3">
                    {companiesLoading ? (
                      <div className="text-xs text-muted-foreground py-2 text-center flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        <span>Loading companies...</span>
                      </div>
                    ) : companiesData.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2 text-center">No companies registered in system.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {companiesData.map((c) => {
                          const isChecked = selectedCompanyId === String(c.id);
                          return (
                            <label
                              key={c.id}
                              className={cn(
                                "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                                isChecked
                                  ? "border-primary bg-primary/5 text-foreground font-semibold shadow-2xs"
                                  : "border-border/70 hover:border-primary/40 bg-card text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <input
                                type="radio"
                                name="company"
                                value={String(c.id)}
                                checked={isChecked}
                                onChange={() => setSelectedCompanyId(String(c.id))}
                                className="h-3.5 w-3.5 text-primary focus:ring-primary/30 border-input"
                              />
                              <span className="truncate">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 5: Active Status Controls */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>5. Status & Access Controls</span>
              </div>

              <div className="p-3.5 border border-border/80 rounded-2xl bg-card space-y-2 max-w-xs">
                <label className="text-xs font-bold text-foreground block">Active Status</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsActive('Yes')}
                    className={cn(
                      'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                      isActive === 'Yes'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-background text-muted-foreground border-border hover:bg-accent'
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive('No')}
                    className={cn(
                      'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                      isActive === 'No'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-background text-muted-foreground border-border hover:bg-accent'
                    )}
                  >
                    <XCircle className="h-3.5 w-3.5" /> No
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Error Banner */}
            {submitError && (
              <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="text-xs h-10 px-4 rounded-xl"
                  disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-6 rounded-xl shadow-xs gap-2"
              >
                {createLocationMutation.isPending || updateLocationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : editingId ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Update Location</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add Location</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>


        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Location Records Directory (lg:col-span-5)                  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-4">
          
          {/* Directory Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Location Records</h3>
              <Badge variant="secondary" className="text-xs font-semibold rounded-full px-2.5">
                {filteredDisplayList.length}
              </Badge>
            </div>

            <Button
              onClick={handleResetForm}
              size="sm"
              className="text-xs font-semibold h-9 px-3 rounded-xl gap-1.5 transition-all shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Add Location</span>
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {/* Type Category Dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                <option value="All">All Types</option>
                <option value="Head Office">Head Office</option>
                <option value="Branch Office">Branch Office</option>
                <option value="Regional Office">Zonal Office</option>
              </select>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={displaySearch}
                  onChange={(e) => setDisplaySearch(e.target.value)}
                  className="pl-8 text-xs h-9 bg-background rounded-xl"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          {/* Location Cards Directory List */}
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {locationsLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Loading locations from database...</span>
              </div>
            ) : filteredDisplayList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No location records found.</p>
                <p className="text-[11px]">Click "Add Location" above to register an office location.</p>
              </div>
            ) : (
              filteredDisplayList.map((item: any) => {
                const phone = item.contactNumber || item.contact_number;
                const contactNm = item.contactName || item.contact_name;
                const locName = item.locationName || item.location_name || item.name || '—';
                const officeType = item.officeType || item.office_type || 'Office';
                const isItemActive = item.isActive === 'Yes' || item.is_active === 'Yes' || item.status === 'active';
                const isSelected = editingId === item.id;
                const locationStr = [item.city, item.state, item.country].filter(Boolean).join(', ') || 'No address specified';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectForEdit(item)}
                    className={cn(
                      'p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group shadow-2xs space-y-2',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                        : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-sm font-bold truncate', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                            {locName}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0 shrink-0',
                              isSelected
                                ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                                : 'bg-muted/50 text-muted-foreground border-border'
                            )}
                          >
                            {officeType}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px]">
                          <MapPin className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')} />
                          <span className={cn('truncate', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                            {locationStr}
                          </span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : isItemActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                        )}
                      >
                        {isItemActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Sub Info Row */}
                    <div className={cn('pt-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-2', isSelected ? 'border-primary-foreground/20 text-primary-foreground/80' : 'border-border/40 text-muted-foreground')}>
                      {phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {phone}
                        </span>
                      )}
                      {contactNm && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <User className="h-3 w-3 shrink-0" /> {contactNm}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

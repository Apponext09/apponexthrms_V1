import React, { useState } from 'react';
import { Plus, X, Info, MapPin, Phone, Search, Building2, CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCheck, ShieldCheck, Mail, User, Globe, Hash, Loader2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '../hooks/useLocations';
import { useCompanies } from '../hooks/useCompanies';

const WORLD_COUNTRIES = [
  'India', // Listed at top as requested
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

// Remove static COMPANY_OPTIONS and CONSULTANT_OPTIONS — now loaded from API

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
  const { data: locationsData, isLoading: locationsLoading, refetch: refetchLocations } = useLocations();
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

  // Submit error state
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSelectForEdit = (item: any) => {
    setEditingId(item.id);
    setLocationName(item.locationName || item.location_name || item.name || '');
    setOfficeType(item.officeType || item.office_type || 'Choose');
    setAddressLine1(item.addressLine1 || item.address_line1 || '');
    setAddressLine2(item.addressLine2 || item.address_line2 || '');
    setCountry(item.country || 'India');
    setZipCode(item.zipCode || item.zip_code || '');
    setPostalArea(item.postalArea || item.postal_area || '');
    setCity(item.city || '');
    setDistrict(item.district || '');
    setFormState(item.state || 'Maharashtra');
    setCurrencyFormat(item.currencyFormat || item.default_currency_format || '- Select -');
    setLocationMail(item.locationMail || item.location_mail || '');
    setContactName(item.contactName || item.contact_name || '');
    setContactNumber(item.contactNumber || item.contact_number || '');
    const compId = item.companyId || item.company_id;
    setSelectedCompanyId(compId ? String(compId) : '');
    const isInactive = item.isActive === 'No' || item.is_active === 'No' || item.status === 'inactive';
    setIsActive(isInactive ? 'No' : 'Yes');
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
    setSubmitError(null);
  };

  const resetForm = () => {
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
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!locationName.trim()) {
      setSubmitError('Location Name is required.');
      return;
    }

    try {
      const payload = {
        locationName: locationName.trim(),
        officeType: officeType === 'Choose' ? null : officeType,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        country,
        zipCode: zipCode || null,
        postalArea: postalArea || null,
        city: city || null,
        district: district || null,
        state: formState || null,
        currencyFormat: currencyFormat === '- Select -' ? null : currencyFormat,
        locationMail: locationMail || null,
        contactName: contactName || null,
        contactNumber: contactNumber || null,
        companyId: selectedCompanyId ? parseInt(selectedCompanyId) : null,
        isActive,
      };

      if (editingId) {
        const result = await updateLocationMutation.mutateAsync({ id: editingId, data: payload as any });
        if (onSave) onSave(result);
      } else {
        const result = await createLocationMutation.mutateAsync(payload as any);
        if (onSave) onSave(result);
      }
      await refetchLocations();
      resetForm();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Failed to save location. Please try again.');
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
        {/* LEFT COLUMN: + Add Location Form                                           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-5">
          {/* Title Bar - Clean & Minimal matching Apponext HRMS theme */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground tracking-tight">Add Location</h3>
                <p className="text-[11px] text-muted-foreground">Fill in office details and configuration parameters</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {/* Office Type */}
            <div className="space-y-1.5">
              <label className="block text-foreground font-bold">
                Office Type <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <select
                  value={officeType}
                  onChange={(e) => setOfficeType(e.target.value)}
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                >
                  <option value="Choose">Choose</option>
                  <option value="Head Office">Head Office</option>
                  <option value="Branch Office">Branch Office</option>
                  <option value="Regional Office">Zonal Office</option>
                
                </select>
                <div title="Select classification type for this office location" className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Location Name */}
            <div className="space-y-1.5">
              <label className="block text-foreground font-bold">
                Location Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Airoli Office / Corporate HQ"
                className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Address Line 1 & Address Line 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Building / Street Address"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Landmark / Suite / Floor"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Country, ZIP Code, Postal Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Country with India at top */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Country <span className="text-rose-500">*</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                >
                  {WORLD_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* ZIP Code */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  ZIP Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-medium"
                />
              </div>

              {/* Postal Area */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Postal Area <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={postalArea}
                  onChange={(e) => setPostalArea(e.target.value)}
                  placeholder="e.g. Airoli, Bandra, Connaught Place"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* City, District, State */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  District <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  State <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Default Currency Format & Location Mail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Default Currency Format <span className="text-rose-500">*</span>
                </label>
                <select
                  value={currencyFormat}
                  onChange={(e) => setCurrencyFormat(e.target.value)}
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                >
                  <option value="- Select -">- Select -</option>
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Location Mail
                </label>
                <input
                  type="email"
                  value={locationMail}
                  onChange={(e) => setLocationMail(e.target.value)}
                  placeholder="location@company.com"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Contact Name & Contact Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Branch Manager / Contact Person"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Accordions Section matching Screenshot 2 & 3 */}
            <div className="space-y-3 pt-2">
              {/* Company Accordion - loaded from API */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsCompanyExpanded(!isCompanyExpanded)}
                  className="w-full p-2.5 bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between font-bold text-foreground border-b border-border text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    {isCompanyExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span>Company</span>
                  </span>
                  {companiesLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </button>

                {isCompanyExpanded && (
                  <div className="p-3 bg-background">
                    {companiesLoading ? (
                      <div className="text-[11px] text-muted-foreground py-2 text-center">Loading companies...</div>
                    ) : companiesData.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground py-2 text-center">No companies available yet.</div>
                    ) : (
                      <div className="space-y-2">
                        <option value="">— Select Company —</option>
                        {companiesData.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer pl-1.5 transition-colors text-xs">
                            <input
                              type="radio"
                              name="company"
                              value={String(c.id)}
                              checked={selectedCompanyId === String(c.id)}
                              onChange={() => setSelectedCompanyId(String(c.id))}
                              className="h-3.5 w-3.5 text-primary focus:ring-primary/30 border-input"
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="space-y-1 pt-1">
              <label className="block text-foreground font-bold">
                Active
              </label>
              <div className="inline-flex rounded-xl border border-border bg-muted p-1 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setIsActive('Yes')}
                  className={cn(
                    'px-3.5 py-1 font-semibold rounded-lg transition-all',
                    isActive === 'Yes' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive('No')}
                  className={cn(
                    'px-3.5 py-1 font-semibold rounded-lg transition-all',
                    isActive === 'No' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  No
                </button>
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="submit"
                disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-5 rounded-xl flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createLocationMutation.isPending || updateLocationMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : editingId ? (
                  <><Edit2 className="h-4 w-4 stroke-[2.5]" /> Update Location</>
                ) : (
                  <><Plus className="h-4 w-4 stroke-[2.5]" /> Add Location</>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="bg-muted hover:bg-muted/80 text-foreground font-semibold h-9 px-4 rounded-xl flex items-center gap-1.5 text-xs border border-border transition-all cursor-pointer"
              >
                <X className="h-4 w-4 stroke-[2.5]" /> Cancel
              </button>
            </div>
          </form>
        </div>


        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Location Display & Search Panel (Clean & Minimal Theme)      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
          
          {/* Top Filter & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            {/* All Category Dropdown */}
            <div className="sm:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
              >
                <option value="All">All</option>
                <option value="Head Office">Head Office</option>
                <option value="Branch Office">Branch Office</option>
                <option value="Regional Office">Regional Office</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <input
                type="text"
                value={displaySearch}
                onChange={(e) => setDisplaySearch(e.target.value)}
                placeholder="Search term..."
                className="w-full h-8 pl-2.5 pr-7 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            {/* Active Dropdown */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          {/* Location Header Container */}
          <div className="border border-border rounded-xl p-4 space-y-3 bg-background/40">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <div className="p-1 rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <span>Location</span>
              </div>
              <span className="bg-muted text-foreground font-semibold text-[11px] px-2 py-0.5 rounded-full border border-border">
                {filteredDisplayList.length}
              </span>
            </div>

            {/* Location Cards List - Server Data */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-0.5">
              {locationsLoading ? (
                <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                  <Loader2 className="h-5 w-5 mx-auto animate-spin text-primary" />
                  <p>Loading locations...</p>
                </div>
              ) : filteredDisplayList.map((item: any) => {
                const phone = item.contactNumber || item.contact_number;
                const contactNm = item.contactName || item.contact_name;
                const locName = item.locationName || item.location_name || item.name || '—';
                const officeType = item.officeType || item.office_type || 'Office';
                const isActive = item.isActive === 'Yes' || item.is_active === 'Yes' || item.status === 'active';
                const isSelected = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectForEdit(item)}
                    className={cn(
                      "rounded-xl border p-3.5 space-y-2 cursor-pointer transition-all group hover:scale-[1.01]",
                      isSelected
                        ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/30"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-xs"
                    )}
                    title="Click to Edit Location"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        <span>
                          {locName}{item.city ? `, ${item.city}` : ''}{item.state ? `, ${item.state}` : ''}
                        </span>
                      </div>
                      <span className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-all" title="Edit Location">
                        <Edit2 className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground/70" />
                        <span> {phone || 'N/A'}</span>
                      </div>
                      {contactNm && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground/70" />
                          <span>{contactNm}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/50">
                      <span className="bg-primary/10 text-primary font-semibold text-[10px] px-2 py-0.5 rounded-md border border-primary/20">
                        {officeType}
                      </span>
                      {isActive ? (
                        <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {!locationsLoading && filteredDisplayList.length === 0 && (
                <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-1.5 bg-muted/20">
                  <MapPin className="h-6 w-6 mx-auto text-muted-foreground/50" />
                  <p className="font-semibold text-foreground">No locations found</p>
                  <p className="text-[11px] text-muted-foreground">Add a location using the form on the left.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Plus, X, Info, MapPin, Phone, Search, Filter, CheckCircle2, Building2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const COMPANY_OPTIONS = [
  { id: 'c1', name: 'Trial Company' },
  { id: 'c2', name: 'Apponext Technolabs Pvt Ltd' },
  { id: 'c3', name: 'Apponext Global Inc' }
];

const CONSULTANT_OPTIONS = [
  { id: 'cs1', name: 'test' },
  { id: 'cs2', name: 'Sruthi' },
  { id: 'cs3', name: 'Ramesh Consulting' }
];

export interface LocationRecordItem {
  id: string;
  officeType: string;
  locationName: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  zipCode: string;
  postalArea: string;
  city: string;
  district: string;
  state: string;
  currencyFormat: string;
  locationMail: string;
  contactName: string;
  contactNumber: string;
  selectedCompanies: string[];
  selectedConsultants: string[];
  isActive: boolean;
}

const INITIAL_LOCATION_LIST: LocationRecordItem[] = [
  {
    id: 'loc-1',
    officeType: 'Head Office',
    locationName: 'Airoli Office',
    addressLine1: 'Mindspace IT Park, Building 4',
    addressLine2: 'Thane Belapur Road',
    country: 'India',
    zipCode: '400708',
    postalArea: 'Airoli',
    city: 'Navi Mumbai',
    district: 'Thane',
    state: 'Maharashtra',
    currencyFormat: 'INR',
    locationMail: 'airoli.office@apponext.com',
    contactName: 'Rahul Sharma',
    contactNumber: 'N/A',
    selectedCompanies: ['c1', 'c2'],
    selectedConsultants: ['cs1', 'cs2'],
    isActive: true,
  },
];

interface LocationMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: any) => void;
}

export function LocationMasterForm({ onCancel, onSave }: LocationMasterFormProps) {
  // Saved Location Display List State (Right Side)
  const [locationsList, setLocationsList] = useState<LocationRecordItem[]>(INITIAL_LOCATION_LIST);
  
  // Right Side Search & Filter State
  const [displaySearch, setDisplaySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Form State (Left Side)
  const [officeType, setOfficeType] = useState('Choose');
  const [locationName, setLocationName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [country, setCountry] = useState('India'); // India selected by default at top
  const [zipCode, setZipCode] = useState('424306');
  const [postalArea, setPostalArea] = useState('Pimpalner');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('Dhule');
  const [state, setState] = useState('Maharashtra');
  const [currencyFormat, setCurrencyFormat] = useState('- Select -');
  const [locationMail, setLocationMail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Accordion Expand/Collapse States
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(true);
  const [isConsultantsExpanded, setIsConsultantsExpanded] = useState(true);

  // Checkbox Selection States
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['c1']);
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>(['cs1', 'cs2']);

  // Active Toggle Switch State
  const [isActive, setIsActive] = useState(true);

  // Handlers for Company Checkboxes
  const handleToggleCompany = (id: string) => {
    if (selectedCompanies.includes(id)) {
      setSelectedCompanies(selectedCompanies.filter(c => c !== id));
    } else {
      setSelectedCompanies([...selectedCompanies, id]);
    }
  };

  const handleSelectAllCompanies = () => {
    if (selectedCompanies.length === COMPANY_OPTIONS.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(COMPANY_OPTIONS.map(c => c.id));
    }
  };

  // Handlers for Consultants Checkboxes
  const handleToggleConsultant = (id: string) => {
    if (selectedConsultants.includes(id)) {
      setSelectedConsultants(selectedConsultants.filter(cs => cs !== id));
    } else {
      setSelectedConsultants([...selectedConsultants, id]);
    }
  };

  const handleSelectAllConsultants = () => {
    if (selectedConsultants.length === CONSULTANT_OPTIONS.length) {
      setSelectedConsultants([]);
    } else {
      setSelectedConsultants(CONSULTANT_OPTIONS.map(cs => cs.id));
    }
  };

  const resetForm = () => {
    setOfficeType('Choose');
    setLocationName('');
    setAddressLine1('');
    setAddressLine2('');
    setCountry('India');
    setZipCode('424306');
    setPostalArea('Pimpalner');
    setCity('');
    setDistrict('Dhule');
    setState('Maharashtra');
    setCurrencyFormat('- Select -');
    setLocationMail('');
    setContactName('');
    setContactNumber('');
    setSelectedCompanies(['c1']);
    setSelectedConsultants(['cs1', 'cs2']);
    setIsActive(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLocation: LocationRecordItem = {
      id: `loc-${Date.now()}`,
      officeType,
      locationName: locationName || 'New Office Location',
      addressLine1,
      addressLine2,
      country,
      zipCode,
      postalArea,
      city,
      district,
      state,
      currencyFormat,
      locationMail,
      contactName,
      contactNumber,
      selectedCompanies,
      selectedConsultants,
      isActive
    };

    setLocationsList([newLocation, ...locationsList]);
    if (onSave) onSave(newLocation);
    resetForm();
  };

  // Filtered list for right side display
  const filteredDisplayList = locationsList.filter(item => {
    // Status filter
    if (statusFilter === 'Active' && !item.isActive) return false;
    if (statusFilter === 'Inactive' && item.isActive) return false;

    // Type filter
    if (typeFilter !== 'All' && item.officeType !== typeFilter) return false;

    // Search query
    if (displaySearch.trim()) {
      const q = displaySearch.toLowerCase();
      const matchName = item.locationName.toLowerCase().includes(q);
      const matchCity = item.city.toLowerCase().includes(q);
      const matchState = item.state.toLowerCase().includes(q);
      const matchCountry = item.country.toLowerCase().includes(q);
      const matchPostal = item.postalArea.toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchState && !matchCountry && !matchPostal) return false;
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
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-xs text-gray-800 dark:text-gray-200 space-y-4">
          {/* Title Bar matching screenshot 1 */}
          <div className="flex items-center gap-1.5 font-bold text-base text-gray-800 dark:text-gray-100 border-b pb-3 border-gray-200 dark:border-gray-800">
            <Plus className="h-4 w-4 text-gray-700 dark:text-gray-300 stroke-[3]" />
            <span>Add Location</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {/* Office Type */}
            <div className="space-y-1">
              <label className="block text-gray-700 dark:text-gray-300 font-bold">
                Office Type <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <select
                  value={officeType}
                  onChange={(e) => setOfficeType(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Choose">Choose</option>
                  <option value="Head Office">Head Office</option>
                  <option value="Branch Office">Branch Office</option>
                  <option value="Regional Office">Regional Office</option>
                  <option value="Factory / Plant">Factory / Plant</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="R&D Center">R&D Center</option>
                  <option value="Sales Office">Sales Office</option>
                </select>
                <span title="Select classification type for this office location" className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <Info className="h-4 w-4" />
                </span>
              </div>
            </div>

            {/* Location Name */}
            <div className="space-y-1">
              <label className="block text-gray-700 dark:text-gray-300 font-bold">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder=""
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Address Line 1 & Address Line 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Country, ZIP Code, Postal Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Country with India at top */}
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  {WORLD_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* ZIP Code */}
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Postal Area */}
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Postal Area <span className="text-red-500">*</span>
                </label>
                <select
                  value={postalArea}
                  onChange={(e) => setPostalArea(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  <option value="Pimpalner">Pimpalner</option>
                  <option value="Central Zone">Central Zone</option>
                  <option value="Industrial Area">Industrial Area</option>
                  <option value="IT Park Zone">IT Park Zone</option>
                </select>
              </div>
            </div>

            {/* City, District, State */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Default Currency Format & Location Mail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Default Currency Format <span className="text-red-500">*</span>
                </label>
                <select
                  value={currencyFormat}
                  onChange={(e) => setCurrencyFormat(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  <option value="- Select -">- Select -</option>
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Location Mail
                </label>
                <input
                  type="email"
                  value={locationMail}
                  onChange={(e) => setLocationMail(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Contact Name & Contact Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-700 dark:text-gray-300 font-bold">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Accordions Section matching Screenshot 2 & 3 */}
            <div className="space-y-3 pt-2">
              {/* Company Accordion */}
              <div className="border border-gray-300 dark:border-gray-700 rounded overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsCompanyExpanded(!isCompanyExpanded)}
                  className="w-full p-2.5 bg-gray-200 dark:bg-gray-800 flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700 text-xs"
                >
                  <span>[+] Company <span className="text-red-500">*</span></span>
                  <span className="bg-gray-800 dark:bg-gray-900 text-white rounded-full text-[11px] w-5 h-5 flex items-center justify-center font-bold">
                    {selectedCompanies.length}
                  </span>
                </button>

                {isCompanyExpanded && (
                  <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
                    <label className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.length === COMPANY_OPTIONS.length}
                        onChange={handleSelectAllCompanies}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span>{selectedCompanies.length === COMPANY_OPTIONS.length ? 'Unselect All' : 'Select All'}</span>
                    </label>

                    {COMPANY_OPTIONS.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer pl-2">
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(c.id)}
                          onChange={() => handleToggleCompany(c.id)}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Consultants Accordion */}
              <div className="border border-gray-300 dark:border-gray-700 rounded overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsConsultantsExpanded(!isConsultantsExpanded)}
                  className="w-full p-2.5 bg-gray-200 dark:bg-gray-800 flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700 text-xs"
                >
                  <span>[+] Consultants</span>
                  <span className="bg-gray-800 dark:bg-gray-900 text-white rounded-full text-[11px] w-5 h-5 flex items-center justify-center font-bold">
                    {selectedConsultants.length}
                  </span>
                </button>

                {isConsultantsExpanded && (
                  <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
                    <label className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedConsultants.length === CONSULTANT_OPTIONS.length}
                        onChange={handleSelectAllConsultants}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span>{selectedConsultants.length === CONSULTANT_OPTIONS.length ? 'Unselect All' : 'Select All'}</span>
                    </label>

                    {CONSULTANT_OPTIONS.map((cs) => (
                      <label key={cs.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer pl-2">
                        <input
                          type="checkbox"
                          checked={selectedConsultants.includes(cs.id)}
                          onChange={() => handleToggleConsultant(cs.id)}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span>{cs.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="space-y-1 pt-1">
              <label className="block text-gray-800 dark:text-gray-200 font-bold">
                Active
              </label>
              <div className="inline-flex rounded border border-gray-300 dark:border-gray-700 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={cn(
                    'px-4 py-1.5 font-bold transition-colors',
                    isActive ? 'bg-[#337ab7] text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={cn(
                    'px-4 py-1.5 font-bold transition-colors',
                    !isActive ? 'bg-[#337ab7] text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  No
                </button>
              </div>
            </div>

            {/* Action Buttons matching Screenshot 2 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="submit"
                className="bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold h-9 px-5 rounded flex items-center gap-1.5 text-xs shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4 stroke-[3]" /> Add
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="bg-[#dd4b39] hover:bg-[#c9302c] text-white font-bold h-9 px-5 rounded flex items-center gap-1.5 text-xs shadow-xs transition-colors"
              >
                <X className="h-4 w-4 stroke-[3]" /> Cancel
              </button>
            </div>
          </form>
        </div>


        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Location Display & Search Panel (matching latest screenshot) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-xs space-y-4">
          
          {/* Top Filter & Search Bar matching screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            {/* All Category Dropdown */}
            <div className="sm:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-8 px-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold"
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
                className="w-full h-8 pl-2 pr-7 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>

            {/* Active Dropdown */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 px-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          {/* Location Header Container with Top Cyan Border & Count Badge */}
          <div className="border border-gray-200 dark:border-gray-800 border-t-2 border-t-cyan-500 rounded p-4 space-y-4 bg-gray-50/50 dark:bg-gray-850/50">
            <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-1.5 font-bold text-sm text-gray-800 dark:text-gray-200">
                <MapPin className="h-4 w-4 text-cyan-600" />
                <span>Location</span>
              </div>
              <span className="font-bold text-xs text-gray-800 dark:text-gray-200">
                {filteredDisplayList.length}
              </span>
            </div>

            {/* Cards List Display */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredDisplayList.map((item) => (
                <div
                  key={item.id}
                  className="rounded overflow-hidden border border-cyan-400/40 shadow-xs transition-all bg-emerald-500/90 text-white p-3.5 space-y-1.5"
                  style={{ backgroundColor: '#26b99a' }} // Matching exact teal/cyan color from screenshot
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight text-white">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {item.postalArea || item.locationName}, {item.state || 'Maharashtra'}, {item.country || 'India'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-emerald-100 font-semibold pt-0.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>📞 {item.contactNumber || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/20 text-white/90">
                    <span className="font-semibold">{item.officeType}</span>
                    <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}

              {filteredDisplayList.length === 0 && (
                <div className="text-center py-10 border border-dashed border-gray-300 dark:border-gray-700 rounded text-gray-500 text-xs space-y-1">
                  <MapPin className="h-6 w-6 mx-auto text-gray-400" />
                  <p className="font-bold">No locations found</p>
                  <p className="text-[11px]">Fill out the form on the left to add your first location.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

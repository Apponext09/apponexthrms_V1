import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RotateCcw, MapPin, Search, Building2, HelpCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';

export interface CompanyRecordItem {
  id: string;
  code: string;
  name: string;
  employerName: string;
  classOfEstablishment: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  zipCode: string;
  state: string;
  city: string;
  panTin: string;
  contactNumber: string;
  email: string;
  logo: string;
  companyStamp: string;
  signature: string;
  isActiveToggle: boolean;
  activeUsersToggle: boolean;
  loginPageLogoToggle: boolean;
  status: 'Active' | 'Inactive';
}

// Dependent Location Dataset (Country -> State -> City -> Default ZIP)
const LOCATION_DATA: Record<
  string,
  Record<string, { cities: string[]; zipDefault: string }>
> = {
  India: {
    Maharashtra: { cities: ['Thane', 'Mumbai', 'Navi Mumbai', 'Pune', 'Nagpur', 'Nashik'], zipDefault: '400708' },
    Karnataka: { cities: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi'], zipDefault: '560001' },
    Delhi: { cities: ['New Delhi', 'North Delhi', 'South Delhi'], zipDefault: '110001' },
    'Uttar Pradesh': { cities: ['Noida', 'Lucknow', 'Kanpur', 'Agra'], zipDefault: '201301' },
    Gujarat: { cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'], zipDefault: '380001' },
    'Tamil Nadu': { cities: ['Chennai', 'Coimbatore', 'Madurai'], zipDefault: '600001' },
  },
  'United States': {
    California: { cities: ['San Jose', 'San Francisco', 'Los Angeles', 'San Diego', 'Sacramento'], zipDefault: '94025' },
    'New York': { cities: ['New York City', 'Buffalo', 'Albany', 'Rochester'], zipDefault: '10001' },
    Texas: { cities: ['Austin', 'Dallas', 'Houston', 'San Antonio'], zipDefault: '73301' },
    Florida: { cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'], zipDefault: '33101' },
  },
  'United Kingdom': {
    England: { cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'], zipDefault: 'EC1A 1BB' },
    Scotland: { cities: ['Edinburgh', 'Glasgow', 'Aberdeen'], zipDefault: 'EH1 1YZ' },
  },
  Australia: {
    'New South Wales': { cities: ['Sydney', 'Newcastle', 'Wollongong'], zipDefault: '2000' },
    Victoria: { cities: ['Melbourne', 'Geelong', 'Ballarat'], zipDefault: '3000' },
  },
  Canada: {
    Ontario: { cities: ['Toronto', 'Ottawa', 'Hamilton', 'Mississauga'], zipDefault: 'M5H 2N2' },
    'British Columbia': { cities: ['Vancouver', 'Victoria', 'Surrey'], zipDefault: 'V6B 1A1' },
  },
};

interface CompanyMasterFormProps {
  hideFiltersAndList?: boolean;
  isNew?: boolean;
  companiesList?: CompanyRecordItem[];
  onCancel?: () => void;
  onSave?: (company: CompanyRecordItem) => void;
}

export function CompanyMasterForm({
  hideFiltersAndList = false,
  isNew = false,
  companiesList,
  onCancel,
  onSave,
}: CompanyMasterFormProps) {
  const [companies, setCompanies] = useState<CompanyRecordItem[]>(companiesList || []);

  // Sync external companiesList if provided from parent
  useEffect(() => {
    if (companiesList && companiesList.length > 0) {
      setCompanies(companiesList);
    }
  }, [companiesList]);

  const [selectedId, setSelectedId] = useState<string>(companiesList?.[0]?.id || '');

  // Keep selectedId valid when companies state is loaded
  useEffect(() => {
    if (companies.length > 0 && (!selectedId || !companies.some(c => c.id === selectedId))) {
      setSelectedId(companies[0].id);
    }
  }, [companies, selectedId]);

  // Filter States
  const [searchField, setSearchField] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Hidden File Input Refs for Device Image Uploads
  const logoFileRef = useRef<HTMLInputElement>(null);
  const stampFileRef = useRef<HTMLInputElement>(null);
  const sigFileRef = useRef<HTMLInputElement>(null);

  // Selected company object
  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedId) || companies[0] || null;
  }, [companies, selectedId]);

  // Form Fields State
  const [formName, setFormName] = useState(isNew ? '' : selectedCompany?.name || '');
  const [formEmployerName, setFormEmployerName] = useState(isNew ? '' : selectedCompany?.employerName || '');
  const [formClassOfEstablishment, setFormClassOfEstablishment] = useState(isNew ? '' : selectedCompany?.classOfEstablishment || '');
  const [formCode, setFormCode] = useState(isNew ? `COM-${Math.floor(100 + Math.random() * 900)}` : selectedCompany?.code || '');
  const [formAddress1, setFormAddress1] = useState(isNew ? '' : selectedCompany?.addressLine1 || '');
  const [formAddress2, setFormAddress2] = useState(isNew ? '' : selectedCompany?.addressLine2 || '');
  
  // Dependent Location State
  const [formCountry, setFormCountry] = useState(isNew ? 'India' : selectedCompany?.country || 'India');
  const [formState, setFormState] = useState(isNew ? 'Maharashtra' : selectedCompany?.state || 'Maharashtra');
  const [formCity, setFormCity] = useState(isNew ? 'Thane' : selectedCompany?.city || 'Thane');
  const [formZipCode, setFormZipCode] = useState(isNew ? '400708' : selectedCompany?.zipCode || '400708');

  const [formPanTin, setFormPanTin] = useState(isNew ? '' : selectedCompany?.panTin || '');
  const [formContactNumber, setFormContactNumber] = useState(isNew ? '' : selectedCompany?.contactNumber || '');
  const [formEmail, setFormEmail] = useState(isNew ? '' : selectedCompany?.email || '');
  const [formLogo, setFormLogo] = useState(isNew ? '' : selectedCompany?.logo || '');
  const [formCompanyStamp, setFormCompanyStamp] = useState(isNew ? '' : selectedCompany?.companyStamp || '');
  const [formSignature, setFormSignature] = useState(isNew ? '' : selectedCompany?.signature || '');
  const [formIsActiveToggle, setFormIsActiveToggle] = useState<boolean>(isNew ? true : selectedCompany?.isActiveToggle ?? true);
  const [formActiveUsersToggle, setFormActiveUsersToggle] = useState<boolean>(isNew ? true : selectedCompany?.activeUsersToggle ?? true);
  const [formLoginPageLogoToggle, setFormLoginPageLogoToggle] = useState<boolean>(isNew ? false : selectedCompany?.loginPageLogoToggle ?? false);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>(isNew ? 'Active' : selectedCompany?.status || 'Active');

  // Compute available states based on selected country
  const availableStates = useMemo(() => {
    if (!formCountry || !LOCATION_DATA[formCountry]) return [];
    return Object.keys(LOCATION_DATA[formCountry]);
  }, [formCountry]);

  // Compute available cities based on selected country & state
  const availableCities = useMemo(() => {
    if (!formCountry || !formState || !LOCATION_DATA[formCountry]?.[formState]) return [];
    return LOCATION_DATA[formCountry][formState].cities;
  }, [formCountry, formState]);

  // Handle Country change -> reset state, city & zip code
  const handleCountryChange = (countryVal: string) => {
    setFormCountry(countryVal);
    const states = LOCATION_DATA[countryVal] ? Object.keys(LOCATION_DATA[countryVal]) : [];
    if (states.length > 0) {
      const firstState = states[0];
      setFormState(firstState);
      const cities = LOCATION_DATA[countryVal][firstState].cities;
      if (cities.length > 0) {
        setFormCity(cities[0]);
        setFormZipCode(LOCATION_DATA[countryVal][firstState].zipDefault || '');
      } else {
        setFormCity('');
        setFormZipCode('');
      }
    } else {
      setFormState('');
      setFormCity('');
      setFormZipCode('');
    }
  };

  // Handle State change -> reset city & zip code
  const handleStateChange = (stateVal: string) => {
    setFormState(stateVal);
    if (formCountry && LOCATION_DATA[formCountry]?.[stateVal]) {
      const cities = LOCATION_DATA[formCountry][stateVal].cities;
      if (cities.length > 0) {
        setFormCity(cities[0]);
        setFormZipCode(LOCATION_DATA[formCountry][stateVal].zipDefault || '');
      } else {
        setFormCity('');
        setFormZipCode('');
      }
    } else {
      setFormCity('');
      setFormZipCode('');
    }
  };

  // Handle City change -> auto fill default zip code
  const handleCityChange = (cityVal: string) => {
    setFormCity(cityVal);
    if (formCountry && formState && LOCATION_DATA[formCountry]?.[formState]) {
      setFormZipCode(LOCATION_DATA[formCountry][formState].zipDefault || '');
    }
  };

  // Device File Upload Handlers (Read as Base64 Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setField: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setField(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sync form when selectedCompany changes
  useEffect(() => {
    if (!isNew && selectedCompany) {
      setFormName(selectedCompany.name);
      setFormEmployerName(selectedCompany.employerName);
      setFormClassOfEstablishment(selectedCompany.classOfEstablishment);
      setFormCode(selectedCompany.code);
      setFormAddress1(selectedCompany.addressLine1);
      setFormAddress2(selectedCompany.addressLine2);
      setFormCountry(selectedCompany.country);
      setFormState(selectedCompany.state);
      setFormCity(selectedCompany.city);
      setFormZipCode(selectedCompany.zipCode);
      setFormPanTin(selectedCompany.panTin);
      setFormContactNumber(selectedCompany.contactNumber);
      setFormEmail(selectedCompany.email);
      setFormLogo(selectedCompany.logo);
      setFormCompanyStamp(selectedCompany.companyStamp || '');
      setFormSignature(selectedCompany.signature || '');
      setFormIsActiveToggle(selectedCompany.isActiveToggle ?? true);
      setFormActiveUsersToggle(selectedCompany.activeUsersToggle ?? true);
      setFormLoginPageLogoToggle(selectedCompany.loginPageLogoToggle ?? false);
      setFormStatus(selectedCompany.status);
    }
  }, [selectedId, isNew, selectedCompany]);

  const handleSelectCompany = (comp: CompanyRecordItem) => {
    setSelectedId(comp.id);
  };

  const handleReset = () => {
    if (isNew) {
      setFormName('');
      setFormEmployerName('');
      setFormClassOfEstablishment('');
      setFormCode(`COM-${Math.floor(100 + Math.random() * 900)}`);
      setFormAddress1('');
      setFormAddress2('');
      setFormCountry('India');
      setFormState('Maharashtra');
      setFormCity('Thane');
      setFormZipCode('400708');
      setFormPanTin('');
      setFormContactNumber('');
      setFormEmail('');
      setFormLogo('');
      setFormCompanyStamp('');
      setFormSignature('');
      setFormIsActiveToggle(true);
      setFormActiveUsersToggle(true);
      setFormLoginPageLogoToggle(false);
      setFormStatus('Active');
    } else if (selectedCompany) {
      setFormName(selectedCompany.name);
      setFormEmployerName(selectedCompany.employerName);
      setFormClassOfEstablishment(selectedCompany.classOfEstablishment);
      setFormCode(selectedCompany.code);
      setFormAddress1(selectedCompany.addressLine1);
      setFormAddress2(selectedCompany.addressLine2);
      setFormCountry(selectedCompany.country);
      setFormState(selectedCompany.state);
      setFormCity(selectedCompany.city);
      setFormZipCode(selectedCompany.zipCode);
      setFormPanTin(selectedCompany.panTin);
      setFormContactNumber(selectedCompany.contactNumber);
      setFormEmail(selectedCompany.email);
      setFormLogo(selectedCompany.logo);
      setFormCompanyStamp(selectedCompany.companyStamp || '');
      setFormSignature(selectedCompany.signature || '');
      setFormIsActiveToggle(selectedCompany.isActiveToggle ?? true);
      setFormActiveUsersToggle(selectedCompany.activeUsersToggle ?? true);
      setFormLoginPageLogoToggle(selectedCompany.loginPageLogoToggle ?? false);
      setFormStatus(selectedCompany.status);
    }
  };

  // Load real company records from MySQL database on mount
  useEffect(() => {
    const fetchDbCompanies = async () => {
      try {
        const res = await apiClient.get('/settings/companies');
        if (res.data?.success && Array.isArray(res.data.data)) {
          const mapped: CompanyRecordItem[] = res.data.data.map((c: any) => ({
            id: String(c.companyId || c.company_id || c.id || c.uuid),
            code: c.code || '',
            name: c.name || '',
            employerName: c.employerName || c.employer_name || '',
            classOfEstablishment: c.classOfEstablishment || c.class_of_establishment || '',
            addressLine1: c.addressLine1 || c.addressLine_1 || c.address_line_1 || '',
            addressLine2: c.addressLine2 || c.addressLine_2 || c.address_line_2 || '',
            country: c.country || 'India',
            zipCode: c.zipCode || c.zip_code || '',
            state: c.state || '',
            city: c.city || '',
            panTin: c.panTin || c.pan_tin || '',
            contactNumber: c.contactNumber || c.contact_number || '',
            email: c.email || '',
            logo: c.logo || '',
            companyStamp: c.companyStamp || c.company_stamp || '',
            signature: c.signature || '',
            isActiveToggle: c.isActiveToggle === 1 || c.isActiveToggle === true || c.is_active_toggle === 1 || c.is_active_toggle === true,
            activeUsersToggle: c.activeUsersToggle === 1 || c.activeUsersToggle === true || c.active_users_toggle === 1 || c.active_users_toggle === true,
            loginPageLogoToggle: c.loginPageLogoToggle === 1 || c.loginPageLogoToggle === true || c.login_page_logo_toggle === 1 || c.login_page_logo_toggle === true,
            status: c.status || 'Active',
          }));
          setCompanies(mapped);
          if (mapped.length > 0) {
            setSelectedId(prev => (prev && mapped.some(m => m.id === prev) ? prev : mapped[0].id));
          }
        }
      } catch (err) {
        console.warn('DB company fetch error:', err);
      }
    };
    fetchDbCompanies();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload = {
      code: formCode || `COM-${Math.floor(100 + Math.random() * 900)}`,
      name: formName,
      employerName: formEmployerName,
      classOfEstablishment: formClassOfEstablishment,
      addressLine1: formAddress1,
      addressLine2: formAddress2,
      country: formCountry,
      zipCode: formZipCode,
      state: formState,
      city: formCity,
      panTin: formPanTin,
      contactNumber: formContactNumber,
      email: formEmail,
      logo: formLogo,
      companyStamp: formCompanyStamp,
      signature: formSignature,
      isActiveToggle: formIsActiveToggle,
      activeUsersToggle: formActiveUsersToggle,
      loginPageLogoToggle: formLoginPageLogoToggle,
      status: formStatus,
    };

    try {
      const isUpdating = !isNew && Boolean(selectedId);
      let res;
      if (isUpdating) {
        res = await apiClient.put(`/settings/companies/${selectedId}`, payload);
      } else {
        res = await apiClient.post('/settings/companies', payload);
      }

      if (res.data?.success && res.data.data) {
        const c = res.data.data;
        const savedCompany: CompanyRecordItem = {
          id: String(c.company_id || c.companyId || c.id || c.uuid),
          code: c.code || payload.code,
          name: c.name || payload.name,
          employerName: c.employer_name ?? c.employerName ?? payload.employerName,
          classOfEstablishment: c.class_of_establishment ?? c.classOfEstablishment ?? payload.classOfEstablishment,
          addressLine1: c.address_line_1 ?? c.addressLine1 ?? payload.addressLine1,
          addressLine2: c.address_line_2 ?? c.addressLine2 ?? payload.addressLine2,
          country: c.country ?? payload.country,
          zipCode: c.zip_code ?? c.zipCode ?? payload.zipCode,
          state: c.state ?? payload.state,
          city: c.city ?? payload.city,
          panTin: c.pan_tin ?? c.panTin ?? payload.panTin,
          contactNumber: c.contact_number ?? c.contactNumber ?? payload.contactNumber,
          email: c.email ?? payload.email,
          logo: c.logo ?? payload.logo,
          companyStamp: c.company_stamp ?? c.companyStamp ?? payload.companyStamp,
          signature: c.signature ?? payload.signature,
          isActiveToggle: c.is_active_toggle !== undefined ? Boolean(c.is_active_toggle) : payload.isActiveToggle,
          activeUsersToggle: c.active_users_toggle !== undefined ? Boolean(c.active_users_toggle) : payload.activeUsersToggle,
          loginPageLogoToggle: c.login_page_logo_toggle !== undefined ? Boolean(c.login_page_logo_toggle) : payload.loginPageLogoToggle,
          status: c.status || payload.status,
        };

        setCompanies((prev) => {
          const exists = prev.some((item) => item.id === savedCompany.id);
          if (exists) {
            return prev.map((item) => (item.id === savedCompany.id ? savedCompany : item));
          }
          return [savedCompany, ...prev];
        });

        setSelectedId(savedCompany.id);
        if (onSave) onSave(savedCompany);
        alert('Company Information saved to database successfully!');
      } else {
        alert(`Failed to save company: ${res.data?.error?.message || 'Unknown database error'}`);
      }
    } catch (err: any) {
      console.error('Save to database endpoint error:', err);
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Database error';
      alert(`Failed to save company to database: ${errMsg}`);
    }
  };

  // Filter Companies for Right Side List
  const filteredCompanies = useMemo(() => {
    let list = companies;

    if (statusFilter !== 'All') {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();

    return list.filter((c) => {
      if (searchField === 'name') return c.name.toLowerCase().includes(q);
      if (searchField === 'code') return c.code.toLowerCase().includes(q);
      if (searchField === 'state') return c.state.toLowerCase().includes(q);
      if (searchField === 'city') return c.city.toLowerCase().includes(q);
      if (searchField === 'zipCode') return c.zipCode.toLowerCase().includes(q);
      if (searchField === 'contactNo') return c.contactNumber.toLowerCase().includes(q);
      if (searchField === 'email') return c.email.toLowerCase().includes(q);
      // 'all'
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.zipCode.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [companies, statusFilter, searchQuery, searchField]);

  // Main Form Component JSX
  const formElement = (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Hidden Device File Inputs */}
      <input
        type="file"
        ref={logoFileRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, setFormLogo)}
      />
      <input
        type="file"
        ref={stampFileRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, setFormCompanyStamp)}
      />
      <input
        type="file"
        ref={sigFileRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, setFormSignature)}
      />

      {/* Form Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            {isNew ? 'Add New Company' : selectedCompany ? `Edit ${selectedCompany.name}` : 'Company Details'}
          </h2>
        </div>

        <button
          type="button"
          onClick={handleReset}
          title="Reset Form"
          className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Top Company Metadata Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Company Name <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Enter Company Name"
            className="text-xs h-10 bg-background rounded-xl"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Employer Name</label>
            <Input
              type="text"
              value={formEmployerName}
              onChange={(e) => setFormEmployerName(e.target.value)}
              placeholder="Employer Name"
              className="text-xs h-10 bg-background rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Class Of Establishment</label>
            <Input
              type="text"
              value={formClassOfEstablishment}
              onChange={(e) => setFormClassOfEstablishment(e.target.value)}
              placeholder="Class Of Establishment"
              className="text-xs h-10 bg-background rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Establishment Company Code</label>
          <Input
            type="text"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            placeholder="Establishment Company Code"
            className="text-xs h-10 font-mono bg-background rounded-xl"
          />
        </div>
      </div>

      {/* Fieldset: Registered Address (Cascading Dependent Selection: Country -> State -> City -> ZIP Code) */}
      <div className="border border-border rounded-xl p-4 space-y-4 bg-muted/20">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Registered Address</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Address Line 1 <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={formAddress1}
              onChange={(e) => setFormAddress1(e.target.value)}
              placeholder="Address Line 1"
              className="text-xs h-10 bg-background rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Address Line 2</label>
            <Input
              type="text"
              value={formAddress2}
              onChange={(e) => setFormAddress2(e.target.value)}
              placeholder="Address Line 2"
              className="text-xs h-10 bg-background rounded-xl"
            />
          </div>

          {/* Dependent Level 1: Country */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Country <span className="text-rose-500">*</span>
            </label>
            <select
              value={formCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground cursor-pointer"
              required
            >
              <option value="">Choose Country</option>
              {Object.keys(LOCATION_DATA).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Dependent Level 2: State */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              State <span className="text-rose-500">*</span>
            </label>
            {availableStates.length > 0 ? (
              <select
                value={formState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground cursor-pointer"
                required
              >
                <option value="">Choose State</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type="text"
                value={formState}
                onChange={(e) => setFormState(e.target.value)}
                placeholder="Enter State"
                className="text-xs h-10 bg-background rounded-xl"
                required
              />
            )}
          </div>

          {/* Dependent Level 3: City */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              City <span className="text-rose-500">*</span>
            </label>
            {availableCities.length > 0 ? (
              <select
                value={formCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground cursor-pointer"
                required
              >
                <option value="">Choose City</option>
                {availableCities.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type="text"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="Enter City"
                className="text-xs h-10 bg-background rounded-xl"
                required
              />
            )}
          </div>

          {/* Dependent Level 4: ZIP Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              ZIP Code <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={formZipCode}
              onChange={(e) => setFormZipCode(e.target.value)}
              placeholder="ZIP Code"
              className="text-xs h-10 bg-background rounded-xl"
              required
            />
          </div>
        </div>
      </div>

      {/* Statutory, Contact, Email & Device File Upload for Logo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            PAN/TIN <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </label>
          <Input
            type="text"
            value={formPanTin}
            onChange={(e) => setFormPanTin(e.target.value)}
            placeholder="PAN/TIN"
            className="text-xs h-10 bg-background rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Contact Number <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            value={formContactNumber}
            onChange={(e) => setFormContactNumber(e.target.value)}
            placeholder="Contact Number"
            className="text-xs h-10 bg-background rounded-xl"
            required
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-foreground">
            Email <span className="text-rose-500">*</span>
          </label>
          <Input
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="Email address"
            className="text-xs h-10 bg-background rounded-xl"
            required
          />
        </div>

        {/* Company Logo Upload */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            Company Logo <span className="text-rose-500">*</span> <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </label>
          <div className="flex items-center gap-3">
            <div
              onClick={() => logoFileRef.current?.click()}
              className="w-12 h-12 rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors"
            >
              {formLogo ? (
                <img src={formLogo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <Input
              type="text"
              value={formLogo}
              onChange={(e) => setFormLogo(e.target.value)}
              placeholder="Paste logo URL or upload from device"
              className="text-xs h-10 bg-background rounded-xl flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoFileRef.current?.click()}
              className="h-10 text-xs px-3 rounded-xl flex items-center gap-1.5"
            >
              <Upload className="h-4 w-4" /> Upload Device Image
            </Button>
          </div>
        </div>
      </div>

      {/* Company Stamp & Signature Device Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/50">
        {/* Company Stamp Upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1">
            Company Stamp <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
          </label>
          <div className="p-4 border border-dashed border-border rounded-xl flex items-center gap-3 bg-muted/20">
            <div
              onClick={() => stampFileRef.current?.click()}
              className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:border-emerald-500 transition-colors"
            >
              {formCompanyStamp ? (
                <img src={formCompanyStamp} alt="Stamp" className="w-10 h-10 object-contain" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </div>
            <Input
              type="text"
              value={formCompanyStamp}
              onChange={(e) => setFormCompanyStamp(e.target.value)}
              placeholder="Stamp image URL or upload file"
              className="text-xs h-9 bg-background rounded-lg flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => stampFileRef.current?.click()}
              className="h-9 text-xs px-2.5 rounded-lg flex items-center gap-1"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
          </div>
        </div>

        {/* Signature Upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1">
            Signature <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
          </label>
          <div className="p-4 border border-dashed border-border rounded-xl flex items-center gap-3 bg-muted/20">
            <div
              onClick={() => sigFileRef.current?.click()}
              className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:border-emerald-500 transition-colors"
            >
              {formSignature ? (
                <img src={formSignature} alt="Signature" className="w-10 h-10 object-contain" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </div>
            <Input
              type="text"
              value={formSignature}
              onChange={(e) => setFormSignature(e.target.value)}
              placeholder="Signature image URL or upload file"
              className="text-xs h-9 bg-background rounded-lg flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sigFileRef.current?.click()}
              className="h-9 text-xs px-2.5 rounded-lg flex items-center gap-1"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Toggle Switches: Active, Active/Inactive Users, Login Page Logo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-4 border-t border-border">
        {/* Active Toggle Switch */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-foreground shrink-0">Active</label>
          <div className="inline-flex rounded-full border border-input p-0.5 bg-muted/30 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setFormIsActiveToggle(true)}
              className={cn(
                'px-3.5 py-1 text-xs font-bold transition-all rounded-full',
                formIsActiveToggle
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setFormIsActiveToggle(false)}
              className={cn(
                'px-3.5 py-1 text-xs font-bold transition-all rounded-full',
                !formIsActiveToggle
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              No
            </button>
          </div>
        </div>

        {/* Active/Inactive Users Toggle Switch */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-foreground shrink-0">Active/Inactive Users</label>
          <div className="inline-flex rounded-full border border-input p-0.5 bg-muted/30 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setFormActiveUsersToggle(true)}
              className={cn(
                'px-3.5 py-1 text-xs font-bold transition-all rounded-full',
                formActiveUsersToggle
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => setFormActiveUsersToggle(false)}
              className={cn(
                'px-3.5 py-1 text-xs font-bold transition-all rounded-full',
                !formActiveUsersToggle
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Deactivate
            </button>
          </div>
        </div>

        {/* Login Page Logo Toggle Switch */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-foreground shrink-0">Login Page Logo</label>
            <div className="inline-flex rounded-full border border-input p-0.5 bg-muted/30 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setFormLoginPageLogoToggle(true)}
                className={cn(
                  'px-3.5 py-1 text-xs font-bold transition-all rounded-full',
                  formLoginPageLogoToggle
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFormLoginPageLogoToggle(false)}
                className={cn(
                  'px-3.5 py-1 text-xs font-bold transition-all rounded-full',
                  !formLoginPageLogoToggle
                    ? 'bg-slate-200 dark:bg-slate-700 text-foreground font-semibold'
                    : 'bg-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                No
              </button>
            </div>
          </div>
          <p className="text-[11px] text-rose-500 leading-tight">
            (Enabled from here,will be disabled from the other companies.)
          </p>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs h-9 px-4 rounded-xl">
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs">
          {isNew ? 'Save Company' : 'Update Company Information'}
        </Button>
      </div>
    </form>
  );

  // If hideFiltersAndList is true, render ONLY the form cleanly
  if (hideFiltersAndList) {
    return <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-xs">{formElement}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Field Dropdown */}
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="h-9 px-3 text-xs border border-input rounded-xl bg-background font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
          >
            <option value="all">All</option>
            <option value="name">Company Name</option>
            <option value="code">Company Code</option>
            <option value="zipCode">Zip Code</option>
            <option value="state">State</option>
            <option value="city">City</option>
            <option value="contactNo">Contact No</option>
            <option value="email">Email</option>
          </select>

          {/* Search Term Input */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search term..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-background rounded-xl"
            />
          </div>
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
            className="h-9 px-3 text-xs border border-input rounded-xl bg-background font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Form in Middle/Left + Vertical Company List on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Middle / Left Side: Company Form */}
        <div className="md:col-span-8 lg:col-span-9 bg-card border border-border rounded-2xl p-6 shadow-xs">
          {formElement}
        </div>

        {/* Right Side: Vertical List of Company Records (Green Theme) */}
        <div className="md:col-span-4 lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Company Records ({filteredCompanies.length})
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
            {filteredCompanies.map((comp, idx) => {
              const isSelected = comp.id === selectedId;
              const locationStr = [comp.city, comp.state, comp.country].filter(Boolean).join(', ') || 'No location address';

              return (
                <div
                  key={comp.id}
                  onClick={() => handleSelectCompany(comp)}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group shadow-2xs',
                    isSelected
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-md font-medium'
                      : 'bg-card border-border hover:border-emerald-500/50 hover:bg-accent/30 text-foreground'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className={cn('text-sm font-bold truncate', isSelected ? 'text-white' : 'text-foreground')}>
                        {comp.name}
                      </p>
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className={cn('h-3 w-3 flex-shrink-0', isSelected ? 'text-emerald-100' : 'text-muted-foreground')} />
                        <span className={cn('truncate', isSelected ? 'text-emerald-100' : 'text-muted-foreground')}>
                          {locationStr}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0',
                        isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCompanies.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                No companies found matching criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  RotateCcw, MapPin, Search, Building2, HelpCircle, Upload, Image as ImageIcon,
  Plus, CheckCircle2, XCircle, Loader2, Mail, Phone, FileCheck, Shield, Check, X,
  Eye, EyeOff, KeyRound, Boxes, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import { showToast } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { masterBuilderApi } from '@/features/master-builder/api/masterBuilderApi';

const CORE_FIELD_KEYS = [
  'name', 'employer_name', 'employerName', 'class_of_establishment', 'classOfEstablishment',
  'code', 'address_line_1', 'addressLine1', 'address_line_2', 'addressLine2',
  'country', 'state', 'city', 'zip_code', 'zipCode',
  'pan_tin', 'panTin', 'contact_number', 'contactNumber', 'email',
  'logo', 'company_stamp', 'companyStamp', 'signature',
  'is_active_toggle', 'isActiveToggle', 'active_users_toggle', 'activeUsersToggle',
  'login_page_logo_toggle', 'loginPageLogoToggle',
  'has_credentials', 'hasCredentials', 'full_name', 'fullName', 'login_email', 'loginEmail',
  'status', 'description'
];

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
  // Credentials
  hasCredentials: boolean;
  fullName: string;
  loginEmail: string;
  // Note: password is never stored in frontend state after save
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
  // Always start in New mode so the form opens blank (not showing saved data)
  const [isNewMode, setIsNewMode] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const queryClient = useQueryClient();

  // Sync external companiesList if provided from parent
  useEffect(() => {
    if (companiesList && companiesList.length > 0) {
      setCompanies(companiesList);
    }
  }, [companiesList]);

  const [selectedId, setSelectedId] = useState<string>(companiesList?.[0]?.id || '');

  // Keep selectedId valid when companies state is loaded
  useEffect(() => {
    if (!isNewMode && companies.length > 0 && (!selectedId || !companies.some(c => c.id === selectedId))) {
      setSelectedId(companies[0].id);
    }
  }, [companies, selectedId, isNewMode]);

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

  // Dependent Location State — start blank for new records
  const [formCountry, setFormCountry] = useState(isNew ? '' : selectedCompany?.country || '');
  const [formState, setFormState] = useState(isNew ? '' : selectedCompany?.state || '');
  const [formCity, setFormCity] = useState(isNew ? '' : selectedCompany?.city || '');
  const [formZipCode, setFormZipCode] = useState(isNew ? '' : selectedCompany?.zipCode || '');

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

  // Credentials State
  const [formHasCredentials, setFormHasCredentials] = useState<boolean>(isNew ? false : selectedCompany?.hasCredentials ?? false);
  const [formFullName, setFormFullName] = useState<string>(isNew ? '' : selectedCompany?.fullName || '');
  const [formLoginEmail, setFormLoginEmail] = useState<string>(isNew ? '' : selectedCompany?.loginEmail || '');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formConfirmPassword, setFormConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Field-wise Validation Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Master Builder dynamic custom fields state (for extra fields designed in Master Builder)
  const [companyMasterId, setCompanyMasterId] = useState<number | null>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Fetch Master Builder custom fields configured for 'company'
  useEffect(() => {
    const fetchMasterSchema = async () => {
      try {
        const masters = await masterBuilderApi.getMasters();
        const comp = masters.find((m) => m.code === 'company');
        if (comp) {
          setCompanyMasterId(comp.id);
          const detail = await masterBuilderApi.getMasterById(comp.id);
          const extra = (detail.fields || []).filter(
            (f: any) => !f.isCore && !f.is_core && !CORE_FIELD_KEYS.includes(f.fieldKey || f.field_key)
          );
          setCustomFields(extra);
        }
      } catch (err) {
        console.warn('Could not load custom fields for company from master builder:', err);
      }
    };
    fetchMasterSchema();
  }, []);

  // Derived: do passwords match? (only meaningful when both are non-empty)
  const passwordsMatch = formPassword === formConfirmPassword;

  // Switch form to "Add New Company" mode
  const handleAddNewCompanyClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setFormName('');
    setFormEmployerName('');
    setFormClassOfEstablishment('');
    setFormCode(`COM-${Math.floor(100 + Math.random() * 900)}`);
    setFormAddress1('');
    setFormAddress2('');
    setFormCountry('');
    setFormState('');
    setFormCity('');
    setFormZipCode('');
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
    // Clear credentials
    setFormHasCredentials(false);
    setFormFullName('');
    setFormLoginEmail('');
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCustomFieldValues({});
    setErrors({});
  };

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
    clearFieldError('country');
    const states = LOCATION_DATA[countryVal] ? Object.keys(LOCATION_DATA[countryVal]) : [];
    if (states.length > 0) {
      const firstState = states[0];
      setFormState(firstState);
      clearFieldError('state');
      const cities = LOCATION_DATA[countryVal][firstState].cities;
      if (cities.length > 0) {
        setFormCity(cities[0]);
        clearFieldError('city');
        setFormZipCode((LOCATION_DATA[countryVal][firstState].zipDefault || '').replace(/\D/g, '').slice(0, 10));
        clearFieldError('zipCode');
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
    clearFieldError('state');
    if (formCountry && LOCATION_DATA[formCountry]?.[stateVal]) {
      const cities = LOCATION_DATA[formCountry][stateVal].cities;
      if (cities.length > 0) {
        setFormCity(cities[0]);
        clearFieldError('city');
        setFormZipCode((LOCATION_DATA[formCountry][stateVal].zipDefault || '').replace(/\D/g, '').slice(0, 10));
        clearFieldError('zipCode');
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
    clearFieldError('city');
    if (formCountry && formState && LOCATION_DATA[formCountry]?.[formState]) {
      setFormZipCode((LOCATION_DATA[formCountry][formState].zipDefault || '').replace(/\D/g, '').slice(0, 10));
      clearFieldError('zipCode');
    }
  };

  // Dedicated Sanitized Field Handlers
  const handleNameChange = (val: string) => {
    setFormName(val);
    clearFieldError('name');
  };

  const handleEmployerNameChange = (val: string) => {
    setFormEmployerName(val);
    clearFieldError('employerName');
  };

  const handleClassOfEstablishmentChange = (val: string) => {
    setFormClassOfEstablishment(val);
    clearFieldError('classOfEstablishment');
  };

  const handleCodeChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9-_]/g, '').slice(0, 30);
    setFormCode(clean);
    clearFieldError('code');
  };

  const handleAddress1Change = (val: string) => {
    setFormAddress1(val);
    clearFieldError('addressLine1');
  };

  const handleAddress2Change = (val: string) => {
    setFormAddress2(val);
    clearFieldError('addressLine2');
  };

  const handleZipCodeChange = (val: string) => {
    // Postal code is a numeric value for Company Master records.
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setFormZipCode(clean);
    clearFieldError('zipCode');
  };

  const handlePanTinChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setFormPanTin(clean);
    clearFieldError('panTin');
  };

  const handleContactNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 15);
    setFormContactNumber(clean);
    clearFieldError('contactNumber');
  };

  const handleEmailChange = (val: string) => {
    setFormEmail(val.trim());
    clearFieldError('email');
  };

  const handleLogoChange = (val: string) => {
    setFormLogo(val);
    clearFieldError('logo');
  };

  const handleFullNameChange = (val: string) => {
    setFormFullName(val);
    clearFieldError('fullName');
  };

  const handleLoginEmailChange = (val: string) => {
    setFormLoginEmail(val.trim());
    clearFieldError('loginEmail');
  };

  const handlePasswordChange = (val: string) => {
    setFormPassword(val);
    clearFieldError('password');
    clearFieldError('confirmPassword');
  };

  const handleConfirmPasswordChange = (val: string) => {
    setFormConfirmPassword(val);
    clearFieldError('confirmPassword');
  };

  // Device File Upload Handlers (Read as Base64 Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setField: (val: string) => void, fieldKey?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check image file type
    if (!file.type.startsWith('image/')) {
      showToast.error('Invalid File', 'Please upload a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('File Too Large', 'Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setField(event.target.result as string);
        if (fieldKey) clearFieldError(fieldKey);
        showToast.success('File Uploaded', `${file.name} loaded into form.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sync form when selectedCompany changes or when mode changes
  useEffect(() => {
    if (!isNewMode && selectedCompany) {
      setFormName(selectedCompany.name || '');
      setFormEmployerName(selectedCompany.employerName || '');
      setFormClassOfEstablishment(selectedCompany.classOfEstablishment || '');
      setFormCode(selectedCompany.code || '');
      setFormAddress1(selectedCompany.addressLine1 || '');
      setFormAddress2(selectedCompany.addressLine2 || '');
      setFormCountry(selectedCompany.country || 'India');
      setFormState(selectedCompany.state || '');
      setFormCity(selectedCompany.city || '');
      setFormZipCode(selectedCompany.zipCode || '');
      setFormPanTin(selectedCompany.panTin || '');
      setFormContactNumber(selectedCompany.contactNumber || '');
      setFormEmail(selectedCompany.email || '');
      setFormLogo(selectedCompany.logo || '');
      setFormCompanyStamp(selectedCompany.companyStamp || '');
      setFormSignature(selectedCompany.signature || '');
      setFormIsActiveToggle(selectedCompany.isActiveToggle ?? true);
      setFormActiveUsersToggle(selectedCompany.activeUsersToggle ?? true);
      setFormLoginPageLogoToggle(selectedCompany.loginPageLogoToggle ?? false);
      setFormStatus(selectedCompany.status || 'Active');
      // Sync credentials (never populate passwords)
      setFormHasCredentials(selectedCompany.hasCredentials ?? false);
      setFormFullName(selectedCompany.fullName || '');
      setFormLoginEmail(selectedCompany.loginEmail || '');
      setFormPassword('');
      setFormConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [selectedId, isNewMode, selectedCompany]);

  const handleSelectCompany = async (comp: CompanyRecordItem) => {
    setIsNewMode(false);
    setSelectedId(comp.id);
    if (companyMasterId && customFields.length > 0) {
      try {
        const recRes = await masterBuilderApi.getRecords(companyMasterId, { limit: 100 });
        const match = recRes.records?.find((r) => String(r.id) === String(comp.id));
        if (match?.data) {
          const extraVals: Record<string, any> = {};
          customFields.forEach((cf: any) => {
            const k = cf.fieldKey || cf.field_key;
            if (match.data[k] !== undefined) {
              extraVals[k] = match.data[k];
            }
          });
          setCustomFieldValues(extraVals);
        } else {
          setCustomFieldValues({});
        }
      } catch (e) {
        setCustomFieldValues({});
      }
    } else {
      setCustomFieldValues({});
    }
  };

  const handleReset = () => {
    setCustomFieldValues({});
    if (isNewMode) {
      handleAddNewCompanyClick();
    } else if (selectedCompany) {
      setFormName(selectedCompany.name || '');
      setFormEmployerName(selectedCompany.employerName || '');
      setFormClassOfEstablishment(selectedCompany.classOfEstablishment || '');
      setFormCode(selectedCompany.code || '');
      setFormAddress1(selectedCompany.addressLine1 || '');
      setFormAddress2(selectedCompany.addressLine2 || '');
      setFormCountry(selectedCompany.country || 'India');
      setFormState(selectedCompany.state || '');
      setFormCity(selectedCompany.city || '');
      setFormZipCode(selectedCompany.zipCode || '');
      setFormPanTin(selectedCompany.panTin || '');
      setFormContactNumber(selectedCompany.contactNumber || '');
      setFormEmail(selectedCompany.email || '');
      setFormLogo(selectedCompany.logo || '');
      setFormCompanyStamp(selectedCompany.companyStamp || '');
      setFormSignature(selectedCompany.signature || '');
      setFormIsActiveToggle(selectedCompany.isActiveToggle ?? true);
      setFormActiveUsersToggle(selectedCompany.activeUsersToggle ?? true);
      setFormLoginPageLogoToggle(selectedCompany.loginPageLogoToggle ?? false);
      setFormStatus(selectedCompany.status || 'Active');
      // Reset credentials
      setFormHasCredentials(selectedCompany.hasCredentials ?? false);
      setFormFullName(selectedCompany.fullName || '');
      setFormLoginEmail(selectedCompany.loginEmail || '');
      setFormPassword('');
      setFormConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
    showToast.info('Form Reset', 'Form fields restored to saved values.');
  };

  // Load real company records from MySQL database on mount
  useEffect(() => {
    const fetchDbCompanies = async () => {
      setIsFetching(true);
      try {
        const res = await apiClient.get('/settings/companies');
        if (res.data?.success && Array.isArray(res.data.data)) {
          const mapped: CompanyRecordItem[] = res.data.data.map((c: any) => ({
            id: String(c.companyId || c.company_id || c.id || c.uuid),
            code: c.code || '',
            name: c.name || '',
            employerName: c.employerName || c.employer_name || '',
            classOfEstablishment: c.classOfEstablishment || c.class_of_establishment || '',
            addressLine1: c.addressLine1 || c.address_line_1 || c.addressLine_1 || c.address_line1 || c.address || '',
            addressLine2: c.addressLine2 || c.address_line_2 || c.addressLine_2 || c.address_line2 || '',
            country: c.country || 'India',
            zipCode: c.zipCode || c.zip_code || c.postal_code || c.postalCode || '',
            state: c.state || '',
            city: c.city || '',
            panTin: c.panTin || c.pan_tin || '',
            contactNumber: c.contactNumber || c.contact_number || '',
            email: c.email || '',
            logo: c.logo || '',
            companyStamp: c.companyStamp || c.company_stamp || '',
            signature: c.signature || '',
            hasCredentials: c.hasCredentials === 1 || c.hasCredentials === true || c.has_credentials === 1 || c.has_credentials === true,
            fullName: c.fullName || c.full_name || '',
            loginEmail: c.loginEmail || c.login_email || '',
            isActiveToggle: c.isActiveToggle === 1 || c.isActiveToggle === true || c.is_active_toggle === 1 || c.is_active_toggle === true,
            activeUsersToggle: c.activeUsersToggle === 1 || c.activeUsersToggle === true || c.active_users_toggle === 1 || c.active_users_toggle === true,
            loginPageLogoToggle: c.loginPageLogoToggle === 1 || c.loginPageLogoToggle === true || c.login_page_logo_toggle === 1 || c.login_page_logo_toggle === true,
            status: c.status || 'Active',
          }));
          setCompanies(mapped);
          // Stay in new-record mode after fetching — don't auto-select a saved record
          // The user can click a company from the list to edit it
        }
      } catch (err) {
        console.warn('DB company fetch error:', err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchDbCompanies();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // 1. Company Name
    if (!formName.trim()) {
      newErrors.name = 'Company Name is required.';
    } else if (formName.trim().length < 2) {
      newErrors.name = 'Company Name must be at least 2 characters.';
    } else if (formName.trim().length > 150) {
      newErrors.name = 'Company Name cannot exceed 150 characters.';
    }

    if (!formEmployerName.trim()) {
      newErrors.employerName = 'Employer Name is required.';
    } else if (formEmployerName.trim().length < 2 || formEmployerName.trim().length > 150) {
      newErrors.employerName = 'Employer Name must be 2-150 characters.';
    }

    if (!formClassOfEstablishment.trim()) {
      newErrors.classOfEstablishment = 'Class Of Establishment is required (e.g. LLP or Pvt. Ltd.).';
    } else if (formClassOfEstablishment.trim().length < 2 || formClassOfEstablishment.trim().length > 100) {
      newErrors.classOfEstablishment = 'Class Of Establishment must be 2-100 characters.';
    }

    // 2. Establishment Company Code
    if (!formCode.trim()) {
      newErrors.code = 'Establishment Company Code is required.';
    } else if (!/^[A-Za-z0-9-_]{2,30}$/.test(formCode.trim())) {
      newErrors.code = 'Code must be 2-30 characters (letters, numbers, hyphens, underscores).';
    }

    // 3. Address Line 1
    if (!formAddress1.trim()) {
      newErrors.addressLine1 = 'Address Line 1 is required.';
    } else if (formAddress1.trim().length < 3) {
      newErrors.addressLine1 = 'Address Line 1 must be at least 3 characters.';
    }

    // 4. Country
    if (!formCountry.trim()) {
      newErrors.country = 'Country is required.';
    }

    // 5. State
    if (!formState.trim()) {
      newErrors.state = 'State is required.';
    }

    // 6. City
    if (!formCity.trim()) {
      newErrors.city = 'City is required.';
    }

    // 7. ZIP / PIN Code (Pincode validation)
    if (!formZipCode.trim()) {
      newErrors.zipCode = 'ZIP / PIN Code is required.';
    } else {
      const isIndia = !formCountry || formCountry.toLowerCase() === 'india';
      if (isIndia && !/^\d{6}$/.test(formZipCode.trim())) {
        newErrors.zipCode = 'PIN Code must be exactly 6 digits (e.g. 400708).';
      } else if (!isIndia && !/^\d{3,10}$/.test(formZipCode.trim())) {
        newErrors.zipCode = 'Postal / ZIP Code must contain 3-10 digits.';
      }
    }

    // 8. Contact Number
    if (!formContactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required.';
    } else {
      if (!/^\d{10,15}$/.test(formContactNumber)) {
        newErrors.contactNumber = 'Contact Number must contain 10-15 digits only.';
      }
    }

    // 9. Official Corporate Email
    if (!formEmail.trim()) {
      newErrors.email = 'Official Corporate Email is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formEmail.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. contact@apponext.com).';
    }

    // 10. PAN Number (optional, but must be a 10-character alphanumeric identifier)
    if (formPanTin.trim()) {
      const panUpper = formPanTin.trim().toUpperCase();
      if (!/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10}$/.test(panUpper)) {
        newErrors.panTin = 'PAN Number must be exactly 10 alphanumeric characters and include both letters and numbers (e.g. ABCDE1234F).';
      }
    }

    // 11. Company Logo
    if (!formLogo.trim()) {
      newErrors.logo = 'Company Logo is required. Please upload an image or enter a valid URL.';
    }

    // 12. Credentials Validation (if enabled)
    if (formHasCredentials) {
      if (!formFullName.trim()) {
        newErrors.fullName = 'Administrator Full Name is required.';
      }
      if (!formLoginEmail.trim()) {
        newErrors.loginEmail = 'Login Email is required.';
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formLoginEmail.trim())) {
        newErrors.loginEmail = 'Please enter a valid Login Email address.';
      }

      if (isNewMode && !formPassword) {
        newErrors.password = 'Password is required when credentials are enabled.';
      } else if (formPassword && formPassword.length < 6) {
        newErrors.password = 'Password must be at least 6 characters long.';
      }

      if (formPassword && formPassword !== formConfirmPassword) {
        newErrors.confirmPassword = 'Password and Confirm Password do not match.';
      }
    }

    // 13. Dynamic Custom Fields validation
    if (customFields.length > 0) {
      for (const cf of customFields) {
        const key = cf.fieldKey || cf.field_key;
        const name = cf.fieldName || cf.field_name || key;
        const isReq = Boolean(cf.isRequired ?? cf.is_required);
        if (isReq && (!customFieldValues[key] || !String(customFieldValues[key]).trim())) {
          newErrors[key] = `${name} is required.`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      showToast.error('Validation Error', firstError);
      return;
    }

    setErrors({});
    setIsSaving(true);

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
      // Credentials
      hasCredentials: formHasCredentials,
      fullName: formHasCredentials ? formFullName : '',
      loginEmail: formHasCredentials ? formLoginEmail : '',
      ...(formHasCredentials && formPassword ? { password: formPassword } : {}),
    };

    try {
      const isUpdating = !isNewMode && Boolean(selectedId);
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
          hasCredentials: c.has_credentials !== undefined ? Boolean(c.has_credentials) : payload.hasCredentials,
          fullName: c.full_name ?? c.fullName ?? payload.fullName,
          loginEmail: c.login_email ?? c.loginEmail ?? payload.loginEmail,
        };

        setCompanies((prev) => {
          const exists = prev.some((item) => item.id === savedCompany.id);
          if (exists) {
            return prev.map((item) => (item.id === savedCompany.id ? savedCompany : item));
          }
          return [savedCompany, ...prev];
        });

        setIsNewMode(false);
        setSelectedId(savedCompany.id);
        if (onSave) onSave(savedCompany);
        queryClient.invalidateQueries({ queryKey: ['companies'] });

        // Save extended custom field values if configured in Master Builder
        if (companyMasterId && customFields.length > 0 && savedCompany.id) {
          try {
            await masterBuilderApi.updateRecord(companyMasterId, Number(savedCompany.id), {
              data: customFieldValues,
            });
          } catch (extErr) {
            console.warn('Extended data save notice:', extErr);
          }
        }

        showToast.success(
          isUpdating ? 'Company Updated' : 'Company Created',
          isUpdating ? `${savedCompany.name} updated successfully.` : `${savedCompany.name} created successfully.`
        );
      } else {
        showToast.error('Save Failed', res.data?.error?.message || 'Unable to save company record.');
      }
    } catch (err: any) {
      console.error('Save to database endpoint error:', err);
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Database connection error';
      showToast.error('Save Failed', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Companies for Right Side Directory List
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

      {/* Form Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              {isNewMode ? 'Add New Company' : selectedCompany ? `Edit ${selectedCompany.name}` : 'Company Details'}
              {isNewMode ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  New
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  {formStatus}
                </Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure company profile, establishment address, branding, and system access settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            title="Reset Form"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* SECTION 1: Company Profile & Establishment Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span>1. Company Profile & Identification</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Company Name <span className="text-rose-500">*</span></span>
              {formName && <span className="text-[10px] text-muted-foreground">{formName.length} chars</span>}
            </label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Kosqu Global Technologies Ltd"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.name && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.name && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Employer Name <span className="text-rose-500">*</span></label>
            <Input
              type="text"
              value={formEmployerName}
              onChange={(e) => handleEmployerNameChange(e.target.value)}
              placeholder="e.g. Authorized Employer / HR Admin"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.employerName && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.employerName && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.employerName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Class Of Establishment <span className="text-rose-500">*</span></label>
            <Input
              type="text"
              value={formClassOfEstablishment}
              onChange={(e) => handleClassOfEstablishmentChange(e.target.value)}
              placeholder="e.g. LLP, Pvt. Ltd., Partnership"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.classOfEstablishment && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.classOfEstablishment && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.classOfEstablishment}
              </p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-foreground">Establishment Company Code <span className="text-rose-500">*</span></label>
            <Input
              type="text"
              value={formCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="e.g. HQ-MAIN-001"
              className={cn(
                "text-xs h-10 font-mono uppercase bg-background rounded-xl transition-all",
                errors.code && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.code && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.code}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Registered Address */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>2. Registered Headquarters Address</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Address Line 1 <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={formAddress1}
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
            <label className="text-xs font-semibold text-foreground">Address Line 2</label>
            <Input
              type="text"
              value={formAddress2}
              onChange={(e) => handleAddress2Change(e.target.value)}
              placeholder="Landmark, Area, Sector"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.addressLine2 && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.addressLine2 && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.addressLine2}
              </p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Country <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={formCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              placeholder="Enter Country (e.g. India)"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.country && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
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
              placeholder="Enter State (e.g. Maharashtra)"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.state && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.state && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.state}
              </p>
            )}
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              City <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={formCity}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="Enter City (e.g. Pune, Mumbai)"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.city && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.city && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.city}
              </p>
            )}
          </div>

          {/* ZIP Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>ZIP / PIN Code <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-muted-foreground font-mono">Numbers only</span>
            </label>
            <Input
              type="text"
              value={formZipCode}
              inputMode="numeric"
              maxLength={(!formCountry || formCountry.toLowerCase() === 'india') ? 6 : 10}
              onChange={(e) => handleZipCodeChange(e.target.value)}
              placeholder={(!formCountry || formCountry.toLowerCase() === 'india') ? "e.g. 400708" : "e.g. 10001"}
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
        </div>
      </div>

      {/* SECTION 3: Statutory & Communication */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <FileCheck className="h-3.5 w-3.5 text-primary" />
          <span>3. Statutory, Contact & Communication</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>PAN Number</span>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </label>
            <Input
              type="text"
              value={formPanTin}
              maxLength={10}
              onChange={(e) => handlePanTinChange(e.target.value)}
              placeholder="e.g. AAACD1234F"
              className={cn(
                "text-xs h-10 font-mono uppercase bg-background rounded-xl transition-all",
                errors.panTin && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.panTin && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.panTin}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Contact Number <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-muted-foreground font-mono">Numbers only, 10-15 digits</span>
            </label>
            <Input
              type="text"
              value={formContactNumber}
              inputMode="numeric"
              maxLength={15}
              onChange={(e) => handleContactNumberChange(e.target.value)}
              placeholder="e.g. 9898989899"
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

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-foreground">
              Official Corporate Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              value={formEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="e.g. contact@apponext.com"
              className={cn(
                "text-xs h-10 bg-background rounded-xl transition-all",
                errors.email && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
              )}
            />
            {errors.email && (
              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: Media & Branding Uploads */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5 text-primary" />
          <span>4. Branding Assets & Media</span>
        </div>

        {/* Company Logo Card */}
        <div className={cn(
          "p-4 border rounded-2xl bg-muted/10 space-y-2 transition-all",
          errors.logo ? "border-rose-500 bg-rose-50/10" : "border-border/80"
        )}>
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              Company Logo <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] text-muted-foreground">PNG, JPG or WebP (Max 5MB)</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <div
              onClick={() => logoFileRef.current?.click()}
              className={cn(
                "w-14 h-14 rounded-xl border border-dashed bg-background flex items-center justify-center cursor-pointer hover:border-primary transition-all shrink-0 overflow-hidden",
                errors.logo ? "border-rose-500" : "border-border"
              )}
            >
              {formLogo ? (
                <img src={formLogo} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <Input
              type="text"
              value={formLogo}
              onChange={(e) => handleLogoChange(e.target.value)}
              placeholder="Paste logo URL or click Upload"
              className={cn(
                "text-xs h-10 bg-background rounded-xl flex-1 min-w-[200px]",
                errors.logo && "border-rose-500 focus-visible:ring-rose-500"
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logoFileRef.current?.click()}
              className="h-10 text-xs px-3 rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <Upload className="h-4 w-4" /> Upload Image
            </Button>
            {formLogo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleLogoChange('')}
                className="h-10 text-xs px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {errors.logo && (
            <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.logo}
            </p>
          )}
        </div>

        {/* Company Stamp & Signature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Stamp Card */}
          <div className="p-4 border border-border/80 rounded-2xl bg-muted/10 space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              Company Official Stamp
            </label>
            <div className="flex items-center gap-3">
              <div
                onClick={() => stampFileRef.current?.click()}
                className="w-12 h-12 rounded-xl border border-dashed border-border bg-background flex items-center justify-center cursor-pointer hover:border-primary transition-all shrink-0 overflow-hidden"
              >
                {formCompanyStamp ? (
                  <img src={formCompanyStamp} alt="Stamp" className="w-full h-full object-contain p-1" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <Input
                type="text"
                value={formCompanyStamp}
                onChange={(e) => setFormCompanyStamp(e.target.value)}
                placeholder="Stamp URL or device file"
                className="text-xs h-9 bg-background rounded-xl flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => stampFileRef.current?.click()}
                className="h-9 text-xs px-2.5 rounded-xl shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Signature Card */}
          <div className="p-4 border border-border/80 rounded-2xl bg-muted/10 space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              Authorized Signature
            </label>
            <div className="flex items-center gap-3">
              <div
                onClick={() => sigFileRef.current?.click()}
                className="w-12 h-12 rounded-xl border border-dashed border-border bg-background flex items-center justify-center cursor-pointer hover:border-primary transition-all shrink-0 overflow-hidden"
              >
                {formSignature ? (
                  <img src={formSignature} alt="Signature" className="w-full h-full object-contain p-1" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <Input
                type="text"
                value={formSignature}
                onChange={(e) => setFormSignature(e.target.value)}
                placeholder="Signature URL or device file"
                className="text-xs h-9 bg-background rounded-xl flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sigFileRef.current?.click()}
                className="h-9 text-xs px-2.5 rounded-xl shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Status & System Access Controls */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>5. Status & System Controls</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Active Status */}
          <div className="p-3.5 border border-border/80 rounded-2xl bg-card space-y-2">
            <label className="text-xs font-bold text-foreground block">Active Status</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormIsActiveToggle(true)}
                className={cn(
                  'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                  formIsActiveToggle
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                <Check className="h-3.5 w-3.5" /> Yes
              </button>
              <button
                type="button"
                onClick={() => setFormIsActiveToggle(false)}
                className={cn(
                  'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                  !formIsActiveToggle
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                <X className="h-3.5 w-3.5" /> No
              </button>
            </div>
          </div>

          {/* Active Users Toggle */}
          <div className="p-3.5 border border-border/80 rounded-2xl bg-card space-y-2">
            <label className="text-xs font-bold text-foreground block">Users Access</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormActiveUsersToggle(true)}
                className={cn(
                  'flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all flex items-center justify-center',
                  formActiveUsersToggle
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                Activate
              </button>
              <button
                type="button"
                onClick={() => setFormActiveUsersToggle(false)}
                className={cn(
                  'flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all flex items-center justify-center',
                  !formActiveUsersToggle
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                Deactivate
              </button>
            </div>
          </div>

          {/* Login Page Logo */}
          <div className="p-3.5 border border-border/80 rounded-2xl bg-card space-y-2">
            <label className="text-xs font-bold text-foreground block">Login Page Logo</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormLoginPageLogoToggle(true)}
                className={cn(
                  'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                  formLoginPageLogoToggle
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFormLoginPageLogoToggle(false)}
                className={cn(
                  'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                  !formLoginPageLogoToggle
                    ? 'bg-muted dark:bg-slate-700 text-foreground'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: Company Login Credentials */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5 text-primary" />
          <span>6. Company Login Credentials</span>
        </div>

        {/* Want Credentials toggle */}
        <div className="p-3.5 border border-border/80 rounded-2xl bg-card space-y-2">
          <label className="text-xs font-bold text-foreground block">Want Credentials</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFormHasCredentials(true)}
              className={cn(
                'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                formHasCredentials
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <Check className="h-3.5 w-3.5" /> Yes
            </button>
            <button
              type="button"
              onClick={() => { setFormHasCredentials(false); setFormPassword(''); setFormConfirmPassword(''); }}
              className={cn(
                'flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1',
                !formHasCredentials
                  ? 'bg-muted dark:bg-slate-700 text-foreground border-transparent'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <X className="h-3.5 w-3.5" /> No
            </button>
          </div>
        </div>

        {/* Credential fields — visible only when hasCredentials = true */}
        {formHasCredentials && (
          <div className="p-4 border border-primary/20 rounded-2xl bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary shrink-0" />
              Password is encrypted with Argon2id and stored securely. Leave password fields blank to keep existing password.
            </p>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name <span className="text-rose-500">*</span></label>
              <Input
                type="text"
                value={formFullName}
                onChange={(e) => handleFullNameChange(e.target.value)}
                placeholder="e.g. Admin User Name"
                className={cn(
                  "text-xs h-10 bg-background rounded-xl transition-all",
                  errors.fullName && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                )}
              />
              {errors.fullName && (
                <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Login Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Login Email <span className="text-rose-500">*</span></label>
              <Input
                type="email"
                value={formLoginEmail}
                onChange={(e) => handleLoginEmailChange(e.target.value)}
                placeholder="e.g. admin@company.com"
                className={cn(
                  "text-xs h-10 bg-background rounded-xl transition-all",
                  errors.loginEmail && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                )}
              />
              {errors.loginEmail && (
                <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.loginEmail}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Password {isNewMode && <span className="text-rose-500">*</span>}</span>
                {formPassword && formConfirmPassword && (
                  <span className={cn('text-[10px] font-bold flex items-center gap-1',
                    passwordsMatch ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                    {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className={cn(
                    "text-xs h-10 bg-background rounded-xl pr-10 transition-all",
                    errors.password && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Confirm Password {formPassword && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formConfirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Re-enter password"
                  className={cn(
                    'text-xs h-10 bg-background rounded-xl pr-10 transition-all',
                    errors.confirmPassword && 'border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10',
                    !errors.confirmPassword && formConfirmPassword && !passwordsMatch && 'border-rose-400 focus-visible:ring-rose-400',
                    !errors.confirmPassword && formConfirmPassword && passwordsMatch && 'border-emerald-400 focus-visible:ring-emerald-400'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7: Dynamic Custom Fields from Master Builder */}
      {customFields.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Boxes className="h-3.5 w-3.5 text-primary" />
              <span>7. Custom Master Builder Fields</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Dynamic Fields ({customFields.length})
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customFields.map((field: any) => {
              const fieldKey = field.fieldKey || field.field_key;
              const fieldName = field.fieldName || field.field_name || fieldKey;
              const isRequired = Boolean(field.isRequired ?? field.is_required);
              const fieldType = field.fieldType || field.field_type || 'text';
              const placeholder = field.placeholder || `Enter ${fieldName}`;
              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {fieldName} {isRequired && <span className="text-rose-500">*</span>}
                  </label>
                  {fieldType === 'textarea' ? (
                    <textarea
                      value={customFieldValues[fieldKey] || ''}
                      onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                      placeholder={placeholder}
                      rows={3}
                      className="w-full text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : fieldType === 'boolean' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: true }))}
                        className={cn(
                          'py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1',
                          customFieldValues[fieldKey]
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border'
                        )}
                      >
                        <Check className="h-3.5 w-3.5" /> Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: false }))}
                        className={cn(
                          'py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1',
                          !customFieldValues[fieldKey]
                            ? 'bg-muted text-foreground border-border'
                            : 'bg-background text-muted-foreground border-border'
                        )}
                      >
                        <X className="h-3.5 w-3.5" /> No
                      </button>
                    </div>
                  ) : (
                    <Input
                      type={fieldType === 'number' ? 'number' : fieldType === 'email' ? 'email' : 'text'}
                      value={customFieldValues[fieldKey] || ''}
                      onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                      placeholder={placeholder}
                      className="text-xs h-10 bg-background rounded-xl"
                      required={isRequired}
                    />
                  )}
                </div>
              );
            })}
          </div>
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
            disabled={isSaving}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isSaving || (formHasCredentials && !!(formPassword || formConfirmPassword) && !passwordsMatch)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-6 rounded-xl shadow-xs gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>{isNewMode ? 'Save Company' : 'Update Company Information'}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );

  // If hideFiltersAndList is true, render ONLY the form cleanly
  if (hideFiltersAndList) {
    return <div className="w-full bg-card border border-border/80 rounded-2xl p-6 shadow-xs">{formElement}</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout: Left Form Card (lg:col-span-7), Right Display List (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Company Information Form (lg:col-span-7)                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground">
          {formElement}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Companies Directory List (lg:col-span-5)                    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-4">
          {/* Directory Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Company Records</h3>
              <Badge variant="secondary" className="text-xs font-semibold rounded-full px-2.5">
                {filteredCompanies.length}
              </Badge>
            </div>

            <Button
              onClick={handleAddNewCompanyClick}
              size="sm"
              className={cn(
                'text-xs font-semibold h-9 px-3 rounded-xl gap-1.5 transition-all shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              <Plus className="h-4 w-4" />
              <span>Add New Company</span>
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {/* Filter Category */}
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="city">City</option>
                <option value="state">State</option>
                <option value="email">Email</option>
              </select>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 bg-background rounded-xl"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
                className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Scrollable Company Directory Cards */}
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {isFetching ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Loading companies from database...</span>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No company records found.</p>
                <p className="text-[11px]">Click "Add New Company" above to register one.</p>
              </div>
            ) : (
              filteredCompanies.map((comp, idx) => {
                const isSelected = !isNewMode && comp.id === selectedId;
                const locationStr = [comp.city, comp.state, comp.country].filter(Boolean).join(', ') || 'No address specified';

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleSelectCompany(comp)}
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
                            {comp.name}
                          </p>
                          {comp.code && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-mono px-1.5 py-0 shrink-0',
                                isSelected
                                  ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                                  : 'bg-muted/50 text-muted-foreground border-border'
                              )}
                            >
                              {comp.code}
                            </Badge>
                          )}
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
                            : comp.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                        )}
                      >
                        {comp.status}
                      </span>
                    </div>

                    {/* Sub Info Row */}
                    <div className={cn('pt-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-2', isSelected ? 'border-primary-foreground/20 text-primary-foreground/80' : 'border-border/40 text-muted-foreground')}>
                      {comp.contactNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {comp.contactNumber}
                        </span>
                      )}
                      {comp.email && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <Mail className="h-3 w-3 shrink-0" /> {comp.email}
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

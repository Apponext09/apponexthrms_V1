import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import {
  Sparkles,
  Settings,
  Palette,
  Eye,
  Sliders,
  FileText,
  Save,
  CheckCircle,
  Building,
  Image as ImageIcon,
  UserCheck,
  Shield,
  HelpCircle,
  ArrowLeft,
  Upload,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_FIELDS = [
  { key: 'dateOfBirth', label: 'Date of Birth', category: 'Personal' },
  { key: 'gender', label: 'Gender', category: 'Personal' },
  { key: 'emailId', label: 'Email ID', category: 'Personal' },
  { key: 'contactNumber', label: 'Contact Number', category: 'Personal' },
  { key: 'address', label: 'Full Address', category: 'Address' },
  { key: 'country', label: 'Country', category: 'Address' },
  { key: 'zipcode', label: 'Zipcode', category: 'Address' },
  { key: 'state', label: 'State', category: 'Address' },
  { key: 'city', label: 'City', category: 'Address' },
  { key: 'maritalStatus', label: 'Marital Status', category: 'Personal' },
  { key: 'currentCompany', label: 'Current Company', category: 'Professional' },
  { key: 'qualification', label: 'Qualification', category: 'Education' },
  { key: 'university', label: 'University / Institute', category: 'Education' },
  { key: 'relevantExperience', label: 'Relevant Experience', category: 'Professional' },
  { key: 'totalExperience', label: 'Total Experience', category: 'Professional' },
  { key: 'skills', label: 'Skills & Competencies', category: 'Professional' },
  { key: 'comments', label: 'Comments / Cover Note', category: 'General' },
  { key: 'resume', label: 'Resume File Upload', category: 'Documents' },
];

const COLOR_PALETTES = [
  { name: 'Indigo Purple', value: '#4f46e5', bg: 'from-indigo-600 to-purple-600' },
  { name: 'Royal Blue', value: '#2563eb', bg: 'from-blue-600 to-indigo-600' },
  { name: 'Emerald Green', value: '#059669', bg: 'from-emerald-600 to-teal-600' },
  { name: 'Deep Purple', value: '#7c3aed', bg: 'from-purple-600 to-pink-600' },
  { name: 'Rose Red', value: '#e11d48', bg: 'from-rose-600 to-pink-600' },
  { name: 'Midnight Dark', value: '#1e293b', bg: 'from-slate-800 to-slate-900' },
];

const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', quality);
          resolve(compressedDataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const CareerPortalCustomizationPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'branding' | 'visibility' | 'fields' | 'footer'>('branding');

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 400, 0.85);
      setSettings((prev) => ({ ...prev, companyLogoUrl: compressedBase64 }));
      toast.success('Company Logo uploaded & optimized successfully!');
    } catch (err) {
      console.error('Failed to optimize logo image', err);
      toast.error('Failed to process logo image file');
    }
  };

  const [settings, setSettings] = useState({
    portalTitle: 'Career Portal',
    portalTagline: 'Find Your Next Opportunity',
    bannerDescription: 'Explore open roles, apply directly, or submit a referral application.',
    companyLogoUrl: '',
    primaryColor: '#4f46e5',
    showAccountInfo: false,
    showBackToHrms: true,
    copyrightText: `© ${new Date().getFullYear()} HRMS Career Portal. All rights reserved.`,
    formFieldsConfig: {} as Record<string, { enabled: boolean; required: boolean }>,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/recruitment/career-portal-settings');
      if (res.data?.success && res.data.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load career portal settings:', err);
      toast.error('Failed to load settings from server');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put('/recruitment/career-portal-settings', settings);
      if (res.data?.success) {
        toast.success(res.data.message || 'Career Portal settings saved successfully!');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Failed to save settings';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldToggle = (fieldKey: string, prop: 'enabled' | 'required', val: boolean) => {
    setSettings((prev) => {
      const currentConfig = prev.formFieldsConfig[fieldKey] || { enabled: true, required: false };
      const updatedConfig = {
        ...currentConfig,
        [prop]: val,
      };

      // If disabling field, set required to false as well
      if (prop === 'enabled' && !val) {
        updatedConfig.required = false;
      }

      return {
        ...prev,
        formFieldsConfig: {
          ...prev.formFieldsConfig,
          [fieldKey]: updatedConfig,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 text-sm font-medium">
        <Sparkles className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
        Loading Career Portal Settings...
      </div>
    );
  }

  const currentColorObj = COLOR_PALETTES.find((c) => c.value === settings.primaryColor) || COLOR_PALETTES[0];

  return (
    <div className="recruitment-page flex-1 min-w-0 space-y-4">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="recruitment-page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20 shadow-xs">
            <Palette className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings')}
                className="h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Career Portal Customization
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Customize corporate branding, logo, banner titles, applicant form field visibility, and footer legal text.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.open('/careers', '_blank')}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted text-foreground cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Live Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────────── */}
      <div className="recruitment-segments flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="w-4 h-4" /> Branding & Banner
        </button>

        <button
          onClick={() => setActiveTab('visibility')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'visibility'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="w-4 h-4" /> Account & Header Toggles
        </button>

        <button
          onClick={() => setActiveTab('fields')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'fields'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="w-4 h-4" /> Form Fields Matrix
        </button>

        <button
          onClick={() => setActiveTab('footer')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'footer'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" /> Footer & Copyright
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: BRANDING & BANNER */}
          {activeTab === 'branding' && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  Company Branding & Banner Config
                </CardTitle>
                <CardDescription className="text-xs">
                  Set portal title, banner headings, logo image, and theme accent colors.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Portal Title / Company Header</Label>
                  <Input
                    value={settings.portalTitle}
                    onChange={(e) => setSettings({ ...settings, portalTitle: e.target.value })}
                    placeholder="e.g. Apponext Global Career Portal"
                    className="h-10 text-xs font-medium bg-white text-slate-900 border-slate-300 focus:bg-white placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-400">Displayed in the top navigation bar.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Banner Main Tagline</Label>
                  <Input
                    value={settings.portalTagline}
                    onChange={(e) => setSettings({ ...settings, portalTagline: e.target.value })}
                    placeholder="e.g. Find Your Next Opportunity"
                    className="h-10 text-xs font-medium bg-white text-slate-900 border-slate-300 focus:bg-white placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Banner Sub-Description</Label>
                  <textarea
                    rows={2}
                    value={settings.bannerDescription}
                    onChange={(e) => setSettings({ ...settings, bannerDescription: e.target.value })}
                    placeholder="e.g. Explore open roles, apply directly, or submit a referral application."
                    className="w-full border border-slate-300 rounded-xl p-3 text-xs font-medium bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400"
                  />
                </div>

                {/* Company Logo Upload & Preview */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 block">Company Logo</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {settings.companyLogoUrl ? (
                      <div className="relative group shrink-0">
                        <img
                          src={settings.companyLogoUrl}
                          alt="Company Logo"
                          className="h-12 w-auto max-w-[160px] object-contain rounded-lg border border-slate-300 bg-white p-1 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, companyLogoUrl: '' })}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors cursor-pointer"
                          title="Remove Logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoFileUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => logoInputRef.current?.click()}
                          className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold h-8 px-3 cursor-pointer shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                          Upload Logo File
                        </Button>
                        <span className="text-[10px] text-slate-500 font-medium">PNG, JPG, SVG or WEBP (Max 3 MB)</span>
                      </div>

                      <Input
                        value={settings.companyLogoUrl}
                        onChange={(e) => setSettings({ ...settings, companyLogoUrl: e.target.value })}
                        placeholder="Or paste Logo Image URL (e.g. https://example.com/logo.png)"
                        className="h-9 text-xs bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Accent Color */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-700 block">Primary Theme Accent Color</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COLOR_PALETTES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, primaryColor: c.value })}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          settings.primaryColor === c.value
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/30'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full bg-gradient-to-r ${c.bg} shrink-0 shadow-sm`} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: VISIBILITY TOGGLES */}
          {activeTab === 'visibility' && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Header & Account Bar Toggles
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure whether public visitors see top account info or navigation shortcuts.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-1 max-w-md">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      Show Top User Account Info Badge
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Displays user name badge (e.g., <code>Narendra Gaikwad NG</code>) on the top right header.
                      <strong>Turn OFF for public visitors</strong> so external candidates don't see logged-in employee credentials.
                    </p>
                  </div>
                  <Switch
                    checked={settings.showAccountInfo}
                    onCheckedChange={(val) => setSettings({ ...settings, showAccountInfo: val })}
                  />
                </div>

                <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-1 max-w-md">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      Show 'Back to HRMS' Button
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Displays top right button allowing logged-in employees to quickly navigate back to HRMS Dashboard.
                    </p>
                  </div>
                  <Switch
                    checked={settings.showBackToHrms}
                    onCheckedChange={(val) => setSettings({ ...settings, showBackToHrms: val })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: FORM FIELDS MATRIX */}
          {activeTab === 'fields' && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Candidate Registration Form Fields Customization
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose which fields are <strong>Show (Visible)</strong> and <strong>Required (Mandatory)</strong> when a candidate fills out an application.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="p-3">Field Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-center">Show (Visible)</th>
                        <th className="p-3 text-center">Required (Mandatory)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {DEFAULT_FIELDS.map((f) => {
                        const config = settings.formFieldsConfig[f.key] || { enabled: true, required: false };
                        return (
                          <tr key={f.key} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 font-semibold text-slate-800">{f.label}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                                {f.category}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Switch
                                checked={config.enabled !== false}
                                onCheckedChange={(val) => handleFieldToggle(f.key, 'enabled', val)}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Switch
                                disabled={config.enabled === false}
                                checked={config.required === true}
                                onCheckedChange={(val) => handleFieldToggle(f.key, 'required', val)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: FOOTER */}
          {activeTab === 'footer' && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Footer & Legal Copyright Config
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Copyright Statement</Label>
                  <Input
                    value={settings.copyrightText}
                    onChange={(e) => setSettings({ ...settings, copyrightText: e.target.value })}
                    placeholder="e.g. © 2026 Apponext Global Inc. All rights reserved."
                    className="h-10 text-xs font-medium"
                  />
                  <p className="text-[11px] text-slate-400">Displayed at the bottom footer of all career portal pages.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Realtime Visual Preview */}
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-md sticky top-6">
            <CardHeader className="border-b border-slate-100 bg-slate-900 text-white rounded-t-xl py-3 px-4">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" /> Realtime Portal Preview
                </span>
                <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-[9px]">Live</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs bg-slate-50">
              {/* Preview Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  {settings.companyLogoUrl ? (
                    <img src={settings.companyLogoUrl} alt="Logo" className="w-6 h-6 object-contain" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                      H
                    </div>
                  )}
                  <span className="font-bold text-slate-800">{settings.portalTitle}</span>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  {settings.showAccountInfo && (
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">
                      User Account Badge
                    </span>
                  )}
                  {settings.showBackToHrms && (
                    <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
                      ← Back to HRMS
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Banner */}
              <div className={`p-4 rounded-xl text-white shadow-sm bg-gradient-to-r ${currentColorObj.bg}`}>
                <p className="text-[9px] uppercase font-bold text-white/70 tracking-wider">Hiring Announcement</p>
                <h3 className="text-sm font-extrabold mt-0.5">{settings.portalTagline}</h3>
                <p className="text-[10px] text-white/80 mt-1">{settings.bannerDescription}</p>
              </div>

              {/* Preview Form Mandates */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                <span className="font-bold text-slate-700 text-[11px] block border-b pb-1">
                  Active Mandatory Form Fields:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_FIELDS.filter((f) => settings.formFieldsConfig[f.key]?.required).map((f) => (
                    <span key={f.key} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                      {f.label} *
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview Footer */}
              <div className="text-center pt-2 text-[10px] text-slate-400 font-medium">
                {settings.copyrightText}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

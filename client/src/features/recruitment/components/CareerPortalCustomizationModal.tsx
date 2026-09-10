import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import {
  Palette,
  Eye,
  Sliders,
  FileText,
  Save,
  Building,
  UserCheck,
  Shield,
  Sparkles,
  Check,
  Upload,
  X
} from 'lucide-react';

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
  { key: 'signature', label: 'Signature File Upload', category: 'Documents' },
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

interface CareerPortalCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

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

export const CareerPortalCustomizationModal: React.FC<CareerPortalCustomizationModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/recruitment/career-portal-settings');
      if (res.data?.success && res.data.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load career portal settings:', err);
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
        if (onSaved) onSaved();
        onClose();
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

  const currentColorObj = COLOR_PALETTES.find((c) => c.value === settings.primaryColor) || COLOR_PALETTES[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Edit Career Portal Customization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Customize company branding, header text, account info visibility, and candidate application form fields.
            </DialogDescription>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-600" /> Loading configuration...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('branding')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'branding'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Building className="w-3.5 h-3.5" /> Branding & Colors
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('visibility')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'visibility'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Account & Header Toggles
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fields')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'fields'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Form Fields Matrix
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('footer')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'footer'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Footer & Legal
              </button>
            </div>

            {/* TAB 1: BRANDING */}
            {activeTab === 'branding' && (
              <div className="space-y-4 text-xs font-medium text-slate-700">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Portal Title / Company Header</Label>
                  <Input
                    value={settings.portalTitle}
                    onChange={(e) => setSettings({ ...settings, portalTitle: e.target.value })}
                    placeholder="e.g. Apponext Global Career Portal"
                    className="h-9 text-xs bg-white text-slate-900 border-slate-300 focus:bg-white placeholder:text-slate-400 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Banner Main Tagline</Label>
                  <Input
                    value={settings.portalTagline}
                    onChange={(e) => setSettings({ ...settings, portalTagline: e.target.value })}
                    placeholder="e.g. Find Your Next Opportunity"
                    className="h-9 text-xs bg-white text-slate-900 border-slate-300 focus:bg-white placeholder:text-slate-400 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Banner Sub-Description</Label>
                  <textarea
                    rows={2}
                    value={settings.bannerDescription}
                    onChange={(e) => setSettings({ ...settings, bannerDescription: e.target.value })}
                    placeholder="e.g. Explore open roles, apply directly, or submit a referral application."
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400"
                  />
                </div>

                {/* Company Logo Upload & Preview */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800 block">Company Logo</Label>
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
                        className="h-8 text-xs bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-800 block">Primary Theme Accent Color</Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {COLOR_PALETTES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, primaryColor: c.value })}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          settings.primaryColor === c.value
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-gradient-to-r ${c.bg} shrink-0 shadow-xs`} />
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VISIBILITY */}
            {activeTab === 'visibility' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-1 max-w-md">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      Show Top User Account Info Badge
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Displays top right user name badge on the public career portal.
                      Turn OFF for external visitors so logged-in employee info is not displayed.
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
                      Displays top right shortcut allowing employees to navigate back to HRMS Dashboard.
                    </p>
                  </div>
                  <Switch
                    checked={settings.showBackToHrms}
                    onCheckedChange={(val) => setSettings({ ...settings, showBackToHrms: val })}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: FORM FIELDS MATRIX */}
            {activeTab === 'fields' && (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 z-10">
                      <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
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
                          <tr key={f.key} className="hover:bg-slate-50 transition-colors">
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
              </div>
            )}

            {/* TAB 4: FOOTER */}
            {activeTab === 'footer' && (
              <div className="space-y-4 text-xs font-medium text-slate-700">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Copyright Statement</Label>
                  <Input
                    value={settings.copyrightText}
                    onChange={(e) => setSettings({ ...settings, copyrightText: e.target.value })}
                    placeholder="e.g. © 2026 Apponext Global Inc. All rights reserved."
                    className="h-9 text-xs bg-white text-slate-900 border-slate-300 focus:bg-white placeholder:text-slate-400 font-medium"
                  />
                  <p className="text-[11px] text-slate-400">Displayed at the bottom footer of all career portal pages.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 shadow-sm"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

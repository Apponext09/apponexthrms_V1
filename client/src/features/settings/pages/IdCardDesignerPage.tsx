import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Palette, Layout, Type, Image as ImageIcon, QrCode as QrIcon, 
  Save, RotateCcw, Copy, Trash2, History, CheckCircle2, AlertTriangle, 
  Sparkles, Layers, Eye, EyeOff, ArrowUp, ArrowDown, Plus, Upload, 
  RefreshCw, Printer, Download, ZoomIn, ZoomOut, UserCheck, Settings, 
  Sliders, ChevronDown, ChevronRight, HelpCircle, FileCheck, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

import { 
  useIdCardTemplates, 
  useCreateIdCardTemplate, 
  useUpdateIdCardTemplate, 
  usePublishIdCardTemplate, 
  useDuplicateIdCardTemplate, 
  useDeleteIdCardTemplate, 
  useIdCardTemplateVersions, 
  useRollbackIdCardTemplateVersion 
} from '@/features/id-card/api/useIdCardTemplates';
import { IdCardRenderer } from '@/features/id-card/components/IdCardRenderer';
import { 
  DEFAULT_ID_CARD_CONFIG, 
  KOSQU_CORPORATE_CONFIG,
  THEME_COLOR_PRESETS, 
  FONT_OPTIONS, 
  AVAILABLE_FIELDS_LIBRARY 
} from '@/features/id-card/constants/defaultIdCardConfig';
import type { 
  IdCardConfig, 
  IdCardTemplate, 
  IdCardFieldConfig, 
  TemplateAppliesTo 
} from '@/features/id-card/types/idCard.types';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';

// Robust recursive JSON parser to guarantee IdCardConfig object shape
const parseConfigJson = (raw: any): IdCardConfig => {
  if (!raw) return DEFAULT_ID_CARD_CONFIG;
  let parsed: any = raw;
  let attempts = 0;
  while (typeof parsed === 'string' && attempts < 10) {
    try {
      const next = JSON.parse(parsed);
      if (next === parsed) break;
      parsed = next;
    } catch (e) {
      break;
    }
    attempts++;
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return {
      ...DEFAULT_ID_CARD_CONFIG,
      ...parsed,
      theme: { ...DEFAULT_ID_CARD_CONFIG.theme, ...(parsed.theme || {}) },
      header: { ...DEFAULT_ID_CARD_CONFIG.header, ...(parsed.header || {}) },
      photo: { ...DEFAULT_ID_CARD_CONFIG.photo, ...(parsed.photo || {}) },
      footer: { ...DEFAULT_ID_CARD_CONFIG.footer, ...(parsed.footer || {}) },
      back: { ...DEFAULT_ID_CARD_CONFIG.back, ...(parsed.back || {}) },
      qrCode: { ...DEFAULT_ID_CARD_CONFIG.qrCode, ...(parsed.qrCode || {}) },
      qrConfig: { ...DEFAULT_ID_CARD_CONFIG.qrConfig, ...(parsed.qrConfig || parsed.qrCode || {}) },
      fields: Array.isArray(parsed.fields) && parsed.fields.length > 0 ? parsed.fields : DEFAULT_ID_CARD_CONFIG.fields,
    };
  }
  return DEFAULT_ID_CARD_CONFIG;
};

// Helper to compress uploaded images locally
const compressImage = (file: File, maxWidth = 800, quality = 0.88): Promise<string> => {
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
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(mimeType, quality));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Helper to calculate contrast ratio for WCAG hint
function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string) {
  try {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch (e) {
    return 4.5;
  }
}

export const IdCardDesignerPage: React.FC = () => {
  const { user } = useAuthStore();
  
  // Queries & Mutations
  const { data: templates = [], isLoading, refetch: refetchTemplates } = useIdCardTemplates();
  const createMutation = useCreateIdCardTemplate();
  const updateMutation = useUpdateIdCardTemplate();
  const publishMutation = usePublishIdCardTemplate();
  const duplicateMutation = useDuplicateIdCardTemplate();
  const deleteMutation = useDeleteIdCardTemplate();
  const rollbackMutation = useRollbackIdCardTemplateVersion();

  // Active state
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<IdCardTemplate | null>(null);
  const [config, setConfig] = useState<IdCardConfig>(DEFAULT_ID_CARD_CONFIG);
  const [templateName, setTemplateName] = useState('Default ID Card Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [appliesTo, setAppliesTo] = useState<TemplateAppliesTo>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Preview & Interactive state
  const [isFlipped, setIsFlipped] = useState(false);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [previewMode, setPreviewMode] = useState<'sample' | 'own'>('sample');
  const [previewZoom, setPreviewZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<'theme' | 'header' | 'photo' | 'fields' | 'qr' | 'footer' | 'back' | 'print' | 'rules'>('theme');

  // Modals state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishChangelog, setPublishChangelog] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false);
  const [newCustomField, setNewCustomField] = useState({ label: '', key: '', value: '', side: 'front' as 'front' | 'back' });
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Department & Location Master options for rules
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [employeeTypes, setEmployeeTypes] = useState<Array<{ id: string; name: string }>>([
    { id: 'full-time', name: 'Full-Time Permanent' },
    { id: 'contract', name: 'Contractor' },
    { id: 'intern', name: 'Intern / Trainee' },
    { id: 'part-time', name: 'Part-Time' },
  ]);

  // Image upload refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const headerBgInputRef = useRef<HTMLInputElement>(null);
  const footerBgInputRef = useRef<HTMLInputElement>(null);
  const ribbonImageInputRef = useRef<HTMLInputElement>(null);
  const backHeaderImageInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const previewFrontRef = useRef<HTMLDivElement>(null);
  const previewBackRef = useRef<HTMLDivElement>(null);

  // Version history query
  const { data: versions = [] } = useIdCardTemplateVersions(selectedTemplateId || undefined);

  // Fetch Master Data (Departments, Locations)
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [deptRes, locRes] = await Promise.all([
          apiClient.get('/settings/departments'),
          apiClient.get('/settings/locations'),
        ]);
        if (deptRes.data?.data) {
          setDepartments(deptRes.data.data.map((d: any) => ({ id: d.id, name: d.name || d.department_name })));
        }
        if (locRes.data?.data) {
          const rawLocs = Array.isArray(locRes.data.data) ? locRes.data.data : [];
          setLocations(rawLocs
            .filter((l: any) => l.status !== 'inactive' && l.status !== 'Inactive' && l.is_active !== 'No' && l.isActive !== 'No')
            .map((l: any) => ({ id: l.id, name: l.name || l.location_name })));
        }
      } catch (err) {}
    };
    fetchMasters();
  }, []);

  // Ref to track currently loaded template and prevent accidental resets
  const currentTemplateIdRef = useRef<number | null>(null);

  // Sync selected template
  useEffect(() => {
    if (templates.length > 0) {
      if (!selectedTemplateId) {
        const initial = templates.find((t) => t.isDefault) || templates[0];
        if (initial) {
          currentTemplateIdRef.current = initial.id;
          setSelectedTemplateId(initial.id);
          setActiveTemplate(initial);
          setConfig(parseConfigJson(initial.configJson));
          setTemplateName(initial.name);
          setTemplateDescription(initial.description || '');
          setIsDefault(!!initial.isDefault);
          setAppliesTo(initial.appliesTo || {});
          setHasUnsavedChanges(false);
        }
      } else if (currentTemplateIdRef.current !== selectedTemplateId) {
        const target = templates.find((t) => t.id === selectedTemplateId);
        if (target) {
          currentTemplateIdRef.current = target.id;
          setActiveTemplate(target);
          setConfig(parseConfigJson(target.configJson));
          setTemplateName(target.name);
          setTemplateDescription(target.description || '');
          setIsDefault(!!target.isDefault);
          setAppliesTo(target.appliesTo || {});
          setHasUnsavedChanges(false);
        }
      }
    }
  }, [templates, selectedTemplateId]);

  // Deep update helper for config
  const updateConfig = (updater: (prev: IdCardConfig) => IdCardConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  // Actions
  const handleSaveDraft = async () => {
    if (!selectedTemplateId) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedTemplateId,
        name: templateName,
        description: templateDescription,
        isDefault,
        appliesTo,
        configJson: config,
        status: activeTemplate?.status || 'published',
      });
      setHasUnsavedChanges(false);
    } catch (err) {}
  };

  const handleSaveSettings = async () => {
    try {
      const configSnapshot = JSON.parse(JSON.stringify(config));
      // Save local backup immediately so preview never blinks
      try {
        localStorage.setItem('apponext_saved_id_card_config', JSON.stringify(configSnapshot));
      } catch (e) {}

      let templateIdToSave = selectedTemplateId || templates[0]?.id;

      if (templateIdToSave) {
        const saved = await updateMutation.mutateAsync({
          id: templateIdToSave,
          configJson: configSnapshot,
          isDefault: true,
          name: templateName || 'Official Company ID Card',
          description: templateDescription,
          status: 'published',
        });

        if (saved) {
          currentTemplateIdRef.current = saved.id;
          setSelectedTemplateId(saved.id);
          setActiveTemplate(saved);
          const parsed = parseConfigJson(saved.configJson || configSnapshot);
          setConfig({ ...parsed });
          setHasUnsavedChanges(false);
          toast.success('ID Card settings saved successfully! Live for all employees.');
        }
      } else {
        const created = await createMutation.mutateAsync({
          name: templateName || 'Official Company ID Card',
          description: templateDescription,
          isDefault: true,
          configJson: configSnapshot,
          status: 'published',
        });

        if (created) {
          currentTemplateIdRef.current = created.id;
          setSelectedTemplateId(created.id);
          setActiveTemplate(created);
          const parsed = parseConfigJson(created.configJson || configSnapshot);
          setConfig({ ...parsed });
          setHasUnsavedChanges(false);
          toast.success('ID Card settings saved successfully! Live for all employees.');
        }
      }
    } catch (err) {
      toast.error('Failed to save ID card settings.');
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplateId) return;
    try {
      const dup = await duplicateMutation.mutateAsync(selectedTemplateId);
      if (dup) setSelectedTemplateId(dup.id);
    } catch (err) {}
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    if (isDefault) {
      toast.error('Cannot delete the organization default template.');
      return;
    }
    if (confirm(`Are you sure you want to delete template '${templateName}'?`)) {
      try {
        await deleteMutation.mutateAsync(selectedTemplateId);
        setSelectedTemplateId(null);
      } catch (err) {}
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Reset this template layout to factory default settings?')) {
      setConfig(DEFAULT_ID_CARD_CONFIG);
      setHasUnsavedChanges(true);
      toast.info('Template reset to factory default settings.');
    }
  };

  const handleRollback = async (versionId: number) => {
    if (!selectedTemplateId) return;
    try {
      const rolledBack = await rollbackMutation.mutateAsync({ id: selectedTemplateId, versionId });
      if (rolledBack) {
        const newConfig = rolledBack.configJson || DEFAULT_ID_CARD_CONFIG;
        setConfig({ ...newConfig });
        setTemplateName(rolledBack.name);
        setTemplateDescription(rolledBack.description || '');
        setIsDefault(!!rolledBack.isDefault);
        setAppliesTo(rolledBack.appliesTo || {});
        setActiveTemplate(rolledBack);
        setHasUnsavedChanges(false);
        toast.success(`Restored directly to Version #${rolledBack.version}!`);
      }
      setIsHistoryModalOpen(false);
    } catch (err) {}
  };

  const handleCreateNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        name: newTemplateName.trim(),
        description: '',
        isDefault: false,
        configJson: DEFAULT_ID_CARD_CONFIG,
        status: 'draft',
      });
      if (created) {
        setSelectedTemplateId(created.id);
        setIsNewTemplateModalOpen(false);
        setNewTemplateName('');
      }
    } catch (err) {}
  };

  // Image Upload Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        toast.error('Logo file size exceeds 2.5MB limit.');
        return;
      }
      try {
        const base64 = await compressImage(file, 500, 0.9);
        updateConfig((c) => ({
          ...c,
          header: { 
            ...c.header, 
            logoUrl: base64, 
            showLogo: true,
            // When uploading logo, remove banner slice so the logo and org title display clearly
            headerImageUrl: null,
            bgImageUrl: null,
            headerBackground: 'transparent',
          },
        }));
        toast.success('Company logo uploaded! Click "Save Settings" to save live.');
      } catch (err) {
        toast.error('Failed to process logo image.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Background image file size exceeds 3MB limit.');
        return;
      }
      try {
        const base64 = await compressImage(file, 800, 0.88);
        updateConfig((c) => ({
          ...c,
          theme: { ...c.theme, style: 'image', bgImageUrl: base64 },
        }));
        toast.success('Card background image applied! Click "Save Settings" to save live.');
      } catch (err) {
        toast.error('Failed to process background image.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleHeaderBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Header image file size exceeds 3MB limit.');
        return;
      }
      try {
        const base64 = await compressImage(file, 600, 0.88);
        updateConfig((c) => ({
          ...c,
          header: { 
            ...c.header, 
            headerImageUrl: base64, 
            bgImageUrl: base64, 
            headerBackground: 'image',
            visible: true,
          },
        }));
        toast.success('Header banner strip image applied! Click "Save Settings" to save live.');
      } catch (err) {
        toast.error('Failed to process header image.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleRibbonImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        toast.error('Ribbon image file size exceeds 2.5MB limit.');
        return;
      }
      try {
        const base64 = await compressImage(file, 600, 0.88);
        updateConfig((c) => ({
          ...c,
          theme: { ...c.theme, ribbonImageUrl: base64 },
        }));
        toast.success('Chevron ribbon image applied! Click "Save Settings" to save live.');
      } catch (err) {
        toast.error('Failed to process ribbon image.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleFooterBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        toast.error('Footer image file size exceeds 2.5MB limit.');
        return;
      }
      try {
        const base64 = await compressImage(file, 600, 0.88);
        updateConfig((c) => ({
          ...c,
          footer: { ...c.footer, bottomBarcodeImageUrl: base64, footerImageUrl: base64, bgImageUrl: base64 },
        }));
        toast.success('Bottom barcode & footer applied! Click "Save Settings" to save live.');
      } catch (err) {
        toast.error('Failed to process footer image.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleBackHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        toast.error('Back header image file size exceeds 2.5MB limit.');
        return;
      }
      try {
        const base64 = await compressImage(file, 600, 0.88);
        updateConfig((c) => ({
          ...c,
          back: { ...c.back, backHeaderImageUrl: base64 },
        }));
        toast.success('Back header image applied! Click "Save Settings" to save live.');
      } catch (err) {
        toast.error('Failed to process back header image.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Signature file size exceeds 2MB limit.');
        return;
      }
      try {
        const base64 = await compressImage(file, 400, 0.9);
        updateConfig((c) => ({
          ...c,
          back: { ...c.back, signatureImageUrl: base64 },
        }));
        toast.success('Authorized signature image applied! Click "Save Settings" to save live.');
      } catch (err) {
        toast.error('Failed to process signature image.');
      } finally {
        e.target.value = '';
      }
    }
  };

  // Field Reordering & Visibility
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    updateConfig((c) => {
      const newFields = [...c.fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFields.length) return c;
      const temp = newFields[index];
      newFields[index] = newFields[targetIndex];
      newFields[targetIndex] = temp;
      return { ...c, fields: newFields };
    });
  };

  const handleToggleFieldVisibility = (id: string) => {
    updateConfig((c) => ({
      ...c,
      fields: c.fields.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f)),
    }));
  };

  const handleAddCustomField = () => {
    if (!newCustomField.label.trim()) {
      toast.error('Please enter a field label.');
      return;
    }
    const id = `custom_${Date.now()}`;
    const fieldToAdd: IdCardFieldConfig = {
      id,
      key: newCustomField.key || id,
      label: newCustomField.label.trim(),
      visible: true,
      side: newCustomField.side,
      fontSize: 'xs',
      fontWeight: 'bold',
      color: '#ffffff',
      isCustom: true,
      customValue: newCustomField.value.trim(),
      showLabel: true,
    };

    updateConfig((c) => ({
      ...c,
      fields: [...c.fields, fieldToAdd],
    }));

    setIsCustomFieldModalOpen(false);
    setNewCustomField({ label: '', key: '', value: '', side: 'front' });
    toast.success('Custom field added to template!');
  };

  // Contrast Ratio Checker
  const bgPrimary = config.theme.primaryColor || '#7c3aed';
  const textPrimary = config.theme.textColor || '#ffffff';
  const contrastRatio = getContrastRatio(textPrimary, bgPrimary);
  const isContrastCompliant = contrastRatio >= 4.5;

  // High-Resolution PNG Export from Admin Preview
  const handleExportPng = async (side: 'front' | 'back') => {
    const targetRef = side === 'front' ? previewFrontRef.current : previewBackRef.current;
    if (!targetRef) return;

    toast.info(`Generating ${side.toUpperCase()} PNG export...`);
    try {
      const canvas = await html2canvas(targetRef, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${templateName.replace(/\s+/g, '_')}_${side.toUpperCase()}.png`;
      link.click();
      toast.success('Downloaded PNG preview successfully!');
    } catch (err) {
      toast.error('Failed to generate PNG download.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar / Header Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> ID Card Designer
            </h1>
            {activeTemplate?.status === 'published' ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                Draft Mode
              </Badge>
            )}
            {isDefault && (
              <Badge variant="secondary" className="text-xs font-bold bg-primary/10 text-primary border-primary/20">
                ⭐ Org Default
              </Badge>
            )}
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs font-semibold text-rose-500 border-rose-300 animate-pulse">
                • Unsaved Changes
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Configure visual layout, headers, photo styles, fields, and print settings for your organization's digital ID cards.
          </p>
        </div>

        {/* Top Action Buttons - Single Master Template Mode */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <Button
            size="sm"
            onClick={handleSaveSettings}
            disabled={updateMutation.isPending}
            className="gap-1.5 h-10 px-6 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" /> {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* ── Main Layout: Controls on Left, Live Preview on Right ──────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT CONTROLS PANEL (7 Cols) ────────────────────────────────────── */}
        <div className="xl:col-span-7 space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" /> Designer Controls
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToDefault}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Default
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1 p-1 bg-muted rounded-xl h-auto">
                  <TabsTrigger value="theme" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    🎨 Theme
                  </TabsTrigger>
                  <TabsTrigger value="header" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    🏛️ Header
                  </TabsTrigger>
                  <TabsTrigger value="photo" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    👤 Photo
                  </TabsTrigger>
                  <TabsTrigger value="fields" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    📋 Fields
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    📱 QR Code
                  </TabsTrigger>
                  <TabsTrigger value="footer" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    📄 Footer
                  </TabsTrigger>
                  <TabsTrigger value="back" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    🛡️ Back
                  </TabsTrigger>
                  <TabsTrigger value="rules" className="text-xs font-bold rounded-lg py-1.5 data-[state=active]:bg-background">
                    ⚙️ Rules
                  </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: THEME & GLOBAL STYLES ────────────────────────── */}
                <TabsContent value="theme" className="space-y-4 pt-1">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-foreground">Preset Color Themes</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {THEME_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            if ((preset as any).isKosqu) {
                              updateConfig(() => ({ ...KOSQU_CORPORATE_CONFIG }));
                              return;
                            }
                            updateConfig((c) => ({
                              ...c,
                              theme: {
                                ...c.theme,
                                style: 'solid',
                                primaryColor: preset.primary,
                                solidBgColor: preset.solidBg || '#ffffff',
                                textColor: preset.textColor || '#0f172a',
                              },
                              header: {
                                ...c.header,
                                statusBadge: {
                                  ...c.header.statusBadge,
                                  colorVariant: preset.badge as any,
                                },
                              },
                            }));
                          }}
                          className="flex flex-col items-start p-2 rounded-xl border border-border/80 hover:border-primary text-left transition-all group bg-card"
                        >
                          <div
                            className="w-full h-8 rounded-lg shadow-inner mb-1.5 border border-border/40 flex items-center justify-center font-bold text-[10px]"
                            style={{
                              backgroundColor: preset.primary || preset.from,
                              color: '#ffffff',
                            }}
                          >
                            Aa
                          </div>
                          <span className="text-[11px] font-bold text-foreground truncate w-full group-hover:text-primary">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Primary Theme Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.theme.primaryColor || '#0284c7'}
                          onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, primaryColor: e.target.value } }))}
                          className="w-8 h-8 rounded-lg border border-border cursor-pointer p-0 shrink-0"
                        />
                        <Input
                          value={config.theme.primaryColor || '#0284c7'}
                          onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, primaryColor: e.target.value } }))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Card Background Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.theme.solidBgColor || '#ffffff'}
                          onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, solidBgColor: e.target.value } }))}
                          className="w-8 h-8 rounded-lg border border-border cursor-pointer p-0 shrink-0"
                        />
                        <Input
                          value={config.theme.solidBgColor || '#ffffff'}
                          onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, solidBgColor: e.target.value } }))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Text Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.theme.textColor || '#0f172a'}
                          onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, textColor: e.target.value } }))}
                          className="w-8 h-8 rounded-lg border border-border cursor-pointer p-0 shrink-0"
                        />
                        <Input
                          value={config.theme.textColor || '#0f172a'}
                          onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, textColor: e.target.value } }))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold">Corner Radius</Label>
                        <span className="text-xs font-mono text-muted-foreground">{config.theme.borderRadius ?? 24}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="36"
                        step="2"
                        value={config.theme.borderRadius ?? 24}
                        onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, borderRadius: Number(e.target.value) } }))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Font Family</Label>
                      <Select
                        value={config.theme.fontFamily || 'Inter'}
                        onValueChange={(v) => updateConfig((c) => ({ ...c, theme: { ...c.theme, fontFamily: v } }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f.label} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <Label className="text-xs font-bold">Custom Card Background Image</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bgImageInputRef.current?.click()}
                        className="h-8 text-xs font-bold rounded-lg gap-1.5 w-full"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload BG
                      </Button>
                      {config.theme.bgImageUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateConfig((c) => ({ ...c, theme: { ...c.theme, bgImageUrl: null, style: 'solid' } }))}
                          className="h-8 text-xs text-rose-500"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Middle Chevron Ribbon Image Upload */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground block">Middle Chevron Ribbon Strip Image</span>
                        <span className="text-[11px] text-muted-foreground">Upload a custom divider banner or arrow graphic strip</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-20 h-7 rounded-lg bg-muted border border-border flex items-center justify-center text-xs overflow-hidden shrink-0">
                        {config.theme.ribbonImageUrl ? (
                          <img src={config.theme.ribbonImageUrl} alt="Ribbon Strip" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Default</span>
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => ribbonImageInputRef.current?.click()}
                            className="h-8 text-xs font-bold gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload Ribbon Image
                          </Button>
                          {config.theme.ribbonImageUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateConfig((c) => ({ ...c, theme: { ...c.theme, ribbonImageUrl: null } }))}
                              className="h-8 text-xs text-rose-500"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">PNG or JPG strip (e.g. 600x60px, max 2MB)</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 2: HEADER SECTION ──────────────────────────────── */}
                <TabsContent value="header" className="space-y-4 pt-1">
                  {/* Header Type / Mode Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Header Display Style</Label>
                    <p className="text-[11px] text-muted-foreground">Select which header layout to show at the top of the ID card (one active at a time):</p>
                  </div>
                    
                  {(() => {
                      const isHidden = config.header.visible === false;
                      const isBanner = !isHidden && (config.header.headerBackground === 'image' || !!config.header.headerImageUrl || !!config.header.bgImageUrl);
                      const isLogo = !isHidden && !isBanner;

                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                            {/* Option 1: Standard Logo & Title */}
                            <div
                              onClick={() =>
                                updateConfig((c) => ({
                                  ...c,
                                  header: {
                                    ...c.header,
                                    visible: true,
                                    headerBackground: 'transparent',
                                    headerImageUrl: null,
                                    bgImageUrl: null,
                                  },
                                }))
                              }
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                                isLogo
                                  ? 'border-primary bg-primary/5 shadow-xs'
                                  : 'border-border/70 hover:border-border hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  🏢 Logo & Text
                                </span>
                                {isLogo && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Dynamic Company Logo, Organization Name & Subtitle.
                              </p>
                            </div>

                            {/* Option 2: Custom Banner Strip Image */}
                            <div
                              onClick={() => {
                                updateConfig((c) => ({
                                  ...c,
                                  header: {
                                    ...c.header,
                                    visible: true,
                                    headerBackground: 'image',
                                  },
                                }));
                                if (!config.header.headerImageUrl && !config.header.bgImageUrl) {
                                  headerBgInputRef.current?.click();
                                }
                              }}
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                                isBanner
                                  ? 'border-primary bg-primary/5 shadow-xs'
                                  : 'border-border/70 hover:border-border hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  🖼️ Banner Strip Image
                                </span>
                                {isBanner && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Full edge-to-edge graphic banner (Recommended: 550 × 175 px).
                              </p>
                            </div>

                            {/* Option 3: Hidden / No Header */}
                            <div
                              onClick={() =>
                                updateConfig((c) => ({
                                  ...c,
                                  header: {
                                    ...c.header,
                                    visible: false,
                                  },
                                }))
                              }
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                                isHidden
                                  ? 'border-primary bg-primary/5 shadow-xs'
                                  : 'border-border/70 hover:border-border hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  🚫 No Header
                                </span>
                                {isHidden && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Hide top header area completely.
                              </p>
                            </div>
                          </div>

                          {/* MODE 1 CONTROLS: Logo & Text Header */}
                          {isLogo && (
                            <div className="space-y-4 pt-3 border-t border-border/60">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold">Company / Org Name</Label>
                                  <Input
                                    value={config.header.orgName || ''}
                                    onChange={(e) => updateConfig((c) => ({ ...c, header: { ...c.header, orgName: e.target.value } }))}
                                    placeholder="KOSQU"
                                    className="h-8 text-xs font-bold"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold">Subtitle</Label>
                                  <Input
                                    value={config.header.subtitle || ''}
                                    onChange={(e) => updateConfig((c) => ({ ...c, header: { ...c.header, subtitle: e.target.value } }))}
                                    placeholder="TECHNOLOGY • AI • GROWTH"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>

                              {/* Company Logo Upload */}
                              <div className="space-y-3 pt-2 border-t border-border/60">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold">Company Logo</Label>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor="show_logo" className="text-[11px] text-muted-foreground">Show Logo</Label>
                                    <Switch
                                      id="show_logo"
                                      checked={config.header.showLogo !== false}
                                      onCheckedChange={(v) => updateConfig((c) => ({ ...c, header: { ...c.header, showLogo: v } }))}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="w-16 h-12 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                                    {config.header.logoUrl ? (
                                      <img src={config.header.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                    ) : (
                                      <span>{config.header.logoInitial || 'K'}</span>
                                    )}
                                  </div>
                                  <div className="space-y-1 flex-1">
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => logoInputRef.current?.click()}
                                        className="h-8 text-xs font-bold gap-1.5"
                                      >
                                        <Upload className="w-3.5 h-3.5" /> Upload Logo
                                      </Button>
                                      {config.header.logoUrl && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => updateConfig((c) => ({ ...c, header: { ...c.header, logoUrl: null } }))}
                                          className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                        >
                                          Remove Logo
                                        </Button>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">PNG, SVG or JPG (max 2.5MB, transparent recommended)</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* MODE 2 CONTROLS: Banner Strip Image */}
                          {isBanner && (
                            <div className="space-y-4 pt-3 border-t border-border/60">
                              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground flex items-start gap-2.5">
                                <span className="text-base">🖼️</span>
                                <div className="space-y-1">
                                  <span className="font-bold block text-xs">Edge-to-Edge Banner Strip is Active</span>
                                  <span className="text-[11px] text-muted-foreground block">
                                    The uploaded graphic banner will display across the full top width of the ID card.
                                  </span>
                                  <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                                    📐 Recommended Size: 550 × 175 px (PNG, JPG or SVG)
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-28 h-12 rounded-lg bg-muted border border-border flex items-center justify-center text-xs overflow-hidden shrink-0">
                                  {config.header.bgImageUrl || config.header.headerImageUrl ? (
                                    <img src={config.header.bgImageUrl || config.header.headerImageUrl!} alt="Header Banner" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">No image</span>
                                  )}
                                </div>
                                <div className="space-y-1 flex-1">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => headerBgInputRef.current?.click()}
                                      className="h-8 text-xs font-bold gap-1.5"
                                    >
                                      <Upload className="w-3.5 h-3.5" /> Upload Banner Image
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        updateConfig((c) => ({
                                          ...c,
                                          header: {
                                            ...c.header,
                                            headerImageUrl: null,
                                            bgImageUrl: null,
                                            headerBackground: 'transparent',
                                          },
                                        }))
                                      }
                                      className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      Switch to Logo & Text
                                    </Button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    Recommended resolution: <strong className="text-foreground font-semibold">550 × 175 px</strong> (PNG, JPG or SVG, max 3MB)
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* MODE 3 CONTROLS: Hidden Header */}
                          {isHidden && (
                            <div className="p-4 rounded-xl bg-muted/50 border border-border text-center space-y-1">
                              <span className="text-xs font-bold text-foreground block">Header Section is Hidden</span>
                              <p className="text-[11px] text-muted-foreground">
                                Cards will render without any top header bar. Photo and employee details will start directly from the top.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}

                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground block">Status Badge</span>
                        <span className="text-[11px] text-muted-foreground">Displays credential status e.g. ACTIVE</span>
                      </div>
                      <Switch
                        checked={config.header.statusBadge?.visible !== false}
                        onCheckedChange={(v) =>
                          updateConfig((c) => ({
                            ...c,
                            header: {
                              ...c.header,
                              statusBadge: { ...c.header.statusBadge, visible: v },
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Rule Mode</Label>
                        <Select
                          value={config.header.statusBadge?.type || 'auto'}
                          onValueChange={(v: any) =>
                            updateConfig((c) => ({
                              ...c,
                              header: {
                                ...c.header,
                                statusBadge: { ...c.header.statusBadge, type: v },
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto" className="text-xs">Auto (from Employee Status)</SelectItem>
                            <SelectItem value="static" className="text-xs">Static Custom Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Badge Color</Label>
                        <Select
                          value={config.header.statusBadge?.colorVariant || 'emerald'}
                          onValueChange={(v: any) =>
                            updateConfig((c) => ({
                              ...c,
                              header: {
                                ...c.header,
                                statusBadge: { ...c.header.statusBadge, colorVariant: v },
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="emerald" className="text-xs">🟢 Emerald Green</SelectItem>
                            <SelectItem value="cyan" className="text-xs">🔵 Cyan Blue</SelectItem>
                            <SelectItem value="amber" className="text-xs">🟡 Amber Gold</SelectItem>
                            <SelectItem value="rose" className="text-xs">🔴 Rose Red</SelectItem>
                            <SelectItem value="purple" className="text-xs">🟣 Purple</SelectItem>
                            <SelectItem value="slate" className="text-xs">⚪ Slate Gray</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 3: PHOTO / AVATAR ──────────────────────────────── */}
                <TabsContent value="photo" className="space-y-4 pt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Show Employee Photo</span>
                      <span className="text-[11px] text-muted-foreground">Toggles photo or avatar initials badge</span>
                    </div>
                    <Switch
                      checked={config.photo?.visible !== false}
                      onCheckedChange={(v) => updateConfig((c) => ({ ...c, photo: { ...c.photo, visible: v } }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Photo Shape</Label>
                      <Select
                        value={config.photo?.shape || 'rounded-square'}
                        onValueChange={(v: any) => updateConfig((c) => ({ ...c, photo: { ...c.photo, shape: v } }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="circle" className="text-xs">⭕ Circle (Rounded Full)</SelectItem>
                          <SelectItem value="rounded-square" className="text-xs">⏹️ Squircle (Smooth Rounded)</SelectItem>
                          <SelectItem value="square" className="text-xs">🔲 Sharp Square</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold">Photo Size</Label>
                        <span className="text-xs font-mono text-muted-foreground">{config.photo?.size || 96}px</span>
                      </div>
                      <input
                        type="range"
                        min="64"
                        max="128"
                        step="4"
                        value={typeof config.photo?.size === 'number' ? config.photo.size : 96}
                        onChange={(e) => updateConfig((c) => ({ ...c, photo: { ...c.photo, size: Number(e.target.value) } }))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">No-Photo Fallback Style</Label>
                      <Select
                        value={config.photo?.fallbackStyle || 'initials'}
                        onValueChange={(v: any) => updateConfig((c) => ({ ...c, photo: { ...c.photo, fallbackStyle: v } }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="initials" className="text-xs">🔤 Initials (e.g. VK)</SelectItem>
                          <SelectItem value="silhouette" className="text-xs">👤 User Silhouette Icon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold">Border Width</Label>
                        <span className="text-xs font-mono text-muted-foreground">{config.photo?.borderWidth ?? 2}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="6"
                        step="1"
                        value={config.photo?.borderWidth ?? 2}
                        onChange={(e) => updateConfig((c) => ({ ...c, photo: { ...c.photo, borderWidth: Number(e.target.value) } }))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Allow Employee Self-Upload</span>
                      <span className="text-[11px] text-muted-foreground">Allows employees to click and upload their ID photo in self-service portal</span>
                    </div>
                    <Switch
                      checked={config.photo?.allowEmployeeUpload !== false}
                      onCheckedChange={(v) => updateConfig((c) => ({ ...c, photo: { ...c.photo, allowEmployeeUpload: v } }))}
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 4: FIELDS MANAGER ──────────────────────────────── */}
                <TabsContent value="fields" className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Employee Info Fields</h4>
                      <p className="text-[11px] text-muted-foreground">Reorder fields, customize labels, and assign to Front or Back card</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsCustomFieldModalOpen(true)}
                      className="gap-1 h-7 text-xs font-bold rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Field
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {config.fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-colors"
                      >
                        {/* Up/Down buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveField(idx, 'up')}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === config.fields.length - 1}
                            onClick={() => handleMoveField(idx, 'down')}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Visibility toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleFieldVisibility(field.id)}
                          className={`p-1 rounded-md ${field.visible ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted'}`}
                          title={field.visible ? 'Hide field' : 'Show field'}
                        >
                          {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* Editable Label */}
                        <div className="flex-1 min-w-0">
                          <Input
                            value={field.label}
                            onChange={(e) => {
                              const newLabel = e.target.value;
                              updateConfig((c) => ({
                                ...c,
                                fields: c.fields.map((f) => (f.id === field.id ? { ...f, label: newLabel } : f)),
                              }));
                            }}
                            className="h-7 text-xs font-bold"
                          />
                        </div>

                        {/* Target Side Selector */}
                        <Select
                          value={field.side}
                          onValueChange={(v: any) =>
                            updateConfig((c) => ({
                              ...c,
                              fields: c.fields.map((f) => (f.id === field.id ? { ...f, side: v } : f)),
                            }))
                          }
                        >
                          <SelectTrigger className="h-7 w-20 text-[10px] font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="front" className="text-xs">Front</SelectItem>
                            <SelectItem value="back" className="text-xs">Back</SelectItem>
                            <SelectItem value="both" className="text-xs">Both</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Color Picker Override */}
                        <input
                          type="color"
                          value={field.color || '#ffffff'}
                          onChange={(e) => {
                            const newCol = e.target.value;
                            updateConfig((c) => ({
                              ...c,
                              fields: c.fields.map((f) => (f.id === field.id ? { ...f, color: newCol } : f)),
                            }));
                          }}
                          className="w-6 h-6 rounded-md border border-border cursor-pointer p-0 shrink-0"
                          title="Field text color override"
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* ── TAB 5: QR & BARCODE CONFIGURATION ───────────────── */}
                <TabsContent value="qr" className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Code Type & Placement Format</Label>
                    <Select
                      value={config.theme?.barcodeFormat || 'barcode'}
                      onValueChange={(v: any) => updateConfig((c) => ({ ...c, theme: { ...c.theme, barcodeFormat: v } }))}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold bg-background text-foreground">
                        <SelectValue placeholder="Barcode on Front (Kosqu Standard)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="barcode" className="text-xs font-medium">Barcode on Front (Kosqu Standard)</SelectItem>
                        <SelectItem value="qr" className="text-xs font-medium">Dynamic QR Code on Front</SelectItem>
                        <SelectItem value="both" className="text-xs font-medium">Both (Barcode on Front + Dynamic QR Code on Back)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Dynamic QR Payload Type</Label>
                      <Select
                        value={config.qrConfig?.payloadType || 'vcard'}
                        onValueChange={(v: any) => updateConfig((c) => ({ ...c, qrConfig: { ...c.qrConfig, payloadType: v } }))}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold bg-background text-foreground">
                          <SelectValue placeholder="📇 vCard (Direct Scan to Phone Contacts)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vcard" className="text-xs">📇 vCard (Direct Scan to Phone Contacts)</SelectItem>
                          <SelectItem value="verification-url" className="text-xs">🔗 Live ID Verification Link</SelectItem>
                          <SelectItem value="employee-id" className="text-xs">🆔 Employee Code (e.g. KT23045)</SelectItem>
                          <SelectItem value="json-profile" className="text-xs">📑 Full Employee Profile JSON</SelectItem>
                          <SelectItem value="custom-url" className="text-xs">🌐 Custom URL Template</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Error Correction Level</Label>
                      <Select
                        value={config.qrConfig?.errorCorrection || 'M'}
                        onValueChange={(v: any) => updateConfig((c) => ({ ...c, qrConfig: { ...c.qrConfig, errorCorrection: v } }))}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold bg-background text-foreground">
                          <SelectValue placeholder="Level M (15% Recovery - Recommended)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L" className="text-xs">Level L (7% Recovery)</SelectItem>
                          <SelectItem value="M" className="text-xs">Level M (15% Recovery - Recommended)</SelectItem>
                          <SelectItem value="Q" className="text-xs">Level Q (25% Recovery)</SelectItem>
                          <SelectItem value="H" className="text-xs">Level H (30% High Reliability)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {config.qrConfig?.payloadType === 'custom-url' && (
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <Label className="text-xs font-bold">Custom Verification URL Template</Label>
                      <Input
                        value={config.qrConfig?.customUrlTemplate || ''}
                        onChange={(e) => updateConfig((c) => ({ ...c, qrConfig: { ...c.qrConfig, customUrlTemplate: e.target.value } }))}
                        placeholder="https://verify.kosqu.com/id/{{employeeCode}}"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Supported variables: <code className="text-primary font-bold">&#123;&#123;employeeCode&#125;&#125;</code>, <code className="text-primary font-bold">&#123;&#123;firstName&#125;&#125;</code>, <code className="text-primary font-bold">&#123;&#123;department&#125;&#125;</code>
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 mt-2">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Show QR Code on Back Side</span>
                      <span className="text-[11px] text-muted-foreground">Displays scannable verification QR code on the back of the card</span>
                    </div>
                    <Switch
                      checked={config.back?.showQrCode !== false}
                      onCheckedChange={(v) => updateConfig((c) => ({ ...c, back: { ...c.back, showQrCode: v } }))}
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 6: FOOTER & SIGNATORY ──────────────────────────── */}
                <TabsContent value="footer" className="space-y-4 pt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Show Footer Bar</span>
                      <span className="text-[11px] text-muted-foreground">Toggles footer text & secured note</span>
                    </div>
                    <Switch
                      checked={config.footer?.visible !== false}
                      onCheckedChange={(v) => updateConfig((c) => ({ ...c, footer: { ...c.footer, visible: v } }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Footer Note Text</Label>
                    <Input
                      value={config.footer?.text || ''}
                      onChange={(e) => updateConfig((c) => ({ ...c, footer: { ...c.footer, text: e.target.value } }))}
                      placeholder="Click card to flip • Apponext HRMS Secured"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Corporate HR Helpline</Label>
                      <Input
                        value={config.footer?.hrHelpline || ''}
                        onChange={(e) => updateConfig((c) => ({ ...c, footer: { ...c.footer, hrHelpline: e.target.value } }))}
                        placeholder="hr@apponexthrms.com"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/60 mt-4 sm:mt-0">
                      <div>
                        <span className="text-xs font-bold block">Powered By Badge</span>
                        <span className="text-[10px] text-muted-foreground">Apponext HRMS branding</span>
                      </div>
                      <Switch
                        checked={config.footer?.showPoweredBy !== false}
                        onCheckedChange={(v) => updateConfig((c) => ({ ...c, footer: { ...c.footer, showPoweredBy: v } }))}
                      />
                    </div>
                  </div>

                  {/* Footer Background / Banner Image Upload */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Footer Banner / Graphic Strip Image</span>
                      <span className="text-[11px] text-muted-foreground">Upload a custom graphic strip or security watermark for the card footer</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-20 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-xs overflow-hidden shrink-0">
                        {config.footer?.footerImageUrl || config.footer?.bgImageUrl ? (
                          <img src={config.footer.footerImageUrl || config.footer.bgImageUrl!} alt="Footer Banner" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">None</span>
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => footerBgInputRef.current?.click()}
                            className="h-8 text-xs font-bold gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload Footer Image
                          </Button>
                          {(config.footer?.footerImageUrl || config.footer?.bgImageUrl) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateConfig((c) => ({ ...c, footer: { ...c.footer, footerImageUrl: null, bgImageUrl: null } }))}
                              className="h-8 text-xs text-rose-500"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">PNG, JPG or SVG banner (max 2.5MB)</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 7: BACK SIDE LAYOUT ────────────────────────────── */}
                <TabsContent value="back" className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Back Side Header Title</Label>
                    <Input
                      value={config.back?.headerTitle || ''}
                      onChange={(e) => updateConfig((c) => ({ ...c, back: { ...c.back, headerTitle: e.target.value } }))}
                      placeholder="SECURITY & EMERGENCY DETAILS"
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  {/* Back Header Graphic / Slice Image Upload */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Back Card Header / Logo Graphic Image</span>
                      <span className="text-[11px] text-muted-foreground">Upload a custom graphic banner or logo slice for the back of the card</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-20 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-xs overflow-hidden shrink-0">
                        {config.back?.backHeaderImageUrl ? (
                          <img src={config.back.backHeaderImageUrl} alt="Back Header" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Default</span>
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => backHeaderImageInputRef.current?.click()}
                            className="h-8 text-xs font-bold gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload Back Header Image
                          </Button>
                          {config.back?.backHeaderImageUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateConfig((c) => ({ ...c, back: { ...c.back, backHeaderImageUrl: null } }))}
                              className="h-8 text-xs text-rose-500"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">PNG, SVG or JPG (max 2.5MB)</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <Label className="text-xs font-bold">Terms & Return Disclaimer Note</Label>
                    <textarea
                      value={config.back?.disclaimer || ''}
                      onChange={(e) => updateConfig((c) => ({ ...c, back: { ...c.back, disclaimer: e.target.value } }))}
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold block">Authorized Signatory Block</span>
                        <span className="text-[11px] text-muted-foreground">Display signature image & signatory title</span>
                      </div>
                      <Switch
                        checked={config.back?.showSignatory || false}
                        onCheckedChange={(v) => updateConfig((c) => ({ ...c, back: { ...c.back, showSignatory: v } }))}
                      />
                    </div>

                    {config.back?.showSignatory && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Signatory Title</Label>
                          <Input
                            value={config.back?.signatoryTitle || ''}
                            onChange={(e) => updateConfig((c) => ({ ...c, back: { ...c.back, signatoryTitle: e.target.value } }))}
                            placeholder="Authorized Signatory"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Signature Image</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => signatureInputRef.current?.click()}
                            className="h-8 text-xs font-bold gap-1.5 w-full"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload Signature
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── TAB 8: TEMPLATE RULES & ASSIGNMENT ─────────────────── */}
                <TabsContent value="rules" className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Template Name</Label>
                      <Input
                        value={templateName}
                        onChange={(e) => {
                          setTemplateName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="h-8 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Description</Label>
                      <Input
                        value={templateDescription}
                        onChange={(e) => {
                          setTemplateDescription(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="e.g. Standard badge for all full-time employees"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Set as Organization Default Template</span>
                      <span className="text-[11px] text-muted-foreground">Used as fallback when no specific department/type rule matches</span>
                    </div>
                    <Switch
                      checked={isDefault}
                      onCheckedChange={(v) => {
                        setIsDefault(v);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>

                  {/* Conditional Assignment Rules */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Conditional Assignment Criteria</h4>
                      <p className="text-[11px] text-muted-foreground">Optionally assign this template only to matching employees</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold">Applicable Department</Label>
                        <Select
                          value={appliesTo.departments?.[0] ? String(appliesTo.departments[0]) : 'all'}
                          onValueChange={(v) => {
                            setAppliesTo((prev) => ({
                              ...prev,
                              departments: v === 'all' ? [] : [Number(v)],
                            }));
                            setHasUnsavedChanges(true);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                            {departments.map((d) => (
                              <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold">Applicable Location</Label>
                        <Select
                          value={appliesTo.locations?.[0] ? String(appliesTo.locations[0]) : 'all'}
                          onValueChange={(v) => {
                            setAppliesTo((prev) => ({
                              ...prev,
                              locations: v === 'all' ? [] : [Number(v)],
                            }));
                            setHasUnsavedChanges(true);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">All Locations / Branches</SelectItem>
                            {locations.map((l) => (
                              <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                                {l.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT LIVE PREVIEW PANEL (5 Cols) ────────────────────────────────── */}
        <div className="xl:col-span-5 space-y-4 sticky top-6">
          <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" /> Live Card Preview
                  </CardTitle>
                  {isContrastCompliant ? (
                    <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
                      ✓ Contrast AAA ({contrastRatio.toFixed(1)}:1)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40" title="Low contrast may reduce legibility">
                      ⚠️ Contrast Hint ({contrastRatio.toFixed(1)}:1)
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="h-7 text-xs font-bold gap-1 rounded-lg"
                  >
                    <RotateCcw className="w-3 h-3 text-primary" /> {isFlipped ? 'Show Front' : 'Show Back'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 flex flex-col items-center justify-center bg-muted/20 min-h-[540px]">
              {/* The Live Shared Card Renderer */}
              <div className="flex items-center justify-center transition-transform duration-200">
                <IdCardRenderer
                  config={config}
                  employeeData={
                    previewMode === 'sample'
                      ? {
                          firstName: 'RAHUL',
                          lastName: 'SHARMA',
                          employeeCode: 'KT23045',
                          designation: 'SR. DATA ANALYST',
                          department: 'Data & Analytics',
                          employmentType: 'Full-Time Permanent',
                          dateOfJoining: '2024-08-01',
                          status: 'active',
                          workEmail: 'info@kosqu.com',
                          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
                        }
                      : {
                          firstName: user?.firstName || 'Employee',
                          lastName: user?.lastName || '',
                          employeeCode: (user as any)?.employeeCode || `EMP-${String(user?.id || 1).padStart(4, '0')}`,
                          designation: (user as any)?.designation || 'Team Member',
                          department: (user as any)?.department || 'Corporate Office',
                          status: 'active',
                        }
                  }
                  personalDetails={{
                    blood_group: 'O+',
                    emergencyContactPhone: '+91 98765 43210',
                    currentAddress: 'Technology Innovation Center, Tower B, Level 4',
                  }}
                  isFlipped={isFlipped}
                  onFlipToggle={() => setIsFlipped(!isFlipped)}
                  interactive={true}
                  scale={previewZoom / 100}
                />
              </div>

              {/* Hidden 2D refs for direct crisp export */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <IdCardRenderer
                  config={config}
                  side="front"
                  mode="flat-2d"
                  frontRef={previewFrontRef}
                />
                <IdCardRenderer
                  config={config}
                  side="back"
                  mode="flat-2d"
                  backRef={previewBackRef}
                />
              </div>

              {/* Live Preview Controls Bar */}
              <div className="w-full flex items-center justify-between pt-4 mt-4 border-t border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold">Data:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('sample')}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${previewMode === 'sample' ? 'bg-primary text-primary-foreground' : 'hover:text-foreground'}`}
                  >
                    Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('own')}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${previewMode === 'own' ? 'bg-primary text-primary-foreground' : 'hover:text-foreground'}`}
                  >
                    My Data
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportPng('front')}
                    className="h-7 text-[11px] font-bold px-2 rounded-lg gap-1 text-primary"
                  >
                    <Download className="w-3 h-3" /> Front PNG
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportPng('back')}
                    className="h-7 text-[11px] font-bold px-2 rounded-lg gap-1 text-primary"
                  >
                    <Download className="w-3 h-3" /> Back PNG
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>



      {/* ── MODAL: ADD CUSTOM FIELD ───────────────────────────────────────────── */}
      <Dialog open={isCustomFieldModalOpen} onOpenChange={setIsCustomFieldModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add Custom Field
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new custom label or static parameter to display on the card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Field Label *</Label>
              <Input
                value={newCustomField.label}
                onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                placeholder="e.g. Project Code, Security Clearance"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Static Value / Note</Label>
              <Input
                value={newCustomField.value}
                onChange={(e) => setNewCustomField({ ...newCustomField, value: e.target.value })}
                placeholder="e.g. Secret Level 2"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Display On</Label>
              <Select
                value={newCustomField.side}
                onValueChange={(v: any) => setNewCustomField({ ...newCustomField, side: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front" className="text-xs">Front Face</SelectItem>
                  <SelectItem value="back" className="text-xs">Back Face</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsCustomFieldModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddCustomField} className="bg-primary hover:bg-primary/90 font-bold">
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CREATE NEW TEMPLATE ────────────────────────────────────────── */}
      <Dialog open={isNewTemplateModalOpen} onOpenChange={setIsNewTemplateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Create New ID Card Template
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a distinct badge template (e.g. Contractor Badge, Intern Card).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Template Name *</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Contractor Security Badge"
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsNewTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNewTemplate}
              disabled={createMutation.isPending}
              className="bg-primary hover:bg-primary/90 font-bold"
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hidden File Inputs for Local Asset Uploads ────────────────────────── */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={bgImageInputRef}
        onChange={handleBgImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={headerBgInputRef}
        onChange={handleHeaderBgUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={footerBgInputRef}
        onChange={handleFooterBgUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={ribbonImageInputRef}
        onChange={handleRibbonImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={backHeaderImageInputRef}
        onChange={handleBackHeaderImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={signatureInputRef}
        onChange={handleSignatureUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default IdCardDesignerPage;

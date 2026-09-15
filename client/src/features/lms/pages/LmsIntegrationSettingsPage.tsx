import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Key,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  ExternalLink,
  Save,
  ArrowLeft,
  RefreshCw,
  Zap,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Globe,
  Hash,
  Eye,
  EyeOff,
  Clock,
  Sliders,
  Check,
  ArrowRight,
  Layers,
  Lock,
  Boxes,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  useLmsIntegrationSettings,
  useUpdateLmsIntegrationSetting,
  useSyncLmsPlatform,
} from '../api/useLms';
import type { LmsPlatform } from '../types/lms.types';
import { toast } from 'sonner';

interface PlatformConfig {
  platform: LmsPlatform;
  name: string;
  badge: string;
  badgeColor: string;
  logoBg: string;
  logoText: string;
  description: string;
  features: string[];
  docsUrl: string;
  credentialFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    helperText?: string;
    isSecret?: boolean;
    icon: React.ElementType;
  }>;
  isAvailable: boolean;
}

const PLATFORMS: PlatformConfig[] = [
  {
    platform: 'udemy',
    name: 'Udemy for Business',
    badge: 'Enterprise Connector',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    logoBg: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white',
    logoText: 'U',
    description:
      'Import thousands of on-demand technology, business, and leadership courses from your Udemy for Business (UFB) subscription. Employees can enroll and track learning progress directly inside ApponextHRMS.',
    features: [
      'Automated course catalog metadata synchronization',
      'Unified employee enrollment & progress tracking',
      'Playback embed & completions tracking within HRMS',
    ],
    docsUrl: 'https://www.udemy.com/developers/affiliate/',
    credentialFields: [
      {
        key: 'orgSubdomain',
        label: 'Organization Subdomain',
        placeholder: 'e.g. acme (from acme.udemy.com)',
        helperText: 'Your company custom domain prefix on Udemy Business.',
        icon: Globe,
      },
      {
        key: 'orgId',
        label: 'Organization / Customer ID',
        placeholder: 'e.g. 104829',
        helperText: 'Found in Udemy Business Admin → Settings → Integrations.',
        icon: Hash,
      },
      {
        key: 'apiKey',
        label: 'API Bearer Token / Secret Key',
        placeholder: 'Enter your UFB API Bearer Token',
        helperText: 'Stored securely in backend vault; never sent to browser.',
        isSecret: true,
        icon: Key,
      },
    ],
    isAvailable: true,
  },
  {
    platform: 'coursera',
    name: 'Coursera for Teams / Enterprise',
    badge: 'Enterprise Connector',
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    logoBg: 'bg-gradient-to-br from-blue-600 to-cyan-700 text-white',
    logoText: 'C',
    description:
      'Sync professional certificate programs, guided projects, and university degree modules with enterprise grade analytics directly to employee skill portfolios.',
    features: [
      'University-backed degree & certificate tracks',
      'Role-based skill taxonomy mapping',
      'Automated assessment & score ingestion',
    ],
    docsUrl: 'https://www.coursera.org/business/api-documentation',
    credentialFields: [
      {
        key: 'orgId',
        label: 'Program ID / Organization ID',
        placeholder: 'e.g. enterprise-prog-8392',
        helperText: 'Found in Coursera Admin Dashboard → Settings → API Integrations.',
        icon: Hash,
      },
      {
        key: 'clientId',
        label: 'OAuth2 Client ID / API Key',
        placeholder: 'Enter Coursera Client ID',
        helperText: 'Client ID generated in Coursera Partner portal.',
        icon: Key,
      },
      {
        key: 'clientSecret',
        label: 'OAuth2 Client Secret',
        placeholder: 'Enter Coursera Client Secret',
        helperText: 'Stored securely in backend vault; never exposed to browser.',
        isSecret: true,
        icon: Key,
      },
    ],
    isAvailable: true,
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn Learning',
    badge: 'Enterprise Connector',
    badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    logoBg: 'bg-gradient-to-br from-sky-600 to-blue-800 text-white',
    logoText: 'in',
    description:
      'Connect LinkedIn Learning LMS connector to synchronize personalized course recommendations and professional certification badges.',
    features: [
      'Role-based learning path synchronization',
      'Direct certificate verification with LinkedIn',
      'Micro-learning bite-sized module tracking',
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/learning/',
    credentialFields: [
      {
        key: 'clientId',
        label: 'OAuth2 Client ID',
        placeholder: 'Enter LinkedIn Client ID',
        helperText: 'Found in LinkedIn Developer Portal → Auth Settings.',
        icon: Key,
      },
      {
        key: 'clientSecret',
        label: 'OAuth2 Client Secret',
        placeholder: 'Enter LinkedIn Client Secret',
        helperText: 'Stored securely in backend vault; never sent to browser.',
        isSecret: true,
        icon: Key,
      },
      {
        key: 'orgUrn',
        label: 'Enterprise Org URN / Account ID',
        placeholder: 'e.g. urn:li:organization:938102',
        helperText: 'Your LinkedIn Learning organization URN identifier.',
        icon: Hash,
      },
    ],
    isAvailable: true,
  },
];

export function LmsIntegrationSettingsPage() {
  const navigate = useNavigate();
  const { data: settings = [], isLoading, refetch, isRefetching } = useLmsIntegrationSettings();
  const updateMutation = useUpdateLmsIntegrationSetting();
  const syncMutation = useSyncLmsPlatform();

  // Local state for credentials and visibility
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({ udemy: true });
  const [credentialsState, setCredentialsState] = useState<Record<string, Record<string, string>>>({});
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});

  // General policy toggles
  const [autoPublish, setAutoPublish] = useState(true);
  const [autoCertificates, setAutoCertificates] = useState(true);

  const getSettingFor = (platform: LmsPlatform) =>
    settings.find((s) => s.platform === platform) ?? {
      platform,
      isEnabled: false,
      isConfigured: false,
      lastSyncedAt: null,
    };

  const handleToggle = async (platform: LmsPlatform, currentValue: boolean) => {
    try {
      await updateMutation.mutateAsync({
        platform,
        data: { isEnabled: !currentValue },
      });
    } catch {
      // Handled in mutation
    }
  };

  const handleSaveCredentials = async (platform: LmsPlatform) => {
    const creds = credentialsState[platform] || {};
    if (Object.keys(creds).length === 0) {
      toast.info('Please enter credentials to save');
      return;
    }
    await updateMutation.mutateAsync({
      platform,
      data: { config: creds },
    });
    // Clear out dirty state
    setCredentialsState((prev) => ({ ...prev, [platform]: {} }));
  };

  const handleSyncNow = async (platform: LmsPlatform) => {
    await syncMutation.mutateAsync(platform);
  };

  const formatLastSynced = (ts: string | null) => {
    if (!ts) return 'Never synced';
    const d = new Date(ts);
    return `${d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })} at ${d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const activeCount = settings.filter((s) => s.isEnabled).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-muted-foreground mt-3 font-semibold">
          Loading LMS Integration Settings...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16 p-4 sm:p-6 font-sans select-none">
      {/* ─── TOP HEADER CARD (Apponext Theme) ─── */}
      <Card className="border border-border/80 shadow-2xs rounded-2xl bg-card overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 px-5 pt-5 border-b border-border/50 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl shrink-0 shadow-2xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold tracking-tight text-foreground">
                  LMS Platform Integrations &amp; Connectors
                </CardTitle>
                <Badge className="text-[10px] font-bold py-0.5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  Multi-Provider Ready
                </Badge>
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                  Company Level
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Configure external e-learning platforms (Udemy for Business, Coursera, LinkedIn Learning) to synchronize course catalogs, certificates, and employee learning progress.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/lms/courses')}
              className="h-9 text-xs font-semibold gap-1.5 px-3 rounded-xl cursor-pointer hover:bg-accent"
            >
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              Course Catalog
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-9 text-xs font-semibold gap-1.5 px-3 rounded-xl cursor-pointer hover:bg-accent"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ─── QUICK METRICS / STATUS TILES ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Active Connectors */}
        <Card className="border border-border/80 rounded-2xl p-4 bg-card shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Connectors
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-foreground">{activeCount}</span>
              <span className="text-xs text-muted-foreground">/ 3 platforms</span>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${activeCount > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
            <Zap className="w-5 h-5" />
          </div>
        </Card>

        {/* Metric 2: Primary Provider */}
        <Card className="border border-border/80 rounded-2xl p-4 bg-card shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Primary Connector
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">Udemy for Business</span>
              {getSettingFor('udemy').isEnabled ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>

        {/* Metric 3: Sync Mechanism */}
        <Card className="border border-border/80 rounded-2xl p-4 bg-card shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Catalog Sync Model
            </p>
            <p className="text-xs font-bold text-foreground">On-Demand &amp; Auto Hook</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
            <RefreshCw className="w-5 h-5" />
          </div>
        </Card>

        {/* Metric 4: Security & Vault */}
        <Card className="border border-border/80 rounded-2xl p-4 bg-card shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Credentials Vault
            </p>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> AES-256 Encrypted
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Lock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* ─── INFO NOTICE BANNER ─── */}
      <div className="rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 p-4 flex items-start gap-3.5">
        <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-foreground">
            Manual course creation is always enabled as default
          </p>
          <p className="text-muted-foreground leading-relaxed">
            These external platforms are modular add-ons. Existing in-house created courses remain completely untouched. When an external connector is activated, a new &quot;Import Platform Courses&quot; option is unlocked inside the Course Management studio.
          </p>
        </div>
      </div>

      {/* ─── PLATFORM CONNECTOR CARDS ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Platform Connectors
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Manage individual platform connections, credentials, and course synchronization status.
            </p>
          </div>
        </div>

        {PLATFORMS.map((platform) => {
          const setting = getSettingFor(platform.platform);
          const isEnabled = setting.isEnabled;
          const isConfigured = setting.isConfigured;
          const isExpanded = showCredentials[platform.platform] ?? false;
          const localCreds = credentialsState[platform.platform] || {};
          const isDirty = Object.keys(localCreds).length > 0;

          return (
            <Card
              key={platform.platform}
              className={`border rounded-2xl shadow-xs transition-all overflow-hidden bg-card ${
                isEnabled
                  ? 'border-purple-500/40 ring-1 ring-purple-500/10'
                  : 'border-border/80 hover:border-border'
              }`}
            >
              {/* Card Header Bar */}
              <CardHeader className="p-5 pb-4 border-b border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Platform Logo Avatar */}
                    <div
                      className={`w-11 h-11 rounded-2xl ${platform.logoBg} font-black text-lg flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      {platform.logoText}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground tracking-tight">
                          {platform.name}
                        </h3>
                        <Badge className={`text-[10px] font-bold py-0.5 px-2 ${platform.badgeColor}`}>
                          {platform.badge}
                        </Badge>
                        {isEnabled ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1" /> Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Disabled
                          </Badge>
                        )}
                        {isConfigured && (
                          <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] font-bold">
                            Configured
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                        {platform.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch + Status */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <div className="text-right hidden md:block">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {isEnabled ? 'Integration Active' : 'Integration Off'}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80">
                        {formatLastSynced(setting.lastSyncedAt)}
                      </p>
                    </div>

                    <Switch
                      checked={isEnabled}
                      disabled={!platform.isAvailable || updateMutation.isPending}
                      onCheckedChange={() => handleToggle(platform.platform, isEnabled)}
                      className="cursor-pointer data-[state=checked]:bg-purple-600"
                    />
                  </div>
                </div>
              </CardHeader>

              {/* Card Body: Feature bullet points + Credentials Config */}
              <CardContent className="p-5 pt-4 space-y-4">
                {/* Feature tags */}
                <div className="flex flex-wrap gap-2">
                  {platform.features.map((feat, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/40"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      {feat}
                    </span>
                  ))}
                </div>

                {/* Available Credentials Form */}
                {platform.isAvailable && (
                  <div className="pt-2">
                    {/* Collapsible toggle button */}
                    <div className="flex items-center justify-between py-2 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() =>
                          setShowCredentials((prev) => ({
                            ...prev,
                            [platform.platform]: !prev[platform.platform],
                          }))
                        }
                        className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-purple-600 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-purple-600" />
                        API Credentials &amp; Vault Configuration
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>

                      <a
                        href={platform.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
                      >
                        Developer Docs <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-4 animate-in fade-in-50 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {platform.credentialFields.map((field) => {
                            const FieldIcon = field.icon;
                            const isSecret = field.isSecret;
                            const showSecretKey = `${platform.platform}_${field.key}`;
                            const isSecretRevealed = showSecretMap[showSecretKey] ?? false;

                            return (
                              <div key={field.key} className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <FieldIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                  {field.label}
                                </Label>
                                <div className="relative">
                                  <Input
                                    type={isSecret && !isSecretRevealed ? 'password' : 'text'}
                                    placeholder={field.placeholder}
                                    value={localCreds[field.key] ?? ''}
                                    onChange={(e) =>
                                      setCredentialsState((prev) => ({
                                        ...prev,
                                        [platform.platform]: {
                                          ...(prev[platform.platform] || {}),
                                          [field.key]: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-10 text-xs font-mono rounded-xl border-border bg-background pr-9"
                                    autoComplete="off"
                                  />
                                  {isSecret && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowSecretMap((prev) => ({
                                          ...prev,
                                          [showSecretKey]: !prev[showSecretKey],
                                        }))
                                      }
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                      {isSecretRevealed ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                {field.helperText && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {field.helperText}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Action buttons bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Lock className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Saved credentials are encrypted with tenant isolation keys.</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncNow(platform.platform)}
                              disabled={syncMutation.isPending || !isEnabled}
                              className="h-9 text-xs font-bold gap-1.5 rounded-xl border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 cursor-pointer"
                            >
                              {syncMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              Sync Catalog Now
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveCredentials(platform.platform)}
                              disabled={updateMutation.isPending || !isDirty}
                              className="h-9 text-xs font-bold gap-1.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs cursor-pointer"
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              Save Credentials
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── GLOBAL LMS AUTOMATION POLICIES ─── */}
      <Card className="border border-border/80 shadow-2xs rounded-2xl bg-card">
        <CardHeader className="pb-3 px-5 pt-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">Integration Automation &amp; Governance</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Configure how synced external courses and certifications behave inside the LMS portal.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
            <div className="space-y-0.5 pr-4">
              <p className="text-xs font-bold text-foreground">Auto-Publish Synced Courses</p>
              <p className="text-[11px] text-muted-foreground">
                Make newly imported platform courses immediately visible in the employee Course Catalog.
              </p>
            </div>
            <Switch
              checked={autoPublish}
              onCheckedChange={setAutoPublish}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
            <div className="space-y-0.5 pr-4">
              <p className="text-xs font-bold text-foreground">HRMS Certificate Generation</p>
              <p className="text-[11px] text-muted-foreground">
                Automatically generate an Apponext digital certificate upon external course 100% completion.
              </p>
            </div>
            <Switch
              checked={autoCertificates}
              onCheckedChange={setAutoCertificates}
              className="cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LmsIntegrationSettingsPage;

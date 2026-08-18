import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CareerPortalCustomizationModal } from '../recruitment/components/CareerPortalCustomizationModal';
import {
  Users,
  FileBarChart,
  Briefcase,
  UserCheck,
  User,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
  Layers,
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Building,
  MapPin,
  UserPlus,
  Palette,
  CalendarCheck,
  Palmtree,
  Clock,
  Wallet,
  TrendingUp,
  GraduationCap,
  BookOpen,
  Package,
  Plane,
  Receipt,
  Headphones,
  BarChart3,
  GitMerge,
  FileText,
  Mail,
  Folder,
  Lock,
  Gauge,
  UserCog,
  Users2,
  Lightbulb,
  UserSearch,
  CreditCard,
  LineChart,
  ClipboardList,
  Target,
  Video,
  FileSpreadsheet,
  Megaphone,
  Repeat,
  BarChart2,
  FolderKanban,
  Calendar,
  Check,
  Sliders,
  Settings,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import {
  ModuleNode,
  RoleType,
  RoleModulesMap,
  ModulesStateMap,
  ROLE_MODULES,
  ROLE_LABELS,
  loadModulesState,
  saveModulesState,
  getDefaultStateForRole,
} from './types';
import { showToast } from '@/components/ui/toast';
import { InlineDashboardCustomizer } from './components/InlineDashboardCustomizer';
import { CoreHREmployeeCustomizer } from './components/CoreHREmployeeCustomizer';
import { cn } from '@/lib/utils';

// Map icon strings to Lucide icon components
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Repeat,
  Building2,
  Building,
  MapPin,
  UserPlus,
  CalendarCheck,
  Palmtree,
  Clock,
  Wallet,
  TrendingUp,
  GraduationCap,
  BookOpen,
  Package,
  Plane,
  Receipt,
  Headphones,
  ShieldCheck,
  BarChart3,
  GitMerge,
  FileText,
  Mail,
  Folder,
  Lock,
  Gauge,
  UserCog,
  Users2,
  Lightbulb,
  UserSearch,
  CreditCard,
  LineChart,
  ClipboardList,
  BarChart2,
  FolderKanban,
  Target,
  Video,
  FileSpreadsheet,
  Megaphone,
  Briefcase,
  UserCheck,
  User,
  Calendar,
  Settings,
};

function renderNodeIcon(iconName?: string, className = 'w-4 h-4 text-primary shrink-0') {
  const IconComponent = (iconName && ICON_MAP[iconName]) || Layers;
  return <IconComponent className={className} />;
}

// Helper to collect all node IDs under a parent module
function getAllSubtreeIds(node: ModuleNode): string[] {
  const ids = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...getAllSubtreeIds(child));
    }
  }
  return ids;
}

// Flatten sub-features into leaf nodes for clean feature chip matrix
interface FeatureLeaf {
  id: string;
  name: string;
  parentCategory?: string;
}

function getFeatureLeaves(nodes?: ModuleNode[], currentCategory?: string): FeatureLeaf[] {
  if (!nodes || nodes.length === 0) return [];
  const leaves: FeatureLeaf[] = [];

  for (const node of nodes) {
    if (!node.children || node.children.length === 0) {
      leaves.push({
        id: node.id,
        name: node.name,
        parentCategory: currentCategory,
      });
    } else {
      const categoryName = currentCategory ? `${currentCategory} › ${node.name}` : node.name;
      leaves.push(...getFeatureLeaves(node.children, categoryName));
    }
  }

  return leaves;
}

/**
 * Main Scoped Module Management Page with Master-Detail Split Screen Layout
 */
export function ModuleManagementPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleParam = searchParams.get('module')?.toLowerCase();

  const resolveRole = (param?: string | null): RoleType => {
    if (param === 'ceo' || param === 'admin') return 'ceo';
    if (param === 'hr') return 'hr';
    if (param === 'manager') return 'manager';
    if (param === 'team-lead' || param === 'tl') return 'tl';
    if (param === 'employee' || param === 'emp') return 'emp';
    return 'ceo';
  };

  const activeRole: RoleType = resolveRole(moduleParam);
  const roleInfo = ROLE_LABELS[activeRole];
  const roleModules: ModuleNode[] = ROLE_MODULES[activeRole] || [];

  const [modulesState, setModulesState] = useState<ModulesStateMap>(loadModulesState());
  const [selectedModuleId, setSelectedModuleId] = useState<string>(roleModules[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [approvalLevels, setApprovalLevels] = useState<number>(2);
  const [sickLeaveDocThreshold, setSickLeaveDocThreshold] = useState<number>(3);
  const [isCareerCustomizationOpen, setIsCareerCustomizationOpen] = useState(false);

  // Sync state when role changes
  useEffect(() => {
    if (roleModules.length > 0) {
      // Keep selected or reset to first module
      if (!roleModules.some((m) => m.id === selectedModuleId)) {
        setSelectedModuleId(roleModules[0]?.id || '');
      }
    }
  }, [activeRole]);

  useEffect(() => {
    const handleSync = () => {
      setModulesState(loadModulesState());
    };
    window.addEventListener('apponext_modules_updated', handleSync);

    // Load organization settings
    apiClient.get('/settings/org-settings')
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const approvalVal = res.data.data.LEAVE_APPROVAL_LEVELS;
          if (approvalVal !== undefined) {
            setApprovalLevels(Number(approvalVal));
          }
          const slThreshold = res.data.data.sick_leave_doc_threshold;
          if (slThreshold !== undefined) {
            setSickLeaveDocThreshold(Number(slThreshold));
          }
        }
      })
      .catch((err) => console.error('Failed to load org settings', err));

    return () => {
      window.removeEventListener('apponext_modules_updated', handleSync);
    };
  }, []);

  const currentRoleMap: RoleModulesMap = modulesState[activeRole] || {};

  // Toggle parent module
  const handleToggleModule = (nodeId: string, enabled: boolean, subtreeIds: string[]) => {
    const newRoleMap = { ...currentRoleMap };
    for (const id of subtreeIds) {
      newRoleMap[id] = enabled;
    }
    setModulesState((prev) => ({ ...prev, [activeRole]: newRoleMap }));
    setHasUnsavedChanges(true);
    showToast.success(`Updated module state`);
  };

  // Toggle leaf feature
  const handleToggleFeature = (featureId: string, enabled: boolean) => {
    const newRoleMap = { ...currentRoleMap, [featureId]: enabled };
    setModulesState((prev) => ({ ...prev, [activeRole]: newRoleMap }));
    setHasUnsavedChanges(true);
  };

  // Bulk enable all subfeatures of current selected module
  const handleBulkEnableCurrentModule = (moduleNode: ModuleNode) => {
    const subtreeIds = getAllSubtreeIds(moduleNode);
    const newRoleMap = { ...currentRoleMap };
    for (const id of subtreeIds) {
      newRoleMap[id] = true;
    }
    setModulesState((prev) => ({ ...prev, [activeRole]: newRoleMap }));
    setHasUnsavedChanges(true);
    showToast.success(`Enabled all features for ${moduleNode.name}`);
  };

  // Bulk disable all subfeatures of current selected module
  const handleBulkDisableCurrentModule = (moduleNode: ModuleNode) => {
    const subtreeIds = getAllSubtreeIds(moduleNode);
    const newRoleMap = { ...currentRoleMap };
    for (const id of subtreeIds) {
      newRoleMap[id] = false;
    }
    setModulesState((prev) => ({ ...prev, [activeRole]: newRoleMap }));
    setHasUnsavedChanges(true);
    showToast.info(`Disabled all features for ${moduleNode.name}`);
  };

  // Reset to default state
  const handleResetDefault = () => {
    if (confirm(`Reset all ${roleInfo.title} module settings back to default?`)) {
      const defaultRoleMap = getDefaultStateForRole(activeRole);
      setModulesState((prev) => ({ ...prev, [activeRole]: defaultRoleMap }));
      setHasUnsavedChanges(true);
      showToast.success(`Reset ${roleInfo.title} modules to default state`);
    }
  };

  // Save changes
  const handleSaveChanges = async () => {
    try {
      saveModulesState(modulesState);
      await apiClient.put('/settings/org-settings', { 
        LEAVE_APPROVAL_LEVELS: approvalLevels,
        sick_leave_doc_threshold: sickLeaveDocThreshold
      });
      setHasUnsavedChanges(false);
      showToast.success('Configuration saved successfully!');
    } catch (e) {
      showToast.error('Failed to save configuration settings');
    }
  };

  // Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return roleModules;
    const q = searchQuery.toLowerCase();
    return roleModules.filter((m) => {
      const leaves = getFeatureLeaves(m.children);
      return (
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        leaves.some((l) => l.name.toLowerCase().includes(q))
      );
    });
  }, [roleModules, searchQuery]);

  // Currently selected module node
  const selectedModule = roleModules.find((m) => m.id === selectedModuleId) || roleModules[0];
  const isSelectedDashboard = selectedModule?.id?.toLowerCase().includes('dashboard');
  const isSelectedCoreHR =
    selectedModule?.id?.toLowerCase().includes('core_hr') ||
    selectedModule?.id === 'hr_employee_management' ||
    selectedModule?.id === 'hr_employee_lifecycle' ||
    selectedModule?.id === 'hr_dept_management' ||
    selectedModule?.name?.toLowerCase().includes('core hr') ||
    selectedModule?.name?.toLowerCase().includes('employee');

  const selectedModuleLeaves = getFeatureLeaves(selectedModule?.children);
  const selectedModuleActiveCount = selectedModuleLeaves.filter((l) => currentRoleMap[l.id] !== false).length;
  const isSelectedModuleEnabled = currentRoleMap[selectedModule?.id] !== false;

  // Group leaves by parentCategory for detailed view
  const groupedLeaves: Record<string, FeatureLeaf[]> = {};
  selectedModuleLeaves.forEach((leaf) => {
    const cat = leaf.parentCategory || 'Core Capabilities';
    if (!groupedLeaves[cat]) groupedLeaves[cat] = [];
    groupedLeaves[cat].push(leaf);
  });

  const totalRoleModules = roleModules.length;
  const activeRoleModulesCount = roleModules.filter((m) => currentRoleMap[m.id] !== false).length;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full pb-12 p-3 sm:p-5">
      {/* Top Header Card Scoped to Active Role */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-extrabold tracking-tight">
                  {roleInfo.title} Module Management
                </CardTitle>
                
                <Badge variant="secondary" className="text-[10px] font-mono font-semibold">
                  {activeRoleModulesCount} of {totalRoleModules} Modules Active
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Select any module on the left to configure fields, customize dashboard widgets, and toggle capabilities on the right.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefault}
              className="h-8 text-xs font-semibold gap-1.5 px-3 rounded-xl cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSaveChanges}
              className="h-8 text-xs font-bold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Configuration
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Leave Approval Stage Setting Card */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-500/10 text-violet-600 rounded-lg shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Leave Approval Workflow</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Toggle between two-stage approval (requires Team Lead/Manager AND Admin/HR) or one-stage approval (Team Lead/Manager is final).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {approvalLevels === 2 ? 'Two-Stage Approval (TL/Manager + HR)' : 'One-Stage Approval (TL/Manager Only)'}
            </span>
            <Switch
              checked={approvalLevels === 2}
              onCheckedChange={(checked) => {
                setApprovalLevels(checked ? 2 : 1);
                setHasUnsavedChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sick Leave Threshold Setting Card */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0 mt-0.5">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Sick Leave Medical Proof Threshold (Days)</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Specify the minimum duration of Sick Leave (SL) in days that will mandate employees to upload a supporting medical document.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={sickLeaveDocThreshold}
              onChange={(e) => {
                setSickLeaveDocThreshold(parseInt(e.target.value, 10));
                setHasUnsavedChanges(true);
              }}
              className="w-[200px] h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
            >
              <option value="1">1 Day or more</option>
              <option value="2">2 Days or more</option>
              <option value="3">3 Days or more (Default)</option>
              <option value="4">4 Days or more</option>
              <option value="5">5 Days or more</option>
              <option value="7">7 Days or more</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Career Portal Customization Setting Card */}
      <Card className="border border-indigo-200/80 shadow-2xs rounded-xl bg-indigo-50/30 dark:bg-slate-900">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-foreground">Career Portal Customization</h4>
                <Badge className="bg-indigo-100 text-indigo-700 text-[9px] font-bold border-indigo-200">Customizable</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Customize company logo, portal title, banner tagline, theme colors, top user account info visibility, and candidate application form field requirements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsCareerCustomizationOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              Edit Customization
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Module Quick Launch Card */}
      <Card className="border border-primary/30 shadow-2xs rounded-xl bg-card">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0 mt-0.5">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-foreground">Attendance Module</h4>
                <Badge className="text-[10px] font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/30">
                  Enterprise Module
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Manage enterprise attendance policies, shift rules, grace periods, geofence parameters, and regularization settings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="sm"
              onClick={() => navigate('/settings/attendance-module')}
              className="h-8 text-xs font-bold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              Open Attendance Module
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Master-Detail Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ─── LEFT COLUMN: Module Directory (4 cols) ─── */}
        <Card className="lg:col-span-4 border border-border/80 shadow-2xs rounded-2xl bg-card overflow-hidden">
          <CardHeader className="p-3.5 pb-2.5 border-b border-border/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8.5 bg-muted/40 border-border/60 rounded-xl"
              />
            </div>
          </CardHeader>

          <CardContent className="p-2 space-y-1 max-h-[calc(100vh-230px)] overflow-y-auto">
            {filteredModules.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No matching modules found</p>
            ) : (
              filteredModules.map((moduleNode) => {
                const isSelected = selectedModule?.id === moduleNode.id;
                const isEnabled = currentRoleMap[moduleNode.id] !== false;
                const subtreeIds = getAllSubtreeIds(moduleNode);
                const leaves = getFeatureLeaves(moduleNode.children);
                const activeLeaves = leaves.filter((l) => currentRoleMap[l.id] !== false).length;

                return (
                  <div
                    key={moduleNode.id}
                    onClick={() => setSelectedModuleId(moduleNode.id)}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/30'
                        : 'border-transparent hover:border-border/80 hover:bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'p-2 rounded-lg shrink-0 transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-2xs'
                            : isEnabled
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {renderNodeIcon(moduleNode.iconName, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p
                          className={cn(
                            'font-bold text-xs truncate',
                            isSelected ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {moduleNode.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {leaves.length > 0 ? (
                            <span>{activeLeaves}/{leaves.length} Capabilities</span>
                          ) : (
                            <span>Core Module</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleModule(moduleNode.id, checked, subtreeIds)}
                      />
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 transition-transform text-muted-foreground',
                          isSelected ? 'text-primary translate-x-0.5' : 'opacity-40 group-hover:opacity-100'
                        )}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ─── RIGHT COLUMN: Detail Configuration Pane (8 cols) ─── */}
        <div className="lg:col-span-8 space-y-4">
          {selectedModule && (
            <Card className="border border-border/80 shadow-2xs rounded-2xl bg-card overflow-hidden">
              {/* Detail Header */}
              <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                    {renderNodeIcon(selectedModule.iconName, 'w-5 h-5 text-primary stroke-[2.2]')}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-black text-foreground">
                        {selectedModule.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold py-0.5 px-2',
                          isSelectedModuleEnabled
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        )}
                      >
                        {isSelectedModuleEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {(isSelectedDashboard || isSelectedCoreHR) && (
                        <Badge className="text-[10px] font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
                          Customization Studio
                        </Badge>
                      )}
                    </div>
                    {selectedModule.description && (
                      <CardDescription className="text-xs text-muted-foreground">
                        {selectedModule.description}
                      </CardDescription>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  {!isSelectedDashboard && !isSelectedCoreHR && selectedModuleLeaves.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkEnableCurrentModule(selectedModule)}
                        className="h-7 text-[11px] font-semibold px-2.5 rounded-lg"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                        Enable All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkDisableCurrentModule(selectedModule)}
                        className="h-7 text-[11px] font-semibold px-2.5 rounded-lg"
                      >
                        <XCircle className="w-3 h-3 text-rose-600 mr-1" />
                        Disable All
                      </Button>
                    </div>
                  )}

                  <Switch
                    checked={isSelectedModuleEnabled}
                    onCheckedChange={(checked) =>
                      handleToggleModule(selectedModule.id, checked, getAllSubtreeIds(selectedModule))
                    }
                  />
                </div>
              </CardHeader>

              {/* Detail Content Body */}
              <CardContent className="p-4 sm:p-5">
                {isSelectedDashboard ? (
                  /* ─── INLINE DASHBOARD CUSTOMIZER ON THE SAME SCREEN ─── */
                  <InlineDashboardCustomizer />
                ) : isSelectedCoreHR ? (
                  /* ─── INLINE CORE HR EMPLOYEE CUSTOMIZER ON THE SAME SCREEN ─── */
                  <CoreHREmployeeCustomizer />
                ) : (
                  /* ─── STANDARD SUB-FEATURE MATRIX FOR OTHER MODULES ─── */
                  <div className="space-y-4">
                    {selectedModuleLeaves.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                        <p className="font-semibold text-foreground">Standard Core Module</p>
                        <p className="mt-1">This module operates under global enterprise rules and has no individual sub-switches.</p>
                      </div>
                    ) : (
                      Object.entries(groupedLeaves).map(([category, leaves]) => (
                        <div key={category} className="space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {category} ({leaves.filter((l) => currentRoleMap[l.id] !== false).length}/{leaves.length})
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {leaves.map((leaf) => {
                              const isLeafEnabled = isSelectedModuleEnabled && currentRoleMap[leaf.id] !== false;

                              return (
                                <button
                                  key={leaf.id}
                                  type="button"
                                  disabled={!isSelectedModuleEnabled}
                                  onClick={() => handleToggleFeature(leaf.id, !isLeafEnabled)}
                                  className={cn(
                                    'flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs text-left cursor-pointer',
                                    isLeafEnabled
                                      ? 'bg-primary/5 border-primary/40 text-foreground font-semibold shadow-2xs ring-1 ring-primary/20'
                                      : isSelectedModuleEnabled
                                      ? 'bg-card border-border/70 text-muted-foreground hover:bg-muted/40'
                                      : 'bg-muted/20 border-border/30 text-muted-foreground/40 cursor-not-allowed line-through'
                                  )}
                                >
                                  <span className="truncate pr-2">{leaf.name}</span>
                                  <div className="shrink-0">
                                    <Switch
                                      checked={isLeafEnabled}
                                      disabled={!isSelectedModuleEnabled}
                                      onCheckedChange={(checked) => handleToggleFeature(leaf.id, checked)}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Footer Save Button for Module */}
                    <div className="flex items-center justify-end pt-3 border-t border-border/60">
                      <Button
                        size="sm"
                        onClick={handleSaveChanges}
                        className="h-8 text-xs font-bold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-2xs cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save {selectedModule.name} Configuration
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Career Portal Customization Modal Popup */}
      <CareerPortalCustomizationModal
        isOpen={isCareerCustomizationOpen}
        onClose={() => setIsCareerCustomizationOpen(false)}
      />
    </div>
  );
}

export default ModuleManagementPage;

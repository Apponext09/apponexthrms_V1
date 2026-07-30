import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Users,
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
  Settings,
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
};

function renderNodeIcon(iconName?: string) {
  const IconComponent = (iconName && ICON_MAP[iconName]) || Layers;
  return <IconComponent className="w-4 h-4 text-primary shrink-0" />;
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
 * Module Card Component
 */
interface ModuleCardProps {
  moduleNode: ModuleNode;
  roleMap: RoleModulesMap;
  onToggleModule: (nodeId: string, enabled: boolean, subtreeIds: string[]) => void;
  onToggleFeature: (featureId: string, enabled: boolean) => void;
  searchQuery: string;
}

function ModuleCard({
  moduleNode,
  roleMap,
  onToggleModule,
  onToggleFeature,
  searchQuery,
}: ModuleCardProps) {
  const isMainEnabled = roleMap[moduleNode.id] !== false;
  const subtreeIds = getAllSubtreeIds(moduleNode);
  const featureLeaves = getFeatureLeaves(moduleNode.children);

  const activeLeavesCount = featureLeaves.filter((leaf) => roleMap[leaf.id] !== false).length;
  const totalLeavesCount = featureLeaves.length;

  // Search query filter
  const matchesModule =
    !searchQuery ||
    moduleNode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (moduleNode.description && moduleNode.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    featureLeaves.some((leaf) => leaf.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!matchesModule) return null;

  // Group leaves by parentCategory if available
  const groupedLeaves: Record<string, FeatureLeaf[]> = {};
  featureLeaves.forEach((leaf) => {
    const cat = leaf.parentCategory || 'Features';
    if (!groupedLeaves[cat]) groupedLeaves[cat] = [];
    groupedLeaves[cat].push(leaf);
  });

  return (
    <Card
      className={`border rounded-xl transition-all duration-200 ${
        isMainEnabled
          ? 'bg-card border-border/80 shadow-2xs hover:border-primary/40'
          : 'bg-muted/30 border-border/40 opacity-70'
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 pt-4 border-b border-border/40">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-lg shrink-0 transition-colors ${
              isMainEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {renderNodeIcon(moduleNode.iconName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-bold truncate text-foreground">
                {moduleNode.name}
              </CardTitle>
              {totalLeavesCount > 0 && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50 shrink-0">
                  {activeLeavesCount}/{totalLeavesCount} Enabled
                </span>
              )}
            </div>
            {moduleNode.description && (
              <CardDescription className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {moduleNode.description}
              </CardDescription>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          <Badge
            variant="outline"
            className={`text-[10px] font-bold py-0.5 px-2 ${
              isMainEnabled
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
            }`}
          >
            {isMainEnabled ? 'Enabled' : 'Disabled'}
          </Badge>

          <Switch
            checked={isMainEnabled}
            onCheckedChange={(checked) => onToggleModule(moduleNode.id, checked, subtreeIds)}
          />
        </div>
      </CardHeader>

      {/* Feature Matrix / Submodules */}
      {totalLeavesCount > 0 && (
        <CardContent className="px-4 py-3 space-y-2.5">
          {Object.entries(groupedLeaves).map(([category, leaves]) => (
            <div key={category} className="space-y-1.5">
              {Object.keys(groupedLeaves).length > 1 && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {category}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {leaves.map((leaf) => {
                  const isLeafEnabled = isMainEnabled && roleMap[leaf.id] !== false;

                  return (
                    <button
                      key={leaf.id}
                      type="button"
                      disabled={!isMainEnabled}
                      onClick={() => onToggleFeature(leaf.id, !isLeafEnabled)}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isLeafEnabled
                          ? 'bg-primary/10 border-primary/30 text-primary font-medium hover:bg-primary/20 shadow-2xs'
                          : isMainEnabled
                          ? 'bg-muted/40 border-border/50 text-muted-foreground/70 hover:bg-muted/70 hover:text-foreground line-through'
                          : 'bg-muted/20 border-border/30 text-muted-foreground/40 cursor-not-allowed line-through'
                      }`}
                    >
                      {isLeafEnabled ? (
                        <Check className="w-3 h-3 text-primary shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      )}
                      <span>{leaf.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Main Executive Module Management Page
 */
export function ModuleManagementPage(): JSX.Element {
  const [activeRole, setActiveRole] = useState<RoleType>('hr');
  const [modulesState, setModulesState] = useState<ModulesStateMap>(loadModulesState());
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [approvalLevels, setApprovalLevels] = useState<number>(2);
  const [sickLeaveDocThreshold, setSickLeaveDocThreshold] = useState<number>(3);

  useEffect(() => {
    const handleSync = () => {
      setModulesState(loadModulesState());
    };
    window.addEventListener('apponext_modules_updated', handleSync);

    // Load organization settings (leave approval levels, sick leave threshold)
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

  const currentRoleMap = modulesState[activeRole] || {};
  const currentRoleModules = ROLE_MODULES[activeRole] || [];

  // Toggle main module and all its subtree
  const handleToggleModule = (nodeId: string, enabled: boolean, subtreeIds: string[]) => {
    setModulesState((prev) => {
      const newRoleMap = { ...prev[activeRole] };
      subtreeIds.forEach((id) => {
        newRoleMap[id] = enabled;
      });
      return {
        ...prev,
        [activeRole]: newRoleMap,
      };
    });
    setHasUnsavedChanges(true);
  };

  // Toggle single leaf feature
  const handleToggleFeature = (featureId: string, enabled: boolean) => {
    setModulesState((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [featureId]: enabled,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Enable all modules
  const handleEnableAll = () => {
    const newRoleMap: RoleModulesMap = {};
    function traverse(nodes: ModuleNode[]) {
      for (const n of nodes) {
        newRoleMap[n.id] = true;
        if (n.children) traverse(n.children);
      }
    }
    traverse(currentRoleModules);
    setModulesState((prev) => ({ ...prev, [activeRole]: newRoleMap }));
    setHasUnsavedChanges(true);
    showToast.success(`Enabled all ${ROLE_LABELS[activeRole].title} modules`);
  };

  // Disable all modules
  const handleDisableAll = () => {
    const newRoleMap: RoleModulesMap = {};
    function traverse(nodes: ModuleNode[]) {
      for (const n of nodes) {
        newRoleMap[n.id] = false;
        if (n.children) traverse(n.children);
      }
    }
    traverse(currentRoleModules);
    setModulesState((prev) => ({ ...prev, [activeRole]: newRoleMap }));
    setHasUnsavedChanges(true);
    showToast.info(`Disabled all ${ROLE_LABELS[activeRole].title} modules`);
  };

  // Reset to default state
  const handleResetDefault = () => {
    const defaultRoleMap = getDefaultStateForRole(activeRole);
    setModulesState((prev) => ({ ...prev, [activeRole]: defaultRoleMap }));
    setHasUnsavedChanges(true);
    showToast.success(`Reset ${ROLE_LABELS[activeRole].title} modules to default state`);
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
      showToast.success('Configuration and leave settings saved successfully!');
    } catch (e) {
      showToast.error('Failed to save configuration settings');
    }
  };

  // Count total enabled modules
  const allCurrentNodeIds: string[] = [];
  function collectIds(nodes: ModuleNode[]) {
    for (const n of nodes) {
      allCurrentNodeIds.push(n.id);
      if (n.children) collectIds(n.children);
    }
  }
  collectIds(currentRoleModules);

  const totalCount = currentRoleModules.length;
  const activeMainCount = currentRoleModules.filter((m) => currentRoleMap[m.id] !== false).length;

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-12 p-4 sm:p-6">
      {/* Top Header Card */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary shrink-0" />
              <CardTitle className="text-sm font-bold tracking-tight">Module Management</CardTitle>
              {hasUnsavedChanges && (
                <Badge className="text-[10px] font-bold py-0.5 px-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Control feature access and portal modules for each role. Toggle modules on or off with instant persistence.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefault}
              className="h-7 text-xs font-semibold gap-1.5 px-3"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSaveChanges}
              className="h-7 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
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

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['hr', 'manager', 'tl', 'emp'] as RoleType[]).map((role) => {
          const info = ROLE_LABELS[role];
          const isActive = activeRole === role;
          const roleModules = ROLE_MODULES[role] || [];
          const activeModules = roleModules.filter((m) => (modulesState[role] || {})[m.id] !== false).length;

          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`flex flex-col text-left p-3.5 rounded-xl border transition-all text-xs relative ${
                isActive
                  ? 'bg-card border-primary/80 ring-2 ring-primary/15 shadow-2xs'
                  : 'bg-card/70 border-border/80 hover:border-border hover:bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded tracking-wider ${info.color}`}>
                  {info.title}
                </span>
                <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                  {activeModules}/{roleModules.length} Modules
                </span>
              </div>
              <p className="font-bold text-xs text-foreground mt-0.5 line-clamp-1">{info.title} Workspace</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{info.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Filter and Bulk Action Controls */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold">{ROLE_LABELS[activeRole].title} Feature Modules</CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {activeMainCount} of {totalCount} Active Modules
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Toggle switches to enable or disable entire modules. Click feature chips to toggle specific capabilities.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableAll}
              className="h-7 text-xs font-semibold gap-1.5 px-3"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableAll}
              className="h-7 text-xs font-semibold gap-1.5 px-3"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Disable All
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-5 py-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${ROLE_LABELS[activeRole].title} modules and sub-features...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-card border-border/80"
            />
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {currentRoleModules.map((moduleNode) => (
              <ModuleCard
                key={moduleNode.id}
                moduleNode={moduleNode}
                roleMap={currentRoleMap}
                onToggleModule={handleToggleModule}
                onToggleFeature={handleToggleFeature}
                searchQuery={searchQuery}
              />
            ))}
          </div>

          {/* Footer Save Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-border/50 gap-2 text-xs">
            <p className="text-[11px] text-muted-foreground">
              💡 <span className="font-semibold text-foreground">Tip:</span> Disabling a main module switch automatically disables all its nested capabilities.
            </p>

            <Button
              size="sm"
              onClick={handleSaveChanges}
              className="h-7 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="w-3.5 h-3.5" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ModuleManagementPage;


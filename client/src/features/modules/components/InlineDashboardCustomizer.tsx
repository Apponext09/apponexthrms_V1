import { useState } from 'react';
import {
  useDashboardCustomizationStore,
  ALL_AVAILABLE_KPIS,
  ALL_AVAILABLE_REPORTS,
  ALL_AVAILABLE_QUICK_ACTIONS,
  FIXED_KPIS,
} from '@/features/dashboard/store/dashboardCustomizationStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  UserCheck,
  Palmtree,
  Clock,
  Briefcase,
  UserPlus,
  Package,
  Wallet,
  FileBarChart,
  Coffee,
  Navigation,
  IndianRupee,
  Flame,
  CreditCard,
  FilePlus,
  CheckCircle,
  Settings,
  RotateCcw,
  Save,
  Check,
  Layers,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ICON_COMPONENTS: Record<string, any> = {
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  UserCheck,
  Palmtree,
  Clock,
  Briefcase,
  UserPlus,
  Package,
  Wallet,
  FileBarChart,
  Coffee,
  Navigation,
  IndianRupee,
  Flame,
  CreditCard,
  FilePlus,
  CheckCircle,
  Settings,
  Lock,
};

export function InlineDashboardCustomizer() {
  const {
    config,
    updateConfig,
    toggleKpi,
    toggleQuickAction,
    setSelectedReport,
    resetToDefaults,
  } = useDashboardCustomizationStore();

  const [activeTab, setActiveTab] = useState<'sections' | 'kpis' | 'reports' | 'actions'>('sections');

  const getIcon = (name: string) => {
    const IconComp = ICON_COMPONENTS[name] || Layers;
    return <IconComp className="w-4 h-4" />;
  };

  const handleSave = () => {
    toast.success('Dashboard layout and KPI customizations saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Reset all dashboard customizations back to factory defaults?')) {
      resetToDefaults();
      toast.info('Reset dashboard configuration to defaults');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex items-center border-b border-border/80 pb-2 gap-1.5 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('sections')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'sections'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          1. Layout &amp; Sections
        </button>
        <button
          onClick={() => setActiveTab('kpis')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'kpis'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          2. KPI Metrics Studio
          <Badge
            variant={activeTab === 'kpis' ? 'outline' : 'secondary'}
            className={cn('text-[10px] px-1.5 py-0', activeTab === 'kpis' && 'border-white/40 text-white')}
          >
            {config.enabledKpiIds.length} Active
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'reports'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          3. Attendance &amp; Reports
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'actions'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          4. Quick Actions
        </button>
      </div>

      {/* Tab 1: Layout & Sections */}
      {activeTab === 'sections' && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground font-medium">
            Toggle which components and cards are visible on the dashboard:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Header Add Employee */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Add Employee Button</p>
                  <p className="text-[11px] text-muted-foreground">Quick employee creation button in header</p>
                </div>
                <Switch
                  checked={config.showHeaderAddEmployee}
                  onCheckedChange={(checked) => updateConfig({ showHeaderAddEmployee: checked })}
                />
              </CardContent>
            </Card>

            {/* Header Attendance Report */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Attendance Report Button</p>
                  <p className="text-[11px] text-muted-foreground">Report launcher button in header</p>
                </div>
                <Switch
                  checked={config.showHeaderAttendanceReport}
                  onCheckedChange={(checked) => updateConfig({ showHeaderAttendanceReport: checked })}
                />
              </CardContent>
            </Card>

            {/* Overview KPIs Section */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Top KPI Metric Cards</p>
                  <p className="text-[11px] text-muted-foreground">Grid of active employee count &amp; presence stats</p>
                </div>
                <Switch
                  checked={config.showKpiSection}
                  onCheckedChange={(checked) => updateConfig({ showKpiSection: checked })}
                />
              </CardContent>
            </Card>

            {/* Employee Growth Trend */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Employee Growth Trend</p>
                  <p className="text-[11px] text-muted-foreground">Area trajectory chart for month-on-month growth</p>
                </div>
                <Switch
                  checked={config.showGrowthTrendChart}
                  onCheckedChange={(checked) => updateConfig({ showGrowthTrendChart: checked })}
                />
              </CardContent>
            </Card>

            {/* Entity Details */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Entity Details Card</p>
                  <p className="text-[11px] text-muted-foreground">Company name, location, and legal entity status</p>
                </div>
                <Switch
                  checked={config.showEntityDetails}
                  onCheckedChange={(checked) => updateConfig({ showEntityDetails: checked })}
                />
              </CardContent>
            </Card>

            {/* Recent Employee Roster */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Recent Employee Roster</p>
                  <p className="text-[11px] text-muted-foreground">List of newly joined workforce members</p>
                </div>
                <Switch
                  checked={config.showRecentRoster}
                  onCheckedChange={(checked) => updateConfig({ showRecentRoster: checked })}
                />
              </CardContent>
            </Card>

            {/* Quick Management Shortcuts */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Quick Actions Shortcuts</p>
                  <p className="text-[11px] text-muted-foreground">Sidebar launcher buttons for key modules</p>
                </div>
                <Switch
                  checked={config.showQuickActions}
                  onCheckedChange={(checked) => updateConfig({ showQuickActions: checked })}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: KPI Metrics Studio */}
      {activeTab === 'kpis' && (
        <div className="space-y-4 pt-1">

          {/* ── Pinned / Fixed KPIs (always visible, not removable) ─────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-xs font-bold text-foreground">Pinned KPIs</h4>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">Always On</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              These 4 core metrics are permanently displayed and cannot be removed:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FIXED_KPIS.map((kpi) => {
                const IconComp = ICON_COMPONENTS[kpi.iconName] || Layers;
                return (
                  <div
                    key={kpi.id}
                    className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between gap-3 opacity-80 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg shrink-0 bg-primary/10 text-primary">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{kpi.label}</p>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Core</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground">Pinned</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Optional / Toggleable KPIs ──────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-xs font-bold text-foreground">Optional KPI Metrics</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enable additional metrics to appear on the dashboard:
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/20">
                {config.enabledKpiIds.length} Active
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_AVAILABLE_KPIS.map((kpi) => {
                const isEnabled = config.enabledKpiIds.includes(kpi.id);

                return (
                  <div
                    key={kpi.id}
                    onClick={() => toggleKpi(kpi.id)}
                    className={cn(
                      'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
                      isEnabled
                        ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/40'
                        : 'border-border/80 bg-card hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'p-2 rounded-lg shrink-0',
                          isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {getIcon(kpi.iconName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{kpi.label}</p>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {kpi.category}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleKpi(kpi.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Attendance & Reports Connection */}
      {activeTab === 'reports' && (
        <div className="space-y-3 pt-1">
          <div>
            <h4 className="text-xs font-bold text-foreground">Customize Report Connection</h4>
            <p className="text-[11px] text-muted-foreground">
              Select which system report launches when clicking the top header report button:
            </p>
          </div>

          <div className="space-y-2.5">
            {ALL_AVAILABLE_REPORTS.map((report) => {
              const isSelected = config.selectedReportId === report.id;

              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary'
                      : 'border-border/80 bg-card hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl shrink-0',
                        isSelected ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {getIcon(report.iconName)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-xs text-foreground truncate">{report.title}</h5>
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                          {report.path}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{report.description}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Active Target
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs font-semibold rounded-lg">
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Quick Actions */}
      {activeTab === 'actions' && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">Quick Management Shortcuts</h4>
              <p className="text-[11px] text-muted-foreground">
                Choose which quick action links are embedded in the dashboard sidebar card:
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/20">
              {config.enabledQuickActionIds.length} Selected
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_AVAILABLE_QUICK_ACTIONS.map((action) => {
              const isEnabled = config.enabledQuickActionIds.includes(action.id);

              return (
                <div
                  key={action.id}
                  onClick={() => toggleQuickAction(action.id)}
                  className={cn(
                    'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
                    isEnabled
                      ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/40'
                      : 'border-border/80 bg-card hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'p-2 rounded-lg shrink-0',
                        isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {getIcon(action.iconName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{action.label}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">{action.path}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleQuickAction(action.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-8 text-xs font-semibold gap-1.5 px-3 rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className="h-8 text-xs font-bold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-2xs cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          Apply &amp; Save Customizations
        </Button>
      </div>
    </div>
  );
}

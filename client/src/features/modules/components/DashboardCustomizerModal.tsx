import { useState } from 'react';
import {
  useDashboardCustomizationStore,
  ALL_AVAILABLE_KPIS,
  ALL_AVAILABLE_REPORTS,
  ALL_AVAILABLE_QUICK_ACTIONS,
} from '@/features/dashboard/store/dashboardCustomizationStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  DollarSign,
  Flame,
  CreditCard,
  FilePlus,
  CheckCircle,
  Settings,
  RotateCcw,
  Save,
  Sliders,
  Check,
  Layers,
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
  DollarSign,
  Flame,
  CreditCard,
  FilePlus,
  CheckCircle,
  Settings,
};

interface DashboardCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DashboardCustomizerModal({ open, onOpenChange }: DashboardCustomizerModalProps) {
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
    toast.success('Dashboard layout and field customizations saved successfully!');
    onOpenChange(false);
  };

  const handleReset = () => {
    if (confirm('Reset all dashboard customizations back to factory defaults?')) {
      resetToDefaults();
      toast.info('Reset dashboard configuration to defaults');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Sliders className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-foreground tracking-tight">
                Dashboard Customization Studio
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Enable, disable, and customize dashboard widgets, KPI metrics, report connections, and actions.
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs font-semibold gap-1.5 px-3 rounded-xl cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </Button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center border-b border-border px-5 bg-muted/10 gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('sections')}
            className={cn(
              'py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'sections'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            1. Layout & Sections
          </button>
          <button
            onClick={() => setActiveTab('kpis')}
            className={cn(
              'py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              activeTab === 'kpis'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            2. KPI Metrics Studio
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {config.enabledKpiIds.length} Active
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              'py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'reports'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            3. Attendance & Reports
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={cn(
              'py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'actions'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            4. Quick Actions
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-semibold">
          {/* ─── TAB 1: SECTIONS VISIBILITY ─── */}
          {activeTab === 'sections' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">
                Toggle the visibility of high-level dashboard sections and widgets:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Header Add Employee */}
                <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <p className="text-xs font-bold text-foreground truncate">Add Employee Button</p>
                      <p className="text-[11px] text-muted-foreground">Quick employee creation button in top header</p>
                    </div>
                    <Switch
                      checked={config.showHeaderAddEmployee}
                      onCheckedChange={(checked) => updateConfig({ showHeaderAddEmployee: checked })}
                    />
                  </CardContent>
                </Card>

                {/* Header Attendance Report */}
                <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <p className="text-xs font-bold text-foreground truncate">Attendance Report Button</p>
                      <p className="text-[11px] text-muted-foreground">Report launcher button in top header</p>
                    </div>
                    <Switch
                      checked={config.showHeaderAttendanceReport}
                      onCheckedChange={(checked) => updateConfig({ showHeaderAttendanceReport: checked })}
                    />
                  </CardContent>
                </Card>

                {/* Overview KPIs Section */}
                <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <p className="text-xs font-bold text-foreground truncate">Top KPI Metric Cards</p>
                      <p className="text-[11px] text-muted-foreground">Grid of active employee count, depts & presence stats</p>
                    </div>
                    <Switch
                      checked={config.showKpiSection}
                      onCheckedChange={(checked) => updateConfig({ showKpiSection: checked })}
                    />
                  </CardContent>
                </Card>

                {/* Employee Growth Trend */}
                <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
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
                  <CardContent className="p-4 flex items-center justify-between">
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
                  <CardContent className="p-4 flex items-center justify-between">
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
                  <CardContent className="p-4 flex items-center justify-between">
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

          {/* ─── TAB 2: KPIS STUDIO ─── */}
          {activeTab === 'kpis' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Available KPI Metrics</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Select which KPI cards appear in the top dashboard statistics grid:
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/20">
                  {config.enabledKpiIds.length} Selected
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
          )}

          {/* ─── TAB 3: ATTENDANCE & REPORTS ─── */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
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

          {/* ─── TAB 4: QUICK ACTIONS ─── */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
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
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 text-xs font-bold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-2xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Apply &amp; Save Customization
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

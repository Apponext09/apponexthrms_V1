import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  MapPin,
  UserPlus,
  FileBarChart,
  Settings,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  Palmtree,
  Clock,
  Briefcase,
  Package,
  Wallet,
  Coffee,
  Navigation,
  IndianRupee,
  Flame,
  FilePlus,
  CheckCircle,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
  Filter,
  DollarSign,
  UserRoundCheck,
  ReceiptIndianRupee,
  CalendarDays,
  CakeSlice,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCompanyStore } from "@/features/settings/store/companyStore";
import { useAdminDashboard } from "../../hooks/useAdminDashboard";
import {
  useDashboardCustomizationStore,
  ALL_AVAILABLE_REPORTS,
  ALL_AVAILABLE_QUICK_ACTIONS,
  FIXED_KPIS,
  ALL_AVAILABLE_KPIS,
} from "@/features/dashboard/store/dashboardCustomizationStore";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AttendanceOverviewCard } from "@/features/dashboard/components/AttendanceOverviewCard";
import { LeaveDistributionCard } from "@/features/dashboard/components/LeaveDistributionCard";
import { DepartmentDistributionCard } from "@/features/dashboard/components/DepartmentDistributionCard";

const panelClass =
  "dashboard-panel rounded-xl border-border bg-card shadow-soft-xs";

const ICON_MAP: Record<string, any> = {
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
};

// ─── Fixed KPI paths (always-on pinned row) ───────────────────────────────────
const FIXED_KPI_PATHS: Record<string, string> = {
  totalHeadcount: "/org-structure",
  activeDepartments: "/masters?tab=department",
  officeLocations: "/settings/company-profile",
  monthlyPayrollCost: "/payroll",
};

// ─── Optional KPI paths ───────────────────────────────────────────────────────
const OPTIONAL_KPI_PATHS: Record<string, string> = {
  openJobs: "/recruitment/jobs",
  pendingApprovals: "/approvals/dashboard",
  newHires: "/employees",
  onLeaveToday: "/attendance",
  reportingOfficers: "/org-structure",
};

// Color palettes for multi-series graphs
const ATTENDANCE_COLORS: Record<string, string> = {
  Present: "#10b981", // Emerald
  Late: "#f59e0b", // Amber
  HalfDay: "#f97316", // Orange
  WFH: "#3b82f6", // Blue
  OnLeave: "#0ea5e9", // Sky
  Absent: "#ef4444", // Rose
};

const DEPT_COLORS = [
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#0ea5e9",
  "#38bdf8",
  "#0284c7",
  "#0369a1",
];
const STAGE_COLORS = [
  "#1e40af",
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#38bdf8",
  "#0ea5e9",
];

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedCompanyName } = useCompanyStore();
  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useAdminDashboard();
  const { config, toggleKpiVisibility, setSelectedReport, updateConfig } =
    useDashboardCustomizationStore();

  const [activeModuleFilter, setActiveModuleFilter] = useState<
    "all" | "attendance" | "workforce" | "payroll" | "recruitment" | "expenses"
  >("all");
  const [attendancePeriod, setAttendancePeriod] = useState<
    "today" | "week" | "month"
  >("today");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    number | null
  >(null);
  const [payrollRange, setPayrollRange] = useState<
    "month" | "6" | "12" | "custom"
  >("6");
  const [customPayrollMonth, setCustomPayrollMonth] = useState("");
  const [expenseRange, setExpenseRange] = useState<"week" | "month" | "custom">(
    "month",
  );
  const [customExpenseMonth, setCustomExpenseMonth] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState<
    "current" | "next" | "custom"
  >("current");
  const [customBirthdayMonth, setCustomBirthdayMonth] = useState(
    new Date().getMonth(),
  );

  const companyInfo = dashboardData?.companyInfo;
  const companyName =
    companyInfo?.name ||
    selectedCompanyName ||
    user?.organizationName ||
    "Organization";
  const primaryLocation =
    companyInfo?.location || user?.organizationLocation || "Not Specified";

  // ── Fixed KPI values ────────────────────────────────────────────────────────
  const totalEmployees = dashboardData?.kpis?.totalHeadcount ?? 0;
  const totalDepartments = dashboardData?.kpis?.activeDepartments ?? 0;
  const totalLocations = dashboardData?.kpis?.officeLocations ?? 0;
  const monthlyPayrollVal = dashboardData?.kpis?.monthlyPayrollCost ?? 0;

  const formattedPayrollCost = useMemo(() => {
    if (isLoading) return "...";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(monthlyPayrollVal);
  }, [monthlyPayrollVal, isLoading]);

  // ── Optional KPI values ─────────────────────────────────────────────────────
  const openJobsCount = dashboardData?.kpis?.openJobs ?? 0;
  const pendingApprovals = dashboardData?.kpis?.pendingApprovals ?? 0;
  const newHires = dashboardData?.kpis?.newHires ?? 0;
  const onLeaveToday = dashboardData?.kpis?.onLeaveToday ?? 0;
  const reportingOfficers = dashboardData?.kpis?.reportingOfficers ?? 0;

  const growthChartData = dashboardData?.growthTrend || [];
  const departmentBreakdown = dashboardData?.departmentBreakdown || [];
  const selectedDepartment =
    departmentBreakdown.find(
      (department) => department.id === selectedDepartmentId,
    ) || departmentBreakdown[0];
  const recentEmployees = dashboardData?.recentEmployees || [];

  // Real Module Analytics Data
  const attendanceAnalytics = dashboardData?.attendanceAnalytics;
  const leaveAnalytics = dashboardData?.leaveAnalytics;
  const leaveTypes = leaveAnalytics?.byType ?? [];
  const payrollAnalytics = dashboardData?.payrollAnalytics;
  const payrollChartData = useMemo(() => {
    const trend = payrollAnalytics?.monthlyTrend || [];
    if (payrollRange === "month") return trend.slice(-1);
    if (payrollRange === "12") return trend.slice(-12);
    if (payrollRange === "custom")
      return trend.filter((item) => item.monthKey === customPayrollMonth);
    return trend.slice(-6);
  }, [payrollAnalytics?.monthlyTrend, payrollRange, customPayrollMonth]);
  const payrollCustomMonths = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        today.getFullYear(),
        today.getMonth() - (11 - index),
        1,
      );
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        monthKey,
        label: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "numeric",
        }).format(date),
      };
    });
  }, []);
  const recruitmentAnalytics = dashboardData?.recruitmentAnalytics;
  const expenseAnalytics = dashboardData?.expenseAnalytics;
  const expenseCustomMonths = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        today.getFullYear(),
        today.getMonth() - (11 - index),
        1,
      );
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        monthKey,
        label: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "numeric",
        }).format(date),
      };
    });
  }, []);
  const expenseChartData = useMemo(() => {
    const trend = expenseAnalytics?.disbursementTrend || [];
    const formatDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const today = new Date();

    if (expenseRange === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      const start = formatDate(weekStart);
      const end = formatDate(today);
      return trend.filter((item) => item.date >= start && item.date <= end);
    }

    const monthKey =
      expenseRange === "custom"
        ? customExpenseMonth
        : formatDate(today).slice(0, 7);
    return trend.filter((item) => item.date.startsWith(monthKey));
  }, [expenseAnalytics?.disbursementTrend, expenseRange, customExpenseMonth]);
  const workforceAnalytics = dashboardData?.workforceAnalytics;
  const upcomingEvents = dashboardData?.upcomingEvents;
  const birthdayMonthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => ({
        month,
        label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(
          new Date(2000, month, 1),
        ),
      })),
    [],
  );
  const todayDate = new Date();
  const todayMonthDay = `${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
  const birthdayList = useMemo(() => {
    const targetMonth =
      birthdayMonth === "custom"
        ? customBirthdayMonth
        : (new Date().getMonth() + (birthdayMonth === "next" ? 1 : 0)) % 12;
    return (upcomingEvents?.birthdays || [])
      .filter((item) => Number(item.date.slice(5, 7)) - 1 === targetMonth)
      .sort(
        (a, b) =>
          a.date.slice(8, 10).localeCompare(b.date.slice(8, 10)) ||
          a.name.localeCompare(b.name),
      );
  }, [upcomingEvents?.birthdays, birthdayMonth, customBirthdayMonth]);

  const attendanceOverview = useMemo(() => {
    const summary = attendanceAnalytics?.periodSummary?.[attendancePeriod];
    if (summary) return summary;
    const today = attendanceAnalytics?.today;
    if (!today || attendancePeriod !== "today") return null;
    return {
      present: today.present + today.halfDay + today.wfh,
      late: today.late,
      absent: today.absent,
      onLeave: today.onLeave,
      total: today.totalHeadcount,
      attendanceRate: today.attendanceRate,
    };
  }, [attendanceAnalytics, attendancePeriod]);

  const attendanceOverviewData = useMemo(() => {
    if (!attendanceOverview) return [];
    return [
      { name: "Present", value: attendanceOverview.present, color: "#4f46e5" },
      { name: "Late", value: attendanceOverview.late, color: "#e89220" },
      { name: "Absent", value: attendanceOverview.absent, color: "#e43f4f" },
      { name: "On leave", value: attendanceOverview.onLeave, color: "#9298e8" },
    ];
  }, [attendanceOverview]);

  // Selected report details for the header button
  const activeReport = useMemo(() => {
    return (
      ALL_AVAILABLE_REPORTS.find((r) => r.id === config.selectedReportId) ||
      ALL_AVAILABLE_REPORTS[0]
    );
  }, [config.selectedReportId]);

  const ReportIcon = ICON_MAP[activeReport.iconName] || FileBarChart;

  // ── Fixed KPI cards (always shown) ─────────────────────────────────────────
  const fixedKpiCards = useMemo(() => {
    const vals: Record<string, { value: string; icon: any }> = {
      totalHeadcount: {
        value: isLoading ? "..." : isError ? "—" : String(totalEmployees),
        icon: Users,
      },
      activeDepartments: {
        value: isLoading ? "..." : isError ? "—" : String(totalDepartments),
        icon: Building2,
      },
      officeLocations: {
        value: isLoading ? "..." : isError ? "—" : String(totalLocations),
        icon: MapPin,
      },
      monthlyPayrollCost: {
        value: isError ? "—" : formattedPayrollCost,
        icon: Wallet,
      },
    };

    return FIXED_KPIS.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      path: kpi.path,
      ...vals[kpi.id],
    }));
  }, [
    isLoading,
    isError,
    totalEmployees,
    totalDepartments,
    totalLocations,
    formattedPayrollCost,
  ]);

  // ── Optional KPI cards (enabled via customization) ──────────────────────────
  const optionalKpiValues: Record<
    string,
    { value: string; icon: any; label: string; path: string }
  > = {
    openJobs: {
      label: "Open Job Postings",
      value: isLoading ? "..." : isError ? "—" : String(openJobsCount),
      icon: Briefcase,
      path: OPTIONAL_KPI_PATHS.openJobs,
    },
    pendingApprovals: {
      label: "Pending Approvals",
      value: isLoading ? "..." : isError ? "—" : String(pendingApprovals),
      icon: Clock,
      path: OPTIONAL_KPI_PATHS.pendingApprovals,
    },
    newHires: {
      label: "New Hires This Month",
      value: isLoading ? "..." : isError ? "—" : String(newHires),
      icon: UserPlus,
      path: OPTIONAL_KPI_PATHS.newHires,
    },
    onLeaveToday: {
      label: "On Leave Today",
      value: isLoading ? "..." : isError ? "—" : String(onLeaveToday),
      icon: Palmtree,
      path: OPTIONAL_KPI_PATHS.onLeaveToday,
    },
    reportingOfficers: {
      label: "Reporting Officers",
      value: isLoading ? "..." : isError ? "—" : String(reportingOfficers),
      icon: UserCheck,
      path: OPTIONAL_KPI_PATHS.reportingOfficers,
    },
  };

  const optionalKpiCards = useMemo(() => {
    return ALL_AVAILABLE_KPIS.map(({ id }) => ({
      id,
      ...optionalKpiValues[id],
    })).filter((k) => k && k.label);
  }, [
    isLoading,
    openJobsCount,
    pendingApprovals,
    newHires,
    onLeaveToday,
    reportingOfficers,
    isError,
  ]);

  const allKpiCards = useMemo(
    () => [...fixedKpiCards, ...optionalKpiCards],
    [fixedKpiCards, optionalKpiCards],
  );

  const visibleKpiCards = useMemo(() => {
    const hidden = new Set(config.hiddenKpiIds || []);
    return allKpiCards.filter((kpi) => !hidden.has(kpi.id));
  }, [allKpiCards, config.hiddenKpiIds]);

  // Filtered active Quick Actions
  const activeQuickActions = useMemo(() => {
    return (config.enabledQuickActionIds || [])
      .map((id) => ALL_AVAILABLE_QUICK_ACTIONS.find((qa) => qa.id === id))
      .filter(Boolean);
  }, [config.enabledQuickActionIds]);

  return (
    <div className="org-admin-dashboard space-y-6 pb-10 sm:space-y-8">
      {/* ── Header Section ── */}
      <section className="dashboard-heading flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="dashboard-title text-balance font-extrabold tracking-tight text-foreground">
            Dashboard Overview
          </h1>
          <p className="flex min-w-0 items-start gap-1.5 text-pretty text-xs text-muted-foreground sm:text-[13px]">
            <MapPin className="mt-0.5 size-3.5 flex-shrink-0 text-primary" />
            <span className="min-w-0 break-words">
              <strong className="font-bold text-foreground">
                {companyName}
              </strong>
              <span className="mx-1.5 text-muted-foreground/60">·</span>
              {primaryLocation}
            </span>
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:justify-end">
          {config.showHeaderAttendanceReport && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(activeReport.path)}
              className="h-10 min-w-0 flex-1 cursor-pointer gap-1.5 rounded-lg bg-card px-3 text-xs font-semibold shadow-sm transition-colors hover:border-primary/40 hover:text-primary sm:h-9 sm:flex-none"
            >
              <ReportIcon className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{activeReport.title}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-lg bg-card shadow-sm transition-colors hover:border-primary/40 sm:size-9"
            onClick={() => navigate("/org-structure")}
            aria-label="Open organization structure"
            title="Organization Structure"
          >
            <Building2 className="size-4 text-primary" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 rounded-lg bg-card shadow-sm transition-colors hover:border-primary/40 sm:size-9"
                aria-label="Customize dashboard"
              >
                <Settings className="size-4 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="dashboard-scroll max-h-[min(620px,80vh)] w-[min(310px,calc(100vw-2rem))] overflow-y-auto rounded-xl p-2 shadow-soft-lg"
            >
              <DropdownMenuLabel className="px-2 py-2">
                <span className="block text-xs font-bold">
                  Customize dashboard
                </span>
                <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                  Choose your report shortcut and visible metrics.
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Report shortcut
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={config.showHeaderAttendanceReport}
                onCheckedChange={(checked) =>
                  updateConfig({ showHeaderAttendanceReport: checked === true })
                }
                onSelect={(event) => event.preventDefault()}
                className="min-h-9 rounded-lg text-xs"
              >
                Show report button
              </DropdownMenuCheckboxItem>
              <DropdownMenuRadioGroup
                value={config.selectedReportId}
                onValueChange={setSelectedReport}
              >
                {ALL_AVAILABLE_REPORTS.map((report) => {
                  const Icon = ICON_MAP[report.iconName] || FileBarChart;
                  return (
                    <DropdownMenuRadioItem
                      key={report.id}
                      value={report.id}
                      onSelect={(event) => event.preventDefault()}
                      className="my-0.5 min-h-10 rounded-lg pl-8 pr-2"
                    >
                      <Icon className="mr-2 size-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs">
                          {report.title}
                        </span>
                        <span className="block truncate text-[9px] font-normal text-muted-foreground">
                          {report.description}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                KPI cards
              </DropdownMenuLabel>
              {allKpiCards.map(({ id, icon: Icon, label }) => {
                const isVisible = !(config.hiddenKpiIds || []).includes(id);
                return (
                  <DropdownMenuCheckboxItem
                    key={id}
                    checked={isVisible}
                    onCheckedChange={() => toggleKpiVisibility(id)}
                    onSelect={(event) => event.preventDefault()}
                    className="my-0.5 min-h-9 rounded-lg pl-9 pr-2"
                  >
                    <Icon className="mr-2 size-4 text-primary" />
                    <span className="flex-1 truncate text-xs">{label}</span>
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {isVisible ? "Shown" : "Hidden"}
                    </span>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {isError && (
        <div
          role="alert"
          className="dashboard-alert flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10" aria-hidden="true">
              <AlertTriangle className="size-4" />
            </span>
            <span>
              <strong className="block font-semibold">
                Dashboard metrics could not be loaded
              </strong>
              <span className="text-destructive/80">
                Values are unavailable, not zero.
              </span>
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="h-9 shrink-0 self-start border-destructive/30 bg-card text-xs text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:self-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Fixed KPI Row ── */}
      {config.showKpiSection && (
        <section
          aria-label="Organization key performance indicators"
          className="space-y-3"
        >
          {visibleKpiCards.length > 0 ? (
            <div className="dashboard-kpis grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {visibleKpiCards.map(({ id, icon: Icon, label, value, path }) => (
                <Card
                  key={id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${label}: ${value}`}
                  className={`${panelClass} dashboard-kpi-card group cursor-pointer outline-none`}
                  onClick={() => navigate(path)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(path);
                    }
                  }}
                >
                  <CardContent className="flex h-full min-h-[112px] flex-col justify-between gap-3 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="dashboard-kpi-icon flex size-10 flex-shrink-0 items-center justify-center rounded-xl text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <ArrowUpRight
                        className="size-4 flex-shrink-0 text-muted-foreground/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate text-xs font-medium text-muted-foreground"
                        title={label}
                      >
                        {label}
                      </p>
                      {value === "..." ? (
                        <span
                          className="dashboard-skeleton mt-2 h-7 w-20"
                          aria-hidden="true"
                        />
                      ) : (
                        <p
                          className="dashboard-kpi-value mt-1 truncate font-extrabold tracking-tight text-foreground tabular-nums"
                          title={value}
                        >
                          {value}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty min-h-24">
              <p className="text-xs text-muted-foreground">
                All KPI cards are hidden. Use{" "}
                <strong className="font-semibold text-foreground">
                  Customize KPIs
                </strong>{" "}
                to show metrics.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 1: ATTENDANCE & LEAVE ANALYTICS ── */}
      {(activeModuleFilter === "all" ||
        activeModuleFilter === "attendance") && (
        <div className="dashboard-reveal space-y-4">
          <div className="dashboard-section-header flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dashboard-section-icon" aria-hidden="true">
                <Clock className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="dashboard-section-title text-foreground">
                  Attendance & Leave Analytics
                </h2>
                <p className="dashboard-section-subtitle">
                  Check-ins, leave usage and team distribution
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <AttendanceOverviewCard
              summary={attendanceOverview}
              period={attendancePeriod}
              onPeriodChange={setAttendancePeriod}
              onOpenAttendance={() => navigate("/attendance")}
            />
            <LeaveDistributionCard leaveTypes={leaveTypes} />
            <DepartmentDistributionCard
              departments={departmentBreakdown}
              className="md:col-span-2 lg:col-span-1"
            />
            {false && (
              <>
                <Card className={`${panelClass} attendance-overview-card`}>
                  <CardHeader className="p-5 pb-1">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold">
                          Attendance overview
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          Live check-ins across all locations
                        </CardDescription>
                      </div>
                      <div
                        className="flex rounded-xl border border-border bg-muted/45 p-0.5"
                        role="tablist"
                        aria-label="Attendance period"
                      >
                        {(["today", "week", "month"] as const).map((period) => (
                          <button
                            key={period}
                            type="button"
                            role="tab"
                            aria-selected={attendancePeriod === period}
                            onClick={() => setAttendancePeriod(period)}
                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold capitalize transition-all ${attendancePeriod === period ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 pt-1">
                    {!attendanceOverview ||
                    attendanceOverviewData.every((item) => item.value === 0) ? (
                      <div className="flex h-48 flex-col items-center justify-center text-xs text-muted-foreground">
                        <Clock className="mb-2 size-8 opacity-40" />
                        <span>No attendance recorded for this period</span>
                      </div>
                    ) : (
                      <div className="attendance-overview-layout mx-auto grid w-full min-w-0 items-center justify-center gap-4">
                        <div className="relative mx-auto h-36 w-36 2xl:h-40 2xl:w-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={attendanceOverviewData}
                                cx="50%"
                                cy="50%"
                                innerRadius={49}
                                outerRadius={68}
                                cornerRadius={5}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                {attendanceOverviewData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--popover))",
                                  color: "hsl(var(--popover-foreground))",
                                  borderColor: "hsl(var(--border))",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <strong className="text-2xl font-extrabold text-foreground">
                              {attendanceOverview.attendanceRate}%
                            </strong>
                            <span className="text-[10px] text-muted-foreground">
                              present
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 w-full space-y-3 text-xs">
                          {attendanceOverviewData.map((item) => {
                            const percentage =
                              attendanceOverview.total > 0
                                ? (
                                    (item.value / attendanceOverview.total) *
                                    100
                                  ).toFixed(1)
                                : "0.0";
                            return (
                              <div
                                key={item.name}
                                className="grid min-w-0 grid-cols-[10px_minmax(58px,1fr)_auto_40px] items-center gap-1.5"
                              >
                                <span
                                  className="size-2.5 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="truncate text-muted-foreground">
                                  {item.name}
                                </span>
                                <strong className="tabular-nums text-foreground">
                                  {item.value.toLocaleString("en-IN")}
                                </strong>
                                <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                                  {percentage}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate("/attendance")}
                      className="mt-1 h-auto px-0 text-xs"
                    >
                      Open attendance <ArrowUpRight className="size-3.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <Palmtree className="size-4 text-primary" /> Leave
                      Distribution by Type
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Approved applications categorised by leave policy
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                    {!leaveTypes.length ||
                    !leaveTypes.some(
                      (x) => x.approvedCount > 0 || x.pendingCount > 0,
                    ) ? (
                      <div className="flex h-44 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                        <Palmtree className="mb-2 size-8 text-primary opacity-40" />
                        <span className="font-semibold text-foreground">
                          No Leave Requests Logged
                        </span>
                        <span className="mt-0.5">
                          Applied requests will appear here
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {leaveTypes.slice(0, 5).map((lt, idx) => {
                          const maxCount = Math.max(
                            ...leaveTypes.map((x) => x.approvedCount),
                            1,
                          );
                          const pct = Math.round(
                            (lt.approvedCount / maxCount) * 100,
                          );
                          return (
                            <div
                              key={lt.leaveTypeId || idx}
                              className="space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{
                                      backgroundColor:
                                        lt.color ||
                                        DEPT_COLORS[idx % DEPT_COLORS.length],
                                    }}
                                  />
                                  <span className="truncate">
                                    {lt.name} ({lt.code})
                                  </span>
                                </span>
                                <span className="shrink-0 font-bold tabular-nums text-foreground">
                                  {lt.approvedCount}{" "}
                                  <span className="font-medium text-muted-foreground">
                                    approved
                                  </span>
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(pct, 4)}%`,
                                    backgroundColor:
                                      lt.color ||
                                      DEPT_COLORS[idx % DEPT_COLORS.length],
                                  }}
                                />
                              </div>
                              {lt.pendingCount > 0 && (
                                <p className="text-right text-[9px] font-medium text-amber-500">
                                  {lt.pendingCount} pending
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <Building2 className="size-4 text-primary" /> Department
                      distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Active employees by team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 sm:p-5 sm:pt-1">
                    {departmentBreakdown.length === 0 ? (
                      <div className="flex h-52 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                        <Building2 className="mb-2 size-8 text-primary opacity-40" />
                        <span className="font-semibold text-foreground">
                          No Department Data
                        </span>
                        <span className="mt-0.5">
                          Employee assignments will appear here
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        {departmentBreakdown.slice(0, 6).map((department) => {
                          const maxCount = Math.max(
                            ...departmentBreakdown.map((item) => item.count),
                            1,
                          );
                          const width = Math.max(
                            (department.count / maxCount) * 100,
                            5,
                          );
                          const isSelected =
                            selectedDepartment?.id === department.id;
                          return (
                            <button
                              type="button"
                              key={department.id}
                              onClick={() =>
                                setSelectedDepartmentId(department.id)
                              }
                              aria-pressed={isSelected}
                              className={`grid w-full grid-cols-[88px_1fr_auto] items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] transition-colors ${isSelected ? "bg-primary/8 dark:bg-primary/10" : "hover:bg-muted/60"}`}
                            >
                              <span
                                className="truncate text-right font-medium text-muted-foreground"
                                title={department.name}
                              >
                                {department.name}
                              </span>
                              <div className="h-3.5 overflow-hidden rounded-full bg-primary/8 dark:bg-primary/10">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                              <strong className="min-w-6 tabular-nums text-foreground">
                                {department.count}
                              </strong>
                            </button>
                          );
                        })}
                        {selectedDepartment && (
                          <div className="mt-3 border-t border-border pt-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="truncate text-[11px] font-bold text-foreground">
                                {selectedDepartment.name} employees
                              </p>
                              <span className="text-[9px] text-muted-foreground">
                                {selectedDepartment.count} total
                              </span>
                            </div>
                            {selectedDepartment.employees?.length ? (
                              <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                                {selectedDepartment.employees.map(
                                  (employee) => (
                                    <button
                                      type="button"
                                      key={employee.id}
                                      onClick={() =>
                                        navigate(`/employees/${employee.id}`)
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-muted"
                                    >
                                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                                        {employee.name
                                          .split(/\s+/)
                                          .map((part) => part[0])
                                          .join("")
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </span>
                                      <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-foreground">
                                        {employee.name}
                                      </span>
                                      <span className="text-[9px] tabular-nums text-muted-foreground">
                                        {employee.employeeCode}
                                      </span>
                                    </button>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                No active employees assigned.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate("/org-structure")}
                      className="mt-4 h-auto px-0 text-xs"
                    >
                      View organization <ArrowUpRight className="size-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Leave Types & 6-Month Leave Trend */}
          {false && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              {/* Leaves by Type */}
              <Card className={panelClass}>
                <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Palmtree className="size-4 text-sky-500" /> Leave
                    Distribution by Type
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Approved applications categorised by leave policy
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                  {!leaveTypes.length ||
                  !leaveTypes.some(
                    (x) => x.approvedCount > 0 || x.pendingCount > 0,
                  ) ? (
                    <div className="flex flex-col items-center justify-center h-44 text-muted-foreground text-xs">
                      <Palmtree className="size-8 mb-2 opacity-40 text-sky-500" />
                      <span className="font-semibold text-foreground">
                        No Leave Requests Logged
                      </span>
                      <span className="text-muted-foreground mt-0.5">
                        Applied leave requests will appear categorized here
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {leaveTypes.slice(0, 5).map((lt, idx) => {
                        const maxCount = Math.max(
                          ...leaveTypes.map((x) => x.approvedCount),
                          1,
                        );
                        const pct = Math.round(
                          (lt.approvedCount / maxCount) * 100,
                        );
                        return (
                          <div
                            key={lt.leaveTypeId || idx}
                            className="space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <span
                                  className="size-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      lt.color ||
                                      DEPT_COLORS[idx % DEPT_COLORS.length],
                                  }}
                                />
                                {lt.name} ({lt.code})
                              </span>
                              <span className="font-bold text-foreground tabular-nums">
                                {lt.approvedCount} approved &bull;{" "}
                                <span className="text-amber-500">
                                  {lt.pendingCount} pending
                                </span>
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(pct, 4)}%`,
                                  backgroundColor:
                                    lt.color ||
                                    DEPT_COLORS[idx % DEPT_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 6-Month Leave Usage Trend */}
              <Card className={panelClass}>
                <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="size-4 text-primary" /> 6-Month Leave
                    Application Trend
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monthly volume of submitted vs approved leaves
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                  {!leaveAnalytics?.monthlyTrend ||
                  !leaveAnalytics.monthlyTrend.some(
                    (d) => d.applied > 0 || d.approved > 0,
                  ) ? (
                    <div className="dashboard-empty h-48">
                      <Activity className="size-8 mb-2 opacity-40 text-primary" />
                      <span className="font-semibold text-foreground">
                        No Leave History Recorded
                      </span>
                      <span className="text-muted-foreground mt-0.5">
                        Applied vs approved trajectory will plot monthly
                      </span>
                    </div>
                  ) : (
                    <div className="h-48 dashboard-chart w-full pt-2 min-h-[190px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={leaveAnalytics.monthlyTrend}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="hsl(var(--border))"
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                            }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                            }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--popover))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{
                              fontSize: "11px",
                              paddingTop: "8px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="applied"
                            name="Applied"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="approved"
                            name="Approved"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 2: PAYROLL & EXPENSES ANALYTICS ── */}
      {(activeModuleFilter === "all" || activeModuleFilter === "payroll") && (
        <div className="dashboard-reveal space-y-4">
          <div className="dashboard-section-header flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dashboard-section-icon" aria-hidden="true">
                <Wallet className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="dashboard-section-title text-foreground">
                  Payroll & Expense Analytics
                </h2>
                <p className="dashboard-section-subtitle">
                  Salary payouts and expense disbursements
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/payroll")}
              className="h-8 shrink-0 gap-1 px-2.5 text-xs font-semibold text-primary hover:bg-primary/5 hover:text-primary"
            >
              Go to Payroll Portal <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            {/* 6-Month Payroll Payout Trajectory */}
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold">
                      Payroll Trajectory
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Generated payroll, or this month’s active salary structure
                    </CardDescription>
                  </div>
                  <div className="dashboard-segmented shrink-0 self-start">
                    {(
                      [
                        ["month", "Month"],
                        ["6", "6M"],
                        ["12", "12M"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={payrollRange === value}
                        onClick={() => setPayrollRange(value)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${payrollRange === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                    <select
                      value={
                        payrollRange === "custom" ? customPayrollMonth : ""
                      }
                      onChange={(event) => {
                        setCustomPayrollMonth(event.target.value);
                        setPayrollRange("custom");
                      }}
                      aria-label="Choose a payroll month"
                      className={`h-7 max-w-28 cursor-pointer rounded-lg border-0 px-1.5 text-[11px] font-semibold outline-none ${payrollRange === "custom" ? "bg-card text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      <option value="" disabled>
                        Custom
                      </option>
                      {payrollCustomMonths.map((item) => (
                        <option key={item.monthKey} value={item.monthKey}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Badge
                    variant="outline"
                    className="hidden text-[11px] font-bold text-emerald-600 border-emerald-200"
                  >
                    INR (₹)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {!payrollChartData.length ||
                !payrollChartData.some(
                  (d) => d.grossSalary > 0 || d.netSalary > 0,
                ) ? (
                  <div className="dashboard-empty h-56">
                    <Wallet className="size-8 mb-2 opacity-40 text-emerald-600" />
                    <span className="font-semibold text-foreground">
                      No Payroll Records Generated
                    </span>
                    <span className="text-muted-foreground mt-0.5">
                      Process monthly payroll or add salary structures
                    </span>
                  </div>
                ) : (
                  <div className="h-56 dashboard-chart w-full pt-2 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={payrollChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 10,
                          }}
                          tickFormatter={(v) =>
                            v >= 100000
                              ? `${(v / 100000).toFixed(1)}L`
                              : v >= 1000
                                ? `${(v / 1000).toFixed(0)}k`
                                : v
                          }
                        />
                        <Tooltip
                          formatter={(val: any) =>
                            new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(Number(val))
                          }
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                        />
                        <Bar
                          dataKey="grossSalary"
                          name="Gross Salary"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="netSalary"
                          name="Net Payout"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="deductions"
                          name="Deductions"
                          fill="#ea580c"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Disbursement Trend */}
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <ReceiptIndianRupee className="size-4 text-primary" />{" "}
                      Expense Disbursements
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Actual expense amounts disbursed to employees
                    </CardDescription>
                  </div>
                  <div className="dashboard-segmented shrink-0 self-start">
                    {(
                      [
                        ["week", "Week"],
                        ["month", "Month"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={expenseRange === value}
                        onClick={() => setExpenseRange(value)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${expenseRange === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                    <select
                      value={
                        expenseRange === "custom" ? customExpenseMonth : ""
                      }
                      onChange={(event) => {
                        setCustomExpenseMonth(event.target.value);
                        setExpenseRange("custom");
                      }}
                      aria-label="Choose an expense disbursement month"
                      className={`h-7 max-w-28 cursor-pointer rounded-lg border-0 px-1.5 text-[11px] font-semibold outline-none ${expenseRange === "custom" ? "bg-card text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      <option value="" disabled>
                        Custom
                      </option>
                      {expenseCustomMonths.map((item) => (
                        <option key={item.monthKey} value={item.monthKey}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {!expenseChartData.length ? (
                  <div className="dashboard-empty h-56">
                    <ReceiptIndianRupee className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">
                      No Expense Disbursements Recorded
                    </span>
                    <span className="text-muted-foreground mt-0.5">
                      Paid reimbursements appear on their payment date
                    </span>
                  </div>
                ) : (
                  <div className="h-56 dashboard-chart w-full pt-2 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={expenseChartData}
                        margin={{ top: 16, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                          tickFormatter={(date) =>
                            new Intl.DateTimeFormat("en-IN", {
                              day: "numeric",
                              month: "short",
                              timeZone: "UTC",
                            }).format(new Date(`${date}T00:00:00Z`))
                          }
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 10,
                          }}
                          tickFormatter={(v) =>
                            v >= 100000
                              ? `${(v / 100000).toFixed(1)}L`
                              : v >= 1000
                                ? `${(v / 1000).toFixed(0)}k`
                                : v
                          }
                        />
                        <Tooltip
                          labelFormatter={(date) =>
                            new Intl.DateTimeFormat("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            }).format(new Date(`${date}T00:00:00Z`))
                          }
                          formatter={(val: any) =>
                            new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(Number(val))
                          }
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="disbursedAmount"
                          name="Disbursed"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 3: WORKFORCE & ORGANIZATION ANALYTICS ── */}
      {(activeModuleFilter === "all" || activeModuleFilter === "workforce") && (
        <div className="dashboard-reveal space-y-4">
          <div className="dashboard-section-header flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dashboard-section-icon" aria-hidden="true">
                <Users className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="dashboard-section-title text-foreground">
                  Workforce & Organization Analytics
                </h2>
                <p className="dashboard-section-subtitle">
                  Headcount growth, holidays, birthdays and diversity
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/org-structure")}
              className="h-8 shrink-0 gap-1 px-2.5 text-xs font-semibold text-primary hover:bg-primary/5 hover:text-primary"
            >
              View Org Structure <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {/* Employee Growth Trajectory */}
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-balance text-sm font-bold">
                      Workforce Growth Trajectory
                    </CardTitle>
                    <CardDescription className="mt-1 text-pretty text-xs">
                      Live workforce trajectory over recent 6 months
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="flex-shrink-0 text-[11px] font-semibold tabular-nums"
                  >
                    <TrendingUp className="mr-1 size-3 text-emerald-500" />{" "}
                    {totalEmployees} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                {!growthChartData ||
                growthChartData.length === 0 ||
                !growthChartData.some((d) => d.employees > 0) ? (
                  <div className="dashboard-empty h-56">
                    <Users className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">
                      No Employee Growth Data
                    </span>
                    <span className="text-muted-foreground mt-0.5">
                      Workforce trajectory will plot as staff members are added
                    </span>
                  </div>
                ) : (
                  <div className="h-56 dashboard-chart w-full pt-2 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={growthChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorEmpGrowth"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            color: "hsl(var(--popover-foreground))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="employees"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorEmpGrowth)"
                          name="Headcount"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Holidays */}
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-primary" /> Upcoming
                  Holidays
                </CardTitle>
                <CardDescription className="text-xs">
                  Your organization’s next scheduled holidays
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {(upcomingEvents?.holidays || []).length === 0 ? (
                  <div className="dashboard-empty h-52">
                    <CalendarDays className="size-8 mb-2 opacity-40" />
                    <span>No upcoming holidays</span>
                  </div>
                ) : (
                  <div className="dashboard-scroll divide-y divide-border/60 pt-2 max-h-56 overflow-y-auto pr-1">
                    {(upcomingEvents?.holidays || []).map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between gap-3 py-3 text-xs first:pt-1 last:pb-1"
                      >
                        <span
                          className="min-w-0 truncate font-semibold text-foreground"
                          title={holiday.name}
                        >
                          {holiday.name}
                        </span>
                        <span className="shrink-0 font-bold text-foreground tabular-nums">
                          {new Intl.DateTimeFormat("en-IN", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(`${holiday.date}T00:00:00`))}{" "}
                          <span className="font-normal text-muted-foreground">
                            {holiday.type}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className={`${panelClass} md:col-span-2 lg:col-span-1`}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                      <CakeSlice className="size-4 text-primary" /> Upcoming
                      Birthdays
                    </CardTitle>
                    <CardDescription className="text-xs">
                      From employee date of birth
                    </CardDescription>
                  </div>
                  <div className="dashboard-segmented shrink-0">
                    <button
                      type="button"
                      aria-pressed={birthdayMonth === "current"}
                      onClick={() => setBirthdayMonth("current")}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${birthdayMonth === "current" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Current
                    </button>
                    <button
                      type="button"
                      aria-pressed={birthdayMonth === "next"}
                      onClick={() => setBirthdayMonth("next")}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${birthdayMonth === "next" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      aria-pressed={birthdayMonth === "custom"}
                      onClick={() => setBirthdayMonth("custom")}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${birthdayMonth === "custom" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                {birthdayMonth === "custom" && (
                  <select
                    aria-label="Select birthday month"
                    value={customBirthdayMonth}
                    onChange={(event) =>
                      setCustomBirthdayMonth(Number(event.target.value))
                    }
                    className="dashboard-select mt-3 h-9 w-full cursor-pointer rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none sm:h-8"
                  >
                    {birthdayMonthOptions.map((option) => (
                      <option key={option.month} value={option.month}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {birthdayList.length ? (
                  <div className="dashboard-scroll divide-y divide-border/60 pt-2 max-h-56 overflow-y-auto pr-1">
                    {birthdayList.map((person) => {
                      const isToday = person.date.slice(5, 10) === todayMonthDay;
                      return (
                        <div
                          key={person.id}
                          className="flex items-center justify-between gap-3 py-3 text-xs first:pt-1 last:pb-1"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="dashboard-avatar flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-primary">
                              {person.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            <span
                              className="truncate font-semibold text-foreground"
                              title={person.name}
                            >
                              {person.name}
                            </span>
                          </span>
                          {isToday ? (
                            <Badge className="shrink-0 text-[10px]">Today</Badge>
                          ) : (
                            <span className="shrink-0 font-bold text-foreground tabular-nums">
                              {new Intl.DateTimeFormat("en-IN", {
                                day: "numeric",
                                month: "short",
                              }).format(
                                new Date(`${person.upcomingDate}T00:00:00`),
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="dashboard-empty h-52">
                    <CakeSlice className="mb-2 size-8 opacity-40" />
                    No birthdays in this selected month
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gender Distribution */}
          <div>
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-sm font-bold">
                  Gender Diversity
                </CardTitle>
                <CardDescription className="text-xs">
                  Employee distribution by gender
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1 sm:p-5 sm:pt-1">
                {!workforceAnalytics?.byGender ||
                workforceAnalytics.byGender.length === 0 ? (
                  <div className="dashboard-empty h-48">
                    <Users aria-hidden="true" />
                    <span>No gender data</span>
                  </div>
                ) : (
                  <div className="h-64 dashboard-chart w-full pt-2 min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={workforceAnalytics.byGender}
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="gender"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          formatter={(value: number) => [value, "Employees"]}
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Employees"
                          radius={[4, 4, 0, 0]}
                        >
                          <LabelList
                            dataKey="count"
                            position="top"
                            fill="hsl(var(--foreground))"
                            fontSize={11}
                            fontWeight={700}
                          />
                          {workforceAnalytics.byGender.map((_, index) => (
                            <Cell
                              key={`gender-bar-${index}`}
                              fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 4: RECRUITMENT & TALENT PIPELINE ── */}
      {(activeModuleFilter === "all" ||
        activeModuleFilter === "recruitment") && (
        <div className="dashboard-reveal space-y-4">
          <div className="dashboard-section-header flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dashboard-section-icon" aria-hidden="true">
                <Briefcase className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="dashboard-section-title text-foreground">
                  Recruitment & Talent Pipeline
                </h2>
                <p className="dashboard-section-subtitle">
                  Open roles and candidate progress across stages
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/recruitment/jobs")}
              className="h-8 shrink-0 gap-1 px-2.5 text-xs font-semibold text-primary hover:bg-primary/5 hover:text-primary"
            >
              View Recruitment Hub <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            {/* Candidate Pipeline Funnel */}
            <Card className={`${panelClass} lg:col-span-2`}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold">
                      Candidate Pipeline Funnel
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Active applicants distributed across hiring stages
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[11px] font-semibold tabular-nums"
                  >
                    {openJobsCount} Active Jobs
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {!recruitmentAnalytics?.pipelineStages ||
                !recruitmentAnalytics.pipelineStages.some(
                  (s) => s.count > 0,
                ) ? (
                  <div className="dashboard-empty h-52">
                    <Briefcase className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">
                      No Active Candidates in Pipeline
                    </span>
                    <span className="text-muted-foreground mt-0.5">
                      Applications received for open jobs will appear in the
                      pipeline stages
                    </span>
                  </div>
                ) : (
                  <div className="h-52 dashboard-chart w-full pt-2 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={recruitmentAnalytics.pipelineStages}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Candidates"
                          radius={[4, 4, 0, 0]}
                        >
                          {recruitmentAnalytics.pipelineStages.map(
                            (_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                              />
                            ),
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Positions by Department */}
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-sm font-bold">
                  Open Positions by Department
                </CardTitle>
                <CardDescription className="text-xs">
                  Active job openings requiring staffing
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {!recruitmentAnalytics?.openJobsByDept ||
                recruitmentAnalytics.openJobsByDept.length === 0 ? (
                  <div className="dashboard-empty h-48">
                    <Briefcase className="size-8 mb-2 opacity-40" />
                    <span>No active job openings published</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-2">
                    {recruitmentAnalytics.openJobsByDept.map((job, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-lg border border-transparent bg-muted/40 p-2.5 text-xs transition-colors hover:border-border hover:bg-muted/70"
                      >
                        <span
                          className="min-w-0 truncate font-semibold text-foreground"
                          title={job.departmentName}
                        >
                          {job.departmentName}
                        </span>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-primary/30 font-bold text-primary tabular-nums"
                        >
                          {job.openCount} Open
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 5: ROSTER, ENTITY DETAILS & QUICK SHORTCUTS ── */}
      <div className="dashboard-reveal grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Recent Employee Roster */}
        {config.showRecentRoster && (
          <Card className={`${panelClass} lg:col-span-2`}>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserRoundCheck className="size-4 text-primary" /> Recent
                  Employee Roster
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/org-structure")}
                  className="h-8 shrink-0 cursor-pointer px-2.5 text-xs font-semibold text-primary hover:bg-primary/5 hover:text-primary"
                >
                  View All Employees
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
              {isLoading ? (
                <div
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                  role="status"
                  aria-label="Loading employees"
                >
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2.5 rounded-lg border border-border p-2.5"
                    >
                      <span className="dashboard-skeleton size-9 shrink-0 rounded-lg" />
                      <span className="flex-1 space-y-1.5">
                        <span className="dashboard-skeleton h-3 w-3/4" />
                        <span className="dashboard-skeleton h-2.5 w-1/2" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : !recentEmployees.length ? (
                <div className="dashboard-empty py-8">
                  <UserRoundCheck aria-hidden="true" />
                  <span>No employees found.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {recentEmployees.slice(0, 6).map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="dashboard-roster-item group flex min-h-14 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent bg-muted/35 p-2.5 text-left text-xs outline-none hover:border-border hover:bg-muted/70"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="dashboard-avatar flex size-9 flex-shrink-0 items-center justify-center rounded-full font-bold text-primary">
                          {emp.firstName ? emp.firstName[0].toUpperCase() : "E"}
                        </span>
                        <span className="block min-w-0">
                          <span
                            className="block truncate font-semibold text-foreground transition-colors group-hover:text-primary"
                            title={`${emp.firstName} ${emp.lastName}`}
                          >
                            {emp.firstName} {emp.lastName}
                          </span>
                          <span className="block truncate text-[10px] text-muted-foreground tabular-nums">
                            {emp.employeeCode} &bull; {emp.departmentName}
                          </span>
                        </span>
                      </span>
                      <Badge
                        variant="outline"
                        className="flex-shrink-0 text-[10px] capitalize"
                      >
                        {emp.status || "active"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <aside
          className="min-w-0 space-y-4 lg:space-y-5"
          aria-label="Organization details and shortcuts"
        >
          {/* Active Entity Details Card */}
          {config.showEntityDetails && (
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-sm font-bold">
                  Organization Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 px-4 pb-4 pt-0 text-xs sm:px-5 sm:pb-5">
                <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
                  <span className="shrink-0 text-muted-foreground">Company Name</span>
                  <span
                    className="min-w-0 truncate text-right font-bold text-foreground"
                    title={companyName}
                  >
                    {companyName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
                  <span className="shrink-0 text-muted-foreground">
                    Primary Location
                  </span>
                  <span
                    className="min-w-0 truncate text-right font-semibold text-foreground"
                    title={primaryLocation}
                  >
                    {primaryLocation}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
                  <span className="shrink-0 text-muted-foreground">Total Staff</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {totalEmployees} Members
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2.5">
                  <span className="shrink-0 text-muted-foreground">
                    Active Departments
                  </span>
                  <span className="font-bold text-foreground tabular-nums">
                    {totalDepartments} Depts
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Management Shortcuts */}
          {config.showQuickActions && activeQuickActions.length > 0 && (
            <Card className={panelClass}>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-sm font-bold">
                  Quick Management Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                {activeQuickActions.map((qa: any) => {
                  const QAIcon = ICON_MAP[qa.iconName] || Settings;
                  return (
                    <Button
                      key={qa.id}
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(qa.path)}
                      title={qa.label}
                      className="dashboard-action group relative h-auto min-h-[84px] w-full cursor-pointer flex-col items-start justify-between gap-2.5 whitespace-normal rounded-xl bg-card p-3 text-left text-xs font-medium"
                    >
                      <span className="dashboard-action-icon" aria-hidden="true">
                        <QAIcon className="size-4" />
                      </span>
                      <span className="block w-full min-w-0">
                        <span className="line-clamp-2 block font-semibold leading-snug text-foreground">
                          {qa.label}
                        </span>
                        {qa.category && (
                          <span className="mt-0.5 block truncate text-[10px] font-normal text-muted-foreground">
                            {qa.category}
                          </span>
                        )}
                      </span>
                      <ArrowUpRight
                        className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AttendanceReportFilterParams,
  AttendanceReportRow,
  useAttendanceReportQuery,
} from "@/features/analytics/hooks/useAttendanceReports";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getUserRoleAndDept } from "@/lib/userProfile";

const FONT = "font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]";
const COLORS = {
  present: "#10b981",
  absent: "#f43f5e",
  late: "#f59e0b",
  halfDay: "#8b5cf6",
};

const toLocalDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalDateString(date);
};
const getMonthRange = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(year, monthNumber - 1, 1);
  const monthEnd = new Date(year, monthNumber, 0);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthNumber - 1;
  return {
    fromDate: toLocalDateString(monthStart),
    toDate: toLocalDateString(isCurrentMonth ? today : monthEnd),
  };
};
const buildFilters = (
  fromDate: string,
  toDate: string,
): AttendanceReportFilterParams => ({
  companies: ["all"],
  locations: [],
  departments: [],
  reportingOfficers: [],
  employees: [],
  status: "active",
  fromDate,
  toDate,
  isTabularView: true,
  workType: "choose",
  statusFilters: {
    present: true,
    leave: true,
    absent: true,
    expected: true,
    lateMark: false,
    shortWorkingHour: false,
    breakLog: false,
    halfDay: true,
  },
});

type MetricKey = "present" | "absent" | "late" | "halfDay";
type Metrics = Record<MetricKey, number>;
const emptyMetrics = (): Metrics => ({
  present: 0,
  absent: 0,
  late: 0,
  halfDay: 0,
});

// Late employees form their own visual category, keeping chart distributions exclusive.
const getBucket = (row: AttendanceReportRow): MetricKey | null => {
  if (row.dayStatus === "Half Day") return "halfDay";
  if (row.dayStatus === "Absent") return "absent";
  if (row.isLate === "Yes") return "late";
  if (row.dayStatus === "Full Day") return "present";
  return null;
};
const addToMetrics = (metrics: Metrics, row: AttendanceReportRow) => {
  const bucket = getBucket(row);
  if (bucket) metrics[bucket] += 1;
};

export const AttendanceDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const today = toLocalDateString(new Date());
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const todayFilters = useMemo(() => buildFilters(today, today), [today]);
  const weekFilters = useMemo(
    () => buildFilters(getDaysAgo(6), today),
    [today],
  );
  const monthFilters = useMemo(() => {
    const { fromDate, toDate } = getMonthRange(selectedMonth);
    return buildFilters(fromDate, toDate);
  }, [selectedMonth]);
  const todayQuery = useAttendanceReportQuery(todayFilters);
  const weekQuery = useAttendanceReportQuery(weekFilters);
  const monthQuery = useAttendanceReportQuery(monthFilters);
  const todayRows = todayQuery.data || [];
  const weekRows = weekQuery.data || [];
  const monthRows = monthQuery.data || [];
  const isLoading = todayQuery.isLoading || weekQuery.isLoading || monthQuery.isLoading;
  const isError = todayQuery.isError || weekQuery.isError || monthQuery.isError;

  const todayMetrics = useMemo(() => {
    const distribution = emptyMetrics();
    todayRows.forEach((row) => addToMetrics(distribution, row));
    // KPI values intentionally overlap: a late arrival is also a present employee.
    return {
      present: todayRows.filter((row) => row.dayStatus === "Full Day").length,
      absent: todayRows.filter((row) => row.dayStatus === "Absent").length,
      late: todayRows.filter((row) => row.isLate === "Yes").length,
      halfDay: todayRows.filter((row) => row.dayStatus === "Half Day").length,
      distribution,
    };
  }, [todayRows]);

  const monthMetrics = useMemo(() => ({
    present: monthRows.filter((row) => row.dayStatus === "Full Day").length,
    absent: monthRows.filter((row) => row.dayStatus === "Absent").length,
    late: monthRows.filter((row) => row.isLate === "Yes").length,
    halfDay: monthRows.filter((row) => row.dayStatus === "Half Day").length,
  }), [monthRows]);

  const weeklyTrend = useMemo(() => {
    const byDate = new Map<string, { date: string; label: string } & Metrics>();
    weekRows.forEach((row) => {
      if (!byDate.has(row.date)) {
        const parsed = new Date(`${row.date}T12:00:00`);
        byDate.set(row.date, {
          date: row.date,
          label: Number.isNaN(parsed.getTime())
            ? row.date
            : parsed.toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
              }),
          ...emptyMetrics(),
        });
      }
      addToMetrics(byDate.get(row.date)!, row);
    });
    return Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [weekRows]);

  const departmentComparison = useMemo(() => {
    const byDepartment = new Map<
      string,
      { name: string; total: number } & Metrics
    >();
    weekRows.forEach((row) => {
      const name = row.departmentName || "Unassigned";
      if (!byDepartment.has(name))
        byDepartment.set(name, { name, total: 0, ...emptyMetrics() });
      const item = byDepartment.get(name)!;
      item.total += 1;
      addToMetrics(item, row);
    });
    return Array.from(byDepartment.values())
      .map((item) => ({
        name: item.name,
        present: item.present,
        absent: item.absent,
        late: item.late,
        halfDay: item.halfDay,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [weekRows]);

  const pieData = [
    {
      name: "Present",
      value: todayMetrics.distribution.present,
      color: COLORS.present,
    },
    {
      name: "Absent",
      value: todayMetrics.distribution.absent,
      color: COLORS.absent,
    },
    {
      name: "Late arrival",
      value: todayMetrics.distribution.late,
      color: COLORS.late,
    },
    {
      name: "Half day",
      value: todayMetrics.distribution.halfDay,
      color: COLORS.halfDay,
    },
  ].filter((item) => item.value > 0);
  const kpis = [
    {
      label: "Total Present Today",
      value: todayMetrics.present,
      hint: "Full-day employees checked in",
      icon: UsersRound,
      tone: "emerald",
    },
    {
      label: "Total Absent Today",
      value: todayMetrics.absent,
      hint: "Employees without attendance",
      icon: UserRoundX,
      tone: "rose",
    },
    {
      label: "Late Arrivals Today",
      value: todayMetrics.late,
      hint: "Check-ins after shift start",
      icon: Clock3,
      tone: "amber",
    },
    {
      label: "Half Days Today",
      value: todayMetrics.halfDay,
      hint: "Employees marked half day",
      icon: CheckCircle2,
      tone: "violet",
    },
  ] as const;
  const monthlyKpis = [
    { label: "Monthly Present Employees", value: monthMetrics.present, hint: "Full-day attendance in selected month", icon: UsersRound, tone: "emerald" },
    { label: "Monthly Absent Employees", value: monthMetrics.absent, hint: "Absences in selected month", icon: UserRoundX, tone: "rose" },
    { label: "Monthly Late Marks", value: monthMetrics.late, hint: "Late arrivals in selected month", icon: Clock3, tone: "amber" },
    { label: "Monthly Half Days", value: monthMetrics.halfDay, hint: "Half days in selected month", icon: CheckCircle2, tone: "violet" },
  ] as const;
  const refresh = () => {
    void todayQuery.refetch();
    void weekQuery.refetch();
    void monthQuery.refetch();
  };

  return (
    <div
      className={`${FONT} min-h-full -m-4 space-y-5 bg-slate-50 p-4 pb-12 text-slate-950 sm:-m-6 sm:p-6 dark:bg-background dark:text-foreground`}
    >
      <header className="rounded-2xl border border-slate-200 bg-card shadow-sm dark:border-border">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                  Attendance Dashboard
                </h1>
               
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Today’s attendance snapshot and a seven-day punctuality
                overview.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Dashboard month
              <input aria-label="Dashboard month" type="month" value={selectedMonth} max={today.slice(0, 7)} onChange={(event) => setSelectedMonth(event.target.value || today.slice(0, 7))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <Button size="sm" variant="outline" onClick={refresh} className="h-9 shrink-0 gap-2 rounded-lg px-4 text-xs font-semibold">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Sync records
            </Button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
          <Card
            key={label}
            className={`overflow-hidden border-l-4 bg-card shadow-sm dark:border-border ${tone === "emerald" ? "border-l-emerald-500" : tone === "rose" ? "border-l-rose-500" : tone === "amber" ? "border-l-amber-500" : "border-l-violet-500"}`}
          >
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">
                  {todayQuery.isLoading ? "…" : value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === "emerald" ? "bg-emerald-500/10 text-emerald-600" : tone === "rose" ? "bg-rose-500/10 text-rose-600" : tone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-violet-500/10 text-violet-600"}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Monthly attendance</h2>
          <p className="text-xs text-muted-foreground">Counts for {new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {monthlyKpis.map(({ label, value, hint, icon: Icon, tone }) => (
            <Card key={label} className={`overflow-hidden border-l-4 bg-card shadow-sm dark:border-border ${tone === "emerald" ? "border-l-emerald-500" : tone === "rose" ? "border-l-rose-500" : tone === "amber" ? "border-l-amber-500" : "border-l-violet-500"}`}>
              <CardContent className="flex items-start justify-between p-5">
                <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">{monthQuery.isLoading ? "…" : value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === "emerald" ? "bg-emerald-500/10 text-emerald-600" : tone === "rose" ? "bg-rose-500/10 text-rose-600" : tone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-violet-500/10 text-violet-600"}`}><Icon className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load attendance data. Please try syncing again.
        </div>
      )}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="border-slate-200 bg-card shadow-sm dark:border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold">
              Today’s Attendance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="46%"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {pieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No attendance records for today" />
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-card shadow-sm xl:col-span-2 dark:border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold">
              Weekly Attendance &amp; Punctuality Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {weeklyTrend.length ? (
              <TrendChart data={weeklyTrend} />
            ) : (
              <EmptyChart message="No attendance records for the last seven days" />
            )}
          </CardContent>
        </Card>
      </section>
      <Card className="border-slate-200 bg-card shadow-sm dark:border-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold">
            Department-wise Attendance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {departmentComparison.length ? (
            <TrendChart data={departmentComparison} xKey="name" compact />
          ) : (
            <EmptyChart message="No department attendance records for the last seven days" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function TrendChart({
  data,
  xKey = "label",
  percentage = false,
  compact = false,
}: {
  data: Array<Record<string, string | number>>;
  xKey?: string;
  percentage?: boolean;
  compact?: boolean;
}) {
  const label = (value: string) =>
    value === "halfDay"
      ? "Half day"
      : value === "late"
        ? "Late arrival"
        : value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
        barCategoryGap={compact ? "36%" : "24%"}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} />
        <YAxis
          tick={{ fontSize: 11 }}
          allowDecimals={false}
          domain={percentage ? [0, 100] : [0, "auto"]}
          tickFormatter={percentage ? (value) => `${value}%` : undefined}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            percentage ? `${value}%` : value,
            label(name),
          ]}
        />
        <Legend formatter={label} wrapperStyle={{ fontSize: "11px" }} />
        <Bar
          dataKey="present"
          fill={COLORS.present}
          radius={[3, 3, 0, 0]}
          maxBarSize={compact ? 12 : 22}
        />
        <Bar
          dataKey="absent"
          fill={COLORS.absent}
          radius={[3, 3, 0, 0]}
          maxBarSize={compact ? 12 : 22}
        />
        <Bar
          dataKey="late"
          fill={COLORS.late}
          radius={[3, 3, 0, 0]}
          maxBarSize={compact ? 12 : 22}
        />
        <Bar
          dataKey="halfDay"
          fill={COLORS.halfDay}
          radius={[3, 3, 0, 0]}
          maxBarSize={compact ? 12 : 22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
export default AttendanceDashboard;

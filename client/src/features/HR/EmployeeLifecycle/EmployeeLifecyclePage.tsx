import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  ArrowLeftRight,
  UserMinus,
  Search,
  SlidersHorizontal,
  X,
  RefreshCw,
  Building2,
  Briefcase,
  UserCheck,
  Clock,
  ChevronRight,
  CheckCircle2,
  Edit,
  Plus,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/config/api";
import {
  lifecycleApi,
  EmployeeLifecycleSummary,
  EmployeeLifecycleDetails,
} from "./api/lifecycleApi";
import { ChronologicalLifecycleFlow } from "./components/ChronologicalLifecycleFlow";
import { fetchWithFallback, API_ENDPOINTS } from "@/lib/apiHelpers";
import { useLocation } from "react-router-dom";
import {
  useLifecycleCustomizationStore,
  AVAILABLE_LIFECYCLE_KPIS,
} from "@/features/employee-lifecycle/store/lifecycleCustomizationStore";

// ─── Design tokens — consistent with EmployeeListPage ────────────────────────
const T = {
  pageBg: "#EEF4FB",
  card: "#FFFFFF",
  border: "#C9DCF3",
  borderLight: "#DDEAF8",
  navy: "#1E3A5F",
  navyMid: "#2D537A",
  blue: "#2563EB",
  blueHover: "#1D4ED8",
  blueLight: "#DBEAFE",
  blueMid: "#93C5FD",
  muted: "#5A7FA8",
  mutedLight: "#8AAECF",
  mutedBg: "#F0F6FF",
  success: "#059669",
  successBg: "#D1FAE5",
  warn: "#D97706",
  warnBg: "#FEF3C7",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  dangerMid: "#FECACA",
  shadow: "0 1px 4px 0 rgba(30,58,95,0.07)",
  shadowMd: "0 2px 12px 0 rgba(30,58,95,0.10)",
};

// ─── Shared style objects ─────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: T.shadow,
};

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10.5,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 20,
  border: "1px solid",
  lineHeight: 1.6,
  whiteSpace: "nowrap" as const,
};

// ─── Status badge helper ──────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; color: string; bg: string; border: string }
  > = {
    onboarding: {
      label: "Onboarding",
      color: T.blue,
      bg: T.blueLight,
      border: T.blueMid,
    },
    probation: {
      label: "Probation",
      color: T.blue,
      bg: T.blueLight,
      border: T.blueMid,
    },
    active: {
      label: "Active",
      color: T.success,
      bg: T.successBg,
      border: "#6EE7B7",
    },
    notice: {
      label: "Notice Period",
      color: T.warn,
      bg: T.warnBg,
      border: "#FCD34D",
    },
    exit: {
      label: "Offboarded",
      color: T.danger,
      bg: T.dangerBg,
      border: T.dangerMid,
    },
    alumni: {
      label: "Alumni",
      color: T.muted,
      bg: T.mutedBg,
      border: T.border,
    },
  };
  const s = map[status] || {
    label: status,
    color: T.muted,
    bg: T.mutedBg,
    border: T.border,
  };
  return (
    <span
      style={{
        ...pillBase,
        color: s.color,
        background: s.bg,
        borderColor: s.border,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Reusable table cell primitives ──────────────────────────────────────────
const Td = ({
  children,
  right = false,
}: {
  children: React.ReactNode;
  right?: boolean;
}) => (
  <td
    style={{
      padding: "11px 16px",
      fontSize: 12,
      color: T.navyMid,
      verticalAlign: "middle",
      textAlign: right ? "right" : "left",
      whiteSpace: "nowrap" as const,
    }}
  >
    {children}
  </td>
);

const Th = ({
  children,
  right = false,
}: {
  children: React.ReactNode;
  right?: boolean;
}) => (
  <th
    style={{
      padding: "10px 16px",
      fontSize: 10.5,
      fontWeight: 700,
      color: T.muted,
      textAlign: right ? "right" : "left",
      background: T.mutedBg,
      borderBottom: `1px solid ${T.border}`,
      whiteSpace: "nowrap" as const,
      letterSpacing: "0.01em",
    }}
  >
    {children}
  </th>
);

// ─── Employee avatar cell ─────────────────────────────────────────────────────
function EmpAvatar({
  name,
  src,
  sub,
}: {
  name: string;
  src?: string;
  sub?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: T.blueLight,
          border: `1.5px solid ${T.blueMid}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
          color: T.blue,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initials
        )}
      </div>
      <div>
        <div
          style={{
            fontWeight: 700,
            color: T.navy,
            fontSize: 12,
            lineHeight: 1.3,
          }}
        >
          {name}
        </div>
        {sub && (
          <div style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.4 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Info grid cell ───────────────────────────────────────────────────────────
function InfoCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: T.mutedBg,
        borderRadius: 8,
        border: `1px solid ${T.borderLight}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: T.muted,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: accent || T.navy,
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Button variants ──────────────────────────────────────────────────────────
const BtnPrimary = ({
  children,
  onClick,
  type = "button",
  disabled = false,
  style = {},
}: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: disabled ? T.muted : T.blue,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "0 14px",
      height: 34,
      fontSize: 12,
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit",
      transition: "background 0.15s",
      ...style,
    }}
  >
    {children}
  </button>
);

const BtnOutline = ({ children, onClick, style = {}, danger = false }: any) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "#fff",
      color: danger ? T.danger : T.navyMid,
      border: `1px solid ${danger ? T.dangerMid : T.border}`,
      borderRadius: 8,
      padding: "0 14px",
      height: 34,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
      ...style,
    }}
  >
    {children}
  </button>
);

// ─── Form field primitives ────────────────────────────────────────────────────
const FormLabel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: 11.5,
      fontWeight: 600,
      color: T.navyMid,
      marginBottom: 5,
    }}
  >
    {children}
  </div>
);

const FormSelect = ({ value, onChange, children }: any) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: "100%",
      height: 36,
      padding: "0 10px",
      fontSize: 12,
      fontWeight: 500,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      background: T.mutedBg,
      color: T.navy,
      fontFamily: "inherit",
      cursor: "pointer",
      outline: "none",
    }}
  >
    {children}
  </select>
);

const FormInput = ({
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  list = "",
}: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    list={list || undefined}
    style={{
      width: "100%",
      height: 36,
      padding: "0 12px",
      fontSize: 12,
      fontWeight: 500,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      background: T.mutedBg,
      color: T.navy,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box" as const,
    }}
  />
);

const CheckRow = ({ checked, onChange, children }: any) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 500,
      color: T.navyMid,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ width: 14, height: 14, accentColor: T.blue, cursor: "pointer" }}
    />
    {children}
  </label>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmployeeLifecyclePage() {
  const location = useLocation();
  const { config: customConfig } = useLifecycleCustomizationStore();

  const [employees, setEmployees] = useState<EmployeeLifecycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [desigFilter, setDesigFilter] = useState("all");
  const [empTypeFilter, setEmpTypeFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [mainTab, setMainTab] = useState<
    "directory" | "onboarding" | "transfers" | "offboarding"
  >("directory");

  const [companies, setCompanies] = useState<
    Array<{ id: number; name: string; isParent?: boolean }>
  >([]);
  const [departments, setDepartments] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [designations, setDesignations] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [locations, setLocations] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [managers, setManagers] = useState<
    Array<{
      id: number;
      name: string;
      designation?: string;
      department?: string;
    }>
  >([]);

  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [empDetails, setEmpDetails] = useState<EmployeeLifecycleDetails | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] =
    useState<EmployeeLifecycleSummary | null>(null);
  const [transferForm, setTransferForm] = useState({
    toDepartmentId: "",
    toDesignationId: "",
    toLocationId: "",
    toReportingManagerId: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    transferType: "department_change",
    transferReason: "",
    notes: "",
  });
  const [transferBusy, setTransferBusy] = useState(false);

  const [onbOpen, setOnbOpen] = useState(false);
  const [onbForm, setOnbForm] = useState({
    interviewerName: "",
    onboardedByName: "",
    interviewDate: "",
    interviewRating: "4.5 / 5",
    interviewNotes: "",
    joiningDate: "",
    probationEndDate: "",
    orientationCompleted: false,
    documentsVerified: false,
    welcomeKitIssued: false,
    notes: "",
  });

  const [offbOpen, setOffbOpen] = useState(false);
  const [offbForm, setOffbForm] = useState({
    exitType: "resignation",
    resignationDate: "",
    noticePeriodDays: "30",
    relievingDate: "",
    lastWorkingDay: "",
    exitInterviewerName: "",
    exitReason: "",
    exitNotes: "",
    assetsReturned: false,
    fnfStatus: "pending",
    updateEmployeeStatus: "notice" as "notice" | "exit" | "alumni" | "active",
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/onboarding")) {
      setStageFilter("onboarding");
      setMainTab("onboarding");
    } else if (path.includes("/offboarding")) {
      setStageFilter("notice");
      setMainTab("offboarding");
    } else if (path.includes("/transfers")) {
      setStageFilter("all");
      setMainTab("transfers");
    } else setStageFilter("all");
  }, [location.pathname]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await lifecycleApi.getSummaries({
        search,
        stage: stageFilter,
        departmentId: deptFilter !== "all" ? Number(deptFilter) : undefined,
        companyId: companyFilter,
        page,
        pageSize,
      });
      setEmployees(res.data || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to load lifecycle directory",
      );
      setEmployees([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [deptList, locList, desigList, compList] = await Promise.all([
        fetchWithFallback(API_ENDPOINTS.departments()),
        fetchWithFallback(API_ENDPOINTS.locations()),
        fetchWithFallback(API_ENDPOINTS.designations()),
        fetchWithFallback(API_ENDPOINTS.companies()),
      ]);
      setDepartments(
        (deptList || []).map((d: any) => ({
          id: Number(d.id),
          name: d.name || d.department_name,
        })),
      );
      setLocations(
        (locList || []).map((l: any) => ({
          id: Number(l.id),
          name: l.locationName || l.location_name || l.name,
        })),
      );
      const md = (desigList || []).map((d: any) => ({
        id: Number(d.id),
        name: d.name || d.designation_name || d.designationName,
      }));
      setDesignations(
        md.length > 0
          ? md
          : [
              { id: 9, name: "Senior Manager" },
              { id: 10, name: "Manager" },
              { id: 11, name: "Senior Developer" },
              { id: 12, name: "Developer" },
              { id: 13, name: "HR Manager" },
              { id: 14, name: "Sales Manager" },
            ],
      );
      if (compList.length > 0)
        setCompanies(
          compList.map((c: any) => ({
            id: Number(c.companyId ?? c.company_id ?? c.id),
            name: c.name || "Company",
            isParent: Boolean(c.isParent ?? c.is_parent),
          })),
        );
      const mgrList = await lifecycleApi.getManagers().catch(() => []);
      if (Array.isArray(mgrList) && mgrList.length > 0) setManagers(mgrList);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchData();
  }, [
    search,
    stageFilter,
    deptFilter,
    desigFilter,
    empTypeFilter,
    companyFilter,
  ]);
  useEffect(() => {
    fetchData();
  }, [page]);
  useEffect(() => {
    fetchMeta();
  }, []);

  const openDetails = async (empId: number, tab = "overview") => {
    setSelectedEmpId(empId);
    setDetailTab(tab);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const d = await lifecycleApi.getDetails(empId);
      setEmpDetails(d);
    } catch {
      toast.error("Failed to fetch lifecycle details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const openTransfer = (emp: EmployeeLifecycleSummary) => {
    setTransferTarget(emp);
    setTransferForm({
      toDepartmentId: emp.departmentId ? String(emp.departmentId) : "",
      toDesignationId: emp.designationId ? String(emp.designationId) : "",
      toLocationId: emp.currentLocationId ? String(emp.currentLocationId) : "",
      toReportingManagerId: emp.reportingManagerId
        ? String(emp.reportingManagerId)
        : "",
      effectiveDate: new Date().toISOString().split("T")[0],
      transferType: "department_change",
      transferReason: "",
      notes: "",
    });
    setTransferOpen(true);
  };

  const execTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;
    try {
      setTransferBusy(true);
      await lifecycleApi.transferEmployee({
        employeeId: transferTarget.id,
        toDepartmentId: transferForm.toDepartmentId
          ? Number(transferForm.toDepartmentId)
          : undefined,
        toDesignationId: transferForm.toDesignationId
          ? Number(transferForm.toDesignationId)
          : undefined,
        toLocationId: transferForm.toLocationId
          ? Number(transferForm.toLocationId)
          : undefined,
        toReportingManagerId: transferForm.toReportingManagerId
          ? Number(transferForm.toReportingManagerId)
          : undefined,
        effectiveDate: transferForm.effectiveDate,
        transferType: transferForm.transferType,
        transferReason: transferForm.transferReason,
        notes: transferForm.notes,
      });
      toast.success(`${transferTarget.name} transferred successfully`);
      setTransferOpen(false);
      fetchData();
      if (selectedEmpId === transferTarget.id)
        openDetails(transferTarget.id, "transfers");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Transfer failed");
    } finally {
      setTransferBusy(false);
    }
  };

  const openOnbEdit = () => {
    if (!empDetails) return;
    const ob = empDetails.onboarding;
    setOnbForm({
      interviewerName: ob.interviewerName || "",
      onboardedByName: ob.onboardedByName || "",
      interviewDate: ob.interviewDate || "",
      interviewRating: ob.interviewRating || "4.5 / 5",
      interviewNotes: ob.interviewNotes || "",
      joiningDate: ob.joiningDate || empDetails.profile.joiningDate || "",
      probationEndDate: ob.probationEndDate || "",
      orientationCompleted: ob.orientationCompleted,
      documentsVerified: ob.documentsVerified,
      welcomeKitIssued: ob.welcomeKitIssued,
      notes: ob.notes || "",
    });
    setOnbOpen(true);
  };

  const saveOnb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    try {
      await lifecycleApi.saveOnboarding(selectedEmpId, onbForm);
      toast.success("Onboarding records updated");
      setOnbOpen(false);
      openDetails(selectedEmpId, "onboarding");
      fetchData();
    } catch {
      toast.error("Failed to update onboarding");
    }
  };

  const openOffbEdit = () => {
    if (!empDetails) return;
    const off = empDetails.offboarding;
    setOffbForm({
      exitType: off?.exitType || "resignation",
      resignationDate: off?.resignationDate || "",
      noticePeriodDays: String(off?.noticePeriodDays || 30),
      relievingDate: off?.relievingDate || "",
      lastWorkingDay: off?.lastWorkingDay || "",
      exitInterviewerName: off?.exitInterviewerName || "",
      exitReason: off?.exitReason || "",
      exitNotes: off?.exitNotes || "",
      assetsReturned: off?.assetsReturned || false,
      fnfStatus: off?.fnfStatus || "pending",
      updateEmployeeStatus:
        (empDetails.profile.lifecycleStatus as any) || "notice",
    });
    setOffbOpen(true);
  };

  const saveOffb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    try {
      await lifecycleApi.saveOffboarding(selectedEmpId, {
        ...offbForm,
        noticePeriodDays: Number(offbForm.noticePeriodDays),
      });
      toast.success("Offboarding records updated");
      setOffbOpen(false);
      openDetails(selectedEmpId, "offboarding");
      fetchData();
    } catch {
      toast.error("Failed to update offboarding");
    }
  };

  const fmtDate = (d?: string | null) => {
    if (!d || d === "N/A") return "—";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      return dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(d);
    }
  };

  const activeFilters = [
    companyFilter !== "all",
    stageFilter !== "all",
    deptFilter !== "all",
    desigFilter !== "all",
    empTypeFilter !== "all",
  ].filter(Boolean).length;
  const resetFilters = () => {
    setCompanyFilter("all");
    setStageFilter("all");
    setDeptFilter("all");
    setDesigFilter("all");
    setEmpTypeFilter("all");
  };

  const filteredEmps = employees.filter((emp: any) => {
    if (
      desigFilter !== "all" &&
      String(emp.designationName || emp.designationId || "") !== desigFilter
    )
      return false;
    if (empTypeFilter !== "all" && emp.employmentType !== empTypeFilter)
      return false;
    return true;
  });

  const onbEmps = employees.filter(
    (e) =>
      (e.onboarding && Object.keys(e.onboarding).length > 0) ||
      e.lifecycleStatus === "onboarding" ||
      e.lifecycleStatus === "probation",
  );
  const trfEmps = employees.filter((e) => e.transfersCount > 0);
  const offbEmps = employees.filter(
    (e) =>
      (e.offboarding &&
        Object.keys(e.offboarding).length > 0 &&
        (e.offboarding as any).exitType) ||
      e.lifecycleStatus === "notice" ||
      e.lifecycleStatus === "exit" ||
      e.lifecycleStatus === "alumni",
  );

  const TABS = [
    {
      id: "directory",
      label: "Directory",
      mobileLabel: "Dir.",
      icon: <Users size={14} />,
      count: filteredEmps.length,
    },
    {
      id: "onboarding",
      label: "Onboarding",
      mobileLabel: "Onb.",
      icon: <UserPlus size={14} />,
      count: onbEmps.length,
    },
    {
      id: "transfers",
      label: "Transfers",
      mobileLabel: "Trf.",
      icon: <ArrowLeftRight size={14} />,
      count: trfEmps.length,
    },
    {
      id: "offboarding",
      label: "Offboarding",
      mobileLabel: "Off.",
      icon: <UserMinus size={14} />,
      count: offbEmps.length,
    },
  ] as const;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .elc * { font-family:'Plus Jakarta Sans',system-ui,sans-serif; box-sizing:border-box; }

        /* Tab bar */
        .elc-tabbar { display:flex; background:${T.card}; border:1px solid ${T.border}; border-radius:10px; padding:4px; gap:3px; }
        .elc-tab {
          flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
          padding:7px 10px; border-radius:7px; border:none; background:transparent;
          color:${T.muted}; font-size:12px; font-weight:600; cursor:pointer;
          transition:background 0.15s,color 0.15s; white-space:nowrap;
          font-family:'Plus Jakarta Sans',system-ui,sans-serif;
        }
        .elc-tab:hover:not(.elc-tab--active) { background:${T.mutedBg}; color:${T.navyMid}; }
       .elc-tab--active { background:${T.blue}; color:#fff; font-weight:700; }
        .elc-tab .elc-count { font-size:10px; background:rgba(255,255,255,0.25); border-radius:10px; padding:1px 5px; }
        .elc-tab:not(.elc-tab--active) .elc-count { background:${T.blueLight}; color:${T.blue}; }

        /* Responsive tab label */
        .elc-tab-label-full { display:inline; }
        .elc-tab-label-short { display:none; }
        @media(max-width:600px) {
          .elc-tab-label-full { display:none; }
          .elc-tab-label-short { display:inline; }
          .elc-tab { padding:7px 6px; font-size:11px; gap:4px; }
        }

        /* Table */
        .elc-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .elc-table { width:100%; border-collapse:collapse; min-width:640px; }
        .elc-table tbody tr:hover { background:${T.mutedBg}; }
        .elc-table tbody tr { border-bottom:1px solid ${T.borderLight}; }

        /* Inputs */
        .elc-input {
          width:100%; height:36px; padding:0 12px 0 36px; font-size:12px; font-weight:500;
          border:1px solid ${T.border}; border-radius:8px; background:${T.mutedBg}; color:${T.navy};
          font-family:'Plus Jakarta Sans',system-ui,sans-serif; outline:none;
          transition:border-color 0.15s,box-shadow 0.15s;
        }
        .elc-input:focus { border-color:${T.blue}; box-shadow:0 0 0 3px rgba(37,99,235,0.12); background:#fff; }
        .elc-input::placeholder { color:${T.mutedLight}; }

        /* Filter pill */
        .elc-filter-pill {
          display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:500;
          color:${T.navyMid}; background:${T.blueLight}; border:1px solid ${T.blueMid};
          border-radius:20px; padding:3px 9px;
        }
        .elc-filter-pill-x { display:inline-flex; cursor:pointer; color:${T.mutedLight}; transition:color 0.12s; }
        .elc-filter-pill-x:hover { color:${T.danger}; }

        /* Drawer */
        .elc-drawer { position:fixed; inset:0; z-index:999; display:flex; justify-content:flex-end; }
        .elc-drawer-backdrop { position:fixed; inset:0; background:rgba(30,58,95,0.35); backdrop-filter:blur(2px); }
        .elc-drawer-panel {
          position:relative; width:100%; max-width:360px; background:${T.card};
          border-left:1px solid ${T.border}; height:100%; display:flex; flex-direction:column;
          z-index:1; box-shadow:-4px 0 24px rgba(30,58,95,0.12);
        }
        @media(max-width:400px) { .elc-drawer-panel { max-width:100%; } }

        /* Modal grid */
        .elc-info-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; }
        .elc-form-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(max-width:480px) { .elc-form-grid2 { grid-template-columns:1fr; } }

        /* Detail modal tabs */
        .elc-dtab-bar { display:flex; gap:2px; border-bottom:1px solid ${T.border}; margin-bottom:16px; overflow-x:auto; }
        .elc-dtab {
          padding:9px 14px; font-size:12px; font-weight:600; color:${T.muted};
          border:none; background:transparent; cursor:pointer; border-bottom:2px solid transparent;
          white-space:nowrap; font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          transition:color 0.15s; margin-bottom:-1px;
        }
        .elc-dtab:hover { color:${T.navyMid}; }
        .elc-dtab--active { color:${T.blue}; border-bottom-color:${T.blue}; font-weight:700; }

        /* Dialog override */
        [data-radix-dialog-content] { border-radius:14px !important; }
        @media(max-width:520px) { [data-radix-dialog-content] { margin:8px !important; max-width:calc(100vw - 16px) !important; } }

        /* Scroll */
        .elc-scroll { overflow-y:auto; -webkit-overflow-scrolling:touch; }
        .elc-scroll::-webkit-scrollbar { width:4px; }
        .elc-scroll::-webkit-scrollbar-track { background:transparent; }
        .elc-scroll::-webkit-scrollbar-thumb { background:${T.border}; border-radius:4px; }
      `}</style>

      <div
        className="elc"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          paddingBottom: 32,
          minHeight: "100%",
          background: T.pageBg,
        }}
      >
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div
          style={{
            ...cardStyle,
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: T.blue,
                marginBottom: 4,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
              }}
            >
              HR Management
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                color: T.navy,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Employee Lifecycle
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: T.muted }}>
              Directory with onboarding, transfer, and offboarding records.
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: T.mutedBg,
              color: T.navyMid,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "0 14px",
              height: 34,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RefreshCw
              size={13}
              strokeWidth={2}
              className={loading ? "animate-spin" : ""}
              style={{ color: T.blue }}
            />
            Refresh
          </button>
        </div>

        {/* ── Tab Bar ──────────────────────────────────────────────────── */}
        <div className="elc-tabbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`elc-tab${mainTab === t.id ? " elc-tab--active" : ""}`}
              onClick={() => setMainTab(t.id)}
            >
              {t.icon}
              <span className="elc-tab-label-full">{t.label}</span>
              <span className="elc-tab-label-short">{t.mobileLabel}</span>
              <span className="elc-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── Search & Filter bar ───────────────────────────────────────── */}
        <div style={{ ...cardStyle, padding: "12px 16px" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}
            >
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: T.mutedLight,
                  pointerEvents: "none",
                }}
              />
              <input
                className="elc-input"
                placeholder="Search by name, code, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <X
                  size={13}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: T.mutedLight,
                    cursor: "pointer",
                  }}
                  onClick={() => setSearch("")}
                />
              )}
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                background: activeFilters > 0 ? T.blueLight : T.mutedBg,
                color: activeFilters > 0 ? T.blue : T.navyMid,
                border: `1px solid ${activeFilters > 0 ? T.blueMid : T.border}`,
              }}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFilters > 0 && (
                <span
                  style={{
                    background: T.blue,
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                  }}
                >
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {/* Active filter pills */}
          {activeFilters > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${T.borderLight}`,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>
                Active filters:
              </span>
              {companyFilter !== "all" && (
                <span className="elc-filter-pill">
                  Company:{" "}
                  {companies.find((c) => String(c.id) === companyFilter)
                    ?.name || companyFilter}
                  <span
                    className="elc-filter-pill-x"
                    onClick={() => setCompanyFilter("all")}
                  >
                    <X size={10} />
                  </span>
                </span>
              )}
              {stageFilter !== "all" && (
                <span className="elc-filter-pill">
                  Stage: {stageFilter}
                  <span
                    className="elc-filter-pill-x"
                    onClick={() => setStageFilter("all")}
                  >
                    <X size={10} />
                  </span>
                </span>
              )}
              {deptFilter !== "all" && (
                <span className="elc-filter-pill">
                  Dept:{" "}
                  {departments.find((d) => String(d.id) === deptFilter)?.name ||
                    deptFilter}
                  <span
                    className="elc-filter-pill-x"
                    onClick={() => setDeptFilter("all")}
                  >
                    <X size={10} />
                  </span>
                </span>
              )}
              {desigFilter !== "all" && (
                <span className="elc-filter-pill">
                  Role: {desigFilter}
                  <span
                    className="elc-filter-pill-x"
                    onClick={() => setDesigFilter("all")}
                  >
                    <X size={10} />
                  </span>
                </span>
              )}
              {empTypeFilter !== "all" && (
                <span className="elc-filter-pill">
                  Type: {empTypeFilter}
                  <span
                    className="elc-filter-pill-x"
                    onClick={() => setEmpTypeFilter("all")}
                  >
                    <X size={10} />
                  </span>
                </span>
              )}
              <button
                onClick={resetFilters}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.danger,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 4px",
                  fontFamily: "inherit",
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Tables ──────────────────────────────────────────────────── */}
        {/* DIRECTORY */}
        {mainTab === "directory" && (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${T.borderLight}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Users size={14} style={{ color: T.blue }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>
                Employee Directory
              </span>
              <span
                style={{
                  ...pillBase,
                  color: T.blue,
                  background: T.blueLight,
                  borderColor: T.blueMid,
                  marginLeft: "auto",
                }}
              >
                {filteredEmps.length} employees
              </span>
            </div>
            <div className="elc-table-wrap">
              <table className="elc-table">
                <thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Code</Th>
                    <Th>Role</Th>
                    <Th>Department</Th>
                    <Th>Joined</Th>
                    <Th>Status</Th>
                    <Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        <RefreshCw
                          size={16}
                          style={{
                            color: T.blue,
                            display: "block",
                            margin: "0 auto 8px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        Loading directory…
                      </td>
                    </tr>
                  ) : filteredEmps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        No employees match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmps.map((emp) => (
                      <tr key={emp.id}>
                        <Td>
                          <EmpAvatar name={emp.name} src={emp.avatarUrl} />
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: T.muted,
                            }}
                          >
                            {emp.employeeCode || `EMP-${emp.id}`}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              color: T.navy,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {emp.designationName || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11.5,
                              color: T.blue,
                              fontWeight: 600,
                            }}
                          >
                            <Building2 size={11} /> {emp.departmentName || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span style={{ color: T.muted, fontSize: 11 }}>
                            {fmtDate(emp.joiningDate)}
                          </span>
                        </Td>
                        <Td>
                          <StatusPill status={emp.lifecycleStatus} />
                        </Td>
                        <Td right>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "flex-end",
                            }}
                          >
                            <BtnOutline
                              onClick={() => openDetails(emp.id, "overview")}
                              style={{
                                height: 30,
                                fontSize: 11,
                                padding: "0 10px",
                              }}
                            >
                              View <ChevronRight size={11} />
                            </BtnOutline>
                            <BtnPrimary
                              onClick={() => openTransfer(emp)}
                              style={{
                                height: 30,
                                fontSize: 11,
                                padding: "0 10px",
                              }}
                            >
                              <ArrowLeftRight size={11} /> Transfer
                            </BtnPrimary>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ONBOARDING */}
        {mainTab === "onboarding" && (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${T.borderLight}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <UserPlus size={14} style={{ color: T.blue }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>
                Onboarding & Interview Audit
              </span>
              <span
                style={{
                  ...pillBase,
                  color: T.blue,
                  background: T.blueLight,
                  borderColor: T.blueMid,
                  marginLeft: "auto",
                }}
              >
                {onbEmps.length} records
              </span>
            </div>
            <div className="elc-table-wrap">
              <table className="elc-table">
                <thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Code / Role</Th>
                    <Th>Interviewer</Th>
                    <Th>Joining</Th>
                    <Th>Probation End</Th>
                    <Th>Orientation</Th>
                    <Th>Docs</Th>
                    <Th>Score</Th>
                    <Th right>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        Loading onboarding records…
                      </td>
                    </tr>
                  ) : onbEmps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        No active onboarding records.
                      </td>
                    </tr>
                  ) : (
                    onbEmps.map((emp) => (
                      <tr key={emp.id}>
                        <Td>
                          <EmpAvatar name={emp.name} src={emp.avatarUrl} />
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: T.muted,
                              display: "block",
                            }}
                          >
                            {emp.employeeCode || `EMP-${emp.id}`}
                          </span>
                          <span style={{ fontSize: 11, color: T.navyMid }}>
                            {emp.designationName || "Employee"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: T.navy,
                              display: "block",
                            }}
                          >
                            {emp.onboarding?.interviewerName || "—"}
                          </span>
                          <span style={{ fontSize: 11, color: T.muted }}>
                            HR: {emp.onboarding?.onboardedByName || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: T.navy,
                            }}
                          >
                            {fmtDate(emp.joiningDate)}
                          </span>
                        </Td>
                        <Td>
                          <span style={{ fontSize: 11, color: T.muted }}>
                            {fmtDate(emp.onboarding?.probationEndDate)}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              ...pillBase,
                              color: emp.onboarding?.orientationCompleted
                                ? T.success
                                : T.warn,
                              background: emp.onboarding?.orientationCompleted
                                ? T.successBg
                                : T.warnBg,
                              borderColor: emp.onboarding?.orientationCompleted
                                ? "#6EE7B7"
                                : "#FCD34D",
                            }}
                          >
                            {emp.onboarding?.orientationCompleted
                              ? "Done"
                              : "Pending"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              ...pillBase,
                              color: emp.onboarding?.documentsVerified
                                ? T.success
                                : T.warn,
                              background: emp.onboarding?.documentsVerified
                                ? T.successBg
                                : T.warnBg,
                              borderColor: emp.onboarding?.documentsVerified
                                ? "#6EE7B7"
                                : "#FCD34D",
                            }}
                          >
                            {emp.onboarding?.documentsVerified
                              ? "Verified"
                              : "Pending"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: T.warn,
                            }}
                          >
                            {emp.onboarding?.interviewRating
                              ? `★ ${emp.onboarding.interviewRating}`
                              : "—"}
                          </span>
                        </Td>
                        <Td right>
                          <BtnOutline
                            onClick={() => openDetails(emp.id, "onboarding")}
                            style={{
                              height: 30,
                              fontSize: 11,
                              padding: "0 10px",
                            }}
                          >
                            <Edit size={11} /> Details
                          </BtnOutline>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TRANSFERS */}
        {mainTab === "transfers" && (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${T.borderLight}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ArrowLeftRight size={14} style={{ color: T.blue }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>
                Transfer Audit History
              </span>
              <span
                style={{
                  ...pillBase,
                  color: T.blue,
                  background: T.blueLight,
                  borderColor: T.blueMid,
                  marginLeft: "auto",
                }}
              >
                {trfEmps.length} records
              </span>
            </div>
            <div className="elc-table-wrap">
              <table className="elc-table">
                <thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Code</Th>
                    <Th>Department</Th>
                    <Th>Role</Th>
                    <Th>Transfers</Th>
                    <Th>Last Effective</Th>
                    <Th>Reason</Th>
                    <Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        Loading transfer records…
                      </td>
                    </tr>
                  ) : trfEmps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        No transfer history found.
                      </td>
                    </tr>
                  ) : (
                    trfEmps.map((emp) => (
                      <tr key={emp.id}>
                        <Td>
                          <EmpAvatar name={emp.name} src={emp.avatarUrl} />
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: T.muted,
                            }}
                          >
                            {emp.employeeCode || `EMP-${emp.id}`}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: T.navy,
                            }}
                          >
                            {emp.departmentName || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span style={{ fontSize: 11.5, color: T.muted }}>
                            {emp.designationName || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              ...pillBase,
                              color: T.success,
                              background: T.successBg,
                              borderColor: "#6EE7B7",
                            }}
                          >
                            {emp.transfersCount} transfers
                          </span>
                        </Td>
                        <Td>
                          <span style={{ fontSize: 11, color: T.muted }}>
                            {fmtDate(emp.lastTransferDate)}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontSize: 11,
                              color: T.muted,
                              maxWidth: 140,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "block",
                            }}
                          >
                            {emp.transferReason || "—"}
                          </span>
                        </Td>
                        <Td right>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "flex-end",
                            }}
                          >
                            <BtnOutline
                              onClick={() => openDetails(emp.id, "transfers")}
                              style={{
                                height: 30,
                                fontSize: 11,
                                padding: "0 10px",
                              }}
                            >
                              <ArrowLeftRight size={11} /> Log
                            </BtnOutline>
                            <BtnPrimary
                              onClick={() => openTransfer(emp)}
                              style={{
                                height: 30,
                                fontSize: 11,
                                padding: "0 10px",
                              }}
                            >
                              <Plus size={11} /> Transfer
                            </BtnPrimary>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OFFBOARDING */}
        {mainTab === "offboarding" && (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${T.borderLight}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <UserMinus size={14} style={{ color: T.danger }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>
                Offboarding & Exit Records
              </span>
              <span
                style={{
                  ...pillBase,
                  color: T.danger,
                  background: T.dangerBg,
                  borderColor: T.dangerMid,
                  marginLeft: "auto",
                }}
              >
                {offbEmps.length} records
              </span>
            </div>
            <div className="elc-table-wrap">
              <table className="elc-table">
                <thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Code / Dept</Th>
                    <Th>Exit Type</Th>
                    <Th>Resigned</Th>
                    <Th>Last Day</Th>
                    <Th>Notice</Th>
                    <Th>Assets</Th>
                    <Th>F&F Status</Th>
                    <Th right>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        Loading exit records…
                      </td>
                    </tr>
                  ) : offbEmps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.muted,
                          fontSize: 12,
                        }}
                      >
                        No offboarding records found.
                      </td>
                    </tr>
                  ) : (
                    offbEmps.map((emp) => (
                      <tr key={emp.id}>
                        <Td>
                          <EmpAvatar name={emp.name} src={emp.avatarUrl} />
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: T.muted,
                              display: "block",
                            }}
                          >
                            {emp.employeeCode || `EMP-${emp.id}`}
                          </span>
                          <span style={{ fontSize: 11, color: T.navyMid }}>
                            {emp.departmentName || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              ...pillBase,
                              color: T.danger,
                              background: T.dangerBg,
                              borderColor: T.dangerMid,
                              textTransform: "capitalize" as const,
                            }}
                          >
                            {emp.offboarding?.exitType || "Resignation"}
                          </span>
                        </Td>
                        <Td>
                          <span style={{ fontSize: 11, color: T.muted }}>
                            {fmtDate(emp.offboarding?.resignationDate)}
                          </span>
                        </Td>
                        <Td>
                          <span style={{ fontSize: 11, color: T.muted }}>
                            {fmtDate(
                              emp.offboarding?.lastWorkingDay ||
                                emp.offboarding?.relievingDate,
                            )}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: T.navyMid,
                            }}
                          >
                            {emp.offboarding?.noticePeriodDays
                              ? `${emp.offboarding.noticePeriodDays}d`
                              : "—"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              ...pillBase,
                              color: emp.offboarding?.assetsReturned
                                ? T.success
                                : T.danger,
                              background: emp.offboarding?.assetsReturned
                                ? T.successBg
                                : T.dangerBg,
                              borderColor: emp.offboarding?.assetsReturned
                                ? "#6EE7B7"
                                : T.dangerMid,
                            }}
                          >
                            {emp.offboarding?.assetsReturned
                              ? "Returned"
                              : "Pending"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            style={{
                              ...pillBase,
                              color:
                                emp.offboarding?.fnfStatus === "completed" ||
                                emp.offboarding?.fnfStatus === "cleared"
                                  ? T.success
                                  : T.warn,
                              background:
                                emp.offboarding?.fnfStatus === "completed" ||
                                emp.offboarding?.fnfStatus === "cleared"
                                  ? T.successBg
                                  : T.warnBg,
                              borderColor:
                                emp.offboarding?.fnfStatus === "completed" ||
                                emp.offboarding?.fnfStatus === "cleared"
                                  ? "#6EE7B7"
                                  : "#FCD34D",
                              textTransform: "capitalize" as const,
                            }}
                          >
                            {emp.offboarding?.fnfStatus || "Pending"}
                          </span>
                        </Td>
                        <Td right>
                          <BtnOutline
                            onClick={() => openDetails(emp.id, "offboarding")}
                            style={{
                              height: 30,
                              fontSize: 11,
                              padding: "0 10px",
                            }}
                            danger
                          >
                            <Edit size={11} /> Details
                          </BtnOutline>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Filter Drawer ───────────────────────────────────────────── */}
        {filterOpen && (
          <div className="elc-drawer">
            <div
              className="elc-drawer-backdrop"
              onClick={() => setFilterOpen(false)}
            />
            <div className="elc-drawer-panel">
              <div
                style={{
                  padding: "16px 18px",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      background: T.blueLight,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SlidersHorizontal size={15} style={{ color: T.blue }} />
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 14, fontWeight: 800, color: T.navy }}
                    >
                      Filter Directory
                    </div>
                    <div style={{ fontSize: 11, color: T.muted }}>
                      Refine the view
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setFilterOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.muted,
                    display: "flex",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="elc-scroll"
                style={{
                  flex: 1,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div>
                  <FormLabel>
                    <Building2
                      size={12}
                      style={{
                        display: "inline",
                        marginRight: 5,
                        color: T.blue,
                      }}
                    />
                    Company
                  </FormLabel>
                  <FormSelect
                    value={companyFilter}
                    onChange={(e: any) => setCompanyFilter(e.target.value)}
                  >
                    <option value="all">All companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.isParent ? " (Parent)" : ""}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <FormLabel>
                    <UserCheck
                      size={12}
                      style={{
                        display: "inline",
                        marginRight: 5,
                        color: T.blue,
                      }}
                    />
                    Lifecycle Stage
                  </FormLabel>
                  <FormSelect
                    value={stageFilter}
                    onChange={(e: any) => setStageFilter(e.target.value)}
                  >
                    <option value="all">All stages</option>
                    <option value="active">Active</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="probation">Probation</option>
                    <option value="notice">Notice Period</option>
                    <option value="exit">Offboarded / Exit</option>
                  </FormSelect>
                </div>
                <div>
                  <FormLabel>
                    <Users
                      size={12}
                      style={{
                        display: "inline",
                        marginRight: 5,
                        color: T.blue,
                      }}
                    />
                    Department
                  </FormLabel>
                  <FormSelect
                    value={deptFilter}
                    onChange={(e: any) => setDeptFilter(e.target.value)}
                  >
                    <option value="all">All departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <FormLabel>
                    <Briefcase
                      size={12}
                      style={{
                        display: "inline",
                        marginRight: 5,
                        color: T.blue,
                      }}
                    />
                    Designation
                  </FormLabel>
                  <FormSelect
                    value={desigFilter}
                    onChange={(e: any) => setDesigFilter(e.target.value)}
                  >
                    <option value="all">All designations</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <FormLabel>
                    <Clock
                      size={12}
                      style={{
                        display: "inline",
                        marginRight: 5,
                        color: T.blue,
                      }}
                    />
                    Employment Type
                  </FormLabel>
                  <FormSelect
                    value={empTypeFilter}
                    onChange={(e: any) => setEmpTypeFilter(e.target.value)}
                  >
                    <option value="all">All types</option>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </FormSelect>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 18px",
                  borderTop: `1px solid ${T.border}`,
                  display: "flex",
                  gap: 8,
                }}
              >
                <BtnOutline
                  onClick={resetFilters}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Reset
                </BtnOutline>
                <BtnPrimary
                  onClick={() => setFilterOpen(false)}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Apply Filters
                </BtnPrimary>
              </div>
            </div>
          </div>
        )}

        {/* ── Details Modal ──────────────────────────────────────────── */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent
            style={{
              maxWidth: 760,
              maxHeight: "90vh",
              borderRadius: 14,
              padding: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {detailsLoading || !empDetails ? (
              <div
                style={{
                  padding: 60,
                  textAlign: "center",
                  color: T.muted,
                  fontSize: 12,
                }}
              >
                <RefreshCw
                  size={20}
                  style={{
                    color: T.blue,
                    display: "block",
                    margin: "0 auto 10px",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Fetching lifecycle details…
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                {/* Modal header */}
                <div
                  style={{
                    padding: "18px 20px",
                    borderBottom: `1px solid ${T.border}`,
                    background: T.mutedBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: T.blueLight,
                        border: `2px solid ${T.blueMid}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 800,
                        color: T.blue,
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {empDetails.profile.avatarUrl ? (
                        <img
                          src={empDetails.profile.avatarUrl}
                          alt={empDetails.profile.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        empDetails.profile.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: T.navy,
                          }}
                        >
                          {empDetails.profile.name}
                        </span>
                        <StatusPill
                          status={empDetails.profile.lifecycleStatus}
                        />
                      </div>
                      <div
                        style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}
                      >
                        {empDetails.profile.employeeCode} ·{" "}
                        {empDetails.profile.designationName} ·{" "}
                        {empDetails.profile.departmentName}
                      </div>
                    </div>
                  </div>
                  <BtnPrimary
                    onClick={() => {
                      setDetailsOpen(false);
                      openTransfer(empDetails.profile as any);
                    }}
                    style={{ flexShrink: 0 }}
                  >
                    <ArrowLeftRight size={13} /> Transfer
                  </BtnPrimary>
                </div>

                {/* Detail tabs */}
                <div
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                    padding: "0 20px",
                    background: "#fff",
                  }}
                >
                  <div className="elc-dtab-bar">
                    {(
                      [
                        "overview",
                        "onboarding",
                        "transfers",
                        "offboarding",
                      ] as const
                    ).map((t) => (
                      <button
                        key={t}
                        className={`elc-dtab${detailTab === t ? " elc-dtab--active" : ""}`}
                        onClick={() => setDetailTab(t)}
                      >
                        {t === "transfers"
                          ? `Transfers (${empDetails.transfers.length})`
                          : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                <div
                  className="elc-scroll"
                  style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}
                >
                  {detailTab === "overview" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <div className="elc-info-grid">
                        <InfoCell
                          label="Department"
                          value={empDetails.profile.departmentName}
                        />
                        <InfoCell
                          label="Designation"
                          value={empDetails.profile.designationName}
                        />
                        <InfoCell
                          label="Location"
                          value={empDetails.profile.locationName || "—"}
                        />
                        <InfoCell
                          label="Total Transfers"
                          value={`${empDetails.transfers.length} executed`}
                          accent={T.blue}
                        />
                      </div>
                      <ChronologicalLifecycleFlow
                        milestones={empDetails.chronologicalMilestones || []}
                        employeeName={empDetails.profile.name}
                        employeeCode={empDetails.profile.employeeCode}
                      />
                    </div>
                  )}

                  {detailTab === "onboarding" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: T.navy,
                          }}
                        >
                          Onboarding & Interview Details
                        </span>
                        <BtnOutline
                          onClick={openOnbEdit}
                          style={{
                            height: 30,
                            fontSize: 11,
                            padding: "0 10px",
                          }}
                        >
                          <Edit size={11} /> Edit
                        </BtnOutline>
                      </div>
                      <div className="elc-info-grid">
                        <InfoCell
                          label="Interviewer"
                          value={empDetails.onboarding.interviewerName || "—"}
                        />
                        <InfoCell
                          label="Onboarded by"
                          value={empDetails.onboarding.onboardedByName || "—"}
                        />
                        <InfoCell
                          label="Interview date"
                          value={fmtDate(empDetails.onboarding.interviewDate)}
                        />
                        <InfoCell
                          label="Rating"
                          value={empDetails.onboarding.interviewRating || "—"}
                          accent={T.warn}
                        />
                        <InfoCell
                          label="Joining date"
                          value={fmtDate(
                            empDetails.onboarding.joiningDate ||
                              empDetails.profile.joiningDate,
                          )}
                        />
                        <InfoCell
                          label="Probation end"
                          value={
                            fmtDate(empDetails.onboarding.probationEndDate) ||
                            "Completed"
                          }
                        />
                      </div>
                      {empDetails.onboarding.interviewNotes && (
                        <div
                          style={{
                            background: T.mutedBg,
                            borderRadius: 8,
                            border: `1px solid ${T.borderLight}`,
                            padding: "12px 14px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: T.muted,
                              marginBottom: 4,
                            }}
                          >
                            Interview notes
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              color: T.navyMid,
                              lineHeight: 1.6,
                            }}
                          >
                            {empDetails.onboarding.interviewNotes}
                          </p>
                        </div>
                      )}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(160px,1fr))",
                          gap: 8,
                        }}
                      >
                        {[
                          {
                            label: "Orientation completed",
                            done: empDetails.onboarding.orientationCompleted,
                          },
                          {
                            label: "Documents verified",
                            done: empDetails.onboarding.documentsVerified,
                          },
                          {
                            label: "Welcome kit issued",
                            done: empDetails.onboarding.welcomeKitIssued,
                          },
                        ].map((c) => (
                          <div
                            key={c.label}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: `1px solid ${c.done ? "#6EE7B7" : T.borderLight}`,
                              background: c.done ? T.successBg : T.mutedBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: 12,
                              fontWeight: 600,
                              color: c.done ? T.success : T.muted,
                            }}
                          >
                            {c.label}
                            <CheckCircle2
                              size={14}
                              style={{ opacity: c.done ? 1 : 0.3 }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailTab === "transfers" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: T.navy,
                          }}
                        >
                          Transfer History ({empDetails.transfers.length})
                        </span>
                        <BtnPrimary
                          onClick={() => {
                            setDetailsOpen(false);
                            openTransfer(empDetails.profile as any);
                          }}
                          style={{
                            height: 30,
                            fontSize: 11,
                            padding: "0 10px",
                          }}
                        >
                          <Plus size={11} /> New Transfer
                        </BtnPrimary>
                      </div>
                      {empDetails.transfers.length === 0 ? (
                        <div
                          style={{
                            padding: 32,
                            textAlign: "center",
                            color: T.muted,
                            fontSize: 12,
                            background: T.mutedBg,
                            borderRadius: 10,
                          }}
                        >
                          No transfers recorded yet.
                        </div>
                      ) : (
                        empDetails.transfers.map((t) => (
                          <div
                            key={t.id}
                            style={{ ...cardStyle, padding: "14px 16px" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10,
                                paddingBottom: 10,
                                borderBottom: `1px solid ${T.borderLight}`,
                              }}
                            >
                              <span
                                style={{
                                  ...pillBase,
                                  color: T.blue,
                                  background: T.blueLight,
                                  borderColor: T.blueMid,
                                  textTransform: "capitalize" as const,
                                }}
                              >
                                {t.transferType.replace("_", " ")}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: T.navy,
                                }}
                              >
                                Effective: {fmtDate(t.effectiveDate)}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: T.muted,
                                  marginLeft: "auto",
                                }}
                              >
                                By: {t.createdBy}
                              </span>
                            </div>
                            <div
                              className="elc-info-grid"
                              style={{
                                gridTemplateColumns:
                                  "repeat(auto-fit,minmax(130px,1fr))",
                              }}
                            >
                              <InfoCell
                                label="Department"
                                value={
                                  <>
                                    <span style={{ color: T.muted }}>
                                      {t.fromDepartmentName}
                                    </span>
                                    <span style={{ color: T.blue }}>
                                      {" "}
                                      → {t.toDepartmentName}
                                    </span>
                                  </>
                                }
                              />
                              <InfoCell
                                label="Designation"
                                value={
                                  <>
                                    <span style={{ color: T.muted }}>
                                      {t.fromDesignationName}
                                    </span>
                                    <span style={{ color: T.blue }}>
                                      {" "}
                                      → {t.toDesignationName}
                                    </span>
                                  </>
                                }
                              />
                              <InfoCell
                                label="Manager"
                                value={
                                  <>
                                    <span style={{ color: T.muted }}>
                                      {t.fromManagerName}
                                    </span>
                                    <span style={{ color: T.blue }}>
                                      {" "}
                                      → {t.toManagerName}
                                    </span>
                                  </>
                                }
                              />
                              <InfoCell
                                label="Location"
                                value={
                                  <>
                                    <span style={{ color: T.muted }}>
                                      {t.fromLocationName}
                                    </span>
                                    <span style={{ color: T.blue }}>
                                      {" "}
                                      → {t.toLocationName}
                                    </span>
                                  </>
                                }
                              />
                            </div>
                            {t.transferReason && (
                              <div
                                style={{
                                  marginTop: 10,
                                  fontSize: 11.5,
                                  color: T.muted,
                                  background: T.mutedBg,
                                  borderRadius: 6,
                                  padding: "8px 12px",
                                  borderLeft: `3px solid ${T.blue}`,
                                }}
                              >
                                {t.transferReason}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === "offboarding" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: T.navy,
                          }}
                        >
                          Offboarding & Exit
                        </span>
                        <BtnOutline
                          onClick={openOffbEdit}
                          danger
                          style={{
                            height: 30,
                            fontSize: 11,
                            padding: "0 10px",
                          }}
                        >
                          <Edit size={11} /> Manage
                        </BtnOutline>
                      </div>
                      {!empDetails.offboarding ? (
                        <div
                          style={{
                            padding: 32,
                            textAlign: "center",
                            color: T.muted,
                            fontSize: 12,
                            background: T.mutedBg,
                            borderRadius: 10,
                          }}
                        >
                          Employee is active — no exit record initiated.
                          <div style={{ marginTop: 12 }}>
                            <BtnPrimary
                              onClick={openOffbEdit}
                              style={{ background: T.danger }}
                            >
                              Initiate Offboarding
                            </BtnPrimary>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="elc-info-grid">
                            <InfoCell
                              label="Exit type"
                              value={empDetails.offboarding.exitType}
                              accent={T.danger}
                            />
                            <InfoCell
                              label="Resignation date"
                              value={fmtDate(
                                empDetails.offboarding.resignationDate,
                              )}
                            />
                            <InfoCell
                              label="Notice period"
                              value={`${empDetails.offboarding.noticePeriodDays} days`}
                            />
                            <InfoCell
                              label="Relieving date"
                              value={fmtDate(
                                empDetails.offboarding.relievingDate,
                              )}
                            />
                            <InfoCell
                              label="Last working day"
                              value={fmtDate(
                                empDetails.offboarding.lastWorkingDay,
                              )}
                            />
                            <InfoCell
                              label="Exit interviewer"
                              value={
                                empDetails.offboarding.exitInterviewerName ||
                                "—"
                              }
                            />
                            <InfoCell
                              label="F&F status"
                              value={empDetails.offboarding.fnfStatus}
                              accent={T.warn}
                            />
                          </div>
                          <div
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: `1px solid ${empDetails.offboarding.assetsReturned ? "#6EE7B7" : T.dangerMid}`,
                              background: empDetails.offboarding.assetsReturned
                                ? T.successBg
                                : T.dangerBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: 12,
                              fontWeight: 600,
                              color: empDetails.offboarding.assetsReturned
                                ? T.success
                                : T.danger,
                            }}
                          >
                            Assets & hardware returned
                            <CheckCircle2
                              size={14}
                              style={{
                                opacity: empDetails.offboarding.assetsReturned
                                  ? 1
                                  : 0.3,
                              }}
                            />
                          </div>
                          {empDetails.offboarding.exitReason && (
                            <div
                              style={{
                                background: T.mutedBg,
                                borderRadius: 8,
                                border: `1px solid ${T.borderLight}`,
                                padding: "12px 14px",
                                borderLeft: `3px solid ${T.danger}`,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  color: T.muted,
                                  marginBottom: 4,
                                }}
                              >
                                Exit reason
                              </div>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 12,
                                  color: T.navyMid,
                                }}
                              >
                                {empDetails.offboarding.exitReason}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Transfer Modal ─────────────────────────────────────────── */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent
            style={{ maxWidth: 480, borderRadius: 14, padding: "22px 24px" }}
          >
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <ArrowLeftRight size={16} style={{ color: T.blue }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>
                  Transfer Employee
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: T.muted }}>
                {transferTarget?.name} — department, role, location or manager
                reassignment
              </p>
            </div>
            <form
              onSubmit={execTransfer}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div className="elc-form-grid2">
                <div>
                  <FormLabel>Transfer type</FormLabel>
                  <FormSelect
                    value={transferForm.transferType}
                    onChange={(e: any) =>
                      setTransferForm({
                        ...transferForm,
                        transferType: e.target.value,
                      })
                    }
                  >
                    <option value="department_change">Department change</option>
                    <option value="location_transfer">Location transfer</option>
                    <option value="promotion">Promotion</option>
                    <option value="manager_change">Manager reassignment</option>
                  </FormSelect>
                </div>
                <div>
                  <FormLabel>Effective date</FormLabel>
                  <FormInput
                    type="date"
                    value={transferForm.effectiveDate}
                    onChange={(e: any) =>
                      setTransferForm({
                        ...transferForm,
                        effectiveDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <FormLabel>New department</FormLabel>
                <FormSelect
                  value={transferForm.toDepartmentId}
                  onChange={(e: any) =>
                    setTransferForm({
                      ...transferForm,
                      toDepartmentId: e.target.value,
                    })
                  }
                >
                  <option value="">Keep current</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <FormLabel>New designation</FormLabel>
                <FormSelect
                  value={transferForm.toDesignationId}
                  onChange={(e: any) =>
                    setTransferForm({
                      ...transferForm,
                      toDesignationId: e.target.value,
                    })
                  }
                >
                  <option value="">Keep current</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <FormLabel>New location</FormLabel>
                <FormSelect
                  value={transferForm.toLocationId}
                  onChange={(e: any) =>
                    setTransferForm({
                      ...transferForm,
                      toLocationId: e.target.value,
                    })
                  }
                >
                  <option value="">Keep current</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <FormLabel>New reporting manager</FormLabel>
                <FormSelect
                  value={transferForm.toReportingManagerId}
                  onChange={(e: any) =>
                    setTransferForm({
                      ...transferForm,
                      toReportingManagerId: e.target.value,
                    })
                  }
                >
                  <option value="">Keep current</option>
                  {employees
                    .filter((m) => m.id !== transferTarget?.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.departmentName ? ` (${m.departmentName})` : ""}
                      </option>
                    ))}
                </FormSelect>
              </div>
              <div>
                <FormLabel>Reason *</FormLabel>
                <FormInput
                  value={transferForm.transferReason}
                  onChange={(e: any) =>
                    setTransferForm({
                      ...transferForm,
                      transferReason: e.target.value,
                    })
                  }
                  placeholder="e.g. Promoted to core team"
                  required
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  paddingTop: 4,
                }}
              >
                <BtnOutline onClick={() => setTransferOpen(false)}>
                  Cancel
                </BtnOutline>
                <BtnPrimary type="submit" disabled={transferBusy}>
                  {transferBusy ? "Transferring…" : "Confirm Transfer"}
                </BtnPrimary>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Onboarding Edit Modal ──────────────────────────────────── */}
        <Dialog open={onbOpen} onOpenChange={setOnbOpen}>
          <DialogContent
            style={{
              maxWidth: 440,
              borderRadius: 14,
              padding: "22px 24px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <UserPlus size={16} style={{ color: T.blue }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>
                  Edit Onboarding Records
                </span>
              </div>
            </div>
            <form
              onSubmit={saveOnb}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div>
                <FormLabel>Interviewer name</FormLabel>
                <FormInput
                  value={onbForm.interviewerName}
                  onChange={(e: any) =>
                    setOnbForm({ ...onbForm, interviewerName: e.target.value })
                  }
                  list="mgr-list"
                  placeholder="e.g. Manager name"
                />
                <datalist id="mgr-list">
                  {managers.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <FormLabel>Onboarded by (HR)</FormLabel>
                <FormInput
                  value={onbForm.onboardedByName}
                  onChange={(e: any) =>
                    setOnbForm({ ...onbForm, onboardedByName: e.target.value })
                  }
                />
              </div>
              <div className="elc-form-grid2">
                <div>
                  <FormLabel>Interview date</FormLabel>
                  <FormInput
                    type="date"
                    value={onbForm.interviewDate}
                    onChange={(e: any) =>
                      setOnbForm({ ...onbForm, interviewDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <FormLabel>Rating</FormLabel>
                  <FormInput
                    value={onbForm.interviewRating}
                    onChange={(e: any) =>
                      setOnbForm({
                        ...onbForm,
                        interviewRating: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="elc-form-grid2">
                <div>
                  <FormLabel>Joining date</FormLabel>
                  <FormInput
                    type="date"
                    value={onbForm.joiningDate}
                    onChange={(e: any) =>
                      setOnbForm({ ...onbForm, joiningDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <FormLabel>Probation end</FormLabel>
                  <FormInput
                    type="date"
                    value={onbForm.probationEndDate}
                    onChange={(e: any) =>
                      setOnbForm({
                        ...onbForm,
                        probationEndDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <FormLabel>Interview notes</FormLabel>
                <FormInput
                  value={onbForm.interviewNotes}
                  onChange={(e: any) =>
                    setOnbForm({ ...onbForm, interviewNotes: e.target.value })
                  }
                />
              </div>
              <div>
                <FormLabel>Onboarding remarks</FormLabel>
                <FormInput
                  value={onbForm.notes}
                  onChange={(e: any) =>
                    setOnbForm({ ...onbForm, notes: e.target.value })
                  }
                  placeholder="Laptop issued, BG check done…"
                />
              </div>
              <div
                style={{
                  borderTop: `1px solid ${T.borderLight}`,
                  paddingTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <CheckRow
                  checked={onbForm.orientationCompleted}
                  onChange={(e: any) =>
                    setOnbForm({
                      ...onbForm,
                      orientationCompleted: e.target.checked,
                    })
                  }
                >
                  Orientation completed
                </CheckRow>
                <CheckRow
                  checked={onbForm.documentsVerified}
                  onChange={(e: any) =>
                    setOnbForm({
                      ...onbForm,
                      documentsVerified: e.target.checked,
                    })
                  }
                >
                  Documents verified
                </CheckRow>
                <CheckRow
                  checked={onbForm.welcomeKitIssued}
                  onChange={(e: any) =>
                    setOnbForm({
                      ...onbForm,
                      welcomeKitIssued: e.target.checked,
                    })
                  }
                >
                  Welcome kit issued
                </CheckRow>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  paddingTop: 4,
                }}
              >
                <BtnOutline onClick={() => setOnbOpen(false)}>
                  Cancel
                </BtnOutline>
                <BtnPrimary type="submit">Save Onboarding</BtnPrimary>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Offboarding Edit Modal ─────────────────────────────────── */}
        <Dialog open={offbOpen} onOpenChange={setOffbOpen}>
          <DialogContent
            style={{
              maxWidth: 440,
              borderRadius: 14,
              padding: "22px 24px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <UserMinus size={16} style={{ color: T.danger }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>
                  Manage Exit & Offboarding
                </span>
              </div>
            </div>
            <form
              onSubmit={saveOffb}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div className="elc-form-grid2">
                <div>
                  <FormLabel>Exit type</FormLabel>
                  <FormSelect
                    value={offbForm.exitType}
                    onChange={(e: any) =>
                      setOffbForm({ ...offbForm, exitType: e.target.value })
                    }
                  >
                    <option value="resignation">Resignation</option>
                    <option value="termination">Termination</option>
                    <option value="contract_end">Contract end</option>
                    <option value="retirement">Retirement</option>
                  </FormSelect>
                </div>
                <div>
                  <FormLabel>Lifecycle status</FormLabel>
                  <FormSelect
                    value={offbForm.updateEmployeeStatus}
                    onChange={(e: any) =>
                      setOffbForm({
                        ...offbForm,
                        updateEmployeeStatus: e.target.value,
                      })
                    }
                  >
                    <option value="notice">In notice period</option>
                    <option value="exit">Offboarded / Exit</option>
                    <option value="alumni">Alumni</option>
                    <option value="active">Active (cancel exit)</option>
                  </FormSelect>
                </div>
              </div>
              <div className="elc-form-grid2">
                <div>
                  <FormLabel>Resignation date</FormLabel>
                  <FormInput
                    type="date"
                    value={offbForm.resignationDate}
                    onChange={(e: any) =>
                      setOffbForm({
                        ...offbForm,
                        resignationDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <FormLabel>Notice period (days)</FormLabel>
                  <FormInput
                    type="number"
                    value={offbForm.noticePeriodDays}
                    onChange={(e: any) =>
                      setOffbForm({
                        ...offbForm,
                        noticePeriodDays: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="elc-form-grid2">
                <div>
                  <FormLabel>Relieving date</FormLabel>
                  <FormInput
                    type="date"
                    value={offbForm.relievingDate}
                    onChange={(e: any) =>
                      setOffbForm({
                        ...offbForm,
                        relievingDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <FormLabel>Last working day</FormLabel>
                  <FormInput
                    type="date"
                    value={offbForm.lastWorkingDay}
                    onChange={(e: any) =>
                      setOffbForm({
                        ...offbForm,
                        lastWorkingDay: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="elc-form-grid2">
                <div>
                  <FormLabel>Exit interviewer</FormLabel>
                  <FormInput
                    value={offbForm.exitInterviewerName}
                    onChange={(e: any) =>
                      setOffbForm({
                        ...offbForm,
                        exitInterviewerName: e.target.value,
                      })
                    }
                    placeholder="HR Manager"
                  />
                </div>
                <div>
                  <FormLabel>F&F status</FormLabel>
                  <FormSelect
                    value={offbForm.fnfStatus}
                    onChange={(e: any) =>
                      setOffbForm({ ...offbForm, fnfStatus: e.target.value })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="hold">On hold</option>
                  </FormSelect>
                </div>
              </div>
              <div>
                <FormLabel>Exit reason</FormLabel>
                <FormInput
                  value={offbForm.exitReason}
                  onChange={(e: any) =>
                    setOffbForm({ ...offbForm, exitReason: e.target.value })
                  }
                  placeholder="Reason for exit"
                />
              </div>
              <div>
                <FormLabel>HR audit remarks</FormLabel>
                <FormInput
                  value={offbForm.exitNotes}
                  onChange={(e: any) =>
                    setOffbForm({ ...offbForm, exitNotes: e.target.value })
                  }
                  placeholder="Clearance notes, summary…"
                />
              </div>
              <div
                style={{
                  borderTop: `1px solid ${T.borderLight}`,
                  paddingTop: 12,
                }}
              >
                <CheckRow
                  checked={offbForm.assetsReturned}
                  onChange={(e: any) =>
                    setOffbForm({
                      ...offbForm,
                      assetsReturned: e.target.checked,
                    })
                  }
                >
                  Company hardware returned
                </CheckRow>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  paddingTop: 4,
                }}
              >
                <BtnOutline onClick={() => setOffbOpen(false)}>
                  Cancel
                </BtnOutline>
                <BtnPrimary type="submit" style={{ background: T.danger }}>
                  Save Exit Record
                </BtnPrimary>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

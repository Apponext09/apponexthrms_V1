import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getVisibleSections } from "@/config/navigation";
import {
  Search,
  Users,
  BarChart3,
  Briefcase,
  Clock,
  TrendingUp,
  FileText,
  Zap,
  X,
  Calendar,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category:
    | "employees"
    | "departments"
    | "leave"
    | "attendance"
    | "recruitment"
    | "assets"
    | "reports"
    | "policies"
    | "documents"
    | "workflows"
    | "announcements"
    | "settings"
    | "approvals";
  icon: React.ReactNode;
  href: string;
}

const searchData: SearchResult[] = [
  {
    id: "org-structure",
    title: "Org. Structure",
    description: "View the organization hierarchy",
    category: "departments",
    icon: <Users className="h-4 w-4" />,
    href: "/org-structure",
  },
  {
    id: "my-lifecycle",
    title: "My Lifecycle",
    description: "View your employment journey",
    category: "employees",
    icon: <Users className="h-4 w-4" />,
    href: "/employee/lifecycle",
  },
  {
    id: "id-card",
    title: "ID Card",
    description: "View your digital employee ID",
    category: "employees",
    icon: <Users className="h-4 w-4" />,
    href: "/employee/id-card",
  },
  // Employees
  {
    id: "1",
    title: "Employee List",
    description: "View all employees",
    category: "employees",
    icon: <Users className="h-4 w-4" />,
    href: "/employees",
  },
  {
    id: "2",
    title: "Add Employee",
    description: "Onboard new employee",
    category: "employees",
    icon: <Users className="h-4 w-4" />,
    href: "/employees/new",
  },
  {
    id: "3",
    title: "My Profile",
    description: "View your profile",
    category: "employees",
    icon: <Users className="h-4 w-4" />,
    href: "/profile",
  },

  // Leave
  {
    id: "4",
    title: "My Leave",
    description: "View leave balance",
    category: "leave",
    icon: <Calendar className="h-4 w-4" />,
    href: "/leaves",
  },
  {
    id: "5",
    title: "Apply Leave",
    description: "Request time off",
    category: "leave",
    icon: <Clock className="h-4 w-4" />,
    href: "/leaves/apply",
  },
  {
    id: "6",
    title: "Leave Approvals",
    description: "Approve leave requests",
    category: "leave",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "/leaves/approvals",
  },

  // Attendance
  {
    id: "7",
    title: "Attendance Dashboard",
    description: "View attendance metrics",
    category: "attendance",
    icon: <Clock className="h-4 w-4" />,
    href: "/attendance",
  },
  {
    id: "8",
    title: "My Attendance",
    description: "Check-in and out",
    category: "attendance",
    icon: <Clock className="h-4 w-4" />,
    href: "/employee/face-attendance",
  },

  // Recruitment
  {
    id: "10",
    title: "MRF Request",
    description: "Manpower Requisition Form",
    category: "recruitment",
    icon: <Briefcase className="h-4 w-4" />,
    href: "/recruitment/mrf-request",
  },
  {
    id: "11",
    title: "Candidate Report",
    description: "View candidate reports",
    category: "recruitment",
    icon: <Users className="h-4 w-4" />,
    href: "/recruitment/candidate-report",
  },
  {
    id: "11a",
    title: "Resume Bank",
    description: "Source and screen resumes",
    category: "recruitment",
    icon: <Briefcase className="h-4 w-4" />,
    href: "/recruitment/resume-bank",
  },
  {
    id: "11b",
    title: "Applicant Tracker",
    description: "Track applicant statuses",
    category: "recruitment",
    icon: <Briefcase className="h-4 w-4" />,
    href: "/recruitment/applicant-tracker",
  },
  {
    id: "11c",
    title: "Interviewer Rating",
    description: "View interviewer ratings",
    category: "recruitment",
    icon: <Briefcase className="h-4 w-4" />,
    href: "/recruitment/interviewer-rating",
  },

  // Assets
  {
    id: "12",
    title: "Asset Management",
    description: "Manage company assets",
    category: "assets",
    icon: <Zap className="h-4 w-4" />,
    href: "/assets",
  },
  {
    id: "13",
    title: "My Assets",
    description: "View assigned assets",
    category: "assets",
    icon: <Zap className="h-4 w-4" />,
    href: "/assets/my-assets",
  },

  // Reports
  {
    id: "14",
    title: "Reports & Analytics",
    description: "View organizational reports",
    category: "reports",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/analytics",
  },
  {
    id: "15",
    title: "HR Reports",
    description: "HR operations reports",
    category: "reports",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/reports/hr",
  },

  // Policies
  {
    id: "16",
    title: "Work from Home Policy",
    description: "Remote work guidelines",
    category: "policies",
    icon: <FileText className="h-4 w-4" />,
    href: "/policies/work-from-home",
  },
  {
    id: "17",
    title: "Code of Conduct",
    description: "Employee code of conduct",
    category: "policies",
    icon: <FileText className="h-4 w-4" />,
    href: "/policies/code-of-conduct",
  },
  {
    id: "18",
    title: "Leave Policy",
    description: "Leave entitlements and rules",
    category: "policies",
    icon: <FileText className="h-4 w-4" />,
    href: "/policies/leave",
  },
  {
    id: "19",
    title: "Travel Policy",
    description: "Business travel guidelines",
    category: "policies",
    icon: <FileText className="h-4 w-4" />,
    href: "/policies/travel",
  },

  // Documents
  {
    id: "20",
    title: "Employee Handbook",
    description: "Company policies and procedures",
    category: "documents",
    icon: <FileText className="h-4 w-4" />,
    href: "/documents/handbook",
  },
  {
    id: "21",
    title: "Offer Letters",
    description: "View offer letter templates",
    category: "documents",
    icon: <FileText className="h-4 w-4" />,
    href: "/documents/offer-letters",
  },
  {
    id: "22",
    title: "My Documents",
    description: "Access your documents",
    category: "documents",
    icon: <FileText className="h-4 w-4" />,
    href: "/documents/my-documents",
  },

  // Workflows
  {
    id: "23",
    title: "Workflow Builder",
    description: "Create and manage workflows",
    category: "workflows",
    icon: <Zap className="h-4 w-4" />,
    href: "/hr-operations/workflow-builder",
  },
  {
    id: "24",
    title: "Approval Workflows",
    description: "Manage approval processes",
    category: "workflows",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "/approvals",
  },

  // Announcements
  {
    id: "25",
    title: "Company Announcements",
    description: "Latest news and updates",
    category: "announcements",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "/announcements",
  },
  {
    id: "26",
    title: "Create Announcement",
    description: "Post new announcement",
    category: "announcements",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "/announcements/new",
  },

  // Settings
  {
    id: "27",
    title: "Organization Settings",
    description: "Configure organization",
    category: "settings",
    icon: <Zap className="h-4 w-4" />,
    href: "/settings/organization",
  },
  {
    id: "28",
    title: "Department Management",
    description: "Manage departments",
    category: "settings",
    icon: <Users className="h-4 w-4" />,
    href: "/settings/departments",
  },
  {
    id: "29",
    title: "Holiday Calendar",
    description: "Company holidays",
    category: "settings",
    icon: <Calendar className="h-4 w-4" />,
    href: "/settings/holidays",
  },
  {
    id: "30",
    title: "Notification Preferences",
    description: "Manage your notifications",
    category: "settings",
    icon: <Zap className="h-4 w-4" />,
    href: "/settings/notifications",
  },

  // Approvals
  {
    id: "31",
    title: "My Approvals",
    description: "Pending approvals for you",
    category: "approvals",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "/approvals/inbox",
  },
  {
    id: "32",
    title: "Approval Dashboard",
    description: "All approvals overview",
    category: "approvals",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/approvals/dashboard",
  },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Handle Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setQuery("");
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter results based on query
  useEffect(() => {
    if (!query) {
      setResults(searchData.slice(0, 8)); // Show recent items
      return;
    }

    const filtered = searchData.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()),
    );

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      employees: "Employees",
      departments: "Organization",
      leave: "Leave",
      attendance: "Attendance",
      recruitment: "Recruitment",
      assets: "Assets",
      reports: "Reports",
      policies: "Policies",
      documents: "Documents",
      workflows: "Workflows",
      announcements: "Announcements",
      settings: "Settings",
      approvals: "Approvals",
    };
    return labels[category] || category;
  };

  const groupedResults = results.reduce(
    (acc, result) => {
      const category = getCategoryLabel(result.category);
      if (!acc[category]) acc[category] = [];
      acc[category].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl overflow-hidden p-0 shadow-soft-lg sm:w-full">
        <div className="flex max-h-[min(500px,calc(100dvh-2rem))] flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4 py-3 gap-2">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search employees, leave, recruitment..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="border-0 focus-visible:ring-0 focus-visible:outline-none"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ESC
            </span>
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No results found
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-3">
                {Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category}
                    </div>
                    {items.map((result, index) => {
                      const globalIndex =
                        Object.values(groupedResults)
                          .slice(
                            0,
                            Object.keys(groupedResults).indexOf(category),
                          )
                          .reduce((sum, arr) => sum + arr.length, 0) + index;

                      return (
                        <motion.button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left",
                            globalIndex === selectedIndex
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted",
                          )}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex-shrink-0">{result.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {result.title}
                            </p>
                            {result.description && (
                              <p
                                className={cn(
                                  "text-xs truncate",
                                  globalIndex === selectedIndex
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
                              >
                                {result.description}
                              </p>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Help */}
          {results.length > 0 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Navigate with ↑↓ • Select with ↵</span>
              <span>Type to search</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export button component for Topbar
export function GlobalSearchButton() {
  const [inlineQuery, setInlineQuery] = useState("");
  const [inlineOpen, setInlineOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const inlineNavigate = useNavigate();
  const { user } = useAuthStore();
  const role = String(
    user?.accessRole || user?.role || user?.roles?.[0] || "employee",
  ).toLowerCase();
  const portal =
    role === "intern"
      ? "intern"
      : role === "consultant"
        ? "consultant"
        : role === "finance"
          ? "finance"
          : role === "team_lead"
            ? "team-lead"
            : ["manager", "department_head"].includes(role)
              ? "manager"
              : role === "employee"
                ? "employee"
                : null;
  const portalModules: Record<string, Array<[string, string]>> = {
    employee: [
      ["Dashboard", "dashboard"],
      ["My Lifecycle", "lifecycle"],
      ["Org Structure", "org-chart"],
      ["ID Card", "id-card"],
      ["Face Punch", "face-attendance"],
      ["Attendance Logs", "attendance"],
      ["Attendance Correction", "attendance-regularization"],
      ["My Shifts", "shift-roster"],
      ["My Leaves", "leaves"],
      ["Holiday Calendar", "holiday-calendar"],
      ["My Payslips", "payslips"],
      ["Salary Revisions", "salary-revisions"],
      ["My Exit Settlement", "my-settlement"],
      ["Loan Request", "loans"],
      ["My Expenses", "my-expenses"],
      ["Travel Requests", "travel-requests"],
      ["Travel Advances", "travel-advances"],
      ["Mileage Claims", "mileage-claims"],
      ["My Learning Hub", "lms/my-learning"],
      ["Course Catalog", "lms/catalog"],
      ["My Certificates", "lms/certificates"],
      ["Performance Reviews", "performance"],
      ["Goals Checklist", "goals"],
      ["Feedback Hub", "feedback"],
      ["Training Workshops", "training"],
      ["Company Policies", "policies"],
      ["Announcements", "announcements"],
      ["Feedback Surveys", "surveys"],
      ["Health & Wellness", "health-wellness"],
      ["Assigned Assets", "assets"],
      ["My Documents", "documents"],
      ["Internal Job Openings", "job-openings"],
      ["Employee Referrals", "referrals"],
      ["Helpdesk Tickets", "helpdesk"],
      ["AI HR Assistant", "ai-assistant"],
      ["My Approvals", "approvals"],
      ["Settings & Security", "settings"],
    ],

    intern: [
      ["Dashboard", "dashboard"],
      ["My Lifecycle", "lifecycle"],
      ["Org Structure", "org-chart"],
      ["ID Card", "id-card"],
      ["Face Punch", "face-attendance"],
      ["My Attendance Log", "attendance"],
      ["My Shifts", "shift-roster"],
      ["Attendance Correction", "attendance-regularization"],
      ["My Leaves", "leaves"],
      ["My Payslips", "payslips"],
      ["My Documents", "documents"],
      ["Announcements", "announcements"],
    ],

    consultant: [
      ["Dashboard", "dashboard"],
      ["My Lifecycle", "lifecycle"],
      ["Org Structure", "org-chart"],
      ["ID Card", "id-card"],
      ["Face Punch", "face-attendance"],
      ["My Attendance Log", "attendance"],
      ["My Shifts", "shift-roster"],
      ["Attendance Correction", "attendance-regularization"],
      ["My Leaves", "leaves"],
      ["Expense Claims", "expenses"],
      ["Travel Requests", "travel"],
      ["My Payslips", "payslips"],
      ["My Documents", "documents"],
      ["Announcements", "announcements"],
    ],

    finance: [
      ["Dashboard", "dashboard"],
      ["Finance Verification", "expenses/verification"],
      ["Payment Cycle Reports", "expenses/reimbursements"],
      ["Travel Advances", "expenses/travel-advances"],
      ["Expense Approvals", "expenses/approvals"],
      ["Expense Reports", "expenses/reports"],
      ["My Lifecycle", "lifecycle"],
      ["Org Structure", "org-chart"],
      ["ID Card", "id-card"],
      ["Face Punch", "face-punch"],
      ["My Attendance Log", "attendance"],
      ["My Shifts", "shift-roster"],
      ["Attendance Correction", "attendance-regularization"],
      ["Financial Reports", "reports"],
      ["Approval Inbox", "approvals"],
      ["My Leaves", "leaves"],
      ["My Payslips", "payslips"],
      ["Holiday Calendar", "holiday-calendar"],
      ["Announcements", "announcements"],
    ],

    manager: [
      ["Dashboard", "dashboard"],
      ["My Department", "team"],
      ["My Lifecycle", "lifecycle"],
      ["Org Structure", "org-chart"],
      ["ID Card", "id-card"],
      ["My Leaves", "leaves"],
      ["Leave Approvals", "leaves/approvals"],
      ["Approvals Dashboard", "leaves/approvals-dashboard"],
      ["Attendance", "attendance"],
      ["Face Attendance", "face-attendance"],
      ["My Attendance Log", "attendance-log"],
      ["My Shift", "my-shift"],
      ["Attendance Correction", "attendance-correction"],
      ["Payroll", "payroll"],
      ["My Payslips", "payslips"],
      ["Team Exit Settlements", "settlements"],
      ["Loan Request", "loans"],
      ["Expense Approvals", "expenses/approvals"],
      ["My Expenses", "expenses/my-expenses"],
      ["Travel Requests", "expenses/travel-requests"],
      ["Travel Advances", "expenses/travel-advances"],
      ["Mileage Claims", "expenses/mileage-claims"],
      ["Performance", "performance"],
      ["Reviews", "performance/reviews"],
      ["Goals", "performance/goals"],
      ["MRF Request", "mrf-request"],
      ["IJP Approvals", "ijp-approvals"],
      ["Interview Schedule", "interview-schedule"],
      ["My Approvals", "approvals"],
      ["Company Policies", "policies"],
    ],
    "team-lead": [
      ["Dashboard", "dashboard"],
      ["My Team", "members"],
      ["My Lifecycle", "lifecycle"],
      ["Org Structure", "org-chart"],
      ["ID Card", "id-card"],
      ["My Leaves", "leaves"],
      ["Leave Approvals", "leaves/approvals"],
      ["Approvals Dashboard", "leaves/approvals-dashboard"],
      ["Attendance", "attendance"],
      ["Face Attendance", "face-attendance"],
      ["My Attendance Log", "attendance-log"],
      ["My Shift", "my-shift"],
      ["Attendance Correction", "attendance-correction"],
      ["Payroll", "payroll"],
      ["My Payslips", "payslips"],
      ["Team Exit Clearances", "settlements"],
      ["Loan Request", "loans"],
      ["Expense Approvals", "expenses/approvals"],
      ["My Expenses", "expenses/my-expenses"],
      ["Travel Requests", "expenses/travel-requests"],
      ["Travel Advances", "expenses/travel-advances"],
      ["Mileage Claims", "expenses/mileage-claims"],
      ["Performance", "performance"],
      ["Reviews", "performance/reviews"],
      ["Goals", "performance/goals"],
      ["MRF Request", "mrf-request"],
      ["Interview Schedule", "interview-schedule"],
      ["My Approvals", "approvals"],
      ["Company Policies", "policies"],
    ],
  };
  const adminRoleSearchData: SearchResult[] = getVisibleSections(
    user?.roles || (role ? [role] : []),
  )
    .flatMap((section) =>
      section.items.flatMap((item) => [item, ...(item.children || [])]),
    )
    .map((item, index) => ({
      id: `nav-${index}-${item.href}`,
      title: item.name,
      description: `${item.name} · ${item.href}`,
      category: "employees",
      icon: <Search className="h-4 w-4" />,
      href: item.href,
    }));
  const roleSearchData: SearchResult[] =
    portal && portalModules[portal]
      ? portalModules[portal].map(([title, path], index) => ({
          id: `${portal}-${index}`,
          title,
          description: `${title} in your portal`,
          category: "employees",
          icon: <Search className="h-4 w-4" />,
          href: `/${portal}/${path}`,
        }))
      : adminRoleSearchData;
  const inlineResults = roleSearchData
    .filter(
      (item) =>
        item.title.toLowerCase().includes(inlineQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(inlineQuery.toLowerCase()),
    )
    .slice(0, 6);
  return (
    <div className={cn(
      "relative",
      mobileExpanded
        ? "fixed inset-x-3 top-2 z-[70] sm:static sm:z-auto sm:w-[min(16rem,calc(100vw-2rem))]"
        : "w-9 sm:w-[min(16rem,calc(100vw-2rem))]"
    )}>
      {!mobileExpanded && (
        <button
          type="button"
          onClick={() => setMobileExpanded(true)}
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted sm:hidden"
          aria-label="Open search"
        >
          <Search className="size-4" />
        </button>
      )}
      {mobileExpanded && (
        <button
          type="button"
          className="fixed inset-0 -z-10 bg-black/30 sm:hidden"
          onClick={() => { setMobileExpanded(false); setInlineOpen(false); }}
          aria-label="Close search"
        />
      )}
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={inlineQuery}
        onFocus={() => setInlineOpen(true)}
        onChange={(event) => {
          setInlineQuery(event.target.value);
          setInlineOpen(true);
        }}
        placeholder="Search modules..."
        autoFocus={mobileExpanded}
        className={cn(
          "h-9 w-full border-border bg-card pl-9 pr-9 text-sm sm:bg-muted/50 sm:pr-3",
          !mobileExpanded && "hidden sm:block"
        )}
      />
      {mobileExpanded && (
        <button
          type="button"
          onClick={() => { setMobileExpanded(false); setInlineOpen(false); setInlineQuery(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground sm:hidden"
          aria-label="Close search"
        >
          <X className="size-4" />
        </button>
      )}
      {inlineOpen && inlineQuery && (
        <div className="absolute right-0 top-10 z-50 w-full overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
          {inlineResults.length ? (
            inlineResults.map((item) => (
              <button
                key={item.id}
                onMouseDown={() => {
                  inlineNavigate(item.href);
                  setInlineQuery("");
                  setInlineOpen(false);
                  setMobileExpanded(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
              >
                <span className="text-primary">{item.icon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No matching modules.
            </p>
          )}
        </div>
      )}
    </div>
  );
  /* legacy command-palette trigger retained below for reference
  return (
    <button
      onClick={() => {
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }}
      className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground text-sm transition-colors w-full md:w-64"
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Search...</span>
      <span className="ml-auto text-xs opacity-50">⌘K</span>
    </button>
  ); */
}

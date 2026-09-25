import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBulkUploadEmployees, useEmployees } from "../hooks/useEmployees";
import { useDepartments } from "../../settings/hooks/useDepartments";
import { useDesignations } from "../../settings/hooks/useDesignations";
import { useGrades } from "../../settings/hooks/useGrades";
import { useLocations } from "../../settings/hooks/useLocations";
import { useEmployeeTypes } from "../../settings/hooks/useEmployeeTypes";
import {
  AlertCircle,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { read, utils, writeFile } from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useCompanyStore } from "@/features/settings/store/companyStore";
import { useCompanies } from "@/features/settings/hooks/useCompanies";

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  index: number;
  data: any;
  errors: string[];
  isValid: boolean;
}

export function BulkUploadModal({
  open,
  onOpenChange,
  onSuccess,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { bulkUploadEmployees, isLoading } = useBulkUploadEmployees();
  const { selectedCompanyId, selectedCompanyName, setSelectedCompany } =
    useCompanyStore();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: departmentsData } = useDepartments(1, 100);
  const { designations } = useDesignations();
  const { data: gradesData } = useGrades(1, 100);
  const { data: locationsData } = useLocations(1, 100);
  const { employeeTypes } = useEmployeeTypes();
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });
  const { data: roles = [] } = useQuery({
    queryKey: ["rbac-roles"],
    queryFn: async () => {
      const response = await apiClient.get("/rbac/roles");
      const data =
        response.data?.data?.items ||
        response.data?.data ||
        response.data ||
        [];
      return Array.isArray(data) ? data : [];
    },
    enabled: open,
  });

  const activeCompany = companies.find(
    (company) => company.id === selectedCompanyId,
  );
  const activeCompanyName = selectedCompanyName || activeCompany?.name || "";

  React.useEffect(() => {
    if (!open || selectedCompanyId || companies.length === 0) return;
    const parentCompany =
      companies.find((company) => company.isParent) || companies[0];
    setSelectedCompany(parentCompany.id, parentCompany.name);
  }, [open, selectedCompanyId, companies, setSelectedCompany]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // The workbook contains no seeded records: master values are read live from
  // the organization so it is safe to use as the actual import sheet.
  const handleDownloadSampleTemplate = () => {
    try {
      const columns = [
        "Employee Code (Optional)",
        "First Name",
        "Middle Name",
        "Last Name",
        "Email Address",
        "Mobile Number",
        "Date of Birth",
        "Gender",
        "Marital Status",
        "Date of Joining",
        "Employment Type",
        "Department Name",
        "Grade",
        "Job Title",
        "Designation",
        "Location",
        "Reports To (Manager Email / Code)",
        "Access Role",
        "Status",
        "Password",
        "Confirm Password",
      ];
      const worksheet = utils.aoa_to_sheet([columns]);
      const referenceData = [
        ["Field", "Available values"],
        [
          "Departments",
          ...(departmentsData?.data || []).map((item: any) => item.name),
        ],
        ["Designations", ...designations.map((item: any) => item.name)],
        ["Grades", ...(gradesData?.data || []).map((item: any) => item.name)],
        [
          "Locations",
          ...(locationsData?.data || locationsData?.items || []).map(
            (item: any) => item.name || item.location_name,
          ),
        ],
        ["Employment Types", ...employeeTypes.map((item: any) => item.name)],
        ["Access Roles", ...roles.map((item: any) => item.name || item.code)],
        [
          "Managers (email)",
          ...(allEmployees || [])
            .filter((item: any) =>
              [
                "team_lead",
                "hr_manager",
                "department_head",
                "organization_admin",
              ].includes(item.accessRole || item.access_role),
            )
            .map((item: any) => item.email),
        ],
      ];
      const referenceSheet = utils.aoa_to_sheet(referenceData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "employee_data");
      utils.book_append_sheet(workbook, referenceSheet, "reference_data");
      writeFile(workbook, "employee_data.xlsx");
      toast.success("Employee import workbook downloaded.");
    } catch (err) {
      console.error("Failed to generate sample Excel:", err);
      toast.error("Failed to download template.");
    }
  };

  const formatDateToYYYYMMDD = (dateVal: any) => {
    if (!dateVal) return "";
    const dateStr = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);

      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        if (year < 100) {
          year += 2000;
        }
        if (month > 12 && day <= 12) {
          const temp = day;
          day = month;
          month = temp;
        }
      }

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
    }
    return "";
  };

  const parseSheet = (sheet: any) => {
    const rawRows = utils.sheet_to_json(sheet, {
      raw: false,
      dateNF: "yyyy-mm-dd",
      defval: "",
    }) as Record<string, any>[];
    if (rawRows.length === 0) {
      toast.error("The selected file is empty or has no readable rows.");
      return;
    }

    const parsed: ParsedRow[] = [];

    const normalizeHeaderKey = (h: string) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lower.includes("employeecode") || lower === "code")
        return "employeeCode";
      if (lower.includes("firstname") || lower === "first") return "firstName";
      if (lower.includes("lastname") || lower === "last") return "lastName";
      if (lower.includes("middlename")) return "middleName";
      if (lower.includes("report") || lower.includes("manager"))
        return "reportsToInput";
      if (lower.includes("email")) return "email";
      if (lower.includes("phone") || lower.includes("mobile")) return "mobile";
      if (lower.includes("birth") || lower.includes("dob"))
        return "dateOfBirth";
      if (lower.includes("gender")) return "gender";
      if (lower.includes("marital")) return "maritalStatus";
      if (lower === "status" || lower.includes("employeestatus"))
        return "status";
      if (lower.includes("joining") || lower.includes("doj"))
        return "dateOfJoining";
      if (lower.includes("employmenttype")) return "employmentType";
      if (lower.includes("department")) return "departmentInput";
      if (lower.includes("grade")) return "gradeInput";
      if (lower.includes("location") || lower.includes("branch"))
        return "locationInput";
      if (lower.includes("designation")) return "designationInput";
      if (lower.includes("title") || lower.includes("job")) return "jobTitle";
      if (lower.includes("role") || lower.includes("access"))
        return "accessRole";
      if (lower.includes("confirmpassword")) return "confirmPassword";
      if (lower.includes("password")) return "password";
      return h;
    };

    rawRows.forEach((rowObj: Record<string, any>, index: number) => {
      const rowData: Record<string, any> = {};

      // Map raw object keys to normalized keys
      Object.keys(rowObj).forEach((rawKey) => {
        const normKey = normalizeHeaderKey(rawKey);
        const val =
          rowObj[rawKey] !== undefined ? String(rowObj[rawKey]).trim() : "";
        if (val) {
          rowData[normKey] = val;
        }
      });

      // Skip completely empty rows
      if (Object.keys(rowData).length === 0) return;

      // Normalize gender and employmentType
      if (rowData.gender) {
        rowData.gender = rowData.gender.toLowerCase();
      }
      if (rowData.maritalStatus) {
        rowData.maritalStatus = rowData.maritalStatus.toLowerCase();
      }
      if (rowData.employmentType) {
        const etInput = rowData.employmentType
          .toLowerCase()
          .replace(/[- ]/g, "_");
        if (etInput.includes("full")) rowData.employmentType = "full_time";
        else if (etInput.includes("part")) rowData.employmentType = "part_time";
        else if (etInput.includes("contract"))
          rowData.employmentType = "contract";
        else if (etInput.includes("intern"))
          rowData.employmentType = "internship";
        else rowData.employmentType = "full_time";
      } else {
        rowData.employmentType = "full_time";
      }

      // Normalize Access Role
      let normalizedRole = "employee";

      if (rowData.accessRole) {
        const rLower = rowData.accessRole.toLowerCase().trim();

        if (rLower.includes("hr")) {
          normalizedRole = "hr_manager";
        } else if (rLower.includes("finance")) {
          normalizedRole = "finance";
        } else if (
          rLower.includes("department head") ||
          rLower.includes("department_head")
        ) {
          normalizedRole = "department_head";
        } else if (rLower === "manager" || rLower.includes("manager")) {
          normalizedRole = "department_head";
        } else if (
          rLower.includes("team lead") ||
          rLower.includes("team_lead") ||
          rLower.includes("lead")
        ) {
          normalizedRole = "team_lead";
        } else if (rLower.includes("intern")) {
          normalizedRole = "intern";
        } else if (rLower.includes("consultant")) {
          normalizedRole = "consultant";
        }
      }

      rowData.accessRole = normalizedRole;

      // Format Dates
      if (rowData.dateOfJoining) {
        rowData.dateOfJoining = formatDateToYYYYMMDD(rowData.dateOfJoining);
      }

      if (rowData.dateOfBirth) {
        rowData.dateOfBirth = formatDateToYYYYMMDD(rowData.dateOfBirth);
      }

      // Dynamic Resolution 1: Department Name or ID -> Department ID
      let resolvedDepartmentId: number | null = null;
      let resolvedDepartmentName = "";
      if (rowData.departmentInput) {
        const dInput = String(rowData.departmentInput).trim();
        const depts = departmentsData?.data || [];

        // Check if dInput is numeric ID
        const byId = depts.find((d: any) => String(d.id) === dInput);
        if (byId) {
          resolvedDepartmentId = byId.id;
          resolvedDepartmentName = byId.name;
        } else {
          // Check by Department Name match
          const byName = depts.find(
            (d: any) => d.name.toLowerCase() === dInput.toLowerCase(),
          );
          if (byName) {
            resolvedDepartmentId = byName.id;
            resolvedDepartmentName = byName.name;
          }
        }
      }
      rowData.departmentId = resolvedDepartmentId;
      rowData.departmentName =
        resolvedDepartmentName || rowData.departmentInput || "";

      // Dynamic Resolution 2: Reports To (Manager Email, Code, Name, or ID) -> Reporting Manager ID
      let resolvedManagerId: number | null = null;
      let resolvedManagerName = "";
      if (rowData.reportsToInput) {
        const mInput = String(rowData.reportsToInput).trim().toLowerCase();
        const emps = allEmployees || [];

        const byId = emps.find((e: any) => String(e.id) === mInput);
        const byCode = emps.find(
          (e: any) => e.employeeCode?.toLowerCase() === mInput,
        );
        const byEmail = emps.find(
          (e: any) => e.email?.toLowerCase() === mInput,
        );
        const byName = emps.find(
          (e: any) => `${e.firstName} ${e.lastName}`.toLowerCase() === mInput,
        );

        const matchedMgr = byId || byCode || byEmail || byName;
        if (matchedMgr) {
          resolvedManagerId = matchedMgr.id;
          resolvedManagerName = `${matchedMgr.firstName} ${matchedMgr.lastName}`;
        }
      }
      rowData.reportingManagerId = resolvedManagerId;
      rowData.reportingManagerName =
        resolvedManagerName || rowData.reportsToInput || "";

      const masterMatch = (items: any[], value: string) =>
        items.find(
          (item: any) =>
            String(item.id) === value ||
            String(item.name || item.location_name || "").toLowerCase() ===
              value.toLowerCase(),
        );
      const designation = rowData.designationInput
        ? masterMatch(designations, String(rowData.designationInput))
        : null;
      rowData.designationId = designation?.id || null;
      const grade = rowData.gradeInput
        ? masterMatch(gradesData?.data || [], String(rowData.gradeInput))
        : null;
      rowData.gradeId = grade?.id || null;
      const location = rowData.locationInput
        ? masterMatch(
            locationsData?.data || locationsData?.items || [],
            String(rowData.locationInput),
          )
        : null;
      rowData.locationId = location?.id || null;

      if (rowData.password && !rowData.confirmPassword) {
        rowData.confirmPassword = rowData.password;
      }

      // Validations
      const errors: string[] = [];
      if (!rowData.firstName) errors.push("First Name is required");
      if (!rowData.lastName) errors.push("Last Name is required");

      if (
        rowData.employeeCode &&
        !/^[a-zA-Z0-9]+$/.test(rowData.employeeCode)
      ) {
        errors.push(
          "Employee Code must contain letters and numbers only (or leave it blank to auto-generate)",
        );
      }

      if (!rowData.email) {
        errors.push("Email is required");
      } else if (!/\S+@\S+\.\S+/.test(rowData.email)) {
        errors.push("Invalid email format");
      }

      if (!rowData.dateOfJoining) {
        errors.push("Date of Joining is required");
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rowData.dateOfJoining)) {
        errors.push("Invalid Date of Joining format (expected YYYY-MM-DD)");
      }

      if (!rowData.designationId)
        errors.push("A valid Designation is required");

      if (!rowData.jobTitle?.trim()) errors.push("Job Title is required");
      if (rowData.mobile && !/^\d{10}$/.test(rowData.mobile)) {
        errors.push("Mobile Number must be exactly 10 digits");
      }
      if (
        rowData.gender &&
        !["male", "female", "other"].includes(rowData.gender)
      ) {
        errors.push("Gender must be Male, Female, or Other");
      }
      if (
        rowData.maritalStatus &&
        !["single", "married", "divorced", "widowed"].includes(
          rowData.maritalStatus.toLowerCase(),
        )
      ) {
        errors.push(
          "Marital Status must be Single, Married, Divorced, or Widowed",
        );
      }
      if (
        rowData.dateOfBirth &&
        (Number.isNaN(new Date(rowData.dateOfBirth).getTime()) ||
          new Date(rowData.dateOfBirth) >= new Date())
      ) {
        errors.push(
          "Date of Birth must be a valid past date in YYYY-MM-DD format",
        );
      }
      if (rowData.departmentInput && !rowData.departmentId) {
        errors.push("Department does not match a configured department");
      }
      if (rowData.gradeInput && !rowData.gradeId) {
        errors.push("Grade does not match a configured grade");
      }
      if (rowData.locationInput && !rowData.locationId) {
        errors.push("Location does not match a configured location");
      }
      if (rowData.reportsToInput && !rowData.reportingManagerId) {
        errors.push(
          "Reports To does not match an existing employee's email, code, name, or ID",
        );
      }

      if (!rowData.password) errors.push("Password is required");

      if (rowData.password && rowData.password.length < 6) {
        errors.push("Password must be at least 6 characters long");
      }

      if (rowData.password !== rowData.confirmPassword) {
        errors.push("Passwords do not match");
      }

      parsed.push({
        index: index + 1,
        data: rowData,
        errors,
        isValid: errors.length === 0,
      });
    });

    const seenCodes = new Set<string>();
    parsed.forEach((row) => {
      const code = String(row.data.employeeCode || "").toLowerCase();
      if (code && seenCodes.has(code)) {
        row.errors.push("Employee Code is duplicated in this upload file");
        row.isValid = false;
      }
      if (code) seenCodes.add(code);
    });

    setParsedRows(parsed);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      const isExcelOrCsv =
        selectedFile.name.endsWith(".csv") ||
        selectedFile.name.endsWith(".xlsx") ||
        selectedFile.name.endsWith(".xls");
      if (isExcelOrCsv) {
        setFile(selectedFile);
        readFile(selectedFile);
      } else {
        toast.error("Please upload a valid CSV or Excel file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      readFile(selectedFile);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        parseSheet(sheet);
      } catch (err) {
        console.error("Failed to parse file:", err);
        toast.error(
          "Failed to parse the file structure. Please ensure it is a valid Excel or CSV.",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearFile = () => {
    setFile(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!selectedCompanyId) {
      toast.error(
        "Select a company before importing employees. Each imported employee must belong to a company.",
      );
      return;
    }
    const validEmployees = parsedRows
      .filter((row) => row.isValid)
      .map((row) => ({
        sourceRow: row.index,
        employeeCode: row.data.employeeCode || undefined,
        firstName: row.data.firstName,
        lastName: row.data.lastName,
        middleName: row.data.middleName || null,
        email: row.data.email,
        phone: row.data.mobile || row.data.phone || null,
        mobile: row.data.mobile || row.data.phone || null,
        dateOfBirth: row.data.dateOfBirth || null,
        gender: row.data.gender || null,
        dateOfJoining: row.data.dateOfJoining,
        employmentType: row.data.employmentType || "full_time",
        departmentId: row.data.departmentId || null,
        department: row.data.departmentName || row.data.departmentInput || null,
        grade: row.data.gradeInput || null,
        gradeId: row.data.gradeId || null,
        locationId: row.data.locationId || null,
        reportingManagerId: row.data.reportingManagerId || null,
        reportsTo: row.data.reportsToInput || null,
        jobTitle: row.data.jobTitle || null,
        designationId: row.data.designationId || null,
        maritalStatus: row.data.maritalStatus || null,
        status: row.data.status || "active",
        accessRole: row.data.accessRole || "employee",
        password: row.data.password,
        confirmPassword: row.data.confirmPassword || row.data.password,
      }));

    if (validEmployees.length === 0) {
      toast.error("No valid employee records to import.");
      return;
    }

    try {
      const result: any = await bulkUploadEmployees(
        validEmployees,
        selectedCompanyId,
      );
      const summary = result?.data?.data || result?.data || result;
      if (summary?.failed) {
        const errorsByRow = new Map<number, string[]>();
        (summary.errors || []).forEach(
          (item: { row: number; error: string }) => {
            const existing = errorsByRow.get(item.row) || [];
            existing.push(`Server: ${item.error}`);
            errorsByRow.set(item.row, existing);
          },
        );
        setParsedRows((rows) =>
          rows.map((row) => {
            const serverErrors = errorsByRow.get(row.index) || [];
            return serverErrors.length
              ? {
                  ...row,
                  errors: [...row.errors, ...serverErrors],
                  isValid: false,
                }
              : row;
          }),
        );
        toast.error(
          `${summary.imported || 0} imported; ${summary.failed} failed. ${summary.errors?.[0]?.error || "Check duplicate or master values."}`,
        );
        return;
      }
      toast.success(
        `Successfully imported ${summary?.imported ?? validEmployees.length} employees!`,
      );
      clearFile();
      onSuccess();
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const message =
        errorData?.message ||
        err.response?.data?.message ||
        "Failed to import employees";
      const details =
        errorData?.details?.message ||
        (typeof errorData?.details === "string" ? errorData.details : "");
      const fullMessage = details ? `${message}: ${details}` : message;
      toast.error(fullMessage);
    }
  };

  const totalValid = parsedRows.filter((r) => r.isValid).length;
  const totalInvalid = parsedRows.length - totalValid;

  // Reference-guide categories, each keyed to a neutral chip style plus a
  // small theme-token dot so they stay legible in any palette/mode without
  // hardcoded hues.
  const referenceGroups: {
    key: string;
    label: string;
    dotClassName: string;
    items: string[];
    emptyLabel: string;
  }[] = [
    {
      key: "departments",
      label: "Departments",
      dotClassName: "bg-primary",
      items: (departmentsData?.data || []).map((d: any) => d.name),
      emptyLabel: "No departments configured",
    },
    {
      key: "designations",
      label: "Designations",
      dotClassName: "bg-secondary-foreground/60",
      items: (designations || []).map((d: any) => d.name),
      emptyLabel: "No designations configured",
    },
    {
      key: "employmentTypes",
      label: "Employment types",
      dotClassName: "bg-accent-foreground/60",
      items: employeeTypes.map((t: any) => t.name),
      emptyLabel: "No employment types configured",
    },
    {
      key: "roles",
      label: "Roles",
      dotClassName: "bg-muted-foreground",
      items: roles.map((r: any) => r.name || r.code),
      emptyLabel: "No roles configured",
    },
  ];

  const managerOptions = (allEmployees || [])
    .filter((e: any) =>
      [
        "team_lead",
        "hr_manager",
        "department_head",
        "organization_admin",
      ].includes(e.accessRole || e.access_role || ""),
    )
    .slice(0, 10);

  const tableColumns = [
    "Validation",
    "Code",
    "First name",
    "Middle name",
    "Last name",
    "Email",
    "Mobile",
    "DOB",
    "Gender",
    "Marital status",
    "Joining date",
    "Employment type",
    "Department",
    "Grade",
    "Job title",
    "Designation",
    "Location",
    "Reports to",
    "Access role",
    "Employee status",
    "Password",
    "Errors",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-0.5rem)] sm:w-[calc(100vw-2rem)] max-w-6xl h-[calc(100dvh-0.5rem)] sm:h-[calc(100dvh-2rem)] max-h-[900px] flex flex-col overflow-hidden bg-background p-3 sm:p-6">
        <DialogHeader className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3 shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              Bulk upload employees
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload a CSV or Excel sheet to add multiple employees at once.
              Department, designation, and manager fields are matched
              automatically.
            </DialogDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadSampleTemplate}
            className="w-full sm:w-auto gap-2 font-semibold"
          >
            <Download className="w-4 h-4" /> Download sample Excel
          </Button>
        </DialogHeader>

        {/* Upload Zone & Instructions Grid */}
        {!file ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 flex-1 min-h-0 overflow-y-auto pr-1">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`md:col-span-2 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 sm:p-10 cursor-pointer transition-colors duration-200 min-h-[220px] sm:min-h-[300px] ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />
              <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <p className="font-semibold text-lg mb-1 text-center text-foreground">
                Drag and drop your CSV or Excel file here
              </p>
              <p className="text-muted-foreground text-sm text-center">
                or click to browse from files
              </p>
              <p className="text-xs text-muted-foreground/70 mt-4 text-center">
                Only .csv, .xlsx, and .xls files are supported
              </p>
            </div>

            {/* Instruction Panel for Dropdowns & Mapping */}
            <div className="border border-border rounded-xl bg-muted/30 h-full flex flex-col overflow-hidden">
              <div className="p-4 pb-3 border-b border-border/70 shrink-0">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                  Data reference guide
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Dropdown values are matched automatically. Use these exact
                  values in your file's columns.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {referenceGroups.map((group) => (
                  <div key={group.key} className="space-y-1.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${group.dotClassName}`}
                      />
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5 pr-1">
                      {group.items.map((name: string, i: number) => (
                        <span
                          key={`${group.key}-${i}`}
                          className="text-xs bg-muted text-foreground font-medium px-2.5 py-1 rounded-md border border-border"
                        >
                          {name}
                        </span>
                      ))}
                      {group.items.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          {group.emptyLabel}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Reporting Managers */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Reporting managers (email / name)
                  </span>
                  <div className="flex flex-wrap gap-1.5 pr-1">
                    {managerOptions.map((e: any) => (
                      <span
                        key={e.id}
                        className="text-xs bg-muted text-foreground font-mono px-2.5 py-1 rounded-md border border-border truncate max-w-full"
                        title={`${e.firstName} ${e.lastName}`}
                      >
                        {e.firstName} {e.lastName} ({e.email})
                      </span>
                    ))}
                    {managerOptions.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        No managers configured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border/70 shrink-0 bg-muted/40">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Any value outside these lists will fail validation for that
                  row — copy the spelling exactly, including case.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-3 flex-1 min-h-0 overflow-hidden">
            {/* File Info Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/40 border border-border rounded-lg min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm max-w-[250px] truncate text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground sm:ml-auto">
                Company:{" "}
                <span className="font-semibold text-foreground">
                  {selectedCompanyName || "Not selected"}
                </span>
              </p>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Validation Stats Summary */}
            <div className="grid grid-cols-3 gap-2 min-w-0">
              <div className="border border-border rounded-lg p-2 sm:p-3 bg-card flex flex-col min-w-0">
                <span className="text-muted-foreground text-[10px] sm:text-xs font-medium truncate">
                  Total rows
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {parsedRows.length}
                </span>
              </div>
              <div className="border border-emerald-500/20 rounded-lg p-2 sm:p-3 bg-emerald-500/10 flex flex-col text-emerald-600 dark:text-emerald-400 min-w-0">
                <span className="text-[10px] sm:text-xs font-medium flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  Ready to import
                </span>
                <span className="text-lg sm:text-xl font-bold">
                  {totalValid}
                </span>
              </div>
              <div className="border border-destructive/20 rounded-lg p-2 sm:p-3 bg-destructive/10 flex flex-col text-destructive min-w-0">
                <span className="text-[10px] sm:text-xs font-medium flex items-center gap-1 truncate">
                  <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  Needs correction
                </span>
                <span className="text-lg sm:text-xl font-bold">
                  {totalInvalid}
                </span>
              </div>
            </div>

            <details className="rounded-lg border border-border bg-muted/30 p-2 sm:p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-semibold text-foreground mb-1.5">
                View import validation rules
              </summary>
              <p>
                Required: First name, last name, email, date of joining, job
                title, a valid designation, and password (minimum 6 characters).
                Optional employee code must be alphanumeric; leave it blank to
                auto-generate.
              </p>
              <p className="mt-1">
                Mobile must be 10 digits. Dates use YYYY-MM-DD. Department,
                grade, location, designation, and reports-to must match the live
                reference data when provided. Each error is shown in the final
                column for its row.
              </p>
            </details>

            {/* Preview Sheet Data */}
            <div className="min-h-0 overflow-auto overscroll-contain rounded-lg border border-border bg-card">
              <table className="min-w-[2500px] w-max text-sm text-left border-collapse">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    {tableColumns.map((col) => (
                      <th
                        key={col}
                        className="p-3 font-semibold border-b border-border text-foreground"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={`border-b border-border transition-colors ${
                        row.isValid
                          ? "hover:bg-muted/40"
                          : "bg-destructive/5 hover:bg-destructive/10"
                      }`}
                    >
                      <td className="p-3 font-medium">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">
                            <AlertCircle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-foreground">
                        {row.data.employeeCode || "-"}
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {row.data.firstName || "-"}
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.middleName || "-"}
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {row.data.lastName || "-"}
                      </td>
                      <td className="p-3 truncate max-w-[150px] text-foreground">
                        {row.data.email || "-"}
                      </td>
                      <td className="p-3 font-mono text-xs text-foreground">
                        {row.data.mobile || "-"}
                      </td>
                      <td className="p-3 whitespace-nowrap text-foreground">
                        {row.data.dateOfBirth || "-"}
                      </td>
                      <td className="p-3 capitalize text-foreground">
                        {row.data.gender || "-"}
                      </td>
                      <td className="p-3 capitalize text-foreground">
                        {row.data.maritalStatus || "-"}
                      </td>
                      <td className="p-3 whitespace-nowrap text-foreground">
                        {row.data.dateOfJoining || "-"}
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.employmentType || "-"}
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-foreground">
                          {row.data.departmentName ||
                            row.data.departmentInput ||
                            "-"}
                        </span>
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.gradeInput || "-"}
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.jobTitle || "-"}
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {row.data.designationInput || "-"}
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.locationInput || "-"}
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-foreground">
                          {row.data.reportingManagerName ||
                            row.data.reportsToInput ||
                            "-"}
                        </span>
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.accessRole || "-"}
                      </td>
                      <td className="p-3 capitalize text-foreground">
                        {row.data.status || "active"}
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.password ? "Provided" : "Missing"}
                      </td>
                      <td className="p-3 text-destructive text-xs max-w-[200px]">
                        {row.errors.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {row.errors.map((err, idx) => (
                              <span
                                key={idx}
                                className="flex items-center gap-1"
                              >
                                • {err}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            None
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1 bg-background">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={clearFile}
                disabled={isLoading}
              >
                Reset
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading || totalValid === 0}
                className="w-full sm:w-auto gap-2"
              >
                {isLoading ? "Importing..." : `Import ${totalValid} employees`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

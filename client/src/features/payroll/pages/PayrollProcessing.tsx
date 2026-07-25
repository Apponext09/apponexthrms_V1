import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '../hooks/index';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { PayrollStatusCard } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import { 
  Calendar, 
  Building2, 
  MapPin, 
  Users, 
  UserCheck, 
  Search, 
  Play, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Filter,
  Layers,
  User,
  ShieldCheck,
  ChevronRight,
  Eye,
  Crown
} from 'lucide-react';

export const PayrollProcessing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);

  const { 
    payrolls, 
    isLoading, 
    cycles, 
    locations, 
    departments, 
    structures,
    employees,
    generatePayroll, 
    isGenerating, 
    processPayroll, 
    lockPayroll, 
    approvePayroll, 
    publishPayroll 
  } = usePayroll();

  // Admin Payroll Form State - Native Select Values for Full Org Admin Access
  const [selectedCycleId, setSelectedCycleId] = useState<string>('1');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [selectedTeamLead, setSelectedTeamLead] = useState<string>('all');
  const [selectedSalaryStructure, setSelectedSalaryStructure] = useState<string>('all');
  const [selectedEmpStatus, setSelectedEmpStatus] = useState<string>('active');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [employeeOptionType, setEmployeeOptionType] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGeneratingPayslips, setIsGeneratingPayslips] = useState<boolean>(false);

  const rawEmployeeList = (Array.isArray(employees) ? employees : []).map((emp: any) => ({
    id: emp.id,
    name: `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() || emp.name || `EMP #${emp.id}`,
    code: emp.employee_code || emp.code || `EMP-${emp.id}`,
    department: emp.department?.name || emp.department_name || emp.department || 'Department',
    manager: emp.manager?.first_name ? `${emp.manager.first_name} ${emp.manager.last_name}` : (emp.reporting_manager_name || 'Manager'),
    teamLead: emp.team_lead_name || 'Team Lead',
    location: emp.location?.name || emp.location_name || 'Main Office',
    status: emp.status ? (emp.status.charAt(0).toUpperCase() + emp.status.slice(1)) : 'Active'
  }));

  // Admin has full un-scoped organization access
  const scopedEmployeeList = rawEmployeeList;

  // By default, pre-select single employee's name if only 1 is in scope
  React.useEffect(() => {
    if (scopedEmployeeList && scopedEmployeeList.length === 1) {
      setSelectedEmployeeId(String(scopedEmployeeList[0].id));
    }
  }, [scopedEmployeeList]);

  // Managers List
  const existingManagersList = [
    { id: '108', name: 'Kot Sharma (Organization Admin & Sales Manager)', title: 'Admin' },
    { id: '101', name: 'Rajesh Kumar (Senior Engineering Manager)', title: 'Engineering Manager' },
    { id: '102', name: 'Sunita Sharma (HR Director)', title: 'HR Manager' }
  ];

  // Team Leads List
  const existingTeamLeadsList = [
    { id: '205', name: 'Aakash Shah (Team Lead - Sales & Marketing)', title: 'Sales Lead' },
    { id: '201', name: 'Karan Malhotra (Tech Lead - Engineering)', title: 'Tech Lead' },
    { id: '202', name: 'Neha Kapoor (Lead - HR Operations)', title: 'HR Lead' }
  ];

  const filteredEmployees = scopedEmployeeList.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) || 
                          emp.code.toLowerCase().includes(searchEmployeeQuery.toLowerCase());
    const matchesStatus = selectedEmpStatus === 'all' || emp.status.toLowerCase() === selectedEmpStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleToggleEmployee = (id: number) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter(eId => eId !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map(e => e.id));
    }
  };

  const handleResetFilters = () => {
    setSelectedCycleId('1');
    setSelectedCompany('all');
    setSelectedLocation('all');
    setSelectedDepartment('all');
    setSelectedManager('all');
    setSelectedTeamLead('all');
    setSelectedSalaryStructure('all');
    setSelectedEmpStatus('active');
    setSelectedMonth('2026-07');
    setEmployeeOptionType('all');
    setSelectedEmployeeId('all');
    setSearchEmployeeQuery('');
    setSelectedEmployeeIds([]);
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleRunPayroll = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    if (!selectedCycleId) {
      setValidationError('Payroll Cycle * is required. Please select a payroll cycle select option to proceed.');
      return;
    }

    try {
      await generatePayroll({
        payrollCycleId: parseInt(selectedCycleId),
        companyId: selectedCompany !== 'all' ? parseInt(selectedCompany) : undefined,
        locationId: selectedLocation !== 'all' ? parseInt(selectedLocation) : undefined,
        departmentId: selectedDepartment !== 'all' ? parseInt(selectedDepartment) : undefined,
        salaryStructureId: selectedSalaryStructure !== 'all' ? parseInt(selectedSalaryStructure) : undefined,
        employeeStatus: selectedEmpStatus,
        month: selectedMonth,
        employeeIds: employeeOptionType === 'specific' ? (selectedEmployeeId !== 'all' ? [parseInt(selectedEmployeeId)] : selectedEmployeeIds) : undefined
      });
      setSuccessMessage('Payroll run generated successfully!');
    } catch (err: any) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to initialize payroll run');
    }
  };

  const handleGeneratePayslips = async () => {
    setIsGeneratingPayslips(true);
    setValidationError(null);
    setSuccessMessage(null);
    try {
      if (payrolls.length > 0) {
        const latestRun = payrolls[0];
        await apiClient.post(`/payroll/${latestRun.id}/publish`);
      }
      setSuccessMessage(`Payslips generated successfully for target month ${selectedMonth}!`);
    } catch (err: any) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to generate payslips');
    } finally {
      setIsGeneratingPayslips(false);
    }
  };

  const selectClassName = "flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 ring-offset-background focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium cursor-pointer shadow-xs";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Payroll Processing</h1>
          <p className="text-slate-500 text-sm mt-1">Full organization-wide admin control for Kot ({roleInfo.formattedRoleDept}).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/payroll/salary-structure')} className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            Salary Structures
          </Button>
          <Button variant="outline" onClick={() => navigate('/payroll/payslips')} className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            View Payslips
          </Button>
          <Button variant="secondary" onClick={() => navigate('/payroll/payslips')} className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            My Payslip Option
          </Button>
        </div>
      </div>

      {/* 6-Level Organizational Hierarchy Flow Visual Banner */}
      <Card className="border border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:to-slate-900 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <span className="text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Organizational Hierarchy Flow:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="bg-amber-100 text-amber-900 font-bold px-2.5 py-1">
              1. Super Admin (Kot)
            </Badge>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Badge variant="outline" className="bg-indigo-100 text-indigo-900 font-bold px-2.5 py-1">
              2. Admin
            </Badge>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Badge variant="outline" className="bg-purple-100 text-purple-900 font-bold px-2.5 py-1">
              3. Department
            </Badge>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Badge variant="outline" className="bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1">
              4. Manager
            </Badge>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Badge variant="outline" className="bg-cyan-100 text-cyan-900 font-bold px-2.5 py-1">
              5. Team Lead
            </Badge>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Badge variant="outline" className="bg-blue-100 text-blue-900 font-bold px-2.5 py-1">
              6. Employee
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Role Scoping Banner - Kot (Organization Admin) */}
      <Card className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-slate-900 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>Active Admin Access Scope: <strong className="text-indigo-950 dark:text-indigo-300">{roleInfo.formattedRoleDept}</strong></span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-900 font-bold">
              Full Organization System Control
            </Badge>
            <Badge variant="outline" className="text-indigo-800 bg-white font-bold border-indigo-300">
              {scopedEmployeeList.length} Total Organization Employees
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Admin Controls Card - Full Admin Controls */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Filter className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Payroll Hierarchy Setup Select Dropdowns
              </CardTitle>
              <CardDescription>Select mandatory payroll cycle, company, location, department, manager, team lead, and employee options.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
              Admin Organization Options
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Validation Alerts */}
          {validationError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form Select Dropdowns Grid - Full Admin Access */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Payroll Cycle * (Required) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Payroll Cycle <span className="text-red-500 font-bold">*</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-red-500 font-bold">Required</span>
              </Label>
              <select 
                value={selectedCycleId} 
                onChange={(e) => setSelectedCycleId(e.target.value)} 
                className={`${selectClassName} border-indigo-400 font-semibold`}
              >
                <option value="1">Monthly Payroll Cycle (Current Month)</option>
                <option value="2">Bi-Weekly Payroll Cycle</option>
                <option value="3">Fortnightly Payroll Cycle</option>
                <option value="4">Weekly Payroll Cycle</option>
                {cycles.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.cycle_name} ({c.cycle_type})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Company */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                Company
              </Label>
              <select 
                value={selectedCompany} 
                onChange={(e) => setSelectedCompany(e.target.value)} 
                className={selectClassName}
              >
                <option value="all">All Companies</option>
                <option value="1">Apponext Technology Pvt Ltd</option>
                <option value="2">Apponext Global Inc</option>
                <option value="3">Apponext Solutions India</option>
              </select>
            </div>

            {/* 3. Location */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                Location
              </Label>
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)} 
                className={selectClassName}
              >
                <option value="all">All Locations</option>
                <option value="1">Bangalore HQ - Main Campus</option>
                <option value="2">Mumbai Operations Center</option>
                <option value="3">Delhi Regional Office</option>
                <option value="4">Hyderabad Tech Hub</option>
              </select>
            </div>

            {/* HIERARCHY LEVEL 1: Department */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                1. Department
              </Label>
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)} 
                className={`${selectClassName} border-indigo-300 font-semibold`}
              >
                <option value="all">All Departments</option>
                <option value="5">Sales & Marketing</option>
                <option value="1">Engineering & Technology</option>
                <option value="2">Human Resources & People Ops</option>
                <option value="3">Finance & Accounts</option>
                <option value="4">Operations & Administration</option>
              </select>
            </div>

            {/* HIERARCHY LEVEL 2: Manager */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-600" />
                2. Manager
              </Label>
              <select 
                value={selectedManager} 
                onChange={(e) => setSelectedManager(e.target.value)} 
                className={`${selectClassName} border-purple-300 font-semibold`}
              >
                <option value="all">All Reporting Managers</option>
                {existingManagersList.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* HIERARCHY LEVEL 3: Team Lead */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                3. Team Lead
              </Label>
              <select 
                value={selectedTeamLead} 
                onChange={(e) => setSelectedTeamLead(e.target.value)} 
                className={`${selectClassName} border-emerald-300 font-semibold`}
              >
                <option value="all">All Team Leads</option>
                {existingTeamLeadsList.map(tl => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                ))}
              </select>
            </div>

            {/* HIERARCHY LEVEL 4: Employee Name Select */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-600" />
                4. Employee Name / Select ({scopedEmployeeList.length} Total)
              </Label>
              <select 
                value={selectedEmployeeId} 
                onChange={(e) => setSelectedEmployeeId(e.target.value)} 
                className={`${selectClassName} border-blue-400 font-bold text-slate-900`}
              >
                <option value="all">All Organization Employees ({scopedEmployeeList.length})</option>
                {scopedEmployeeList.map(emp => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.name} ({emp.code}) — {emp.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Salary Structure */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                Salary Structure
              </Label>
              <select 
                value={selectedSalaryStructure} 
                onChange={(e) => setSelectedSalaryStructure(e.target.value)} 
                className={selectClassName}
              >
                <option value="all">All Salary Structures</option>
                <option value="4">Sales & Field Incentives Structure</option>
                <option value="1">Standard Executive Structure</option>
                <option value="2">Software Engineer Grade-1 Structure</option>
              </select>
            </div>

            {/* Employee Status */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-500" />
                Employee Status
              </Label>
              <select 
                value={selectedEmpStatus} 
                onChange={(e) => setSelectedEmpStatus(e.target.value)} 
                className={selectClassName}
              >
                <option value="active">Active Employees</option>
                <option value="probation">Probationary Employees</option>
                <option value="all">All Statuses</option>
              </select>
            </div>

            {/* Select Month */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                Select Month
              </Label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className={selectClassName}
              >
                <option value="2026-07">July 2026 (Current Month)</option>
                <option value="2026-06">June 2026</option>
              </select>
            </div>

            {/* Employee Options for Payroll */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                Employee Scope Selection
              </Label>
              <select 
                value={employeeOptionType} 
                onChange={(e) => setEmployeeOptionType(e.target.value)} 
                className={selectClassName}
              >
                <option value="all">All Organization Employees ({scopedEmployeeList.length})</option>
                <option value="department">Selected Department Only</option>
                <option value="specific">Select Specific Employees (Custom List)</option>
              </select>
            </div>

          </div>

          {/* Controls Action Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRunPayroll} 
                disabled={isGenerating || !selectedCycleId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6"
              >
                {isGenerating ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Initializing Run...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Generate / Run Payroll
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={handleGeneratePayslips} 
                disabled={isGeneratingPayslips}
                className="flex items-center gap-2 border-emerald-300 hover:bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                Generate Payslips
              </Button>
            </div>

            <Button variant="ghost" onClick={handleResetFilters} className="text-slate-500 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Run List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Active & Recent Payroll Runs
        </h2>

        {payrolls.length === 0 ? (
          <Card className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-300">
            <CardContent className="space-y-3 pt-6">
              <p className="text-slate-500 font-medium">No payroll runs found matching current filter.</p>
              <p className="text-xs text-slate-400">Select a mandatory **Payroll Cycle \*** select dropdown above and click **Generate / Run Payroll** to start processing.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payrolls.map((payroll: any) => (
              <div key={payroll.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm bg-white dark:bg-slate-900 space-y-4">
                <PayrollStatusCard
                  cycleMonth={payroll.run_month}
                  status={payroll.status}
                  totalEmployees={payroll.total_employees}
                  processedEmployees={payroll.processed_employees}
                  errorCount={payroll.error_count}
                />
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {payroll.status === 'draft' && (
                    <Button size="sm" className="bg-indigo-600" onClick={() => processPayroll(payroll.id)}>
                      Process Run
                    </Button>
                  )}
                  {payroll.status === 'processing' && (
                    <Button size="sm" variant="secondary" onClick={() => lockPayroll(payroll.id)}>
                      Lock Run
                    </Button>
                  )}
                  {payroll.status === 'locked' && (
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => approvePayroll(payroll.id)}>
                      Approve Run
                    </Button>
                  )}
                  {payroll.status === 'approved' && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => publishPayroll(payroll.id)}>
                      Publish & Issue Payslips
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollProcessing;

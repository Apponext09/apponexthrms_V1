import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X, Loader2, ArrowLeft, User } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { useEmployee, useUpdateEmployee, useEmployees } from '../hooks/useEmployees';
import {
  useEmployeePersonalInfo,
  useUpdatePersonalInfo,
  useEmployeeProfessionalInfo,
  useUpdateProfessionalInfo
} from '../hooks/useEmployeeProfile';
import { useDepartments } from '../../settings/hooks/useDepartments';

function formatInputDate(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = parseInt(id || '0', 10);
  const navigate = useNavigate();

  const { employee, isLoading: isEmployeeLoading } = useEmployee(employeeId);
  const { personalInfo, isLoading: isPersonalLoading } = useEmployeePersonalInfo(employeeId);
  const { professionalInfo, isLoading: isProfessionalLoading } = useEmployeeProfessionalInfo(employeeId);
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });
  const { data: departmentsData } = useDepartments(1, 100);

  const { updateEmployee } = useUpdateEmployee(employeeId);
  const { updatePersonalInfo } = useUpdatePersonalInfo(employeeId);
  const { updateProfessionalInfo } = useUpdateProfessionalInfo(employeeId);

  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [basicForm, setBasicForm] = useState<any>({});
  const [personalForm, setPersonalForm] = useState<any>({});
  const [professionalForm, setProfessionalForm] = useState<any>({});

  useEffect(() => {
    if (employee) {
      setBasicForm({
        ...employee,
        accessRole: employee.accessRole || (employee as any).user?.role?.code || 'employee',
      });
    }
  }, [employee]);

  useEffect(() => {
    if (personalInfo) setPersonalForm(personalInfo);
  }, [personalInfo]);

  useEffect(() => {
    if (professionalInfo) setProfessionalForm(professionalInfo);
  }, [professionalInfo]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formattedDob = basicForm.dateOfBirth ? formatInputDate(basicForm.dateOfBirth) : null;
      const formattedDoj = basicForm.dateOfJoining ? formatInputDate(basicForm.dateOfJoining) : undefined;

      // 1. Basic Info Payload
      const basicPayload = {
        firstName: basicForm.firstName,
        lastName: basicForm.lastName,
        middleName: basicForm.middleName || null,
        email: basicForm.email,
        mobile: basicForm.mobile || null,
        phone: basicForm.phone || null,
        dateOfBirth: formattedDob === '' ? null : formattedDob,
        gender: basicForm.gender || null,
        nationality: basicForm.nationality || null,
        bloodGroup: basicForm.bloodGroup || null,
        dateOfJoining: formattedDoj === '' ? undefined : formattedDoj,
        employmentType: basicForm.employmentType || 'full_time',
        departmentId: basicForm.currentDepartmentId ? Number(basicForm.currentDepartmentId) : null,
        reportingManagerId: basicForm.reportingManagerId ? Number(basicForm.reportingManagerId) : null,
        accessRole: basicForm.accessRole,
        bank_name: basicForm.bank_name || null,
        account_no: basicForm.account_no || null,
        ifsc_code: basicForm.ifsc_code || null,
        branch_name: basicForm.branch_name || null,
        account_type: basicForm.account_type || null,
        upi_id: basicForm.upi_id || null,
      };

      // 2. Personal Info Payload
      const personalPayload = {
        fatherName: personalForm.fatherName || null,
        motherName: personalForm.motherName || null,
        spouseName: personalForm.spouseName || null,
        childrenCount: personalForm.childrenCount !== undefined ? Number(personalForm.childrenCount) || 0 : 0,
        currentAddress: personalForm.currentAddress || null,
        permanentAddress: personalForm.permanentAddress || null,
        city: personalForm.city || null,
        state: personalForm.state || null,
        country: personalForm.country || null,
        postalCode: personalForm.postalCode || null,
      };

      // 3. Professional Info Payload
      const professionalPayload = {
        qualification: professionalForm.qualification || null,
        specialization: professionalForm.specialization || null,
        university: professionalForm.university || null,
        graduationYear: professionalForm.graduationYear ? Number(professionalForm.graduationYear) : null,
        yearsOfExperience: professionalForm.yearsOfExperience ? Number(professionalForm.yearsOfExperience) : 0,
        linkedinUrl: professionalForm.linkedinUrl || null,
        githubUrl: professionalForm.githubUrl || null,
      };

      // Execute updates concurrently
      await Promise.all([
        updateEmployee(basicPayload),
        updatePersonalInfo(personalPayload),
        updateProfessionalInfo(professionalPayload),
      ]);

      showToast.success('Employee details updated successfully');
      navigate(`/employees/${employeeId}`);
    } catch (err: any) {
      console.error(err);
      showToast.error(err.response?.data?.message || 'Failed to save employee details. Check URLs/Required fields.');
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isEmployeeLoading || isPersonalLoading || isProfessionalLoading;

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Loading employee edit form...</div>;
  }

  if (!employee) {
    return <div className="p-12 text-red-600 text-center font-semibold">Employee not found</div>;
  }

  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Edit Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/employees/${employeeId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              Edit Employee: {fullName}
            </h1>
            <p className="text-muted-foreground text-sm">Update basic, personal, and professional profile fields</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/employees/${employeeId}`)} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveAll}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[450px]">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="professional">Professional Info</TabsTrigger>
          </TabsList>

          {/* TAB 1: BASIC INFO */}
          <TabsContent value="basic" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Primary account and employment status details</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    required
                    value={basicForm.firstName || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, firstName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    required
                    value={basicForm.lastName || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, lastName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={basicForm.email || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    value={basicForm.mobile || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, mobile: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formatInputDate(basicForm.dateOfBirth)}
                    onChange={(e) => setBasicForm({ ...basicForm, dateOfBirth: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                    value={basicForm.gender || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, gender: e.target.value })}
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <select
                    id="nationality"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                    value={basicForm.nationality || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, nationality: e.target.value })}
                  >
                    <option value="">-- Select Nationality --</option>
                    <option value="Indian">Indian</option>
                    <option value="American">American</option>
                    <option value="British">British</option>
                    <option value="Canadian">Canadian</option>
                    <option value="Australian">Australian</option>
                    <option value="Singaporean">Singaporean</option>
                    <option value="German">German</option>
                    <option value="French">French</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <select
                    id="bloodGroup"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                    value={basicForm.bloodGroup || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, bloodGroup: e.target.value })}
                  >
                    <option value="">-- Select Blood Group --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                  <Input
                    id="dateOfJoining"
                    type="date"
                    required
                    value={formatInputDate(basicForm.dateOfJoining)}
                    onChange={(e) => setBasicForm({ ...basicForm, dateOfJoining: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <select
                    id="employmentType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                    value={basicForm.employmentType || 'full_time'}
                    onChange={(e) => setBasicForm({ ...basicForm, employmentType: e.target.value })}
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="accessRole">Access Role</Label>
                  <select
                    id="accessRole"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                    value={basicForm.accessRole || 'employee'}
                    onChange={(e) => setBasicForm({ ...basicForm, accessRole: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="department_head">Manager</option>
                    <option value="hr_manager">HR</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                    value={basicForm.currentDepartmentId || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, currentDepartmentId: e.target.value ? Number(e.target.value) : '' })}
                  >
                    <option value="">-- Select Department --</option>
                    {departmentsData?.data?.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="reportingManager">Reporting Manager</Label>
                  <select
                    id="reportingManager"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                    value={basicForm.reportingManagerId || ''}
                    onChange={(e) => setBasicForm({ ...basicForm, reportingManagerId: e.target.value ? Number(e.target.value) : '' })}
                  >
                    <option value="">-- No Manager --</option>
                    {allEmployees
                      .filter((emp: any) => emp.id !== employeeId)
                      .map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: PERSONAL INFO */}
          <TabsContent value="personal" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Family connections and address details</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="fatherName">Father's Name</Label>
                  <Input
                    id="fatherName"
                    value={personalForm.fatherName || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, fatherName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="motherName">Mother's Name</Label>
                  <Input
                    id="motherName"
                    value={personalForm.motherName || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, motherName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="spouseName">Spouse's Name</Label>
                  <Input
                    id="spouseName"
                    value={personalForm.spouseName || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, spouseName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="childrenCount">Children Count</Label>
                  <Input
                    id="childrenCount"
                    type="number"
                    value={personalForm.childrenCount ?? ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, childrenCount: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="currentAddress">Current Address</Label>
                  <Input
                    id="currentAddress"
                    value={personalForm.currentAddress || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, currentAddress: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="permanentAddress">Permanent Address</Label>
                  <Input
                    id="permanentAddress"
                    value={personalForm.permanentAddress || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, permanentAddress: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={personalForm.city || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={personalForm.state || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, state: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={personalForm.country || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, country: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={personalForm.postalCode || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, postalCode: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: PROFESSIONAL INFO */}
          <TabsContent value="professional" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>Academic and external profile references</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    value={professionalForm.qualification || ''}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, qualification: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={professionalForm.specialization || ''}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, specialization: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="university">University / Institute</Label>
                  <Input
                    id="university"
                    value={professionalForm.university || ''}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, university: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="graduationYear">Graduation Year</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    value={professionalForm.graduationYear ?? ''}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, graduationYear: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    value={professionalForm.yearsOfExperience ?? ''}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, yearsOfExperience: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    value={professionalForm.linkedinUrl || ''}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, linkedinUrl: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input
                    id="githubUrl"
                    value={professionalForm.githubUrl || ''}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, githubUrl: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}

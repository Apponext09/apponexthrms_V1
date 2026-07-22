import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mail, Phone, Briefcase, MapPin } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useEmployee } from '../hooks/useEmployees';
import { useEmployeeProfessionalInfo } from '../hooks/useEmployeeProfile';
import { EmployeeBasicInfo } from '../components/EmployeeBasicInfo';
import { EmployeePersonalInfo } from '../components/EmployeePersonalInfo';
import { EmployeeProfessionalInfo } from '../components/EmployeeProfessionalInfo';
import { EmployeeDocuments } from '../components/EmployeeDocuments';
import { EmployeeAssets } from '../components/EmployeeAssets';
import { EmployeeLifecycleTimeline } from '../components/EmployeeLifecycleTimeline';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  probation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  onboarding: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  notice: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  exit: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  alumni: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  candidate: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = parseInt(id || '0', 10);
  const { employee, isLoading } = useEmployee(employeeId);
  const { professionalInfo } = useEmployeeProfessionalInfo(employeeId);

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!employee || !employee.id) {
    return <div className="p-4 text-red-600">Employee not found</div>;
  }

  const fullName = [employee.firstName, employee.middleName, employee.lastName]
    .filter(Boolean)
    .join(' ');
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  const status = (employee.status || 'active').toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      {/* LinkedIn-style profile header — cover banner + centered photo */}
      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="flex flex-col items-center px-6 pb-6 -mt-14">
          <Avatar className="h-28 w-28 border-4 border-background shadow-md">
            <AvatarImage src={(employee as any).avatarUrl || undefined} alt={fullName} />
            <AvatarFallback className="text-2xl font-semibold bg-muted">
              {initials || '??'}
            </AvatarFallback>
          </Avatar>

          <div className="mt-3 flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">{fullName}</h1>
            {professionalInfo?.specialization && (
              <p className="text-muted-foreground">{professionalInfo.specialization}</p>
            )}
            <p className="text-sm text-muted-foreground">{employee.employeeCode}</p>

            <div className="mt-2">
              <Badge className={STATUS_STYLES[status] || STATUS_STYLES.active}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>

            {/* Contact row */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {employee.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {employee.email}
                </span>
              )}
              {(employee.mobile || employee.phone) && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  {employee.mobile || employee.phone}
                </span>
              )}
              {employee.employmentType && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  {employee.employmentType.replace(/_/g, ' ')}
                </span>
              )}
              {employee.nationality && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {employee.nationality}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <EmployeeBasicInfo employee={employee} />
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <EmployeePersonalInfo employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="professional" className="mt-4">
          <EmployeeProfessionalInfo employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <EmployeeDocuments employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <EmployeeAssets employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-4">
          <EmployeeLifecycleTimeline employeeId={employee.id as number} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

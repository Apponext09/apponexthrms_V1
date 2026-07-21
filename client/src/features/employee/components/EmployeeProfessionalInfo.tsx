import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface EmployeeProfessionalInfoProps {
  employeeId: number;
}

export function EmployeeProfessionalInfo({ employeeId }: EmployeeProfessionalInfoProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Professional Information</CardTitle>
          <CardDescription>Education, experience, and skills</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="w-4 h-4" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">
          Professional information details would be displayed here
        </div>
      </CardContent>
    </Card>
  );
}



import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface EmployeePersonalInfoProps {
  employeeId: number;
}

export function EmployeePersonalInfo({ employeeId }: EmployeePersonalInfoProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Family and address details</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="w-4 h-4" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">
          Personal information details would be displayed here
        </div>
      </CardContent>
    </Card>
  );
}



import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface EmployeeDocumentsProps {
  employeeId?: number;
}

export function EmployeeDocuments({ employeeId }: EmployeeDocumentsProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Employee documents and certifications</CardDescription>
        </div>
        <Button className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">
          Employee documents would be displayed here
        </div>
      </CardContent>
    </Card>
  );
}


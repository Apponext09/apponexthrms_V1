import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface EmployeeAssetsProps {
  employeeId?: number;
}

export function EmployeeAssets({ employeeId }: EmployeeAssetsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Allocated assets and equipment</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Allocate Asset
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">
          Employee assets would be displayed here
        </div>
      </CardContent>
    </Card>
  );
}


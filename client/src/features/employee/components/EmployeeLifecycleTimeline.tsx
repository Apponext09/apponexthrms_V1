import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmployeeLifecycleTimelineProps {
  employeeId: number;
}

export function EmployeeLifecycleTimeline({ employeeId }: EmployeeLifecycleTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifecycle Timeline</CardTitle>
        <CardDescription>Employee status transitions and important dates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Employee Status Changed</p>
              <p className="text-sm text-muted-foreground">Transitioned to Active status</p>
              <p className="text-xs text-muted-foreground mt-1">2 weeks ago</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



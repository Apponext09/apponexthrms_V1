import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Users2, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const structureItems = [
  {
    title: 'Departments',
    description: 'Manage organizational departments',
    icon: Users2,
    href: '/settings/departments',
  },
  {
    title: 'Branches',
    description: 'Manage office locations and branches',
    icon: Building2,
    href: '/settings/branches',
  },
  {
    title: 'Locations',
    description: 'Manage geographic locations',
    icon: MapPin,
    href: '/settings/locations',
  },
];

export function OrgStructurePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Organization Structure</h1>
        <p className="text-muted-foreground mt-1">Configure your organizational hierarchy and locations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structureItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="hover:shadow-soft-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {item.title}
                    </CardTitle>
                    <CardDescription className="mt-2">{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(item.href)}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  TrendingUp,
  Zap,
  Download,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const analyticsCards = [
  {
    title: 'Headcount Analysis',
    description: 'View employee headcount trends and forecasts',
    icon: Users,
    href: '#',
    comingSoon: true,
  },
  {
    title: 'Leave Analytics',
    description: 'Analyze leave patterns and trends',
    icon: Calendar,
    href: '#',
    comingSoon: true,
  },
  {
    title: 'Attendance Analytics',
    description: 'Track attendance metrics and patterns',
    icon: TrendingUp,
    href: '#',
    comingSoon: true,
  },
  {
    title: 'Performance Metrics',
    description: 'Review performance review analytics',
    icon: BarChart3,
    href: '/performance/analytics',
  },
  {
    title: 'Payroll Analytics',
    description: 'Analyze salary and compensation data',
    icon: BarChart3,
    href: '#',
    comingSoon: true,
  },
  {
    title: 'AI Insights (Premium)',
    description: 'Get AI-powered HR insights and recommendations',
    icon: Zap,
    href: '#',
    comingSoon: true,
    premium: true,
  },
];

export function AnalyticsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Access comprehensive HR analytics and reports for data-driven decisions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyticsCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="hover:shadow-soft-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{item.title}</CardTitle>
                      {item.premium && (
                        <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                          Premium
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-2">{item.description}</CardDescription>
                  </div>
                  <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={item.comingSoon}
                  onClick={() => !item.comingSoon && navigate(item.href)}
                >
                  {item.comingSoon ? 'Coming Soon' : 'View'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

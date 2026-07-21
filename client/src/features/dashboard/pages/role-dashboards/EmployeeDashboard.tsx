import { Users, Calendar, FileText, Clock, CheckCircle2, Gift, Megaphone, Cake } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

export function EmployeeDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome, Sarah</h1>
        <p className="text-muted-foreground mt-1">Here's your HR summary for today</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          label="Leave Balance"
          value="12"
          delta={-2}
          deltaLabel="days taken this year"
          variant="default"
        />
        <StatCard
          icon={Clock}
          label="Today's Status"
          value="Checked In"
          delta={0}
          deltaLabel="At 9:15 AM"
          variant="success"
        />
        <StatCard
          icon={FileText}
          label="Pending Documents"
          value="2"
          delta={1}
          deltaLabel="new this week"
          variant="warning"
        />
        <StatCard
          icon={Gift}
          label="Payslip Ready"
          value="March"
          delta={0}
          deltaLabel="Available for download"
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Calendar
              </CardTitle>
              <CardDescription>Your upcoming events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-border last:pb-0 last:border-0">
                  <div className="text-sm font-semibold text-primary min-w-16">10:00 AM</div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Team Standup</p>
                    <p className="text-sm text-muted-foreground">Conference Room A</p>
                  </div>
                  <Badge variant="secondary">Meeting</Badge>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-border last:pb-0 last:border-0">
                  <div className="text-sm font-semibold text-primary min-w-16">2:00 PM</div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">1-on-1 with Manager</p>
                    <p className="text-sm text-muted-foreground">Virtual</p>
                  </div>
                  <Badge variant="secondary">Meeting</Badge>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-sm font-semibold text-primary min-w-16">4:00 PM</div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Project Kickoff</p>
                    <p className="text-sm text-muted-foreground">Online</p>
                  </div>
                  <Badge variant="secondary">Meeting</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-accent" />
                Latest Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="font-semibold text-foreground">New Work from Home Policy</p>
                  <span className="text-xs text-muted-foreground">2 days ago</span>
                </div>
                <p className="text-sm text-muted-foreground">Updated guidelines for hybrid work are now available. Review the policy document in HR portal.</p>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="font-semibold text-foreground">Company Outing - April 15th</p>
                  <span className="text-xs text-muted-foreground">5 days ago</span>
                </div>
                <p className="text-sm text-muted-foreground">Team outing planned! Click to see details and register your attendance.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Holidays */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium text-foreground">Good Friday</p>
                  <p className="text-xs text-muted-foreground">April 7, 2024</p>
                </div>
                <Separator />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Eid ul-Fitr</p>
                  <p className="text-xs text-muted-foreground">April 10, 2024</p>
                </div>
                <Separator />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Summer Vacation</p>
                  <p className="text-xs text-muted-foreground">June 15 - July 5, 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Birthdays & Anniversaries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Birthdays & Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <Cake className="h-4 w-4 text-warning flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">John's Birthday</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <Gift className="h-4 w-4 text-accent flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Sarah (2 yrs anniversary)</p>
                  <p className="text-xs text-muted-foreground">Tomorrow</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Apply Leave
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Check Attendance
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                View My Documents
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

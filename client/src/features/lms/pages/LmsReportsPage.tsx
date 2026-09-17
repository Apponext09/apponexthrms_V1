import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  Search,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  Award,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useLmsEnrollments,
  useLmsCourses,
  useLmsAnalytics,
} from '../api/useLms';
import { toast } from 'sonner';

export function LmsReportsPage() {
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  const { data: analytics } = useLmsAnalytics();
  const { data: enrollments = [], isLoading } = useLmsEnrollments({
    courseId: selectedCourse,
    status: selectedStatus,
    search,
  });
  const { data: courses = [] } = useLmsCourses();

  const handleExportCSV = () => {
    if (enrollments.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = [
      'Enrollment ID',
      'Employee Code',
      'Employee Name',
      'Department',
      'Course Title',
      'Format',
      'Enrolled By',
      'Progress %',
      'Status',
      'Assessment Score %',
      'Enrolled Date',
      'Completed Date',
    ];

    const rows = enrollments.map((e) => [
      e.id,
      e.employeeCode || e.employee_code || '',
      `"${e.employeeName || e.employee_name || ''}"`,
      `"${e.departmentName || e.department_name || ''}"`,
      `"${e.courseTitle || e.course_title || ''}"`,
      e.courseType || e.course_type || 'self_paced',
      e.enrolledBy || e.enrolled_by || 'self',
      e.progressPct || e.progress_pct || 0,
      e.status,
      e.score !== null && e.score !== undefined ? `${e.score}%` : 'N/A',
      e.enrolledOn || e.enrolled_on || '',
      e.completedOn || e.completed_on || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LMS_Training_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('LMS Training Report exported to CSV');
  };

  const kpis = analytics?.kpis || {
    totalEnrollments: 0,
    completedEnrollments: 0,
    completionRate: 0,
    totalLearningHours: 0,
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Learning & Development Training Reports
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Export full employee learning transcripts, compliance audits, and course participation records.
          </p>
        </div>
        <Button onClick={handleExportCSV} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
          <Download className="w-4 h-4" /> Export Transcripts (CSV)
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">Total Enrollments</p>
          <h3 className="text-xl font-black text-foreground mt-1">{kpis.totalEnrollments}</h3>
        </Card>
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">Completions</p>
          <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{kpis.completedEnrollments}</h3>
        </Card>
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">Completion Rate</p>
          <h3 className="text-xl font-black text-primary mt-1">{kpis.completionRate}%</h3>
        </Card>
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">Learning Hours</p>
          <h3 className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{kpis.totalLearningHours} hrs</h3>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search learner or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-lg bg-background"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 text-xs rounded-lg border border-border bg-background px-3 font-semibold text-foreground focus:outline-hidden"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus || ''}
            onChange={(e) => setSelectedStatus(e.target.value || undefined)}
            className="h-9 text-xs rounded-lg border border-border bg-background px-3 font-semibold text-foreground focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="in_progress">In Progress</option>
            <option value="enrolled">Not Started</option>
          </select>
        </div>
      </div>

      {/* Report Table */}
      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Enrolled By</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Completed On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {enrollments.map((enr) => {
                  const progress = Number(enr.progressPct || enr.progress_pct || 0);
                  const isCompleted = enr.status === 'completed';

                  return (
                    <tr key={enr.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-foreground">{enr.employeeName || enr.employee_name}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {enr.employeeCode || enr.employee_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {enr.departmentName || enr.department_name || 'General'}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {enr.courseTitle || enr.course_title}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">
                        {enr.enrolledBy || enr.enrolled_by}
                      </td>
                      <td className="py-3 px-4 w-36">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold">{progress}%</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {enr.status?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {enr.score !== undefined && enr.score !== null ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{enr.score}%</span>
                        ) : (
                          <span className="text-muted-foreground font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {(enr.completedOn || enr.completed_on)
                          ? new Date((enr.completedOn || enr.completed_on)!).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

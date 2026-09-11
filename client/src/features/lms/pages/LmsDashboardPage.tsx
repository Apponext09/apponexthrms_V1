import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  ShieldCheck,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLmsAnalytics } from '../api/useLms';

export function LmsDashboardPage() {
  const navigate = useNavigate();
  const { data: analytics, isLoading } = useLmsAnalytics();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const kpis = analytics?.kpis || {
    totalCourses: 0,
    activeCourses: 0,
    totalEnrollments: 0,
    completedEnrollments: 0,
    completionRate: 0,
    totalLearningHours: 0,
    avgScore: 0,
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border/80 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                Learning & Development (LMS)
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  Enterprise
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage organization courses, employee skill development, batches, compliance, and certifications.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => navigate('/lms/courses')}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 shadow-sm rounded-lg"
          >
            <Plus className="w-4 h-4" /> Create Course
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/lms/enrollments')}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-lg border-border/80"
          >
            <Users className="w-4 h-4" /> Assign Learners
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/lms/reports')}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-lg border-border/80"
          >
            <TrendingUp className="w-4 h-4" /> Reports
          </Button>
        </div>
      </div>

      {/* ── Metric KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Courses */}
        <Card className="border border-border/80 rounded-xl shadow-2xs hover:shadow-sm transition-all bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Courses</p>
              <h3 className="text-2xl font-black text-foreground">{kpis.totalCourses}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {kpis.activeCourses} Active Published
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Enrollments */}
        <Card className="border border-border/80 rounded-xl shadow-2xs hover:shadow-sm transition-all bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Learners Enrolled</p>
              <h3 className="text-2xl font-black text-foreground">{kpis.totalEnrollments}</h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                Across all departments
              </p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="border border-border/80 rounded-xl shadow-2xs hover:shadow-sm transition-all bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completion Rate</p>
              <h3 className="text-2xl font-black text-foreground">{kpis.completionRate}%</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {kpis.completedEnrollments} Completed
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Learning Hours */}
        <Card className="border border-border/80 rounded-xl shadow-2xs hover:shadow-sm transition-all bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Learning Hours</p>
              <h3 className="text-2xl font-black text-foreground">{kpis.totalLearningHours} hrs</h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                <Award className="w-3 h-3" /> Avg Score: {kpis.avgScore}%
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Two Columns: Top Courses + Department Progress ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Courses (2 Cols) */}
        <Card className="lg:col-span-2 border border-border/80 rounded-xl shadow-2xs bg-card">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <BookOpen className="w-4 h-4 text-primary" /> Popular Learning Courses
              </CardTitle>
              <CardDescription className="text-xs">Most actively enrolled training courses</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/lms/courses')}
              className="text-xs font-semibold gap-1 text-primary hover:text-primary"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {analytics?.topCourses && analytics.topCourses.length > 0 ? (
              <div className="divide-y divide-border/60">
                {analytics.topCourses.map((course: any) => {
                  const duration = course.durationHours ?? course.duration_hours ?? 0;
                  const enrolled = course.enrollmentsCount ?? course.enrollments_count ?? 0;
                  const completed = course.completionsCount ?? course.completions_count ?? 0;

                  return (
                    <div key={course.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{course.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {duration}h
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {enrolled} enrolled
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {completed} completed
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/lms/courses`)}
                          className="h-7 text-[11px] font-semibold px-2.5"
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                No courses published yet. Click "Create Course" to add the first training course.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Nav / Quick Actions (1 Col) */}
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-primary" /> Module Quick Access
            </CardTitle>
            <CardDescription className="text-xs">Navigate through LMS capabilities</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <button
              onClick={() => navigate('/lms/courses')}
              className="w-full p-3 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Course Catalog & Curriculum</p>
                  <p className="text-[10px] text-muted-foreground">Manage modules, videos, and PDFs</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/lms/categories')}
              className="w-full p-3 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Skill Categories</p>
                  <p className="text-[10px] text-muted-foreground">Organize learning domains</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/lms/batches')}
              className="w-full p-3 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Batches & Live Training</p>
                  <p className="text-[10px] text-muted-foreground">Schedule sessions and trainers</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/lms/compliance')}
              className="w-full p-3 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Compliance & Mandates</p>
                  <p className="text-[10px] text-muted-foreground">Auto-assign mandatory trainings</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Section: Department Stats & Recent Certifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-wise Enrollment Matrix */}
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4 text-primary" /> Department Training Progress
            </CardTitle>
            <CardDescription className="text-xs">Learning engagement across departments</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {analytics?.departmentStats && analytics.departmentStats.length > 0 ? (
              <div className="space-y-3">
                {analytics.departmentStats.map((dept: any) => {
                  const deptId = dept.departmentId ?? dept.department_id;
                  const deptName = dept.departmentName ?? dept.department_name ?? 'Department';
                  const totalEnr = Number(dept.totalEnrollments ?? dept.total_enrollments ?? 0);
                  const completedEnr = Number(dept.completedEnrollments ?? dept.completed_enrollments ?? 0);
                  const pct = totalEnr > 0 ? Math.round((completedEnr / totalEnr) * 100) : 0;

                  return (
                    <div key={deptId} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{deptName}</span>
                        <span className="text-muted-foreground font-mono">
                          {completedEnr}/{totalEnr} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No departmental enrollment data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Certifications */}
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Award className="w-4 h-4 text-amber-500" /> Recent Certificates Issued
            </CardTitle>
            <CardDescription className="text-xs">Employees who successfully completed courses</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {analytics?.recentCertificates && analytics.recentCertificates.length > 0 ? (
              <div className="divide-y divide-border/60">
                {analytics.recentCertificates.map((cert: any) => {
                  const empName = cert.employeeName ?? cert.employee_name ?? 'Employee';
                  const courseTitle = cert.courseTitle ?? cert.course_title ?? 'Course';
                  const dateStr = cert.issuedOn ?? cert.issued_on;

                  return (
                    <div key={cert.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{empName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{courseTitle}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {dateStr ? new Date(dateStr).toLocaleDateString() : ''}
                        </span>
                        {cert.score && (
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {cert.score}% Score
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Award className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                Certificates will appear here once employees complete courses and pass assessments.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

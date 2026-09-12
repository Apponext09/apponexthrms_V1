import React, { useState } from 'react';
import {
  Users,
  BookOpen,
  Plus,
  PlayCircle,
  Award,
  CheckCircle2,
  Clock,
  Send,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useTeam } from '@/features/team-lead/hooks/useTeam';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useLmsCourses,
  useLmsEnrollments,
  useMyLmsEnrollments,
  useEnrollCourse,
} from '../api/useLms';
import { toast } from 'sonner';

export function TeamLeadLmsPage() {
  const { user } = useAuthStore();
  const teamLeadId = user?.employeeId ? Number(user.employeeId) : 0;

  const [activeTab, setActiveTab] = useState<'team' | 'assign' | 'my'>('team');
  const [search, setSearch] = useState('');

  // Assign form state
  const [selectedEmpId, setSelectedEmpId] = useState<number | undefined>(undefined);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(undefined);

  const { members: teamMembers = [] } = useTeam();
  const teamMemberIds = teamMembers.map((m: any) => m.id);

  const { data: courses = [] } = useLmsCourses({ status: 'published' });
  const { data: allEnrollments = [], isLoading: isTeamLoading } = useLmsEnrollments({
    search,
  });
  const { data: myEnrollments = [] } = useMyLmsEnrollments(teamLeadId);

  const enrollMutation = useEnrollCourse();

  // Filter enrollments to team members
  const memberEnrollments = allEnrollments.filter((e) =>
    teamMemberIds.includes(e.employeeId || (e as any).employee_id)
  );

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedCourseId) {
      toast.error('Please select both a team member and a course');
      return;
    }

    await enrollMutation.mutateAsync({
      employeeId: selectedEmpId,
      courseId: selectedCourseId,
      enrolledBy: 'manager',
    });

    toast.success('Course assigned to team member');
    setSelectedEmpId(undefined);
    setSelectedCourseId(undefined);
    setActiveTab('team');
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Team Lead Learning & Member Upskilling
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track direct report course progress, assign training modules, and support team members.
          </p>
        </div>

        <Button
          onClick={() => setActiveTab('assign')}
          className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg"
        >
          <Plus className="w-4 h-4" /> Assign Course
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          size="sm"
          variant={activeTab === 'team' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('team')}
          className="text-xs font-bold gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> Team Members Progress ({memberEnrollments.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'assign' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('assign')}
          className="text-xs font-bold gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Assign Course
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'my' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('my')}
          className="text-xs font-bold gap-1.5"
        >
          <PlayCircle className="w-3.5 h-3.5" /> My Learning ({myEnrollments.length})
        </Button>
      </div>

      {/* ── Tab 1: Team Member Progress ───────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search team member or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg bg-card"
            />
          </div>

          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardContent className="p-0">
              {isTeamLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading team learning records...</div>
              ) : memberEnrollments.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  No course enrollments for your assigned team members yet. Click "Assign Course" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Course Title</th>
                        <th className="py-3 px-4">Progress</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Enrolled On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-medium">
                      {memberEnrollments.map((enr) => {
                        const progress = Number(enr.progressPct || enr.progress_pct || 0);
                        const isCompleted = enr.status === 'completed';

                        return (
                          <tr key={enr.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">
                              {enr.employeeName || enr.employee_name}
                              <p className="text-[10px] text-muted-foreground font-mono font-normal">
                                {enr.employeeCode || enr.employee_code}
                              </p>
                            </td>
                            <td className="py-3 px-4 font-bold text-foreground">
                              {enr.courseTitle || enr.course_title}
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
                                    : 'bg-primary/10 text-primary border-primary/20'
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
                              {(enr.enrolledOn || enr.enrolled_on)
                                ? new Date((enr.enrolledOn || enr.enrolled_on)!).toLocaleDateString()
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab 2: Assign Course ──────────────────────────────── */}
      {activeTab === 'assign' && (
        <Card className="max-w-xl border border-border/80 rounded-xl shadow-2xs bg-card p-6">
          <CardHeader className="p-0 pb-4 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Assign Course to Team Member
            </CardTitle>
            <CardDescription className="text-xs">
              Directly assign technical or onboarding training to direct reports
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleAssignCourse} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Team Member *</Label>
              <select
                required
                value={selectedEmpId || ''}
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
              >
                <option value="">Select Member</option>
                {teamMembers.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName || emp.first_name} {emp.lastName || emp.last_name} ({emp.code || emp.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Course *</Label>
              <select
                required
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.durationHours || (c as any).duration_hours || 1} hrs)
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <Button type="submit" size="sm" className="w-full h-9 text-xs font-bold gap-1.5 bg-primary">
                <CheckCircle2 className="w-4 h-4" /> Assign Training
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Tab 3: TL Personal Learning ───────────────────────── */}
      {activeTab === 'my' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myEnrollments.length === 0 ? (
            <div className="col-span-3 py-16 text-center bg-card border border-border rounded-xl">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">You are not currently enrolled in any personal courses.</p>
            </div>
          ) : (
            myEnrollments.map((enr) => (
              <Card key={enr.id} className="border border-border/80 rounded-xl shadow-2xs bg-card p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {enr.status?.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{enr.progressPct || 0}%</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">{enr.courseTitle || (enr as any).course_title}</h4>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${enr.progressPct || 0}%` }} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

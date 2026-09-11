import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Clock,
  CheckCircle2,
  Trash2,
  Filter,
  Layers,
  Award,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/config/api';
import { useQuery } from '@tanstack/react-query';
import {
  useLmsEnrollments,
  useLmsCourses,
  useLmsBatches,
  useBulkEnrollCourses,
} from '../api/useLms';
import { toast } from 'sonner';

export function EnrollmentManagerPage() {
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Bulk Assign Form state
  const [assignCourseId, setAssignCourseId] = useState<number | undefined>(undefined);
  const [assignBatchId, setAssignBatchId] = useState<number | undefined>(undefined);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [empSearch, setEmpSearch] = useState('');

  // Fetch enrollments
  const { data: enrollments = [], isLoading } = useLmsEnrollments({
    courseId: selectedCourse,
    status: selectedStatus,
    search,
  });

  const { data: courses = [] } = useLmsCourses();
  const { data: batches = [] } = useLmsBatches(assignCourseId ? { courseId: assignCourseId } : undefined);

  // Fetch employees list for assigning
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'list-simple'],
    queryFn: async () => {
      const res = await apiClient.get('/employees');
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const bulkEnrollMutation = useBulkEnrollCourses();

  const handleOpenAssignModal = () => {
    setAssignCourseId(courses[0]?.id || undefined);
    setAssignBatchId(undefined);
    setSelectedEmployees([]);
    setEmpSearch('');
    setIsAssignModalOpen(true);
  };

  const handleToggleEmployee = (id: number) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (filteredIds: number[]) => {
    if (selectedEmployees.length === filteredIds.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredIds);
    }
  };

  const handleBulkEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCourseId) {
      toast.error('Please select a course');
      return;
    }
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    await bulkEnrollMutation.mutateAsync({
      courseId: assignCourseId,
      batchId: assignBatchId || null,
      employeeIds: selectedEmployees,
      enrolledBy: 'admin',
    });

    setIsAssignModalOpen(false);
  };

  const filteredEmployees = employees.filter((emp: any) => {
    const fullName = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.toLowerCase();
    const code = (emp.employeeCode || emp.employee_code || '').toLowerCase();
    const q = empSearch.toLowerCase();
    return fullName.includes(q) || code.includes(q);
  });

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Learner Enrollments & Progress Tracking
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time course completions, assign mandatory or elective training, and audit employee scores.
          </p>
        </div>
        <Button onClick={handleOpenAssignModal} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg">
          <Plus className="w-4 h-4" /> Assign Learners
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search learner name or code..."
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
            <option value="enrolled">Enrolled (Not Started)</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
      </div>

      {/* Enrollments Table */}
      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading enrollment records...</div>
          ) : enrollments.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              No learner enrollments found matching current criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Batch / Mode</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Enrolled On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {enrollments.map((enr) => {
                    const progress = Number(enr.progressPct || enr.progress_pct || 0);
                    const isCompleted = enr.status === 'completed';

                    return (
                      <tr key={enr.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground">{enr.employeeName || enr.employee_name || 'Employee'}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{enr.employeeCode || enr.employee_code}</p>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {enr.departmentName || enr.department_name || 'General'}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground line-clamp-1">{enr.courseTitle || enr.course_title}</p>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            Assigned by {enr.enrolledBy || enr.enrolled_by}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {enr.batchTitle || enr.batch_title ? (
                            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary" /> {enr.batchTitle || enr.batch_title}
                            </span>
                          ) : (
                            <span className="text-[11px]">Self-Paced</span>
                          )}
                        </td>
                        <td className="py-3 px-4 w-40">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{progress}%</span>
                            </div>
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
                                : enr.status === 'in_progress'
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {enr.status?.replace('_', ' ').toUpperCase()}
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

      {/* ── Assign Learners Modal ─────────────────────────────── */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Assign Learners to Course
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBulkEnrollSubmit} className="space-y-4 pt-2 flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Target Course *</Label>
                <select
                  required
                  value={assignCourseId || ''}
                  onChange={(e) => setAssignCourseId(Number(e.target.value))}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Optional Cohort / Batch</Label>
                <select
                  value={assignBatchId || ''}
                  onChange={(e) => setAssignBatchId(Number(e.target.value) || undefined)}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
                >
                  <option value="">None (Self-Paced Learning)</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.mode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee Multi-Select Box */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold">
                  Select Employees ({selectedEmployees.length} selected)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAllFiltered(filteredEmployees.map((e: any) => e.id))}
                  className="h-7 text-[11px] font-semibold text-primary"
                >
                  {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All Filtered'}
                </Button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by name or code..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/20"
                />
              </div>

              <div className="border border-border/80 rounded-xl overflow-y-auto max-h-56 divide-y divide-border/60 p-1 bg-card">
                {filteredEmployees.map((emp: any) => {
                  const isSelected = selectedEmployees.includes(emp.id);
                  const name = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleToggleEmployee(emp.id)}
                      className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 font-bold' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent div
                          className="rounded text-primary"
                        />
                        <div>
                          <p className="text-foreground">{name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {emp.employeeCode || emp.employee_code} • {emp.departmentName || emp.department_name || 'General'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Enroll {selectedEmployees.length} Learners
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

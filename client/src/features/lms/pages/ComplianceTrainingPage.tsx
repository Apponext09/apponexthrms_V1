import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  BookOpen,
  Users,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Bell,
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
  useLmsCompliance,
  useLmsCourses,
  useCreateLmsCompliance,
  useDeleteLmsCompliance,
} from '../api/useLms';

export function ComplianceTrainingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    courseId: undefined as number | undefined,
    departmentId: undefined as number | undefined,
    designationId: undefined as number | undefined,
    isMandatory: true,
    deadlineDays: 30,
    reminderSchedule: [7, 3, 1],
  });

  const { data: complianceRules = [], isLoading } = useLmsCompliance();
  const { data: courses = [] } = useLmsCourses();

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'simple'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/departments').catch(() => ({ data: { data: [] } }));
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const createMutation = useCreateLmsCompliance();
  const deleteMutation = useDeleteLmsCompliance();

  const handleOpenCreate = () => {
    setForm({
      courseId: courses[0]?.id || undefined,
      departmentId: undefined,
      designationId: undefined,
      isMandatory: true,
      deadlineDays: 30,
      reminderSchedule: [7, 3, 1],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      courseId: Number(form.courseId),
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      designationId: form.designationId ? Number(form.designationId) : null,
      isMandatory: form.isMandatory,
      deadlineDays: Number(form.deadlineDays),
      reminderSchedule: form.reminderSchedule,
    });
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this compliance mandate?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-500" /> Compliance & Mandatory Training Mandates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure statutory, regulatory, information security, and annual compliance courses with automated deadlines.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
          <Plus className="w-4 h-4" /> Add Compliance Mandate
        </Button>
      </div>

      {/* Rules List */}
      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-500" /> Active Compliance Training Rules
          </CardTitle>
          <CardDescription className="text-xs">
            Mandatory courses auto-assigned to onboarding employees and specific departments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading compliance rules...</div>
          ) : complianceRules.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              No compliance rules established. Click "Add Compliance Mandate" to create automated requirements.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mandatory Course</th>
                    <th className="py-3 px-4">Target Group / Scope</th>
                    <th className="py-3 px-4">Completion Deadline</th>
                    <th className="py-3 px-4">Reminders</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {complianceRules.map((rule) => {
                    return (
                      <tr key={rule.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground">{rule.courseTitle || rule.course_title}</p>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Mandatory Requirement
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {rule.departmentName || rule.department_name ? (
                            <Badge variant="outline" className="text-[10px] font-bold">
                              Dept: {rule.departmentName || rule.department_name}
                            </Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                              Entire Organization
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          Within {rule.deadlineDays || rule.deadline_days} days of joining
                        </td>
                        <td className="py-3 px-4 text-muted-foreground flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-primary" /> Auto-remind at 7, 3 & 1 days
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                            Enforcing
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(rule.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-500" /> New Compliance Mandate
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Mandatory Course *</Label>
              <select
                required
                value={form.courseId || ''}
                onChange={(e) => setForm({ ...form, courseId: Number(e.target.value) })}
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
              <Label className="text-xs font-bold">Target Department (Optional)</Label>
              <select
                value={form.departmentId || ''}
                onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value) || undefined })}
                className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
              >
                <option value="">All Departments (Company-Wide)</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Deadline in Days after Assignment *</Label>
              <Input
                type="number"
                min="1"
                required
                value={form.deadlineDays}
                onChange={(e) => setForm({ ...form, deadlineDays: Number(e.target.value) })}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
                <CheckCircle2 className="w-4 h-4" /> Save Mandate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

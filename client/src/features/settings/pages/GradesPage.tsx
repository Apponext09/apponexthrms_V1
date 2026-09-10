import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useRbac } from '@/lib/rbac';
import {
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
} from '../hooks/useGrades';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable, type Column } from '../components/DataTable';
import { GradeFormModal } from '../components/forms/GradeFormModal';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  Users,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';

export function GradesPage() {
  const { currentPage, pageSize, searchQuery, filters, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();

  const { data: gradesData, isLoading } = useGrades(
    currentPage,
    pageSize,
    searchQuery,
    filters.status || ''
  );
  const { employees } = useEmployees({ pageSize: 500 });
  const createMutation = useCreateGrade();
  const updateMutation = useUpdateGrade();
  const deleteMutation = useDeleteGrade();

  const columns: Column[] = [
    {
      key: 'name',
      label: 'Grade',
      width: '35%',
      render: (val, item) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Award className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-bold text-foreground leading-snug">{val}</p>
            {item.description && (
              <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{item.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      width: '20%',
      render: (val) => (
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/60">
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'employeeCount',
      label: 'Assigned Employees',
      width: '20%',
      render: (val) => (
        <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5">
          {val} Employees
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '15%',
      render: (val) => {
        const isActive = (val || 'active').toLowerCase() === 'active';
        return (
          <Badge
            variant="outline"
            className={`text-[10px] font-bold py-0.5 px-2 ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    { key: 'actions', label: 'Actions', width: '10%' },
  ];

  const gradeRows = (gradesData?.items || []).map((grade: any) => {
    const gradeEmployees = employees.filter(
      (employee: any) =>
        (employee.currentGradeId ?? employee.current_grade_id) === grade.id
    );

    return {
      ...grade,
      employeeCount: gradeEmployees.length,
      gradeEmployees,
    };
  });

  const handleSubmit = async (data: any) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving grade:', error);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this grade?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting grade:', error);
      }
    }
  };

  const activeGradesCount = gradeRows.filter(
    (g: any) => (g.status || 'active').toLowerCase() === 'active'
  ).length;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
      {/* ─── Compact Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              Grades
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage organization job grades and hierarchy levels.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={openModal}
          className="h-8 text-xs font-semibold gap-1.5 px-3 self-start sm:self-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Grade
        </Button>
      </div>

      {/* ─── Summary Stats Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total Grades</p>
              <p className="text-xl font-black text-foreground mt-0.5">{gradesData?.meta?.total || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Award className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Active Grades</p>
              <p className="text-xl font-black text-foreground mt-0.5">{activeGradesCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Assigned Employees</p>
              <p className="text-xl font-black text-foreground mt-0.5">
                {gradeRows.reduce((sum: number, g: any) => sum + (g.employeeCount || 0), 0)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Users className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Grade Cards Overview ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-foreground">Grade Overview</h2>
          <span className="text-[11px] text-muted-foreground font-medium">
            Showing {gradeRows.length} grades
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {gradeRows.map((grade: any) => {
            const isActive = (grade.status || 'active').toLowerCase() === 'active';

            return (
              <Card
                key={grade.id}
                className="border border-border/80 shadow-2xs rounded-xl bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-foreground leading-tight">{grade.name}</h3>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                          {grade.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold py-0.5 px-2 ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          useSettingsStore.setState({ editingId: grade.id });
                          openModal();
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-muted"
                        title="Edit Grade"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(grade.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete Grade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Footer Counts */}
                  <div className="pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/20">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Total Assigned Staff:
                      </span>
                      <span className="font-bold text-foreground">{grade.employeeCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Compact Data Table ─── */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-foreground">Grade Registry Table</h2>
          <span className="text-[11px] text-muted-foreground font-medium">Detailed List View</span>
        </div>

        <DataTable
          columns={columns}
          data={gradeRows}
          isLoading={isLoading}
          onEdit={(item) => {
            useSettingsStore.setState({ editingId: item.id });
            openModal();
          }}
          onDelete={handleDelete}
          pagination={{
            page: currentPage,
            pageSize: pageSize,
            total: gradesData?.meta?.total || 0,
          }}
        />
      </div>

      {isModalOpen && <GradeFormModal onSubmit={handleSubmit} onClose={closeModal} editingId={editingId} />}
    </div>
  );
}

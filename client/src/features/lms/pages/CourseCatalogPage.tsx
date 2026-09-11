import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  BookOpen,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  PlayCircle,
  Award,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useLmsCourses,
  useLmsCategories,
  useMyLmsEnrollments,
  useEnrollCourse,
} from '../api/useLms';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EmployeeLmsHeader } from '../components/EmployeeLmsHeader';

export function CourseCatalogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLmsAdmin = location.pathname.startsWith('/lms');
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employeeId ? Number(user.employeeId) : Number(user?.id);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);

  const { data: courses = [], isLoading } = useLmsCourses({
    status: 'published',
    categoryId: selectedCategory,
    search,
  });

  const { data: categories = [] } = useLmsCategories();
  const { data: myEnrollments = [] } = useMyLmsEnrollments(employeeId);
  const enrollMutation = useEnrollCourse();

  // Helper to check if already enrolled
  const getEnrollmentForCourse = (courseId: number) => {
    return myEnrollments.find((e) => (e.courseId || (e as any).course_id) === courseId);
  };

  const handleEnroll = async (courseId: number) => {
    await enrollMutation.mutateAsync({
      employeeId,
      courseId,
      enrolledBy: 'self',
    });
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* ── LMS Academy Header ─────────────────────────────────── */}
      {!isLmsAdmin ? (
        <EmployeeLmsHeader
          title="Course Catalog & Upskilling Tracks"
          subtitle="Explore technology, leadership, compliance, and engineering specializations to boost your career."
        />
      ) : (
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Employee Learning Center & Course Catalog
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explore skill tracks, engineering certifications, management leadership, and compliance courses.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/lms/my-learning')}
            className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg bg-card"
          >
            <PlayCircle className="w-4 h-4 text-primary" /> My Active Learning ({myEnrollments.length})
          </Button>
        </div>
      )}

      {/* ── Search and Category Pills ─────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses, skills, technologies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg bg-background"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Button
              size="sm"
              variant={selectedCategory === undefined ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(undefined)}
              className="h-8 text-xs font-semibold rounded-lg shrink-0"
            >
              All Tracks
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className="h-8 text-xs font-semibold rounded-lg shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Courses Catalog Grid ──────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/40 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="py-20 text-center bg-card border border-border/80 rounded-xl shadow-2xs">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Courses Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or category filter to discover available courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const enrollment = getEnrollmentForCourse(course.id);
            const isEnrolled = !!enrollment;
            const progress = Number(enrollment?.progressPct || (enrollment as any)?.progress_pct || 0);
            const isCompleted = enrollment?.status === 'completed';
            const duration = Number(course.durationHours || course.duration_hours || 0);
            const modCount = Number(course.moduleCount || course.module_count || 0);

            return (
              <Card
                key={course.id}
                className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between bg-card overflow-hidden group"
              >
                <div>
                  {/* Banner */}
                  <div className="h-32 bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 relative p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-center gap-2">
                      <Badge variant="outline" className="bg-card/80 text-foreground border-border text-[10px] font-bold">
                        {course.categoryName || course.category_name || 'General'}
                      </Badge>
                      {course.isMandatory || (course as any).is_mandatory ? (
                        <Badge className="bg-rose-500 text-white text-[9px] font-bold">
                          MANDATORY
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] font-bold capitalize">
                          {course.type?.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {course.description || 'Master key concepts with structured curriculum lessons and interactive assessments.'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold pt-2 border-t border-border/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> {duration} hrs
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-primary" /> {modCount} Lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500" /> Certificate
                      </span>
                    </div>

                    {isEnrolled && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">My Progress</span>
                          <span className="text-foreground">{progress}%</span>
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
                    )}
                  </CardContent>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-muted/20 border-t border-border/60">
                  {isCompleted ? (
                    <Button
                      size="sm"
                      onClick={() => navigate(isLmsAdmin ? '/lms/my-learning' : '/employee/lms/my-learning')}
                      className="w-full h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed (Review Course)
                    </Button>
                  ) : isEnrolled ? (
                    <Button
                      size="sm"
                      onClick={() => navigate(isLmsAdmin ? '/lms/my-learning' : '/employee/lms/my-learning')}
                      className="w-full h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Continue Learning
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleEnroll(course.id)}
                      className="w-full h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" /> Enroll Now
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

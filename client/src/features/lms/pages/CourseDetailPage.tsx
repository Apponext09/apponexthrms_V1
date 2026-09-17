import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  ArrowLeft,
  Clock,
  Layers,
  Award,
  CheckCircle2,
  PlayCircle,
  FileText,
  Video,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLmsCourse, useMyLmsEnrollments, useEnrollCourse } from '../api/useLms';
import { useAuthStore } from '@/features/auth/store/authStore';

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/hr')
    ? '/hr/lms'
    : location.pathname.startsWith('/employee')
    ? '/employee/lms'
    : '/lms';
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employeeId ? Number(user.employeeId) : 0;

  const courseId = Number(id);
  const { data: course, isLoading } = useLmsCourse(courseId);
  const { data: myEnrollments = [] } = useMyLmsEnrollments(employeeId);
  const enrollMutation = useEnrollCourse();

  const enrollment = myEnrollments.find((e) => (e.courseId || (e as any).course_id) === courseId);
  const isEnrolled = !!enrollment;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-lg font-bold">Course Not Found</h3>
        <Button onClick={() => navigate(`${basePath}/catalog`)} className="mt-4">
          Return to Catalog
        </Button>
      </div>
    );
  }

  const duration = Number(course.durationHours || course.duration_hours || 0);
  const modules = course.modules || [];

  return (
    <div className="p-6 space-y-6 bg-background max-w-5xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
              {course.categoryName || course.category_name || 'General Track'}
            </Badge>
            {course.isMandatory || (course as any).is_mandatory ? (
              <Badge className="bg-rose-500 text-white text-[9px] font-bold">
                MANDATORY
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] font-bold capitalize">
                {course.type?.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-black text-foreground">{course.title}</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {course.description || 'Master core fundamentals and real-world implementation through guided modules.'}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold pt-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" /> {duration} Learning Hours
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> {modules.length} Lessons
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> Digital Certificate Included
            </span>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          {isEnrolled ? (
            <Button
              onClick={() => navigate(`${basePath}/my-learning`)}
              className="w-full md:w-auto h-10 px-6 font-bold gap-2 text-xs shadow-sm"
            >
              <PlayCircle className="w-4 h-4" /> Go to Learning Player
            </Button>
          ) : (
            <Button
              onClick={() => enrollMutation.mutate({ employeeId, courseId, enrolledBy: 'self' })}
              className="w-full md:w-auto h-10 px-6 font-bold gap-2 text-xs shadow-sm"
            >
              <GraduationCap className="w-4 h-4" /> Enroll in this Course
            </Button>
          )}
        </div>
      </div>

      {/* Curriculum Syllabus */}
      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Course Curriculum & Lessons ({modules.length})
          </CardTitle>
          <CardDescription className="text-xs">Structured modules designed for step-by-step mastery</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {modules.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">Curriculum details being prepared by instructor.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {modules.map((mod, idx) => (
                <div key={mod.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{mod.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {mod.contentType || (mod as any).content_type} Lesson •{' '}
                        {mod.durationMinutes || (mod as any).duration_minutes || 0} mins
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                    Lesson {idx + 1}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

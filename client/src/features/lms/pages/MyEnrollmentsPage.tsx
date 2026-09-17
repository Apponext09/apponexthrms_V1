import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  BookOpen,
  FileText,
  Video,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Tv,
  Check,
  RefreshCw,
  X,
  Lock,
  HelpCircle,
  CheckCircle,
  Download,
  Users,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useMyLmsEnrollments,
  useLmsCourse,
  useUpdateLmsProgress,
} from '../api/useLms';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EmployeeLmsHeader } from '../components/EmployeeLmsHeader';
import type { LmsEnrollment, LmsModule } from '../types/lms.types';
import { toast } from 'sonner';

/**
 * Parses and formats media & document URLs for inline embedded playback & reading
 */
function parseMediaEmbed(url?: string | null, contentType?: string | null) {
  if (!url && !contentType) return { type: 'none' as const, embedUrl: '', rawUrl: '', isDoc: false };
  const trimmed = (url || '').trim();

  // 1. YouTube
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([\w-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube' as const,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`,
      rawUrl: trimmed,
      isDoc: false,
    };
  }

  // 2. Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[2]) {
    return {
      type: 'vimeo' as const,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[2]}?autoplay=1`,
      rawUrl: trimmed,
      isDoc: false,
    };
  }

  // 3. Direct Video File (.mp4, .webm, .ogg, .mov)
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
    return {
      type: 'direct_video' as const,
      embedUrl: trimmed,
      rawUrl: trimmed,
      isDoc: false,
    };
  }

  // 4. Google Drive / Docs / Slides
  if (trimmed.includes('drive.google.com/file/d/')) {
    const previewUrl = trimmed.replace(/\/view(\?.*)?$/i, '/preview').replace(/\/edit(\?.*)?$/i, '/preview');
    return {
      type: 'document' as const,
      embedUrl: previewUrl.includes('/preview') ? previewUrl : `${previewUrl}/preview`,
      rawUrl: trimmed,
      isDoc: true,
    };
  }
  if (trimmed.includes('docs.google.com/presentation/d/')) {
    const embedUrl = trimmed.replace(/\/edit(\?.*)?$/i, '/embed').replace(/\/pub(\?.*)?$/i, '/embed');
    return {
      type: 'document' as const,
      embedUrl,
      rawUrl: trimmed,
      isDoc: true,
    };
  }
  if (trimmed.includes('docs.google.com/document/d/')) {
    const previewUrl = trimmed.replace(/\/edit(\?.*)?$/i, '/preview');
    return {
      type: 'document' as const,
      embedUrl: previewUrl,
      rawUrl: trimmed,
      isDoc: true,
    };
  }

  // 5. Base64 Data URLs (Uploaded PDF / Word / Text / Images)
  if (trimmed.startsWith('data:')) {
    const isPdf = trimmed.startsWith('data:application/pdf') || contentType === 'pdf';
    return {
      type: isPdf ? ('pdf' as const) : ('document' as const),
      embedUrl: trimmed,
      rawUrl: trimmed,
      isDoc: true,
    };
  }

  // 6. Direct PDF (.pdf)
  if (/\.pdf(\?.*)?$/i.test(trimmed) || contentType === 'pdf') {
    return {
      type: 'pdf' as const,
      embedUrl: trimmed.startsWith('http') ? `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true` : trimmed,
      rawUrl: trimmed,
      isDoc: true,
    };
  }

  // 7. Word / Office Document (.doc, .docx, .ppt, .pptx)
  if (/\.(doc|docx|ppt|pptx|xls|xlsx)(\?.*)?$/i.test(trimmed) || contentType === 'ppt') {
    return {
      type: 'document' as const,
      embedUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`,
      rawUrl: trimmed,
      isDoc: true,
    };
  }

  // 8. General Web Link / iframe
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: (contentType === 'pdf' || contentType === 'ppt' ? 'document' : 'web') as 'document' | 'web',
      embedUrl: trimmed,
      rawUrl: trimmed,
      isDoc: contentType === 'pdf' || contentType === 'ppt',
    };
  }

  return { type: (contentType === 'text' ? 'text' : 'none') as 'text' | 'none', embedUrl: '', rawUrl: trimmed, isDoc: contentType === 'text' };
}

export function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/hr')
    ? '/hr/lms'
    : location.pathname.startsWith('/employee')
    ? '/employee/lms'
    : '/lms';
  const isLmsAdmin = location.pathname.startsWith('/lms');
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employeeId ? Number(user.employeeId) : 0;

  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed' | 'all'>('in_progress');

  // Active Lesson Player Modal State
  const [activeEnrollment, setActiveEnrollment] = useState<LmsEnrollment | null>(null);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [playerTab, setPlayerTab] = useState<'notes' | 'resources'>('notes');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [scrolledModuleIds, setScrolledModuleIds] = useState<number[]>([]);

  const { data: enrollments = [], isLoading } = useMyLmsEnrollments(employeeId);
  const { data: activeCourseData } = useLmsCourse(
    activeEnrollment?.courseId || (activeEnrollment as any)?.course_id || 0
  );

  const updateProgressMutation = useUpdateLmsProgress();

  const inProgressList = useMemo(
    () => enrollments.filter((e) => e.status === 'in_progress' || e.status === 'enrolled'),
    [enrollments]
  );
  const completedList = useMemo(
    () => enrollments.filter((e) => e.status === 'completed'),
    [enrollments]
  );

  const filteredEnrollments =
    activeTab === 'in_progress'
      ? inProgressList
      : activeTab === 'completed'
      ? completedList
      : enrollments;

  const handleOpenPlayer = (enrollment: LmsEnrollment) => {
    setActiveEnrollment(enrollment);
    setSelectedModuleIndex(0);
    setPlayerTab('notes');
  };

  const currentModule = activeCourseData?.modules?.[selectedModuleIndex];

  // Calculate completed module IDs list
  const completedModuleIds: number[] = useMemo(() => {
    if (!activeEnrollment) return [];
    const raw = activeEnrollment.completedModules ?? (activeEnrollment as any).completed_modules;
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [activeEnrollment]);

  // Check if a specific module index is unlocked
  const isModuleUnlocked = (idx: number): boolean => {
    if (idx === 0) return true; // First module is always unlocked
    const modules = activeCourseData?.modules || [];
    const prevMod = modules[idx - 1];
    if (!prevMod) return true;
    return completedModuleIds.includes(prevMod.id) || completedModuleIds.includes(modules[idx]?.id);
  };

  const allModulesCompleted = useMemo(() => {
    const modules = activeCourseData?.modules || [];
    if (modules.length === 0) return false;
    return modules.every((m) => completedModuleIds.includes(m.id));
  }, [activeCourseData, completedModuleIds]);

  const handleSelectLesson = (idx: number, mod: LmsModule) => {
    if (!isModuleUnlocked(idx)) {
      const prevMod = activeCourseData?.modules?.[idx - 1];
      toast.error(`Lesson Locked: Please complete Lesson ${idx} ("${prevMod?.name || 'Previous Lesson'}") first.`);
      return;
    }
    setSelectedModuleIndex(idx);
  };

  const handleCompleteModule = async (mod: LmsModule) => {
    if (!activeEnrollment) return;
    setIsMarkingDone(true);

    try {
      await updateProgressMutation.mutateAsync({
        id: activeEnrollment.id,
        data: {
          completedModuleId: mod.id,
        },
      });

      // Update local state copy so UI checkmark reflects immediately
      const newCompleted = Array.from(new Set([...completedModuleIds, mod.id]));
      setActiveEnrollment((prev) =>
        prev
          ? {
              ...prev,
              completedModules: newCompleted,
              completed_modules: newCompleted,
            }
          : null
      );

      toast.success(`Lesson completed: "${mod.name}"`);

      // Advance to next module if available
      const modules = activeCourseData?.modules || [];
      if (selectedModuleIndex < modules.length - 1) {
        setSelectedModuleIndex(selectedModuleIndex + 1);
      } else {
        toast.success('Congratulations! All curriculum lessons are complete! You can now take the Final MCQ Assessment! 🎓', {
          duration: 6000,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update lesson progress');
    } finally {
      setIsMarkingDone(false);
    }
  };

  const handleStartFinalAssessment = () => {
    if (!allModulesCompleted) {
      toast.error('Locked: Please complete all lessons in this course first to take the Final MCQ Assessment.');
      return;
    }
    const cId = activeEnrollment?.courseId || (activeEnrollment as any)?.course_id;
    const eId = activeEnrollment?.id;
    navigate(`${basePath}/assessment/${cId}?enrollmentId=${eId}`);
  };

  const mediaInfo = useMemo(() => {
    return parseMediaEmbed(
      currentModule?.contentUrl || (currentModule as any)?.content_url,
      currentModule?.contentType || (currentModule as any)?.content_type
    );
  }, [currentModule]);

  const totalCourseModules = activeCourseData?.modules?.length || 1;
  const currentProgressPct = Math.min(
    100,
    Math.round((completedModuleIds.length / totalCourseModules) * 100)
  );

  const isReadingModule =
    currentModule?.contentType === 'pdf' ||
    currentModule?.contentType === 'ppt' ||
    currentModule?.contentType === 'text' ||
    currentModule?.contentType === 'link' ||
    mediaInfo.isDoc;

  const hasScrolledToBottom =
    !isReadingModule ||
    (currentModule && (completedModuleIds.includes(currentModule.id) || scrolledModuleIds.includes(currentModule.id)));

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* ── LMS Academy Header / Hero ────────────────────────── */}
      {!isLmsAdmin ? (
        <EmployeeLmsHeader
          title="My Learning Hub & Live Classes"
          subtitle="Attend scheduled virtual batches with your trainer, complete modular lessons, and earn certified project credentials."
        />
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" /> My Learning Hub & Transcripts
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Continue active lessons, take skill verification tests, and download earned course certificates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`${basePath}/catalog`)}
              className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg"
            >
              <BookOpen className="w-4 h-4 text-primary" /> Browse Catalog
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`${basePath}/certificates`)}
              className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg"
            >
              <Award className="w-4 h-4 text-amber-500" /> My Certificates
            </Button>
          </div>
        </div>
      )}

      {/* ── Filter / Navigation Pills ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-2 rounded-xl border border-border/80 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={activeTab === 'in_progress' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('in_progress')}
            className="text-xs font-bold gap-1.5 rounded-lg"
          >
            <Clock className="w-3.5 h-3.5" /> In Progress ({inProgressList.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('completed')}
            className="text-xs font-bold gap-1.5 rounded-lg"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed ({completedList.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('all')}
            className="text-xs font-bold gap-1.5 rounded-lg"
          >
            All ({enrollments.length})
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`${basePath}/catalog`)}
          className="text-xs font-bold gap-1.5 text-primary border-primary/30 hover:bg-primary/5 rounded-lg ml-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Browse More Courses
        </Button>
      </div>

      {/* ── Course Grid / Empty States ───────────────────────── */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Loading your learning courses...
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/80 rounded-2xl p-8 space-y-3 shadow-2xs">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="text-sm font-bold text-foreground">No Courses In This Tab</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === 'in_progress'
              ? 'You have completed all your active courses! Explore new training from the catalog.'
              : 'Courses you finish and get certified in will show up here.'}
          </p>
          <Button
            size="sm"
            onClick={() => navigate(`${basePath}/catalog`)}
            className="text-xs font-bold gap-1.5"
          >
            Explore Course Catalog <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEnrollments.map((enr) => {
            const isDone = enr.status === 'completed';
            const progress = Number(enr.progressPct || (enr as any).progress_pct || 0);

            return (
              <Card
                key={enr.id}
                className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between bg-card overflow-hidden"
              >
                <CardHeader className="p-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}
                    >
                      {enr.status?.toUpperCase()?.replace('_', ' ')}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {enr.courseDurationHours || 2} hrs
                    </span>
                  </div>

                  <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                    {enr.courseTitle || 'Untitled Course'}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-4">
                  {/* Live Cohort / Batch Meeting Link & Daily Schedule Banner */}
                  {Boolean(
                    enr.batchMeetingLink ||
                    (enr as any).batch_meeting_link ||
                    enr.batchScheduleTime ||
                    (enr as any).batch_schedule_time
                  ) && (
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-card border border-primary/25 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-primary flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-primary animate-pulse" /> Live Batch Class
                        </span>
                        {(enr.batchTrainerName || (enr as any).batch_trainer_name) && (
                          <span className="text-[10px] text-foreground font-semibold px-2 py-0.5 bg-background rounded-md border border-border/60 truncate max-w-[130px]">
                            👨‍🏫 {enr.batchTrainerName || (enr as any).batch_trainer_name}
                          </span>
                        )}
                      </div>

                      {/* Daily Fixed Schedule */}
                      <div className="space-y-1.5 text-xs">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>
                            Daily:{' '}
                            <strong className="text-foreground">
                              {enr.batchScheduleTime || (enr as any).batch_schedule_time || '10:00 AM - 11:30 AM'}
                            </strong>{' '}
                            ({enr.batchScheduleDays || (enr as any).batch_schedule_days || 'Mon - Fri'})
                          </span>
                        </p>

                        {/* Today's Live Class Override / Notice from Admin */}
                        {Boolean(enr.batchTodaySessionTime || (enr as any).batch_today_session_time) && (
                          <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-0.5">
                            <p className="text-[11px] font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                              Today's Live Session: {enr.batchTodaySessionTime || (enr as any).batch_today_session_time}
                            </p>
                            {Boolean(enr.batchSessionNotice || (enr as any).batch_session_notice) && (
                              <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                                📢 {enr.batchSessionNotice || (enr as any).batch_session_notice}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {Boolean(enr.batchMeetingLink || (enr as any).batch_meeting_link) ? (
                        <a
                          href={enr.batchMeetingLink || (enr as any).batch_meeting_link || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-primary text-primary-foreground font-bold text-xs rounded-lg shadow-xs hover:bg-primary/90 transition-all hover:scale-[1.01]"
                        >
                          <Video className="w-4 h-4" /> Join Live Google Meet / Class
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      ) : (
                        <div className="text-[11px] text-center text-muted-foreground bg-muted/40 py-1.5 rounded-lg border border-border/40 font-medium">
                          Meeting link will be shared by trainer before class
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-muted-foreground">Curriculum Progress</span>
                      <span className="text-foreground font-mono">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                <div className="p-3 bg-muted/20 border-t border-border/60">
                  <Button
                    size="sm"
                    onClick={() => handleOpenPlayer(enr)}
                    className="h-8 text-xs font-bold gap-1.5 w-full rounded-lg"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {isDone ? 'Review Course' : 'Launch Player'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── World-Class LMS Cinema / Theater Lesson Player ─────────────────────── */}
      <Dialog open={!!activeEnrollment} onOpenChange={(open) => !open && setActiveEnrollment(null)}>
        <DialogContent
          className={`flex flex-col p-0 overflow-hidden bg-slate-950 text-slate-50 border-slate-800 transition-all duration-200 [&>button]:hidden ${
            isFullscreen
              ? '!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none z-50'
              : '!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 max-w-6xl w-[95vw] h-[92vh] max-h-[92vh] rounded-2xl'
          }`}
        >
          {/* Cinema Header */}
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
                <Tv className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate flex items-center gap-2">
                  {activeCourseData?.title || 'Course Player'}
                  <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300 border-slate-700 py-0">
                    {activeCourseData?.categoryName || 'Training Track'}
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  Lesson {selectedModuleIndex + 1} of {totalCourseModules}:{' '}
                  <span className="text-white font-medium">{currentModule?.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Live Batch Meeting Button if enrolled in live batch */}
              {Boolean(activeEnrollment?.batchMeetingLink || (activeEnrollment as any)?.batch_meeting_link) && (
                <a
                  href={activeEnrollment?.batchMeetingLink || (activeEnrollment as any)?.batch_meeting_link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors animate-pulse"
                >
                  <Video className="w-3.5 h-3.5" /> Join Live Meeting
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              )}

              {/* Overall Course Progress */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-300">
                <span>{currentProgressPct}% Completed</span>
                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${currentProgressPct}%` }}
                  />
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Player'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setActiveEnrollment(null)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Cinema Workspace */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left / Center: Interactive Video Stage & Notes (70%) */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-y-auto">
              {/* Media & Document Stage Box */}
              <div
                className="relative w-full bg-black shrink-0 border-b border-slate-800 flex items-center justify-center overflow-hidden"
                style={{ minHeight: isFullscreen ? '420px' : '320px', maxHeight: isFullscreen ? '68vh' : '52vh' }}
              >
                {mediaInfo.type === 'youtube' ? (
                  <iframe
                    src={mediaInfo.embedUrl}
                    title={currentModule?.name || 'Video Player'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full aspect-video min-h-[320px] max-h-[68vh] border-0"
                  />
                ) : mediaInfo.type === 'vimeo' ? (
                  <iframe
                    src={mediaInfo.embedUrl}
                    title={currentModule?.name || 'Vimeo Player'}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full aspect-video min-h-[340px] max-h-[58vh] border-0"
                  />
                ) : mediaInfo.type === 'direct_video' ? (
                  <video
                    src={mediaInfo.embedUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full aspect-video min-h-[340px] max-h-[58vh] object-contain bg-black"
                  />
                ) : mediaInfo.type === 'pdf' || mediaInfo.type === 'document' ? (
                  <div className="w-full h-full min-h-[340px] flex flex-col bg-slate-900">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <FileText className="w-4 h-4 text-rose-400" />
                        <span>Interactive Document Viewer</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-400 border-slate-700">
                          {currentModule?.contentType || 'Document'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {mediaInfo.rawUrl && (
                          <>
                            <a href={mediaInfo.rawUrl} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] font-bold gap-1 text-slate-300 hover:text-white hover:bg-slate-800">
                                <ExternalLink className="w-3 h-3" /> Open in New Tab
                              </Button>
                            </a>
                            <a href={mediaInfo.rawUrl} download target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold gap-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                                <Download className="w-3 h-3" /> Download
                              </Button>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <iframe
                      src={mediaInfo.embedUrl}
                      title={currentModule?.name || 'Document Viewer'}
                      className="w-full flex-1 min-h-[300px] border-0 bg-white"
                    />
                  </div>
                ) : mediaInfo.type === 'web' ? (
                  <div className="w-full h-full min-h-[340px] p-6 flex flex-col items-center justify-center text-center bg-slate-900/60 space-y-3">
                    <div className="p-4 bg-primary/20 text-primary rounded-2xl">
                      <ExternalLink className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">External Interactive Resource</h4>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-md break-all">
                        {mediaInfo.rawUrl}
                      </p>
                    </div>
                    <a href={mediaInfo.rawUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" className="h-9 px-4 text-xs font-bold gap-1.5 shadow-md">
                        Open Resource In New Window <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[260px] p-8 flex flex-col items-center justify-center text-center bg-slate-900/40 space-y-2">
                    <BookOpen className="w-10 h-10 text-slate-600" />
                    <h4 className="text-sm font-bold text-slate-300">Reading & Conceptual Module</h4>
                    <p className="text-xs text-slate-500 max-w-md">
                      Read through the lesson text and instructions below to complete this module.
                    </p>
                  </div>
                )}
              </div>

              {/* Lesson Details & Content Tabs */}
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                        {currentModule?.contentType || (currentModule as any)?.content_type || 'Lesson'}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />{' '}
                        {currentModule?.durationMinutes || (currentModule as any)?.duration_minutes || 10} Mins
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white">{currentModule?.name}</h2>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
                    <button
                      onClick={() => setPlayerTab('notes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        playerTab === 'notes' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Lesson Reading & Notes
                    </button>
                    <button
                      onClick={() => setPlayerTab('resources')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        playerTab === 'resources' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Attachments & Links
                    </button>
                  </div>
                </div>

                {/* Tab: Notes / Comprehensive Reading with Scroll-to-Bottom Verification */}
                {playerTab === 'notes' && (
                  <div className="space-y-3">
                    <div
                      onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        if (scrollTop + clientHeight >= scrollHeight - 35) {
                          if (currentModule && !scrolledModuleIds.includes(currentModule.id)) {
                            setScrolledModuleIds((prev) => [...prev, currentModule.id]);
                            toast.success('Reading verified! You can now mark this lesson as complete.');
                          }
                        }
                      }}
                      className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-5 text-xs leading-relaxed text-slate-300 max-h-[380px] overflow-y-auto space-y-4"
                    >
                      <div className="whitespace-pre-line leading-relaxed font-sans text-[13px]">
                        {currentModule?.bodyText || (currentModule as any)?.body_text || (
                          <p className="text-slate-400 italic">
                            Welcome to this lesson! Review the video or document concepts covered in this module, read the explanations, and click "Mark Lesson Complete & Continue" to update your progress.
                          </p>
                        )}
                      </div>

                      {/* Bottom End-of-Reading Marker */}
                      <div
                        ref={(el) => {
                          if (el && currentModule && !scrolledModuleIds.includes(currentModule.id)) {
                            const observer = new IntersectionObserver(
                              ([entry]) => {
                                if (entry.isIntersecting) {
                                  setScrolledModuleIds((prev) => [...prev, currentModule.id]);
                                }
                              },
                              { threshold: 0.8 }
                            );
                            observer.observe(el);
                          }
                        }}
                        className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <CheckCircle className="w-4 h-4" /> End of lesson reading material reached
                        </span>
                        {currentModule && !completedModuleIds.includes(currentModule.id) && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                            Reading Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Resources */}
                {playerTab === 'resources' && (
                  <div className="space-y-3">
                    {mediaInfo.rawUrl ? (
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/20 text-primary rounded-lg">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Attachment / Resource Link</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-sm">{mediaInfo.rawUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={mediaInfo.rawUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1 border-slate-700 text-slate-200">
                              Open Link <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                          <a href={mediaInfo.rawUrl} download target="_blank" rel="noreferrer">
                            <Button size="sm" className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground">
                              <Download className="w-3 h-3" /> Download
                            </Button>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-4 text-center">No supplementary attachments for this lesson.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Course Curriculum Playlist (30%) */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 flex flex-col shrink-0">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Course Curriculum</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {completedModuleIds.length} of {totalCourseModules} completed
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-slate-800 border-slate-700 text-emerald-400">
                  {currentProgressPct}%
                </Badge>
              </div>

              {/* Lessons List with Strict Sequential Locking */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {activeCourseData?.modules?.map((mod, idx) => {
                  const isSelected = selectedModuleIndex === idx;
                  const isDone = completedModuleIds.includes(mod.id);
                  const unlocked = isModuleUnlocked(idx);

                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleSelectLesson(idx, mod)}
                      className={`w-full p-3 rounded-xl text-left text-xs transition-all flex items-start justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-primary text-white font-bold shadow-md ring-1 ring-primary/50'
                          : isDone
                          ? 'bg-emerald-500/10 text-slate-200 hover:bg-emerald-500/20 border border-emerald-500/20'
                          : unlocked
                          ? 'bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 border border-slate-800/40'
                          : 'bg-slate-950/40 text-slate-600 border border-slate-900/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {isDone ? (
                          <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : unlocked ? (
                          <span
                            className={`mt-0.5 w-4 h-4 rounded-full border text-[9px] flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-white text-white' : 'border-slate-600 text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        ) : (
                          <div className="mt-0.5 w-4 h-4 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`truncate text-xs ${isSelected ? 'text-white' : unlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                            {mod.name}
                          </p>
                          <span className={`text-[10px] ${isSelected ? 'text-slate-200' : unlocked ? 'text-slate-400' : 'text-slate-600'}`}>
                            {mod.contentType || 'Lesson'} • {mod.durationMinutes || 10}m
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-white/20 text-white rounded shrink-0">
                          Viewing
                        </span>
                      ) : !unlocked ? (
                        <span className="text-[9px] font-semibold text-slate-600 uppercase">
                          Locked
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {/* Final Step: MCQ Assessment Verification Tile */}
                <div
                  onClick={handleStartFinalAssessment}
                  className={`mt-3 p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    allModulesCompleted
                      ? 'bg-gradient-to-r from-amber-500/20 via-primary/20 to-emerald-500/20 border-amber-500/40 text-amber-200 hover:scale-[1.01] shadow-md'
                      : 'bg-slate-950/40 border-slate-900/80 text-slate-600 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${allModulesCompleted ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-600'}`}>
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate">Final MCQ Examination</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {allModulesCompleted ? 'Required to earn Certificate' : 'Complete all lessons to unlock'}
                      </p>
                    </div>
                  </div>

                  {allModulesCompleted ? (
                    <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 shrink-0 animate-pulse">
                      READY
                    </Badge>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                </div>
              </div>

              {/* Sidebar Assessment / Certificate Shortcut */}
              <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2">
                <Button
                  size="sm"
                  disabled={!allModulesCompleted}
                  onClick={handleStartFinalAssessment}
                  className={`w-full h-8 text-xs font-bold gap-1.5 ${
                    allModulesCompleted
                      ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      : 'border-slate-800 bg-slate-950 text-slate-600 opacity-60'
                  }`}
                  variant="outline"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  {allModulesCompleted ? 'Take Skill Assessment' : 'Exam Locked (Finish Lessons)'}
                </Button>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Control Bar */}
          <div className="px-5 py-3.5 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedModuleIndex === 0}
              onClick={() => setSelectedModuleIndex(selectedModuleIndex - 1)}
              className="text-xs font-bold gap-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous Lesson
            </Button>

            <div className="flex items-center gap-3">
              {allModulesCompleted && selectedModuleIndex === (activeCourseData?.modules?.length || 1) - 1 ? (
                <Button
                  size="sm"
                  onClick={handleStartFinalAssessment}
                  className="text-xs font-black gap-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 px-5 shadow-lg shadow-amber-950/40"
                >
                  <Award className="w-4 h-4" /> Take Final MCQ Exam & Claim Certificate
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : currentModule ? (
                isReadingModule && !completedModuleIds.includes(currentModule.id) && !hasScrolledToBottom ? (
                  <Button
                    size="sm"
                    disabled
                    className="text-xs font-bold gap-2 bg-slate-800 text-slate-400 border border-slate-700 px-4 cursor-not-allowed opacity-85"
                    title="Please scroll down to the bottom of the reading notes/document to complete this lesson"
                  >
                    <FileText className="w-4 h-4 text-amber-400 animate-bounce" />
                    Scroll to Bottom to Complete (Read Required) ↓
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={isMarkingDone}
                    onClick={() => handleCompleteModule(currentModule)}
                    className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 shadow-lg shadow-emerald-950/40"
                  >
                    {isMarkingDone ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {completedModuleIds.includes(currentModule.id)
                      ? 'Lesson Completed (Next)'
                      : 'Mark Lesson Complete & Continue'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

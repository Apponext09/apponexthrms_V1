import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Clock,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  FileText,
  Video,
  Link2,
  HelpCircle,
  ExternalLink,
  Filter,
  Upload,
  Paperclip,
  File,
  Check,
  FileCheck,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useLmsCourses,
  useLmsCategories,
  useCreateLmsCourse,
  useUpdateLmsCourse,
  useDeleteLmsCourse,
  useLmsModules,
  useCreateLmsModule,
  useUpdateLmsModule,
  useDeleteLmsModule,
  useAdminLmsAssessment,
  useSaveLmsAssessment,
} from '../api/useLms';
import { useLmsIntegrationSettings } from '../api/useLms';
import type { LmsCourse, LmsQuestion, LmsModule } from '../types/lms.types';
import { toast } from 'sonner';
import { LmsIntegrationImportModal } from '../components/LmsIntegrationImportModal';

export function CourseManagementPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);

  // Modals state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<LmsCourse | null>(null);
  const [activeCourseTab, setActiveCourseTab] = useState<'info' | 'curriculum' | 'assessment'>('info');

  // Integration import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Integration settings — drives visibility of the 'Import from Platform' button
  const { data: integrationSettings = [] } = useLmsIntegrationSettings();
  const anyIntegrationEnabled = integrationSettings.some((s) => s.isEnabled);

  // Course Form state
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    categoryId: undefined as number | undefined,
    type: 'self_paced' as 'self_paced' | 'blended' | 'instructor_led',
    durationHours: 1,
    skillTags: '' as string,
    thumbnailUrl: '',
    isMandatory: false,
    deadlineDays: 30,
    passPercentage: 60,
    attemptLimit: 3,
    status: 'published' as 'draft' | 'published' | 'archived',
  });

  // Module state for curriculum tab
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [moduleForm, setModuleForm] = useState({
    name: '',
    contentType: 'video' as 'video' | 'pdf' | 'ppt' | 'link' | 'text',
    contentUrl: '',
    bodyText: '',
    durationMinutes: 10,
  });

  // Document upload state (Base64)
  const [docInputMode, setDocInputMode] = useState<'upload' | 'url'>('upload');
  const [uploadedDocFileName, setUploadedDocFileName] = useState<string | null>(null);
  const [uploadedDocFileSize, setUploadedDocFileSize] = useState<string | null>(null);

  // Assessment questions state
  const [assessmentForm, setAssessmentForm] = useState({
    title: 'Final Assessment',
    passPercentage: 60,
    attemptLimit: 3,
    timerSeconds: 1800,
    questions: [] as LmsQuestion[],
  });

  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    marks: 1,
  });

  // API Hooks
  const { data: courses = [], isLoading } = useLmsCourses({
    categoryId: selectedCategory,
    status: selectedStatus,
    type: selectedType,
    search,
  });
  const { data: categories = [] } = useLmsCategories();

  const createCourseMutation = useCreateLmsCourse();
  const updateCourseMutation = useUpdateLmsCourse();
  const deleteCourseMutation = useDeleteLmsCourse();

  // Selected course sub-data hooks (for curriculum & assessment)
  const { data: courseModules = [] } = useLmsModules(editingCourse?.id || 0);
  const createModuleMutation = useCreateLmsModule();
  const updateModuleMutation = useUpdateLmsModule();
  const deleteModuleMutation = useDeleteLmsModule();

  const { data: adminAssessment } = useAdminLmsAssessment(editingCourse?.id || 0);
  const saveAssessmentMutation = useSaveLmsAssessment();

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setEditingModuleId(null);
    setModuleForm({
      name: '',
      contentType: 'video',
      contentUrl: '',
      bodyText: '',
      durationMinutes: 10,
    });
    setUploadedDocFileName(null);
    setUploadedDocFileSize(null);
    setCourseForm({
      title: '',
      description: '',
      categoryId: categories[0]?.id || undefined,
      type: 'self_paced',
      durationHours: 2,
      skillTags: '',
      thumbnailUrl: '',
      isMandatory: false,
      deadlineDays: 30,
      passPercentage: 60,
      attemptLimit: 3,
      status: 'published',
    });
    setActiveCourseTab('info');
    setIsCourseModalOpen(true);
  };

  const handleOpenEditModal = (course: LmsCourse) => {
    setEditingCourse(course);
    setEditingModuleId(null);
    setModuleForm({
      name: '',
      contentType: 'video',
      contentUrl: '',
      bodyText: '',
      durationMinutes: 10,
    });
    setUploadedDocFileName(null);
    setUploadedDocFileSize(null);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      categoryId: course.categoryId || course.category_id || undefined,
      type: course.type || 'self_paced',
      durationHours: Number(course.durationHours || course.duration_hours || 0),
      skillTags: Array.isArray(course.skillTags || course.skill_tags)
        ? (course.skillTags || course.skill_tags)!.join(', ')
        : '',
      thumbnailUrl: course.thumbnailUrl || course.thumbnail_url || '',
      isMandatory: Boolean(course.isMandatory ?? (course as any).is_mandatory),
      deadlineDays: Number(course.deadlineDays ?? (course as any).deadline_days ?? 30),
      passPercentage: Number(course.passPercentage ?? (course as any).pass_percentage ?? 60),
      attemptLimit: Number(course.attemptLimit ?? (course as any).attempt_limit ?? 3),
      status: course.status || 'published',
    });

    if (adminAssessment) {
      setAssessmentForm({
        title: adminAssessment.title || 'Course Assessment',
        passPercentage: adminAssessment.passPercentage || 60,
        attemptLimit: adminAssessment.attemptLimit || 3,
        timerSeconds: adminAssessment.timerSeconds || 1800,
        questions: adminAssessment.questions || [],
      });
    }

    setActiveCourseTab('info');
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...courseForm,
      durationHours: Number(courseForm.durationHours),
      deadlineDays: Number(courseForm.deadlineDays),
      passPercentage: Number(courseForm.passPercentage),
      attemptLimit: Number(courseForm.attemptLimit),
      skillTags: courseForm.skillTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (editingCourse) {
      await updateCourseMutation.mutateAsync({ id: editingCourse.id, data: payload });
    } else {
      const created = await createCourseMutation.mutateAsync(payload);
      setEditingCourse(created);
      setActiveCourseTab('curriculum');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error('File exceeds 30MB limit. Please choose a smaller file or provide a cloud link.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setModuleForm((prev) => ({ ...prev, contentUrl: base64 }));
      setUploadedDocFileName(file.name);
      setUploadedDocFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      toast.success(`Loaded document "${file.name}" (Base64 ready)`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUploadedFile = () => {
    setModuleForm((prev) => ({ ...prev, contentUrl: '' }));
    setUploadedDocFileName(null);
    setUploadedDocFileSize(null);
  };

  const handleStartEditModule = (mod: LmsModule) => {
    setEditingModuleId(mod.id);
    const cType = (mod.contentType || (mod as any).content_type || 'video') as 'video' | 'pdf' | 'ppt' | 'link' | 'text';
    const cUrl = mod.contentUrl || (mod as any).content_url || '';
    const bText = mod.bodyText || (mod as any).body_text || '';
    const dur = Number(mod.durationMinutes || (mod as any).duration_minutes || 10);

    setModuleForm({
      name: mod.name,
      contentType: cType,
      contentUrl: cUrl,
      bodyText: bText,
      durationMinutes: dur,
    });

    if (cUrl && cUrl.startsWith('data:')) {
      setDocInputMode('upload');
      setUploadedDocFileName('Stored Base64 Document (Ready to replace or keep)');
      setUploadedDocFileSize('Attached');
    } else {
      setUploadedDocFileName(null);
      setUploadedDocFileSize(null);
      if (cUrl && (cType === 'pdf' || cType === 'ppt')) {
        setDocInputMode('url');
      }
    }
  };

  const handleCancelEditModule = () => {
    setEditingModuleId(null);
    setModuleForm({
      name: '',
      contentType: 'video',
      contentUrl: '',
      bodyText: '',
      durationMinutes: 10,
    });
    setUploadedDocFileName(null);
    setUploadedDocFileSize(null);
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    if (moduleForm.contentType === 'pdf' && !moduleForm.contentUrl) {
      toast.error('Please upload a PDF/Word file or provide a document link');
      return;
    }

    if (editingModuleId) {
      await updateModuleMutation.mutateAsync({
        id: editingModuleId,
        data: {
          courseId: editingCourse.id,
          name: moduleForm.name,
          contentType: moduleForm.contentType,
          contentUrl: moduleForm.contentUrl || null,
          bodyText: moduleForm.bodyText || null,
          durationMinutes: Number(moduleForm.durationMinutes),
        },
      });
      setEditingModuleId(null);
    } else {
      await createModuleMutation.mutateAsync({
        courseId: editingCourse.id,
        name: moduleForm.name,
        contentType: moduleForm.contentType,
        contentUrl: moduleForm.contentUrl || null,
        bodyText: moduleForm.bodyText || null,
        durationMinutes: Number(moduleForm.durationMinutes),
        sequence: courseModules.length + 1,
      });
    }

    setModuleForm({
      name: '',
      contentType: 'video',
      contentUrl: '',
      bodyText: '',
      durationMinutes: 10,
    });
    setUploadedDocFileName(null);
    setUploadedDocFileSize(null);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast.error('Question text is required');
      return;
    }
    const filteredOptions = newQuestion.options.filter((o) => o.trim() !== '');
    if (filteredOptions.length < 2) {
      toast.error('Please enter at least 2 options');
      return;
    }

    const questionObj: LmsQuestion = {
      id: Date.now(),
      question: newQuestion.question,
      options: filteredOptions,
      correctIndex: Number(newQuestion.correctIndex),
      marks: Number(newQuestion.marks) || 1,
    };

    setAssessmentForm((prev) => ({
      ...prev,
      questions: [...prev.questions, questionObj],
    }));

    setNewQuestion({
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      marks: 1,
    });
    toast.success('Question added to test draft');
  };

  const handleSaveAssessment = async () => {
    if (!editingCourse) return;
    if (assessmentForm.questions.length === 0) {
      toast.error('Add at least one question before saving');
      return;
    }

    await saveAssessmentMutation.mutateAsync({
      id: adminAssessment?.id,
      data: {
        courseId: editingCourse.id,
        title: assessmentForm.title,
        passPercentage: Number(assessmentForm.passPercentage),
        attemptLimit: Number(assessmentForm.attemptLimit),
        timerSeconds: Number(assessmentForm.timerSeconds),
        questions: assessmentForm.questions,
      },
    });
  };

  const handleDeleteCourse = async (id: number) => {
    if (await window.appConfirm('Are you sure you want to delete this course?')) {
      await deleteCourseMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Course Catalog & Curriculum Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, publish, and manage structured training courses, video lessons, and MCQ tests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 'Import from Udemy' button — only visible when Udemy integration is enabled */}
          {anyIntegrationEnabled && (
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/40"
            >
              <ExternalLink className="w-4 h-4" />
              Import from Udemy
            </Button>
          )}
          <Button
            onClick={handleOpenCreateModal}
            className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg"
          >
            <Plus className="w-4 h-4" /> Create New Course
          </Button>
        </div>
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-lg bg-background"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 text-xs rounded-lg border border-border bg-background px-3 font-semibold text-foreground focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus || ''}
            onChange={(e) => setSelectedStatus(e.target.value || undefined)}
            className="h-9 text-xs rounded-lg border border-border bg-background px-3 font-semibold text-foreground focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value || undefined)}
            className="h-9 text-xs rounded-lg border border-border bg-background px-3 font-semibold text-foreground focus:outline-hidden"
          >
            <option value="">All Formats</option>
            <option value="self_paced">Self-Paced</option>
            <option value="blended">Blended</option>
            <option value="instructor_led">Instructor-Led</option>
          </select>
        </div>
      </div>

      {/* ── Courses Grid ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/40 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border/80 rounded-xl shadow-2xs">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Courses Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Get started by creating your first course with structured modules and assessments.
          </p>
          <Button onClick={handleOpenCreateModal} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Create Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const isPub = course.status === 'published';
            const duration = Number(course.durationHours || course.duration_hours || 0);
            const modCount = Number(course.moduleCount || course.module_count || 0);
            const enrolledCount = Number(course.enrolledCount || course.enrolled_count || 0);

            return (
              <Card
                key={course.id}
                className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between bg-card overflow-hidden group"
              >
                <div>
                  {/* Top Thumbnail / Banner */}
                  <div className="h-32 bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 relative p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          isPub
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : course.status === 'draft'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {course.status?.toUpperCase()}
                      </Badge>
                      {course.isMandatory || (course as any).is_mandatory ? (
                        <Badge className="bg-rose-500 text-white text-[9px] font-bold">
                          MANDATORY
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] font-bold">
                          {course.type === 'self_paced' ? 'Self-Paced' : course.type === 'blended' ? 'Blended' : 'Live Batch'}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                        {course.categoryName || course.category_name || 'General'}
                      </span>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {course.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold pt-2 border-t border-border/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> {duration} hrs
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-primary" /> {modCount} Lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary" /> {enrolledCount} Enrolled
                      </span>
                    </div>
                  </CardContent>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditModal(course)}
                    className="h-8 text-xs font-semibold gap-1.5 flex-1 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Curriculum
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCourse(course.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Course Modal ────────────────────────── */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              {editingCourse ? `Edit Course: ${editingCourse.title}` : 'Create New Course'}
            </DialogTitle>
          </DialogHeader>

          {/* Tab Selection */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Button
              size="sm"
              variant={activeCourseTab === 'info' ? 'default' : 'ghost'}
              onClick={() => setActiveCourseTab('info')}
              className="text-xs font-bold gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> 1. Course Details
            </Button>
            <Button
              size="sm"
              variant={activeCourseTab === 'curriculum' ? 'default' : 'ghost'}
              disabled={!editingCourse}
              onClick={() => setActiveCourseTab('curriculum')}
              className="text-xs font-bold gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" /> 2. Modules ({courseModules.length})
            </Button>
            <Button
              size="sm"
              variant={activeCourseTab === 'assessment' ? 'default' : 'ghost'}
              disabled={!editingCourse}
              onClick={() => setActiveCourseTab('assessment')}
              className="text-xs font-bold gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" /> 3. MCQ Assessment
            </Button>
          </div>

          {/* ── Tab 1: Course Info ────────────────────────────── */}
          {activeCourseTab === 'info' && (
            <form onSubmit={handleSaveCourse} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold">Course Title *</Label>
                  <Input
                    required
                    placeholder="e.g. Fullstack React & Node.js Masterclass"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold">Course Overview & Objectives</Label>
                  <Textarea
                    rows={3}
                    placeholder="Brief description of what learners will master..."
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Category</Label>
                  <select
                    value={courseForm.categoryId || ''}
                    onChange={(e) => setCourseForm({ ...courseForm, categoryId: Number(e.target.value) || undefined })}
                    className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Training Format</Label>
                  <select
                    value={courseForm.type}
                    onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value as any })}
                    className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
                  >
                    <option value="self_paced">Self-Paced (On-Demand Video/Docs)</option>
                    <option value="blended">Blended (Self-paced + Live Batch)</option>
                    <option value="instructor_led">Instructor-Led Virtual/Classroom</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Estimated Duration (Hours)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={courseForm.durationHours}
                    onChange={(e) => setCourseForm({ ...courseForm, durationHours: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Pass Percentage (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={courseForm.passPercentage}
                    onChange={(e) => setCourseForm({ ...courseForm, passPercentage: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Skill Tags (comma separated)</Label>
                  <Input
                    placeholder="React, TypeScript, CSS, Architecture"
                    value={courseForm.skillTags}
                    onChange={(e) => setCourseForm({ ...courseForm, skillTags: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Publishing Status</Label>
                  <select
                    value={courseForm.status}
                    onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value as any })}
                    className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
                  >
                    <option value="published">Published (Visible to Learners)</option>
                    <option value="draft">Draft (Admin editing only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="mandatoryCheck"
                    checked={courseForm.isMandatory}
                    onChange={(e) => setCourseForm({ ...courseForm, isMandatory: e.target.checked })}
                    className="w-4 h-4 rounded text-primary border-border"
                  />
                  <Label htmlFor="mandatoryCheck" className="text-xs font-bold cursor-pointer">
                    Mark as Mandatory / Compliance Course (Assigned to all eligible employees)
                  </Label>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCourseModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {editingCourse ? 'Save Changes' : 'Create & Continue'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ── Tab 2: Curriculum (Modules) ─────────────────────── */}
          {activeCourseTab === 'curriculum' && editingCourse && (
            <div className="space-y-5 pt-2">
              {/* Existing Modules List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Lessons & Modules ({courseModules.length})
                </h4>
                {courseModules.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3">
                    No lessons added yet. Fill the form below to add lessons to this course.
                  </p>
                ) : (
                  <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden">
                    {courseModules.map((mod, idx) => {
                      const isEditingThis = editingModuleId === mod.id;
                      return (
                        <div
                          key={mod.id}
                          className={`p-3 transition-colors flex items-center justify-between gap-3 text-xs ${
                            isEditingThis ? 'bg-primary/10 border-l-4 border-l-primary' : 'bg-card hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 ${
                                isEditingThis
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{mod.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                                <span className="capitalize">{mod.contentType || (mod as any).content_type}</span> •{' '}
                                <span>{mod.durationMinutes || (mod as any).duration_minutes || 0} mins</span>
                                {isEditingThis && (
                                  <span className="text-primary font-bold ml-1 bg-primary/15 px-1.5 py-0.5 rounded text-[9px]">
                                    Editing now...
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant={isEditingThis ? 'default' : 'ghost'}
                              onClick={() => (isEditingThis ? handleCancelEditModule() : handleStartEditModule(mod))}
                              className={`h-7 w-7 p-0 ${
                                isEditingThis
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                              }`}
                              title={isEditingThis ? 'Cancel Editing' : 'Edit Lesson / Module'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteModuleMutation.mutate({ id: mod.id, courseId: editingCourse.id })}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add / Edit Module Form with Dynamic Content Type Controls */}
              <form
                onSubmit={handleAddModule}
                className={`p-4 border rounded-xl space-y-3.5 transition-all ${
                  editingModuleId
                    ? 'bg-primary/5 border-primary/50 shadow-sm ring-1 ring-primary/20'
                    : 'bg-muted/20 border-border/80'
                }`}
              >
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    {editingModuleId ? (
                      <>
                        <Edit2 className="w-3.5 h-3.5 text-primary" /> Edit Lesson / Module
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-primary" /> Add New Lesson / Module
                      </>
                    )}
                  </h5>
                  <div className="flex items-center gap-2">
                    {editingModuleId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEditModule}
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                      >
                        <X className="w-3 h-3" /> Cancel Edit
                      </Button>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20">
                      {moduleForm.contentType}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-[11px] font-bold">Lesson Title *</Label>
                    <Input
                      required
                      placeholder="e.g. Module 1: Introduction & Architecture Overview"
                      value={moduleForm.name}
                      onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Content Type</Label>
                    <select
                      value={moduleForm.contentType}
                      onChange={(e) => setModuleForm({ ...moduleForm, contentType: e.target.value as any })}
                      className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground font-semibold"
                    >
                      <option value="video">📹 Video URL (YouTube / Vimeo / MP4)</option>
                      <option value="pdf">📄 PDF Document / Word / Slides</option>
                      <option value="ppt">📊 Presentation PPT / Slides</option>
                      <option value="link">🔗 External Article / Reference Link</option>
                      <option value="text">📖 Rich Reading Text & Article</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Estimated Duration (Mins)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={moduleForm.durationMinutes}
                      onChange={(e) => setModuleForm({ ...moduleForm, durationMinutes: Number(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Dynamic Inputs Based on Selected Content Type */}
                  {moduleForm.contentType === 'video' && (
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[11px] font-bold flex items-center justify-between">
                        <span>Video Stream URL (YouTube / Vimeo / MP4) *</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Auto-embeds inside cinema player</span>
                      </Label>
                      <Input
                        required
                        placeholder="e.g. https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                        value={moduleForm.contentUrl}
                        onChange={(e) => setModuleForm({ ...moduleForm, contentUrl: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {moduleForm.contentType === 'pdf' && (
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold">PDF / Word Document Source *</Label>
                        <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
                          <button
                            type="button"
                            onClick={() => setDocInputMode('upload')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                              docInputMode === 'upload' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Upload className="w-3 h-3 inline mr-1" /> Upload File (Base64)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocInputMode('url')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                              docInputMode === 'url' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Link2 className="w-3 h-3 inline mr-1" /> Cloud / Web Link
                          </button>
                        </div>
                      </div>

                      {docInputMode === 'upload' ? (
                        uploadedDocFileName ? (
                          <div className="p-3 bg-card border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
                                <FileCheck className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{uploadedDocFileName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {uploadedDocFileSize} • Base64 Encoded Ready
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveUploadedFile}
                              className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                            >
                              Remove / Change
                            </Button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-card/60 hover:bg-primary/5 transition-all">
                            <Upload className="w-6 h-6 text-primary mb-1.5" />
                            <span className="text-xs font-bold text-foreground">Click to upload PDF or Word Document</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              Supports .pdf, .doc, .docx, .ppt, .pptx files (Up to 30MB, stored as Base64)
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        )
                      ) : (
                        <Input
                          required={docInputMode === 'url'}
                          placeholder="e.g. https://example.com/handbook.pdf or Google Drive / OneDrive preview link"
                          value={moduleForm.contentUrl}
                          onChange={(e) => setModuleForm({ ...moduleForm, contentUrl: e.target.value })}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  )}

                  {moduleForm.contentType === 'ppt' && (
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[11px] font-bold flex items-center justify-between">
                        <span>Presentation Slides Embed Link *</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Google Slides / SlideShare link</span>
                      </Label>
                      <Input
                        required
                        placeholder="e.g. https://docs.google.com/presentation/d/.../embed or slides URL"
                        value={moduleForm.contentUrl}
                        onChange={(e) => setModuleForm({ ...moduleForm, contentUrl: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {moduleForm.contentType === 'link' && (
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[11px] font-bold flex items-center justify-between">
                        <span>External Tutorial / Article URL *</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Opens in interactive frame</span>
                      </Label>
                      <Input
                        required
                        placeholder="e.g. https://developer.mozilla.org/... or https://react.dev"
                        value={moduleForm.contentUrl}
                        onChange={(e) => setModuleForm({ ...moduleForm, contentUrl: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {moduleForm.contentType === 'text' && (
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[11px] font-bold flex items-center justify-between">
                        <span>Supplementary Attachment URL / Resource Link (Optional)</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Code repo or cheatsheet</span>
                      </Label>
                      <Input
                        placeholder="e.g. https://github.com/... or download file link"
                        value={moduleForm.contentUrl}
                        onChange={(e) => setModuleForm({ ...moduleForm, contentUrl: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {/* Rich Notes / Instructions Text Area for all modules */}
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-[11px] font-bold flex items-center justify-between">
                      <span>
                        {moduleForm.contentType === 'text'
                          ? 'Complete Lesson Reading Content & Documentation *'
                          : 'Lesson Notes, Key Takeaways & Reading Guide (Optional)'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {moduleForm.contentType === 'text' ? 'Requires learner scroll-through' : 'Markdown & notes supported'}
                      </span>
                    </Label>
                    <Textarea
                      required={moduleForm.contentType === 'text'}
                      rows={moduleForm.contentType === 'text' ? 5 : 3}
                      placeholder={
                        moduleForm.contentType === 'text'
                          ? 'Write the comprehensive lesson content, step-by-step instructions, code snippets, and explanations here...'
                          : 'Add key concepts covered in this module, summary bullet points, or instructions for the learner...'
                      }
                      value={moduleForm.bodyText}
                      onChange={(e) => setModuleForm({ ...moduleForm, bodyText: e.target.value })}
                      className="text-xs resize-y"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <Button type="submit" size="sm" className="h-8 text-xs font-bold gap-1">
                    {editingModuleId ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Update Lesson
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add Lesson to Curriculum
                      </>
                    )}
                  </Button>
                  {editingModuleId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditModule}
                      className="h-8 text-xs"
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ── Tab 3: Assessment Setup ────────────────────────── */}
          {activeCourseTab === 'assessment' && editingCourse && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border/80 rounded-xl">
                <div>
                  <Label className="text-[11px] font-bold">Pass Mark (%)</Label>
                  <Input
                    type="number"
                    value={assessmentForm.passPercentage}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, passPercentage: Number(e.target.value) })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold">Allowed Retries</Label>
                  <Input
                    type="number"
                    value={assessmentForm.attemptLimit}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, attemptLimit: Number(e.target.value) })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold">Timer (Seconds)</Label>
                  <Input
                    type="number"
                    value={assessmentForm.timerSeconds}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, timerSeconds: Number(e.target.value) })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-foreground">
                  Questions in Test ({assessmentForm.questions.length})
                </h5>
                {assessmentForm.questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3 bg-card border border-border/80 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-foreground">
                        Q{qIdx + 1}: {q.question}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setAssessmentForm((prev) => ({
                            ...prev,
                            questions: prev.questions.filter((_, i) => i !== qIdx),
                          }))
                        }
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-1.5 rounded-md border ${
                            Number(q.correctIndex) === oIdx
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-bold'
                              : 'bg-muted/30 border-border text-muted-foreground'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt} {Number(q.correctIndex) === oIdx && '✓'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question Box */}
              <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-3">
                <h6 className="text-xs font-bold text-foreground">Add Multiple Choice Question</h6>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter question prompt..."
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {newQuestion.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={newQuestion.correctIndex === optIdx}
                          onChange={() => setNewQuestion({ ...newQuestion, correctIndex: optIdx })}
                          className="text-primary"
                        />
                        <Input
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...newQuestion.options];
                            next[optIdx] = e.target.value;
                            setNewQuestion({ ...newQuestion, options: next });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleAddQuestion} className="h-8 text-xs font-bold gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </Button>
                  <Button type="button" size="sm" onClick={handleSaveAssessment} className="h-8 text-xs font-bold gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Save Assessment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Integration Import Modal — rendered outside main Dialog to avoid nesting issues */}
      <LmsIntegrationImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}

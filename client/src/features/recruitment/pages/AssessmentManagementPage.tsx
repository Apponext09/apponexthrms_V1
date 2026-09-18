import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Eye, Clock, CheckCircle, XCircle, Code2, ListChecks, FileText, Link2, Printer, Download, Layers } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface Assessment {
  id: number;
  uuid: string;
  assessmentName: string;
  assessmentType: string;
  durationMinutes: number;
  passingScore: number;
  description: string | null;
  departmentId?: number | null;
  designationId?: number | null;
  departmentName?: string | null;
  designationName?: string | null;
  createdAt: string;
}

interface AttemptRecord {
  id: number;
  uuid: string;
  applicationId: number;
  assessmentId: number;
  attemptNumber: number;
  status: string;
  score: number | null;
  startedAt: string | null;
  completedAt: string | null;
  candidateName?: string;
  candidateEmail?: string;
}

const ASSESSMENT_TYPES = [
  { value: 'coding', label: 'Coding Challenge', icon: Code2, color: 'bg-blue-100 text-blue-700' },
  { value: 'mcq', label: 'MCQ Test', icon: ListChecks, color: 'bg-green-100 text-green-700' },
  { value: 'form', label: 'Subjective Form', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  { value: 'hybrid', label: 'Hybrid Test (MCQ + Coding)', icon: Layers, color: 'bg-indigo-100 text-indigo-700' },
];

export const AssessmentManagementPage: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Departments & Designations list for cascading dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  // Create/Edit Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('coding');
  const [formDuration, setFormDuration] = useState('45');
  const [formPassingScore, setFormPassingScore] = useState('70');
  const [formDescription, setFormDescription] = useState('');
  const [formAllowReattempt, setFormAllowReattempt] = useState<boolean>(true);
  const [formDepartmentId, setFormDepartmentId] = useState<string>('');
  const [formDesignationId, setFormDesignationId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Attempts Viewer Dialog
  const [showAttemptsDialog, setShowAttemptsDialog] = useState(false);
  const [viewingAssessment, setViewingAssessment] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Delete Confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Question Editor State
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [selectedQuestionsAssessment, setSelectedQuestionsAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Question Form State
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('mcq');
  const [questionMarks, setQuestionMarks] = useState('1');
  const [questionExplanation, setQuestionExplanation] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);

  const fetchQuestions = (assessmentId: number) => {
    setLoadingQuestions(true);
    apiClient.get(`/recruitment/assessments/${assessmentId}/questions`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setQuestions(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load questions', err);
        toast.error('Failed to load questions');
      })
      .finally(() => setLoadingQuestions(false));
  };

  const openQuestionsDialog = (assessment: Assessment) => {
    setSelectedQuestionsAssessment(assessment);
    fetchQuestions(assessment.id);
    resetQuestionForm();
    setShowQuestionsDialog(true);
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setQuestionType('mcq');
    setQuestionMarks('1');
    setQuestionExplanation('');
    setQuestionAnswer('');
    setMcqOptions(['', '', '', '']);
  };

  const handleAddOrUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionsAssessment) return;

    const payload = {
      questionText,
      questionType,
      marks: parseInt(questionMarks, 10),
      explanation: questionExplanation || null,
      correctAnswer: questionAnswer || null,
      optionsJson: questionType === 'mcq' ? mcqOptions.filter(o => o.trim() !== '') : null,
    };

    try {
      if (editingQuestion) {
        await apiClient.patch(`/recruitment/assessments/${selectedQuestionsAssessment.id}/questions/${editingQuestion.id}`, payload);
        toast.success('Question updated successfully');
      } else {
        await apiClient.post(`/recruitment/assessments/${selectedQuestionsAssessment.id}/questions`, payload);
        toast.success('Question added successfully');
      }
      fetchQuestions(selectedQuestionsAssessment.id);
      resetQuestionForm();
    } catch (err: any) {
      console.error('Failed to save question', err);
      toast.error(err.response?.data?.error || 'Failed to save question');
    }
  };

  const startEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setQuestionText(q.question_text || q.questionText);
    setQuestionType(q.question_type || q.questionType);
    setQuestionMarks(String(q.marks || 1));
    setQuestionExplanation(q.explanation || '');
    setQuestionAnswer(q.correct_answer || q.correctAnswer || '');
    if (q.options_json || q.optionsJson) {
      try {
        const opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || q.optionsJson);
        if (Array.isArray(opts)) {
          setMcqOptions(opts);
        }
      } catch (e) {
        setMcqOptions(['', '', '', '']);
      }
    } else {
      setMcqOptions(['', '', '', '']);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!selectedQuestionsAssessment) return;
    if (!await window.appConfirm('Are you sure you want to delete this question?')) return;

    try {
      await apiClient.delete(`/recruitment/assessments/${selectedQuestionsAssessment.id}/questions/${questionId}`);
      toast.success('Question deleted successfully');
      fetchQuestions(selectedQuestionsAssessment.id);
      if (editingQuestion?.id === questionId) {
        resetQuestionForm();
      }
    } catch (err) {
      console.error('Failed to delete question', err);
      toast.error('Failed to delete question');
    }
  };

  const fetchAssessments = () => {
    setLoading(true);
    apiClient.get('/recruitment/assessments')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data?.items)) {
          setAssessments(res.data.data.items);
        } else if (res.data?.success && Array.isArray(res.data.data)) {
          setAssessments(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load assessments', err);
        toast.error('Failed to load assessments');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssessments();

    // Fetch Departments list for cascading dropdown
    apiClient.get('/settings/departments', { params: { pageSize: 100 } })
      .catch(() => apiClient.get('/departments'))
      .then(res => {
        const list = res.data?.data?.items || res.data?.data || res.data?.items || res.data || [];
        if (Array.isArray(list)) setDepartments(list);
      })
      .catch(err => console.error('Failed to load departments', err));

    // Fetch Designations list for cascading dropdown
    apiClient.get('/settings/designations', { params: { pageSize: 200 } })
      .catch(() => apiClient.get('/designations'))
      .then(res => {
        const list = res.data?.data?.items || res.data?.data || res.data?.items || res.data || [];
        if (Array.isArray(list)) setDesignations(list);
      })
      .catch(err => console.error('Failed to load designations', err));
  }, []);

  const openCreateDialog = () => {
    setEditingAssessment(null);
    setFormName('');
    setFormType('coding');
    setFormDuration('45');
    setFormPassingScore('70');
    setFormDescription('');
    setFormDepartmentId('');
    setFormDesignationId('');
    setFormAllowReattempt(true);
    setShowCreateDialog(true);
  };

  const openEditDialog = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    setFormName(assessment.assessmentName);
    setFormType(assessment.assessmentType);
    setFormDuration(String(assessment.durationMinutes));
    setFormPassingScore(String(assessment.passingScore));
    setFormDescription(assessment.description || '');
    setFormDepartmentId(assessment.departmentId || (assessment as any).department_id ? String(assessment.departmentId || (assessment as any).department_id) : '');
    setFormDesignationId(assessment.designationId || (assessment as any).designation_id ? String(assessment.designationId || (assessment as any).designation_id) : '');
    setFormAllowReattempt((assessment as any).allowReattempt !== undefined ? Boolean((assessment as any).allowReattempt) : ((assessment as any).allow_reattempt !== undefined ? Boolean((assessment as any).allow_reattempt) : true));
    setShowCreateDialog(true);
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Assessment name is required');
      return;
    }
    setSubmitting(true);

    const payload = {
      assessmentName: formName.trim(),
      assessmentType: formType,
      durationMinutes: Number(formDuration),
      passingScore: Number(formPassingScore),
      description: formDescription.trim() || undefined,
      departmentId: formDepartmentId && formDepartmentId !== 'all' ? Number(formDepartmentId) : null,
      designationId: formDesignationId && formDesignationId !== 'all' ? Number(formDesignationId) : null,
      allowReattempt: formAllowReattempt,
    };

    const request = editingAssessment
      ? apiClient.patch(`/recruitment/assessments/${editingAssessment.id}`, payload)
      : apiClient.post('/recruitment/assessments', payload);

    request
      .then(res => {
        if (res.data?.success) {
          toast.success(editingAssessment ? 'Assessment updated!' : 'Assessment created successfully!');
          setShowCreateDialog(false);
          fetchAssessments();
        } else {
          toast.error(res.data?.message || 'Operation failed');
        }
      })
      .catch(err => {
        console.error('Failed to save assessment', err);
        toast.error('Failed to save assessment');
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = () => {
    if (!deletingId) return;
    apiClient.delete(`/recruitment/assessments/${deletingId}`)
      .then(res => {
        if (res.data?.success) {
          toast.success('Assessment deleted');
          setShowDeleteDialog(false);
          setDeletingId(null);
          fetchAssessments();
        } else {
          toast.error(res.data?.message || 'Failed to delete');
        }
      })
      .catch(err => {
        console.error('Failed to delete assessment', err);
        toast.error('Failed to delete assessment');
      });
  };

  const openAttemptsDialog = (assessment: Assessment) => {
    setViewingAssessment(assessment);
    setShowAttemptsDialog(true);
    setLoadingAttempts(true);
    setAttempts([]);

    // Fetch all attempts for this assessment from all applications
    apiClient.get(`/recruitment/assessments/${assessment.id}/attempts`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setAttempts(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load attempts', err);
        // Silently fail - may not have this endpoint yet
      })
      .finally(() => setLoadingAttempts(false));
  };

  const handleDownloadPdfReport = (attempt: any, assessment: Assessment | null) => {
    let answersData: any[] = [];
    let tabSwitches = 0;
    let faceAbsences = 0;
    try {
      const raw = attempt.answersJson || attempt.answers_json;
      if (raw) {
        answersData = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(answersData) && answersData.length > 0) {
          tabSwitches = answersData[0].tabSwitchCount || 0;
          faceAbsences = answersData[0].faceAbsenceCount || 0;
        }
      }
    } catch (e) {
      console.error('Error parsing answers for PDF', e);
    }

    const candidateName = attempt.candidateName || attempt.candidate_name || `Candidate App #${attempt.applicationId || attempt.application_id}`;
    const candidateEmail = attempt.candidateEmail || attempt.candidate_email || 'N/A';
    const score = attempt.score != null ? attempt.score : 0;
    const passingScore = assessment?.passingScore || 70;
    const isPassed = score >= passingScore;
    const assessmentName = assessment?.assessmentName || 'Assessment Test';
    const assessmentType = (assessment?.assessmentType || 'Coding Challenge').toUpperCase();
    const duration = assessment?.durationMinutes || 60;
    const completedAt = attempt.completedAt || attempt.completed_at ? new Date(attempt.completedAt || attempt.completed_at).toLocaleString('en-IN') : 'N/A';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked! Please allow pop-ups to download PDF report.');
      return;
    }

    const questionsHtml = answersData.map((ans: any, idx: number) => {
      const qNum = ans.questionNumber || idx + 1;
      const qText = ans.questionText || 'Assessment Question';
      const isAnsCorrect = Boolean(ans.isCorrect);
      const ansScore = ans.score || 0;
      const ansMarks = ans.marks || 10;
      const safeAnsText = (ans.answerText || '(No answer provided)').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      let extraDetails = '';
      if (ans.correctAnswer) {
        extraDetails += '<div style="margin-top: 8px; color: #166534; font-size: 11px;"><strong>Expected Correct Answer:</strong> ' + ans.correctAnswer + '</div>';
      }
      if (ans.compilationLog) {
        const testCaseStr = ans.testCasesPassed !== undefined ? (ans.testCasesPassed + '/' + ans.testCasesTotal + ' passed') : 'N/A';
        extraDetails += '<div style="margin-top: 6px; font-size: 10.5px; color: #475569;"><strong>Compiler Log:</strong> ' + ans.compilationLog + ' | <strong>Test Cases:</strong> ' + testCaseStr + '</div>';
      }

      const statusBadge = isAnsCorrect
        ? '<span class="badge-correct">✓ CORRECT (' + ansScore + '/' + ansMarks + ' Marks)</span>'
        : '<span class="badge-incorrect">✗ INCORRECT / NOT ATTEMPTED (0 Marks)</span>';

      return '<div class="q-card">' +
        '<div class="q-head">' +
          '<span>Question #' + qNum + ': ' + qText + '</span>' +
          statusBadge +
        '</div>' +
        '<div class="q-body">' +
          '<div><strong>Submitted Candidate Solution / Answer:</strong></div>' +
          '<div class="ans-code">' + safeAnsText + '</div>' +
          extraDetails +
        '</div>' +
      '</div>';
    }).join('');

    const htmlContent = '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
        '<title>Assessment_Report_' + candidateName.replace(/\s+/g, '_') + '</title>' +
        '<style>' +
          '@media print {' +
            '@page { margin: 12mm; size: A4; }' +
            'body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
          '}' +
          'body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 24px; font-size: 12px; line-height: 1.5; }' +
          '.header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }' +
          '.brand-title { font-size: 22px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }' +
          '.report-subtitle { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }' +
          '.meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-bottom: 20px; }' +
          '.meta-item { display: flex; flex-direction: column; }' +
          '.meta-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }' +
          '.meta-val { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }' +
          '.score-card { background: ' + (isPassed ? '#f0fdf4' : '#fef2f2') + '; border: 1.5px solid ' + (isPassed ? '#86efac' : '#fca5a5') + '; padding: 16px; border-radius: 6px; display: flex; justify-content: space-around; align-items: center; margin-bottom: 20px; text-align: center; }' +
          '.score-num { font-size: 28px; font-weight: 800; color: ' + (isPassed ? '#166534' : '#991b1b') + '; }' +
          '.status-pill { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 800; font-size: 12px; letter-spacing: 0.5px; background: ' + (isPassed ? '#22c55e' : '#ef4444') + '; color: #ffffff; }' +
          '.proctor-box { background: #faf5ff; border: 1px solid #e9d5ff; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 11px; }' +
          '.proctor-title { font-weight: 700; color: #6b21a8; margin-bottom: 6px; text-transform: uppercase; font-size: 10px; }' +
          '.q-section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 14px; }' +
          '.q-card { border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 14px; page-break-inside: avoid; }' +
          '.q-head { background: #f1f5f9; padding: 8px 12px; font-weight: 700; font-size: 11px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; }' +
          '.q-body { padding: 12px; font-size: 11px; }' +
          '.ans-code { background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 10.5px; white-space: pre-wrap; margin-top: 6px; }' +
          '.badge-correct { color: #16a34a; font-weight: 700; }' +
          '.badge-incorrect { color: #dc2626; font-weight: 700; }' +
          '.footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="header">' +
          '<div>' +
            '<div class="brand-title">APPONEXT HRMS</div>' +
            '<div class="report-subtitle">Candidate Assessment Evaluation & Proctor Audit Report</div>' +
          '</div>' +
          '<div style="text-align: right; font-size: 10px; color: #64748b;">' +
            'Generated: ' + new Date().toLocaleString('en-IN') +
          '</div>' +
        '</div>' +

        '<div class="meta-grid">' +
          '<div class="meta-item"><span class="meta-label">Candidate Name</span><span class="meta-val">' + candidateName + '</span></div>' +
          '<div class="meta-item"><span class="meta-label">Candidate Email</span><span class="meta-val">' + candidateEmail + '</span></div>' +
          '<div class="meta-item"><span class="meta-label">Assessment Title</span><span class="meta-val">' + assessmentName + '</span></div>' +
          '<div class="meta-item"><span class="meta-label">Assessment Type</span><span class="meta-val">' + assessmentType + ' (' + duration + ' mins)</span></div>' +
          '<div class="meta-item"><span class="meta-label">Test Completed Date</span><span class="meta-val">' + completedAt + '</span></div>' +
          '<div class="meta-item"><span class="meta-label">Passing Threshold</span><span class="meta-val">' + passingScore + '%</span></div>' +
        '</div>' +

        '<div class="score-card">' +
          '<div>' +
            '<div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Final Achieved Score</div>' +
            '<div class="score-num">' + score + '%</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Evaluation Result</div>' +
            '<div style="margin-top: 4px;">' +
              '<span class="status-pill">' + (isPassed ? 'PASSED' : 'FAILED') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="proctor-box">' +
          '<div class="proctor-title">🛡️ AI Proctoring & Security Audit Trail</div>' +
          '<div style="display: flex; gap: 24px; font-family: monospace;">' +
            '<div>Tab Switch Incidents: <strong>' + tabSwitches + '</strong> ' + (tabSwitches > 0 ? '⚠️ (Warning Logged)' : '✓ (Clean)') + '</div>' +
            '<div>Face Absence Warnings: <strong>' + faceAbsences + '</strong> ' + (faceAbsences > 0 ? '👤 (Warning Logged)' : '✓ (Clean)') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="q-section-title">Question Breakdown & Solutions (' + answersData.length + ')</div>' +

        questionsHtml +

        '<div class="footer">' +
          'Confidential HR Report • Generated by ApponextHRMS Recruitment Suite' +
        '</div>' +
      '</body>' +
      '</html>';

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const getTypeConfig = (type: string) => {
    return ASSESSMENT_TYPES.find(t => t.value === type) || ASSESSMENT_TYPES[0];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">Assigned</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">In Progress</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Completed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 min-h-[calc(100vh-4rem)]">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20 shadow-xs">
            <Code2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Assessment Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Build coding challenges, MCQ tests, subjective forms, and monitor candidate attempts with AI proctoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto">
          <Button onClick={openCreateDialog} className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer whitespace-nowrap">
            <Plus className="w-3.5 h-3.5" /> Create Assessment Profile
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Coding Tests</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{assessments.filter(a => a.assessmentType === 'coding').length}</h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">Algorithmic & Practical</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Code2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">MCQ Tests</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{assessments.filter(a => a.assessmentType === 'mcq').length}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Multi-choice Quiz</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ListChecks className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subjective Forms</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{assessments.filter(a => a.assessmentType === 'form').length}</h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">Long-form Responses</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hybrid Tests</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{assessments.filter(a => a.assessmentType === 'hybrid').length}</h3>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">MCQ + Code combined</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Assessment Table ─────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-border/60">
          <div>
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              All Assessment Tests ({assessments.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Configured question banks and test profiles</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px] border-collapse">
              <TableHeader className="bg-muted/50 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Assessment Title</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Target Dept / Designation</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Format</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Duration</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Passing Score</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Created Date</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground bg-background">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading assessments...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : assessments.length > 0 ? (
                  assessments.map((assessment) => {
                    const typeConfig = getTypeConfig(assessment.assessmentType);
                    const TypeIcon = typeConfig.icon;
                    return (
                      <TableRow key={assessment.id} className="border-border/60 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3 px-5">
                          <div className="font-bold text-xs text-foreground">{assessment.assessmentName}</div>
                          {assessment.description && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-[240px] mt-0.5">{assessment.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full w-fit">
                              🏢 {assessment.departmentName || 'All Departments'}
                            </span>
                            <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full w-fit">
                              💼 {assessment.designationName || 'All Designations'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${typeConfig.color}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            {assessment.durationMinutes} min
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className="inline-flex items-center text-xs font-extrabold font-mono text-foreground px-2 py-0.5 rounded-md bg-muted">
                            {assessment.passingScore}%
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">
                          {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString('en-IN') : '—'}
                        </TableCell>
                        <TableCell className="py-3 px-5 text-right">
                          <div className="flex gap-1 items-center justify-end">
                            <button
                              onClick={() => openAttemptsDialog(assessment)}
                              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors"
                              title="View Attempts & Proctor Reports"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openQuestionsDialog(assessment)}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors"
                              title="Manage Questions"
                            >
                              <ListChecks className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditDialog(assessment)}
                              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
                              title="Edit Assessment"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingId(assessment.id);
                                setShowDeleteDialog(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
                              title="Delete Assessment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground bg-background">
                      No assessments created yet. Click "Create Assessment Profile" to begin.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Assessment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] p-0 flex flex-col overflow-hidden bg-card border-border shadow-xl">
          <DialogHeader className="p-4 sm:px-6 border-b border-border flex-shrink-0 bg-card">
            <DialogTitle className="text-base font-semibold">{editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {editingAssessment ? 'Update the details for this assessment.' : 'Define a new assessment type, passing score, and duration.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrUpdate} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1 max-h-[calc(85vh-120px)]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Assessment Name *</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. JavaScript Coding Challenge"
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  disabled={submitting}
                />
              </div>

              {/* Department & Designation Cascading Selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Department</label>
                  <Select
                    value={formDepartmentId || 'all'}
                    onValueChange={(val) => {
                      setFormDepartmentId(val === 'all' ? '' : val);
                      setFormDesignationId(''); // Reset designation when department changes
                    }}
                    disabled={submitting}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
                      <SelectValue placeholder="Select Department..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto z-[9999]">
                      <SelectItem value="all">All Departments (General)</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.departmentName || d.department_name || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Designation</label>
                  <Select
                    value={formDesignationId || 'all'}
                    onValueChange={(val) => setFormDesignationId(val === 'all' ? '' : val)}
                    disabled={submitting}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
                      <SelectValue placeholder={formDepartmentId && formDepartmentId !== 'all' ? "Select Designation..." : "Select Designation (All)..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto z-[9999]">
                      <SelectItem value="all">All Designations (General)</SelectItem>
                      {designations
                        .filter(desig => {
                          if (!formDepartmentId || formDepartmentId === 'all') return true;
                          const deptId = desig.departmentId || desig.department_id;
                          return !deptId || String(deptId) === String(formDepartmentId);
                        })
                        .map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.designationName || d.designation_name || d.title || d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Type *</label>
                  <Select value={formType} onValueChange={setFormType} disabled={submitting}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {ASSESSMENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Duration (minutes) *</label>
                  <Input
                    type="number"
                    value={formDuration}
                    onChange={e => setFormDuration(e.target.value)}
                    placeholder="45"
                    className="h-8 text-xs bg-background border-border rounded-sm"
                    disabled={submitting}
                    min="5"
                    max="300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Passing Score (%) *</label>
                <Input
                  type="number"
                  value={formPassingScore}
                  onChange={e => setFormPassingScore(e.target.value)}
                  placeholder="70"
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  disabled={submitting}
                  min="0"
                  max="100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Brief description of the assessment..."
                  className="w-full p-2 border border-border rounded bg-background text-xs text-foreground focus:outline-none resize-none"
                  rows={2}
                  disabled={submitting}
                />
              </div>

              {/* Re-attempt & Navigation Permission Setting */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground block">
                  Allow Candidate Question Re-attempt & Navigation? *
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-0.5">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer text-foreground font-medium">
                    <input
                      type="radio"
                      name="allowReattempt"
                      checked={formAllowReattempt === true}
                      onChange={() => setFormAllowReattempt(true)}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={submitting}
                    />
                    <span>Yes (Allow free navigation & answer edit)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer text-foreground font-medium">
                    <input
                      type="radio"
                      name="allowReattempt"
                      checked={formAllowReattempt === false}
                      onChange={() => setFormAllowReattempt(false)}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={submitting}
                    />
                    <span>No (Strict forward order only)</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 sm:px-6 border-t border-border flex-shrink-0 bg-muted/20 flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting} className="text-xs h-8 rounded-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs h-8 rounded-sm">
                {submitting
                  ? (editingAssessment ? 'Updating...' : 'Creating...')
                  : (editingAssessment ? 'Update Assessment' : 'Create Assessment')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Delete Assessment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm deletion of this assessment.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground py-4">
            Are you sure you want to delete this assessment? All related attempt records may be affected. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs h-8 rounded-sm">
              Cancel
            </Button>
            <Button type="button" onClick={handleDelete} className="text-xs h-8 rounded-sm bg-red-600 hover:bg-red-700 text-white">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Bank Dialog */}
      <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Bank — {selectedQuestionsAssessment?.assessmentName}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the questions that candidates will face when taking this assessment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Question Creator/Editor */}
            <Card className="rounded-sm border p-4 bg-card">
              <h3 className="text-xs font-semibold mb-3 text-foreground border-b pb-2">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <form onSubmit={handleAddOrUpdateQuestion} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Question Text *</label>
                  <textarea
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    required
                    placeholder="Enter question content..."
                    className="w-full p-2 border rounded bg-background text-foreground"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Type</label>
                    <Select value={questionType} onValueChange={setQuestionType}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="coding">Coding Challenge</SelectItem>
                        <SelectItem value="text">Subjective Text</SelectItem>
                        <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Marks</label>
                    <Input
                      type="number"
                      value={questionMarks}
                      onChange={e => setQuestionMarks(e.target.value)}
                      className="h-8"
                      min="1"
                    />
                  </div>
                </div>

                {/* Guidance Banner */}
                {questionType === 'coding' && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-blue-600" /> Coding Challenge Question
                    </p>
                    <p className="text-[10px] text-blue-700">
                      ⚡ The Code Editor (IDE) & Compiler will automatically activate on the right side of candidate's screen for this question.
                    </p>
                  </div>
                )}

                {questionType === 'mcq' && (
                  <div className="p-2.5 bg-green-50 border border-green-200 rounded text-[11px] text-green-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-green-600" /> Multiple Choice Question (MCQ)
                    </p>
                    <p className="text-[10px] text-green-700">
                      📝 Candidate will select options (A, B, C, D) on the left. The Code Compiler will remain hidden and Questions Palette will show on the right.
                    </p>
                  </div>
                )}

                {/* MCQ Options */}
                {questionType === 'mcq' && (
                  <div className="space-y-2 pt-1">
                    <label className="font-semibold text-foreground block">Multiple Choice Options</label>
                    {mcqOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-muted-foreground w-4 text-center">{String.fromCharCode(65 + idx)})</span>
                        <Input
                          value={opt}
                          onChange={e => {
                            const copy = [...mcqOptions];
                            copy[idx] = e.target.value;
                            setMcqOptions(copy);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="h-8"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    {questionType === 'coding' ? 'Expected Output / Solution (For Auto-Grading)' : 'Correct Answer'}
                  </label>
                  <Input
                    value={questionAnswer}
                    onChange={e => setQuestionAnswer(e.target.value)}
                    placeholder={questionType === 'mcq' ? 'e.g. Option text or choice letter (A/B/C/D)' : questionType === 'coding' ? 'Expected stdout or test case solution' : 'Expected answer details...'}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Explanation (Optional)</label>
                  <textarea
                    value={questionExplanation}
                    onChange={e => setQuestionExplanation(e.target.value)}
                    placeholder="Provide candidate clarification..."
                    className="w-full p-2 border rounded bg-background text-foreground"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                  {editingQuestion && (
                    <Button type="button" variant="outline" size="sm" onClick={resetQuestionForm}>
                      Cancel Edit
                    </Button>
                  )}
                  <Button type="submit" size="sm">
                    {editingQuestion ? 'Update Question' : 'Add Question'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Questions List */}
            <Card className="rounded-sm border p-4 bg-card flex flex-col max-h-[500px]">
              <h3 className="text-xs font-semibold mb-3 text-foreground border-b pb-2">
                Questions List ({questions.length})
              </h3>
              <div className="overflow-y-auto flex-1 space-y-3">
                {loadingQuestions ? (
                  <p className="text-muted-foreground text-center py-8">Loading questions...</p>
                ) : questions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No questions added yet.</p>
                ) : (
                  questions.map((q, idx) => (
                    <div key={q.id} className="p-3 border rounded bg-background relative hover:border-gray-400 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-bold text-foreground">#{q.question_number || idx + 1}</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => startEditQuestion(q)}
                            className="p-1 hover:bg-yellow-50 text-yellow-600 rounded"
                            title="Edit Question"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="font-medium text-foreground mt-1 line-clamp-3">{q.question_text}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 border-t pt-1">
                        <span className="capitalize">{q.question_type}</span>
                        <span>{q.marks || 1} mark(s)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      {/* Attempts Viewer Dialog - Shows submitted candidate test results */}
      <Dialog open={showAttemptsDialog} onOpenChange={setShowAttemptsDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              <Eye className="w-4 h-4 inline mr-2 text-blue-600" />
              Candidate Attempts — {viewingAssessment?.assessmentName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              All submitted test attempts for this assessment. Click any row to expand answer details & proctoring audit.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loadingAttempts ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm text-muted-foreground">Loading attempts...</span>
              </div>
            ) : attempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-medium text-muted-foreground">No attempts recorded yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Candidates will appear here once they start or complete this assessment.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-card sticky top-0">
                  <TableRow className="border-border">
                    <TableHead className="text-xs font-semibold h-9">Candidate</TableHead>
                    <TableHead className="text-xs font-semibold h-9">Email</TableHead>
                    <TableHead className="text-xs font-semibold h-9">Status</TableHead>
                    <TableHead className="text-xs font-semibold h-9">Score</TableHead>
                    <TableHead className="text-xs font-semibold h-9">Tab Switches</TableHead>
                    <TableHead className="text-xs font-semibold h-9">Face Warnings</TableHead>
                    <TableHead className="text-xs font-semibold h-9">Started</TableHead>
                    <TableHead className="text-xs font-semibold h-9">Completed</TableHead>
                    <TableHead className="text-xs font-semibold h-9 text-right">Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt: any) => {
                    let answersData: any[] = [];
                    let tabSwitches = 0;
                    let faceAbsences = 0;
                    let referencePhoto: string | null = null;
                    try {
                      const raw = attempt.answersJson || attempt.answers_json;
                      if (raw) {
                        answersData = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        if (Array.isArray(answersData) && answersData.length > 0) {
                          tabSwitches = answersData[0].tabSwitchCount || 0;
                          faceAbsences = answersData[0].faceAbsenceCount || 0;
                          referencePhoto = answersData[0].referencePhoto || null;
                        }
                      }
                    } catch (e) { /* ignore parse errors */ }

                    const candidateName = attempt.candidateName || attempt.candidate_name || `App #${attempt.applicationId || attempt.application_id}`;
                    const candidateEmail = attempt.candidateEmail || attempt.candidate_email || '';
                    const status = attempt.status || 'unknown';
                    const score = attempt.score;
                    const startedAt = attempt.startedAt || attempt.started_at;
                    const completedAt = attempt.completedAt || attempt.completed_at;

                    return (
                      <React.Fragment key={attempt.id}>
                        <TableRow className="border-border bg-card hover:bg-background cursor-pointer group">
                          <TableCell className="text-xs py-2 font-medium">{candidateName}</TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">{candidateEmail || '—'}</TableCell>
                          <TableCell className="text-xs py-2">
                            {getStatusBadge(status)}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            {score != null ? (
                              <span className={`font-bold ${score >= (viewingAssessment?.passingScore || 70) ? 'text-green-600' : 'text-red-500'}`}>
                                {score}%
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            {tabSwitches > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-medium">
                                ⚠️ {tabSwitches}
                              </span>
                            ) : (
                              <span className="text-green-600 text-[10px] font-medium">✓ 0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            {faceAbsences > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-medium">
                                👤 {faceAbsences}
                              </span>
                            ) : (
                              <span className="text-green-600 text-[10px] font-medium">✓ 0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">
                            {startedAt ? new Date(startedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">
                            {completedAt ? new Date(completedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] font-semibold border-blue-300 text-blue-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-900 px-2 py-0 shadow-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPdfReport(attempt, viewingAssessment);
                              }}
                            >
                              <Printer className="w-3 h-3 mr-1" /> PDF Report
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* Expanded Answer Details Row */}
                        {answersData.length > 0 && (
                          <TableRow className="border-border">
                            <TableCell colSpan={9} className="p-0">
                              <details className="group">
                                <summary className="px-4 py-1.5 text-[10px] font-medium text-blue-600 cursor-pointer hover:bg-blue-50/50 select-none">
                                  📝 View {answersData.length} Answer(s) & Proctoring Details
                                </summary>
                                <div className="px-4 py-3 bg-muted/30 border-t space-y-2">
                                  {referencePhoto && (
                                    <div className="flex items-center gap-3 p-2.5 rounded border bg-background mb-3 shadow-2xs">
                                      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500 shadow-xs flex-shrink-0 bg-black">
                                        <img src={referencePhoto} alt="Candidate Face Capture" className="w-full h-full object-cover" />
                                      </div>
                                      <div>
                                        <span className="text-[11px] font-bold text-foreground block">👤 Candidate Identity Photo (Webcam Verification)</span>
                                        <span className="text-[10px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                                          ✅ Captured before assessment launch
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {answersData.map((ans: any, i: number) => (
                                    <div key={i} className="p-2.5 rounded border bg-background">
                                      <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-foreground">Q{ans.questionNumber || i + 1}</span>
                                        <div className="flex gap-2">
                                          {ans.isCorrect !== undefined && (
                                            <span className={`text-[10px] font-medium ${ans.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                              {ans.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                            </span>
                                          )}
                                          {ans.score !== undefined && (
                                            <span className="text-[10px] text-muted-foreground">Score: {ans.score}</span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-[11px] text-foreground mt-1 whitespace-pre-wrap font-mono bg-muted/40 p-2 rounded border max-h-[120px] overflow-y-auto">
                                        {ans.answerText || '(No answer provided)'}
                                      </p>
                                      {ans.compilationLog && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                          <strong>Compilation:</strong> {ans.compilationLog}
                                        </p>
                                      )}
                                      {ans.testCasesPassed !== undefined && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          <strong>Test Cases:</strong> {ans.testCasesPassed}/{ans.testCasesTotal} passed
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

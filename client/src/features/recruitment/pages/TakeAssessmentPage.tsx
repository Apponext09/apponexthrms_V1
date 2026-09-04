import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Editor from '@monaco-editor/react';
import {
  AlertCircle, Clock, Play, Send, CheckCircle, ChevronLeft, ChevronRight,
  Code2, ListChecks, Layers, ShieldAlert, Terminal, Maximize, Lock, Eye, Video,
  Check, X, Camera, Mic, Monitor, Clipboard, Shield, Flag, RotateCcw,
  FileText, AlertTriangle, Loader2, BookOpen, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

/* ═══════════════════════════════════════════════════════════════
   ENTERPRISE ASSESSMENT PORTAL — MNC GRADE (TCS / Wipro Level)
   ═══════════════════════════════════════════════════════════════ */

export const TakeAssessmentPage: React.FC = () => {
  return (
    <LocalErrorBoundary>
      <TakeAssessmentPageInner />
    </LocalErrorBoundary>
  );
};

// ─── Code Templates ─────────────────────────────────────────────
const CODE_TEMPLATES: Record<string, string> = {
  javascript: `// Write your JavaScript solution below\nfunction solution(a, b) {\n  // Your code here\n  return a + b;\n}\n`,
  python: `# Write your Python solution below\ndef solution(a, b):\n    # Your code here\n    return a + b\n`,
  java: `// Write your Java solution below\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}`,
  cpp: `// Write your C++ solution below\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
};

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript (Node.js v18)', monacoId: 'javascript' },
  { value: 'python', label: 'Python 3 (v3.10)', monacoId: 'python' },
  { value: 'java', label: 'Java (OpenJDK 17)', monacoId: 'java' },
  { value: 'cpp', label: 'C++ (GCC 11)', monacoId: 'cpp' },
];

// ─── Question Status ────────────────────────────────────────────
type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked-review' | 'answered-marked';

// ─── Helper: API URL ────────────────────────────────────────────
const getAPIUrl = (path: string) => {
  const rawApiUrl = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
  const API_BASE_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
  return `${API_BASE_URL}${path}`;
};

// ─── Helper: Format Time ────────────────────────────────────────
const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const TakeAssessmentPageInner: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();

  // ─── Core State ─────────────────────────────────────────────
  const [testData, setTestData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [timeLeft, setTimeLeft] = useState(3600);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);

  // ─── IDE / Compiler State ───────────────────────────────────
  const [consoleLogs, setConsoleLogs] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'console' | 'testcases'>('console');

  // ─── Question Management State ──────────────────────────────
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [showQuestionPalette, setShowQuestionPalette] = useState(true);

  // ─── Onboarding / Proctoring / Security State ───────────────
  const [onboardingStep, setOnboardingStep] = useState<'instructions' | 'camera' | 'ready'>('instructions');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── Security Violation Counters ────────────────────────────
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenViolationCount, setFullscreenViolationCount] = useState(0);
  const [faceAbsenceCount, setFaceAbsenceCount] = useState(0);

  // ─── Modals ─────────────────────────────────────────────────
  const [showFinalWarningModal, setShowFinalWarningModal] = useState(false);
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState(false);

  // ─── Refs ───────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autosaveTimerRef = useRef<any>(null);

  // ═══════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoStream) videoStream.getTracks().forEach(track => track.stop());
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [videoStream]);

  // Attach camera stream to video tag
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, showOnboarding, hasCameraPermission]);

  // Fetch assessment data
  useEffect(() => {
    setIsLoading(true);
    axios.get(getAPIUrl(`/public/assessments/attempts/${uuid}`))
      .then(res => {
        if (res.data?.success) {
          setTestData(res.data.data);
          const duration = res.data.data.assessment.duration_minutes || res.data.data.assessment.durationMinutes || 60;
          if (res.data.data.attempt.started_at || res.data.data.attempt.startedAt) {
            const startedAtTime = res.data.data.attempt.started_at || res.data.data.attempt.startedAt;
            const start = new Date(startedAtTime).getTime();
            const now = Date.now();
            const elapsed = Math.floor((now - start) / 1000);
            const remaining = (duration * 60) - elapsed;
            setTimeLeft(Math.max(0, remaining));
          } else {
            setTimeLeft(duration * 60);
          }
          if (res.data.data.attempt.status === 'completed') setIsTestSubmitted(true);

          // Restore auto-saved answers if present
          const answersJson = res.data.data.attempt.answers_json || res.data.data.attempt.answersJson;
          if (answersJson && res.data.data.attempt.status !== 'completed') {
            try {
              const parsed = typeof answersJson === 'string' ? JSON.parse(answersJson) : answersJson;
              if (parsed?.answers && typeof parsed.answers === 'object') {
                setAnswers(parsed.answers);
              }
            } catch (e) {}
          }
        } else {
          setError(res.data?.message || 'Assessment not found');
        }
      })
      .catch(err => {
        const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to load assessment.';
        setError(errMsg);
      })
      .finally(() => setIsLoading(false));
  }, [uuid]);

  // Countdown timer
  useEffect(() => {
    if (isTestSubmitted || isLoading || error || showOnboarding) return;
    if (timeLeft <= 0) {
      toast.error('⏰ Time limit reached! Auto-submitting assessment...');
      submitTestAnswers();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isTestSubmitted, isLoading, error, showOnboarding]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (showOnboarding || isLoading || error || isTestSubmitted) return;
    autosaveTimerRef.current = setInterval(() => {
      autoSaveAnswers();
    }, 30000);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, [showOnboarding, isLoading, error, isTestSubmitted, answers]);

  // ═══════════════════════════════════════════════════════════
  // ANTI-CHEAT SECURITY LAYER (10+ measures)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (showOnboarding || isLoading || error || isTestSubmitted) return;

    // 1. Tab Switch / Window Blur Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          if (next <= 2) toast.error(`🚨 Security Warning (${next}/3): Tab switch detected! Return to the test window immediately.`);
          else if (next === 3) setShowFinalWarningModal(true);
          else if (next >= 4) { toast.error('❌ Maximum violations exceeded. Auto-submitting test.'); submitTestAnswers(); }
          return next;
        });
      }
    };

    // 2. Fullscreen Change Monitoring
    const handleFullscreenChange = () => {
      const currentlyFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(currentlyFullscreen);
      if (!currentlyFullscreen && !isTestSubmitted && !showOnboarding) {
        setFullscreenViolationCount(prev => {
          const next = prev + 1;
          toast.error(`🚨 Fullscreen Warning (${next}/3): Re-enter fullscreen immediately!`);
          return next;
        });
      }
    };

    // 3. Copy/Paste/Cut block
    const preventCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning('🔒 Clipboard operations are disabled during this assessment.');
    };

    // 4. Right-click block
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning('🔒 Right-click is disabled during the assessment.');
    };

    // 5. Keyboard shortcut blocking (DevTools, copy, select all, print)
    const preventHotkeys = (e: KeyboardEvent) => {
      const blockedKeys = ['c', 'v', 'x', 'u', 'a', 's', 'p'];
      if (
        (e.ctrlKey && blockedKeys.includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        toast.warning(`🔒 Shortcut [${e.key.toUpperCase()}] blocked by security.`);
      }
    };

    // 6. Before unload warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your assessment is in progress. Are you sure you want to leave?';
    };

    // 7. Window resize detection (split-screen cheating)
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const diff = Math.abs(window.innerWidth - lastWidth);
      if (diff > 200) {
        toast.warning('🔒 Window resize detected. Please use full screen mode.');
      }
      lastWidth = window.innerWidth;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', preventCopyPaste as any);
    document.addEventListener('paste', preventCopyPaste as any);
    document.addEventListener('cut', preventCopyPaste as any);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventHotkeys);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', preventCopyPaste as any);
      document.removeEventListener('paste', preventCopyPaste as any);
      document.removeEventListener('cut', preventCopyPaste as any);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventHotkeys);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('resize', handleResize);
    };
  }, [showOnboarding, isLoading, error, isTestSubmitted]);

  // Face absence proctoring check (every 8s)
  useEffect(() => {
    if (showOnboarding || isLoading || error || isTestSubmitted || !videoStream) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 40; canvas.height = 30;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 40, 30);
          const imgData = ctx.getImageData(0, 0, 40, 30).data;
          let totalBrightness = 0;
          for (let i = 0; i < imgData.length; i += 4) totalBrightness += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
          const avg = totalBrightness / (40 * 30);
          if (avg < 12) {
            setFaceAbsenceCount(prev => {
              const next = prev + 1;
              if (next >= 3) { toast.error('❌ Face absent 3 times. Auto-submitting.'); submitTestAnswers(); }
              else toast.error(`🚨 Face missing/Camera covered (${next}/3).`);
              return next;
            });
          }
        }
      } catch (e) {}
    }, 8000);
    return () => clearInterval(interval);
  }, [showOnboarding, isLoading, error, isTestSubmitted, videoStream]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const enterFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {}
  }, []);

  const startProctoring = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setVideoStream(stream);
        setHasCameraPermission(true);
        toast.success('✅ Camera & Microphone verified successfully.');
      })
      .catch(() => {
        toast.error('Camera & Microphone access is mandatory for this assessment.');
      });
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setReferencePhoto(canvas.toDataURL('image/jpeg'));
        toast.success('📸 Identity verification photo captured!');
      }
    }
  }, []);

  const handleStartTest = useCallback(() => {
    if (!referencePhoto) { toast.error('Please capture your identity photo first.'); return; }
    enterFullscreen();
    setShowOnboarding(false);
    toast.success('🚀 Assessment started! Proctoring & security locks active.');
  }, [referencePhoto, enterFullscreen]);

  const handleAnswerChange = useCallback((qNum: number, value: string) => {
    setAnswers(prev => ({ ...prev, [qNum]: value }));
    setQuestionStatuses(prev => {
      const isMarked = markedForReview.has(qNum);
      return { ...prev, [qNum]: value.trim() ? (isMarked ? 'answered-marked' : 'answered') : (isMarked ? 'marked-review' : 'not-answered') };
    });
  }, [markedForReview]);

  const toggleMarkForReview = useCallback((qNum: number) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(qNum)) next.delete(qNum); else next.add(qNum);
      return next;
    });
    setQuestionStatuses(prev => {
      const hasAnswer = (answers[qNum] || '').trim().length > 0;
      const isCurrentlyMarked = markedForReview.has(qNum);
      if (isCurrentlyMarked) {
        return { ...prev, [qNum]: hasAnswer ? 'answered' : 'not-answered' };
      } else {
        return { ...prev, [qNum]: hasAnswer ? 'answered-marked' : 'marked-review' };
      }
    });
  }, [answers, markedForReview]);

  const navigateToQuestion = useCallback((idx: number) => {
    setActiveQuestionIdx(idx);
    // Mark current question as visited
    if (testData?.questions?.[idx]) {
      const qNum = testData.questions[idx].questionNumber || testData.questions[idx].question_number || idx + 1;
      setQuestionStatuses(prev => {
        if (!prev[qNum] || prev[qNum] === 'not-visited') return { ...prev, [qNum]: 'not-answered' };
        return prev;
      });
    }
  }, [testData]);

  // Auto-save to server
  const autoSaveAnswers = useCallback(async () => {
    if (!uuid || isTestSubmitted) return;
    try {
      await axios.post(getAPIUrl(`/public/assessments/attempts/${uuid}/autosave`), {
        answers,
        tabSwitchCount,
        faceAbsenceCount,
        fullscreenViolationCount,
      });
    } catch (e) {
      // Save to localStorage as fallback
      try { localStorage.setItem(`assessment_autosave_${uuid}`, JSON.stringify(answers)); } catch (le) {}
    }
  }, [uuid, answers, tabSwitchCount, faceAbsenceCount, fullscreenViolationCount, isTestSubmitted]);

  // Run code
  const handleRunCode = useCallback(() => {
    if (!testData) return;
    const activeQ = testData.questions?.[activeQuestionIdx];
    if (!activeQ) return;
    const qNum = activeQ.questionNumber || activeQ.question_number || activeQuestionIdx + 1;
    setRunning(true);
    setConsoleLogs('⚡ Connecting to Code Execution Engine...');
    setTestResults([]);

    const userCode = answers[qNum] || CODE_TEMPLATES[selectedLanguage] || '';
    axios.post(getAPIUrl('/public/assessments/run-code'), {
      code: userCode,
      language: selectedLanguage,
      questionId: activeQ.id,
    })
      .then(res => {
        if (res.data?.success) {
          const data = res.data.data;
          if (data.stderr) {
            setConsoleLogs(`❌ ERROR / TRACEBACK (${data.executionTimeMs || 0}ms)\n${'─'.repeat(50)}\n${data.stderr}\n\n${data.stdout ? 'Standard Output:\n' + data.stdout : ''}`);
            setActiveConsoleTab('console');
          } else {
            setConsoleLogs(`✅ EXECUTION SUCCESSFUL (${data.executionTimeMs || 0}ms)\n${'─'.repeat(50)}\n${data.stdout || 'Program finished with exit code 0.'}`);
            setActiveConsoleTab(data.testResults && data.testResults.length > 0 ? 'testcases' : 'console');
          }
          setTestResults(data.testResults || []);
        } else {
          setConsoleLogs(`❌ COMPILATION ERROR\n${'─'.repeat(50)}\n${res.data?.message || 'Execution failed'}`);
          setActiveConsoleTab('console');
        }
      })
      .catch(err => {
        const errorMsg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Execution error';
        setConsoleLogs(`❌ RUNTIME ERROR\n${'─'.repeat(50)}\n${errorMsg}`);
        setActiveConsoleTab('console');
      })
      .finally(() => setRunning(false));
  }, [testData, activeQuestionIdx, answers, selectedLanguage]);

  // Submit final answers
  const submitTestAnswers = useCallback(() => {
    if (!testData || submitting) return;
    setSubmitting(true);
    const questionsList = testData.questions?.length > 0 ? testData.questions : [{ questionNumber: 1, questionType: 'coding' }];
    const submissionAnswers = questionsList.map((q: any) => {
      const qNum = q.questionNumber || q.question_number || 1;
      return {
        questionNumber: qNum,
        answerText: answers[qNum] || '',
        isCorrect: true,
        score: q.marks || 10,
      };
    });

    axios.post(getAPIUrl(`/public/assessments/attempts/${uuid}/submit`), {
      answers: submissionAnswers,
      tabSwitchCount,
      faceAbsenceCount,
      fullscreenViolationCount,
      referencePhoto,
    })
      .then(res => {
        if (res.data?.success) {
          toast.success('✅ Assessment submitted successfully!');
          setIsTestSubmitted(true);
          if (videoStream) videoStream.getTracks().forEach(track => track.stop());
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        } else toast.error(res.data?.message || 'Submission failed');
      })
      .catch(() => toast.error('Failed to submit. Please try again.'))
      .finally(() => setSubmitting(false));
  }, [testData, answers, uuid, tabSwitchCount, faceAbsenceCount, fullscreenViolationCount, referencePhoto, videoStream, submitting]);

  // ═══════════════════════════════════════════════════════════
  // COMPUTED DATA
  // ═══════════════════════════════════════════════════════════
  const questionsToRender = testData?.questions?.length > 0 ? testData.questions : [];
  const assessment = testData?.assessment || {};
  const candidate = testData?.candidate || {};

  const mcqQuestions = questionsToRender.filter((q: any) => (q.questionType || q.question_type) === 'mcq' || (q.options && q.options.length > 0));
  const codingQuestions = questionsToRender.filter((q: any) => {
    const qType = (q.questionType || q.question_type || '').toLowerCase();
    const qText = (q.questionText || q.question_text || '').toLowerCase();
    return qType === 'coding' || qText.includes('python code') || qText.includes('write a code') || qText.includes('write a python') || qText.includes('write a function');
  });

  const activeQuestion = questionsToRender[activeQuestionIdx] || questionsToRender[0];
  const activeQNum = activeQuestion?.questionNumber || activeQuestion?.question_number || activeQuestionIdx + 1;

  const answeredCount = Object.keys(answers).filter(k => (answers[Number(k)] || '').trim().length > 0).length;
  const markedCount = markedForReview.size;
  const totalQuestions = questionsToRender.length;

  const isTimeLow = timeLeft < 300; // Less than 5 minutes
  const isTimeCritical = timeLeft < 60; // Less than 1 minute

  // ═══════════════════════════════════════════════════════════
  // RENDER: Loading
  // ═══════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080c14] text-white p-4">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            <Shield className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-sm font-bold tracking-wide text-white">INITIALIZING SECURE ENVIRONMENT</p>
            <p className="text-[11px] text-slate-500 font-mono">Loading assessment configuration & security protocols...</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Error
  // ═══════════════════════════════════════════════════════════
  if (error || !testData) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080c14] text-white p-4 overflow-y-auto">
        <div className="max-w-md w-full bg-[#0f1629] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-center">
            <AlertCircle className="w-10 h-10 text-white mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white">Assessment Unavailable</h2>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-sm text-slate-300 leading-relaxed">{error || 'This link is invalid, expired, or has already been completed.'}</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Submitted
  // ═══════════════════════════════════════════════════════════
  if (isTestSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080c14] text-white p-4 overflow-y-auto">
        <div className="max-w-lg w-full bg-[#0f1629] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-center">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Assessment Submitted!</h2>
            <p className="text-emerald-100 text-sm mt-2">Your responses have been securely recorded.</p>
          </div>
          <div className="px-6 py-6 space-y-4 text-center">
            <div className="bg-[#080c14] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Assessment</span><span className="text-white font-bold">{assessment.assessment_name || assessment.assessmentName || 'Assessment'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Candidate</span><span className="text-white font-bold">{candidate.firstName} {candidate.lastName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Questions Answered</span><span className="text-emerald-400 font-bold">{answeredCount} / {totalQuestions}</span></div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg text-[11px] text-slate-400 leading-relaxed">
              Your results are being evaluated. The recruiter team will be in touch shortly. You may now close this browser window.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Onboarding (Instructions → Camera → Start)
  // ═══════════════════════════════════════════════════════════
  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-50 w-full h-full bg-[#080c14] text-white overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-start p-4 py-8 sm:py-12">
          <div className="max-w-3xl w-full bg-[#0f1629] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden shrink-0">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <Shield className="w-6 h-6 text-white" />
              <h1 className="text-xl font-bold text-white tracking-tight">Secure Assessment Portal</h1>
            </div>
            <p className="text-center text-blue-100 text-xs">{assessment.assessment_name || assessment.assessmentName || 'Online Assessment'}</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-0 px-6 pt-5 pb-2">
            {['Instructions', 'Verification', 'Begin'].map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i === (onboardingStep === 'instructions' ? 0 : onboardingStep === 'camera' ? 1 : 2)
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/50'
                      : i < (onboardingStep === 'instructions' ? 0 : onboardingStep === 'camera' ? 1 : 2)
                        ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {i < (onboardingStep === 'instructions' ? 0 : onboardingStep === 'camera' ? 1 : 2) ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{step}</span>
                </div>
                {i < 2 && <div className={`w-16 h-0.5 mb-5 mx-1 ${i < (onboardingStep === 'instructions' ? 0 : onboardingStep === 'camera' ? 1 : 2) ? 'bg-emerald-500' : 'bg-slate-800'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="px-6 pb-6 pt-2">
            {/* ─── Step 1: Instructions ────────────────────────── */}
            {onboardingStep === 'instructions' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Assessment Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: <Clock className="w-5 h-5" />, label: 'Duration', value: `${assessment.duration_minutes || assessment.durationMinutes || 60} min`, color: 'text-blue-400' },
                    { icon: <FileText className="w-5 h-5" />, label: 'Questions', value: `${totalQuestions || '—'}`, color: 'text-emerald-400' },
                    { icon: <ListChecks className="w-5 h-5" />, label: 'Passing', value: `${assessment.passing_score || assessment.passingScore || 50}%`, color: 'text-amber-400' },
                    { icon: <Code2 className="w-5 h-5" />, label: 'Type', value: assessment.assessment_type || assessment.assessmentType || 'Mixed', color: 'text-purple-400' },
                  ].map((item, i) => (
                    <div key={i} className="bg-[#080c14] border border-slate-800 p-3 rounded-xl text-center">
                      <div className={`${item.color} mx-auto mb-1.5 flex justify-center`}>{item.icon}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{item.label}</div>
                      <div className="text-sm font-bold text-white mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Rules */}
                <div className="bg-[#080c14] border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Assessment Rules & Policies
                  </h3>
                  <ul className="space-y-2 text-[12px] text-slate-300 leading-relaxed">
                    {[
                      'This is a proctored assessment. Your camera and microphone must remain active throughout.',
                      'The test must be taken in fullscreen mode. Exiting fullscreen will trigger a security warning.',
                      'Tab switching is strictly monitored. 3 warnings will be issued before auto-termination.',
                      'Copy, paste, cut, and right-click operations are disabled for security integrity.',
                      'Developer tools (F12, Ctrl+Shift+I) and keyboard shortcuts are blocked.',
                      'Your webcam feed is monitored for face presence. Camera obstruction triggers alerts.',
                      'Answers are auto-saved every 30 seconds. You can safely resume if connection drops.',
                      'Once submitted, the assessment cannot be retaken. Review all answers before submitting.',
                    ].map((rule, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Security Features */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { icon: <Video className="w-4 h-4" />, label: 'Webcam Proctoring', desc: 'AI face monitoring', color: 'text-blue-400' },
                    { icon: <Maximize className="w-4 h-4" />, label: 'Fullscreen Lock', desc: 'Mandatory mode', color: 'text-indigo-400' },
                    { icon: <ShieldAlert className="w-4 h-4" />, label: 'Tab Detection', desc: '3-strike policy', color: 'text-amber-400' },
                    { icon: <Clipboard className="w-4 h-4" />, label: 'Clipboard Block', desc: 'No copy/paste', color: 'text-rose-400' },
                  ].map((item, i) => (
                    <div key={i} className="bg-[#080c14] border border-slate-800/80 p-2.5 rounded-lg text-center">
                      <div className={`${item.color} mx-auto mb-1 flex justify-center`}>{item.icon}</div>
                      <div className="text-[10px] font-bold text-slate-200">{item.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Terms Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer bg-blue-950/30 border border-blue-800/40 p-3.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    I have read and understood all assessment rules and policies. I agree to comply with the proctoring requirements and understand that any violations may result in automatic test termination.
                  </span>
                </label>

                <Button
                  onClick={() => setOnboardingStep('camera')}
                  disabled={!termsAccepted}
                  className={`w-full py-3 text-sm font-bold rounded-xl shadow-lg transition-all ${termsAccepted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                >
                  Continue to Identity Verification →
                </Button>
              </div>
            )}

            {/* ─── Step 2: Camera Verification ────────────────── */}
            {onboardingStep === 'camera' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {!hasCameraPermission ? (
                  <div className="text-center space-y-5">
                    <div className="bg-[#080c14] border border-slate-800 rounded-xl p-6">
                      <Camera className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-white mb-1.5">Camera & Microphone Access Required</h3>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                        Your browser will prompt for permissions. Grant access to both camera and microphone to proceed with identity verification.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: <Camera className="w-5 h-5" />, label: 'Camera', status: 'Required', color: 'text-blue-400' },
                        { icon: <Mic className="w-5 h-5" />, label: 'Microphone', status: 'Required', color: 'text-indigo-400' },
                        { icon: <Monitor className="w-5 h-5" />, label: 'Fullscreen', status: 'Required', color: 'text-purple-400' },
                      ].map((item, i) => (
                        <div key={i} className="bg-[#080c14] border border-slate-800 p-3 rounded-xl text-center">
                          <div className={`${item.color} mx-auto mb-1 flex justify-center`}>{item.icon}</div>
                          <div className="text-[10px] font-bold text-slate-200">{item.label}</div>
                          <div className="text-[9px] text-amber-400 font-bold mt-1">{item.status}</div>
                        </div>
                      ))}
                    </div>
                    <Button onClick={startProctoring} className="w-full py-3 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg">
                      <Camera className="w-4 h-4 mr-2" /> Grant Camera & Microphone Access
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <Check className="w-4 h-4" /> Camera & Microphone Verified
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      {/* Live Camera Feed */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-60 h-44 rounded-2xl overflow-hidden border-2 border-blue-500/60 bg-black shadow-xl shadow-blue-500/10">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                          <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> LIVE
                          </div>
                        </div>
                        {!referencePhoto && (
                          <Button onClick={capturePhoto} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs px-6 py-2 font-bold shadow-md">
                            <Camera className="w-3.5 h-3.5 mr-1.5" /> Capture Photo
                          </Button>
                        )}
                      </div>
                      {/* Captured Photo */}
                      <div className="flex flex-col items-center gap-3">
                        {referencePhoto ? (
                          <>
                            <div className="relative w-60 h-44 rounded-2xl overflow-hidden border-2 border-emerald-500/60 bg-black shadow-xl shadow-emerald-500/10">
                              <img src={referencePhoto} alt="Identity" className="w-full h-full object-cover" />
                              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-full">
                                ✓ IDENTITY CAPTURED
                              </div>
                            </div>
                            <Button onClick={capturePhoto} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] px-4 py-1">
                              <RotateCcw className="w-3 h-3 mr-1" /> Retake
                            </Button>
                          </>
                        ) : (
                          <div className="w-60 h-44 rounded-2xl border-2 border-dashed border-slate-700 bg-[#080c14] flex items-center justify-center">
                            <div className="text-center">
                              <Eye className="w-8 h-8 text-slate-700 mx-auto mb-1.5" />
                              <p className="text-[10px] text-slate-600">Photo preview</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleStartTest}
                      disabled={!referencePhoto}
                      className={`w-full py-3 text-sm font-bold rounded-xl shadow-lg transition-all ${referencePhoto ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                      {referencePhoto ? '🚀 Enter Secure Assessment' : '📸 Capture Photo First'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Main Assessment Interface
  // ═══════════════════════════════════════════════════════════
  const isCurrentCoding = (() => {
    if (!activeQuestion) return false;
    const qType = (activeQuestion.questionType || activeQuestion.question_type || '').toLowerCase();
    const qText = (activeQuestion.questionText || activeQuestion.question_text || '').toLowerCase();
    return qType === 'coding' || qText.includes('python code') || qText.includes('write a code') || qText.includes('write a python') || qText.includes('write a function');
  })();

  const codeValue = answers[activeQNum] ?? CODE_TEMPLATES[selectedLanguage] ?? '';

  return (
    <div className="fixed inset-0 z-10 w-full h-full bg-[#080c14] text-slate-100 flex flex-col select-none overflow-hidden" style={{ userSelect: 'none' }}>

      {/* ─── Watermark Overlay ─── */}
      <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden opacity-[0.03]" style={{ transform: 'rotate(-25deg)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="whitespace-nowrap text-white text-xl font-bold tracking-widest my-16" style={{ marginLeft: `${(i % 3) * 120}px` }}>
            {candidate.firstName} {candidate.lastName} • {new Date().toLocaleDateString()} • {candidate.firstName} {candidate.lastName} • PROCTORED • {candidate.firstName} {candidate.lastName}
          </div>
        ))}
      </div>

      {/* ═══════════ TOP HEADER BAR ═══════════ */}
      <header className="bg-[#0c1121] border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-50 shadow-lg shadow-black/20">
        {/* Left: Assessment Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate leading-tight">
              {assessment.assessment_name || assessment.assessmentName || 'Assessment'}
            </h1>
            <p className="text-[10px] text-slate-500 truncate">Candidate: {candidate.firstName} {candidate.lastName}</p>
          </div>
        </div>

        {/* Center: Proctoring HUD */}
        {videoStream && (
          <div className="flex items-center gap-3 bg-[#080c14] border border-slate-800 rounded-xl px-3 py-1.5 shrink-0">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-500/60 bg-black shrink-0">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Proctoring Active</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {tabSwitchCount > 0 && <span className="bg-rose-600/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">TAB:{tabSwitchCount}/3</span>}
                {faceAbsenceCount > 0 && <span className="bg-amber-600/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">FACE:{faceAbsenceCount}/3</span>}
                {fullscreenViolationCount > 0 && <span className="bg-purple-600/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">FS:{fullscreenViolationCount}/3</span>}
                {tabSwitchCount === 0 && faceAbsenceCount === 0 && fullscreenViolationCount === 0 && (
                  <span className="text-[9px] text-slate-500">No violations</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right: Timer + Submit */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Fullscreen re-enter prompt */}
          {!isFullscreen && (
            <button onClick={enterFullscreen} className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 border border-rose-700/60 text-rose-300 text-[10px] font-bold flex items-center gap-1 animate-pulse">
              <Maximize className="w-3 h-3" /> Re-Enter Fullscreen
            </button>
          )}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-mono font-bold border shadow-inner transition-colors ${
            isTimeCritical ? 'bg-rose-950/60 border-rose-600/60 text-rose-400 animate-pulse'
            : isTimeLow ? 'bg-amber-950/60 border-amber-700/60 text-amber-400'
            : 'bg-[#080c14] border-slate-800 text-slate-200'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
          <Button
            onClick={() => setShowSubmitConfirmDialog(true)}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-4 font-bold shadow-md gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Submit
          </Button>
        </div>
      </header>

      {/* ═══════════ SECTION TABS BAR ═══════════ */}
      <div className="bg-[#0a0f1d] border-b border-slate-800/60 px-4 py-1.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-1">Sections:</span>
          {mcqQuestions.length > 0 && (
            <button
              onClick={() => { const idx = questionsToRender.indexOf(mcqQuestions[0]); if (idx !== -1) navigateToQuestion(idx); }}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                mcqQuestions.includes(activeQuestion) ? 'bg-blue-600/90 text-white shadow-md shadow-blue-500/20' : 'bg-[#0f1629] text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <ListChecks className="w-3 h-3" /> MCQ ({mcqQuestions.length})
            </button>
          )}
          {codingQuestions.length > 0 && (
            <button
              onClick={() => { const idx = questionsToRender.indexOf(codingQuestions[0]); if (idx !== -1) navigateToQuestion(idx); }}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                codingQuestions.includes(activeQuestion) ? 'bg-blue-600/90 text-white shadow-md shadow-blue-500/20' : 'bg-[#0f1629] text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Code2 className="w-3 h-3" /> Coding ({codingQuestions.length})
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
          <span>Answered: <strong className="text-emerald-400">{answeredCount}</strong>/{totalQuestions}</span>
          {markedCount > 0 && <span>Marked: <strong className="text-amber-400">{markedCount}</strong></span>}
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── Left: Question Palette Sidebar ─── */}
        <div className={`${showQuestionPalette ? 'w-56' : 'w-0'} shrink-0 bg-[#0a0f1d] border-r border-slate-800/60 flex flex-col overflow-hidden transition-all duration-200`}>
          <div className="px-3 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question Palette</span>
            <button onClick={() => setShowQuestionPalette(false)} className="text-slate-600 hover:text-slate-400"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-1.5">
              {questionsToRender.map((q: any, idx: number) => {
                const qNum = q.questionNumber || q.question_number || idx + 1;
                const status = questionStatuses[qNum] || 'not-visited';
                const statusColors: Record<QuestionStatus, string> = {
                  'not-visited': 'bg-slate-800 text-slate-500 border-slate-700',
                  'not-answered': 'bg-rose-950/60 text-rose-400 border-rose-700/50',
                  'answered': 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50',
                  'marked-review': 'bg-purple-950/60 text-purple-400 border-purple-700/50',
                  'answered-marked': 'bg-blue-950/60 text-blue-400 border-blue-700/50',
                };
                return (
                  <button
                    key={idx}
                    onClick={() => navigateToQuestion(idx)}
                    className={`w-8 h-8 rounded-md text-[10px] font-bold border transition-all ${statusColors[status]} ${idx === activeQuestionIdx ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#0a0f1d]' : ''}`}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="px-3 py-2.5 border-t border-slate-800/60 space-y-1.5">
            {[
              { color: 'bg-emerald-500', label: 'Answered' },
              { color: 'bg-rose-500', label: 'Not Answered' },
              { color: 'bg-purple-500', label: 'Marked for Review' },
              { color: 'bg-slate-600', label: 'Not Visited' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                <span className="text-[9px] text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Main Question/Answer Area ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isCurrentCoding ? (
            /* ═══════ CODING VIEW: Split Panel ═══════ */
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Problem */}
              <div className="w-[45%] border-r border-slate-800/60 flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between bg-[#0a0f1d]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Problem {activeQuestionIdx + 1} / {totalQuestions}</span>
                    <span className="text-[9px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-md font-bold border border-blue-600/30">
                      {activeQuestion?.marks || 10} marks
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" disabled={activeQuestionIdx === 0} onClick={() => navigateToQuestion(activeQuestionIdx - 1)}
                      className="h-6 text-[10px] border-slate-800 bg-transparent text-slate-400 hover:bg-slate-800 px-2">
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={activeQuestionIdx === questionsToRender.length - 1} onClick={() => navigateToQuestion(activeQuestionIdx + 1)}
                      className="h-6 text-[10px] border-slate-800 bg-transparent text-slate-400 hover:bg-slate-800 px-2">
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div>
                    <h2 className="text-base text-white font-bold whitespace-pre-wrap leading-relaxed">{activeQuestion?.questionText || activeQuestion?.question_text}</h2>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] bg-[#080c14] px-2.5 py-1 rounded-md border border-slate-800 font-bold text-blue-400">Difficulty: Medium</span>
                    </div>
                  </div>
                  {(activeQuestion?.sampleInput || activeQuestion?.sample_input) && (
                    <div className="bg-[#080c14] border border-slate-800 p-4 rounded-xl space-y-3">
                      <h3 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-blue-400" /> Sample Test Case</h3>
                      <div className="space-y-2">
                        <div><span className="text-[9px] text-slate-500 block font-bold mb-1">INPUT:</span><code className="block bg-[#060911] p-2.5 rounded-lg border border-slate-800/80 text-emerald-300 font-mono text-[11px]">{activeQuestion.sampleInput || activeQuestion.sample_input}</code></div>
                        {(activeQuestion?.sampleOutput || activeQuestion?.sample_output) && (
                          <div><span className="text-[9px] text-slate-500 block font-bold mb-1">EXPECTED OUTPUT:</span><code className="block bg-[#060911] p-2.5 rounded-lg border border-slate-800/80 text-blue-300 font-mono text-[11px]">{activeQuestion.sampleOutput || activeQuestion.sample_output}</code></div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Mark for Review */}
                  <button
                    onClick={() => toggleMarkForReview(activeQNum)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      markedForReview.has(activeQNum) ? 'bg-purple-950/60 border-purple-600/50 text-purple-400' : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <Flag className="w-3 h-3" /> {markedForReview.has(activeQNum) ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>
              </div>

              {/* Right: Code Editor + Console */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#060911]">
                {/* Editor Toolbar */}
                <div className="bg-[#0c1121] border-b border-slate-800/60 px-4 py-1.5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-blue-400" /> Code Editor</span>
                    <select
                      value={selectedLanguage}
                      onChange={e => {
                        const lang = e.target.value;
                        setSelectedLanguage(lang);
                        const currentVal = answers[activeQNum] || '';
                        const isTemplate = Object.values(CODE_TEMPLATES).some(t => t.trim() === currentVal.trim()) || !currentVal.trim();
                        if (isTemplate) {
                          handleAnswerChange(activeQNum, CODE_TEMPLATES[lang] || '');
                        }
                      }}
                      className="bg-[#080c14] border border-slate-800 text-slate-200 text-[11px] px-2.5 py-1 rounded-lg focus:outline-none font-mono font-bold"
                    >
                      {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleAnswerChange(activeQNum, CODE_TEMPLATES[selectedLanguage] || '');
                        toast.info(`Code reset to default ${selectedLanguage} template.`);
                      }}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Template
                    </button>
                    <span className="text-[9px] text-emerald-500/80 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">Auto-Save</span>
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    language={LANGUAGE_OPTIONS.find(l => l.value === selectedLanguage)?.monacoId || 'javascript'}
                    value={codeValue}
                    onChange={(val) => handleAnswerChange(activeQNum, val || '')}
                    theme="vs-dark"
                    options={{
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                      minimap: { enabled: true, scale: 1 },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                      roundedSelection: true,
                      cursorBlinking: 'smooth',
                      automaticLayout: true,
                      tabSize: 4,
                      wordWrap: 'on',
                      padding: { top: 12 },
                      bracketPairColorization: { enabled: true },
                      smoothScrolling: true,
                      contextmenu: false, // Disable right-click in editor
                    }}
                  />
                </div>

                {/* Console Panel */}
                <div className="h-44 border-t border-slate-800/60 bg-[#0c1121] flex flex-col shrink-0">
                  <div className="flex items-center justify-between px-3 border-b border-slate-800/60">
                    <div className="flex">
                      {[
                        { key: 'console' as const, label: 'Terminal Output' },
                        { key: 'testcases' as const, label: `Test Results (${testResults.filter(r => r.status === 'Passed').length}/${testResults.length})` },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveConsoleTab(tab.key)}
                          className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-all ${
                            activeConsoleTab === tab.key ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleRunCode}
                      disabled={running}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3.5 text-[11px] rounded-lg flex items-center gap-1.5 font-bold shadow-md"
                    >
                      {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      {running ? 'Compiling...' : 'Run Code'}
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 text-[11px] font-mono">
                    {activeConsoleTab === 'console' ? (
                      consoleLogs ? (
                        <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400">{consoleLogs}</pre>
                      ) : (
                        <span className="text-slate-600">Click "Run Code" to compile and execute your solution.</span>
                      )
                    ) : (
                      testResults.length > 0 ? (
                        <div className="space-y-1.5">
                          {testResults.map((res, i) => (
                            <div key={i} className="flex justify-between items-center bg-[#080c14] p-2.5 rounded-lg border border-slate-800/60">
                              <span className="font-bold text-slate-200 text-[11px]">{res.name}</span>
                              <span className={`flex items-center gap-1 font-bold text-[11px] ${res.status === 'Passed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {res.status === 'Passed' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {res.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">Run your code to see test results.</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ═══════ MCQ / TEXT / SUBJECTIVE VIEW ═══════ */
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-5">
                {/* Question Header */}
                <div className="flex justify-between items-center bg-[#0c1121] p-3.5 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white">Question {activeQuestionIdx + 1} / {totalQuestions}</span>
                    <span className="text-[10px] bg-[#080c14] px-2 py-0.5 rounded-md border border-slate-800 font-bold text-emerald-400">
                      {activeQuestion?.marks || 1} marks
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" disabled={activeQuestionIdx === 0} onClick={() => navigateToQuestion(activeQuestionIdx - 1)}
                      className="h-7 text-xs border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 px-2.5">
                      <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={activeQuestionIdx === questionsToRender.length - 1} onClick={() => navigateToQuestion(activeQuestionIdx + 1)}
                      className="h-7 text-xs border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 px-2.5">
                      Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="bg-[#0c1121] border border-slate-800/60 p-5 rounded-xl">
                  <h2 className="text-sm text-white font-bold whitespace-pre-wrap leading-relaxed">{activeQuestion?.questionText || activeQuestion?.question_text}</h2>
                </div>

                {/* MCQ Options */}
                {(activeQuestion?.questionType === 'mcq' || activeQuestion?.question_type === 'mcq') && activeQuestion?.options && (
                  <div className="space-y-2.5">
                    {activeQuestion.options.map((opt: string, optIdx: number) => {
                      const optChar = String.fromCharCode(65 + optIdx);
                      const isSelected = answers[activeQNum] === opt;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleAnswerChange(activeQNum, opt)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3.5 text-sm group ${
                            isSelected
                              ? 'bg-blue-600/15 border-blue-500/60 text-white shadow-md shadow-blue-500/5'
                              : 'bg-[#0c1121] border-slate-800/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/30'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all ${
                            isSelected ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700 text-slate-500 group-hover:border-slate-600'
                          }`}>{optChar}</span>
                          <span className="text-sm">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text / Subjective Answer */}
                {(!activeQuestion?.questionType || activeQuestion?.questionType === 'text' || activeQuestion?.question_type === 'text') && !activeQuestion?.options && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold">Your Response</label>
                    <textarea
                      value={answers[activeQNum] || ''}
                      onChange={e => handleAnswerChange(activeQNum, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full p-4 bg-[#0c1121] border border-slate-800/60 text-white rounded-xl text-sm focus:outline-none focus:border-blue-500/50 resize-none font-mono leading-relaxed"
                      rows={8}
                    />
                  </div>
                )}

                {/* Mark for Review */}
                <button
                  onClick={() => toggleMarkForReview(activeQNum)}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-lg border transition-all ${
                    markedForReview.has(activeQNum) ? 'bg-purple-950/60 border-purple-600/50 text-purple-400' : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" /> {markedForReview.has(activeQNum) ? 'Marked for Review ✓' : 'Mark for Review'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toggle palette button when hidden */}
        {!showQuestionPalette && (
          <button
            onClick={() => setShowQuestionPalette(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-[#0c1121] border border-slate-800 border-l-0 rounded-r-lg px-1.5 py-3 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ═══════════ FINAL WARNING MODAL ═══════════ */}
      {showFinalWarningModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0f1629] border-2 border-rose-500/60 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-5 text-center">
              <AlertTriangle className="w-10 h-10 text-white mx-auto mb-2" />
              <h2 className="text-lg font-bold text-white tracking-tight">FINAL SECURITY WARNING</h2>
            </div>
            <div className="px-6 py-5 space-y-4 text-center">
              <p className="text-sm text-slate-200">You have switched tabs/windows <strong className="text-rose-400">3 times</strong>.</p>
              <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3.5 text-xs text-rose-300 leading-relaxed">
                ⚠️ One more violation will trigger <strong>immediate test termination</strong> and automatic submission.
              </div>
              <Button
                onClick={() => { setShowFinalWarningModal(false); enterFullscreen(); }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-8 py-2.5 font-bold rounded-xl shadow-md"
              >
                I Understand — Return to Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ SUBMIT CONFIRMATION DIALOG ═══════════ */}
      <Dialog open={showSubmitConfirmDialog} onOpenChange={setShowSubmitConfirmDialog}>
        <DialogContent className="sm:max-w-[520px] bg-[#0f1629] border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-5 h-5" /> Confirm Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Review your progress before final submission. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="bg-[#080c14] border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Total Questions</span><span className="font-bold text-white">{totalQuestions}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Answered</span><span className="font-bold text-emerald-400">{answeredCount}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Not Answered</span><span className="font-bold text-rose-400">{totalQuestions - answeredCount}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Marked for Review</span><span className="font-bold text-purple-400">{markedCount}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Time Remaining</span><span className="font-bold text-amber-400">{formatTime(timeLeft)}</span></div>
            </div>
            {totalQuestions - answeredCount > 0 && (
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>You have <strong>{totalQuestions - answeredCount}</strong> unanswered question(s). These will be scored as zero.</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitConfirmDialog(false)} className="h-9 text-xs border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800">
              Go Back
            </Button>
            <Button
              onClick={() => { setShowSubmitConfirmDialog(false); submitTestAnswers(); }}
              disabled={submitting}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 shadow-md"
            >
              {submitting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Submitting...</> : 'Yes, Final Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ═══════════════════════════════════════════════════════════════ */
class LocalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Assessment Portal Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#080c14] text-white p-6">
          <div className="max-w-md w-full bg-[#0f1629] border border-rose-500/30 rounded-2xl shadow-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-rose-400 mb-2">Assessment Portal Error</h2>
            <pre className="bg-[#080c14] p-4 rounded-lg border border-slate-800 overflow-x-auto text-xs text-slate-300 text-left">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

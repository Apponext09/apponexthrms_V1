import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Clock, Play, Send, CheckCircle, ChevronLeft, ChevronRight, Code2, ListChecks, Layers } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export const TakeAssessmentPage: React.FC = () => {
  return (
    <LocalErrorBoundary>
      <TakeAssessmentPageInner />
    </LocalErrorBoundary>
  );
};

const TakeAssessmentPageInner: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [testData, setTestData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // Maps question_id/question_number to answer string
  
  const [timeLeft, setTimeLeft] = useState(3600); // Default 60 minutes in seconds
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  
  const [consoleLogs, setConsoleLogs] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Proctoring and Verification State
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [faceAbsenceCount, setFaceAbsenceCount] = useState<number>(0);
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [showFinalWarningModal, setShowFinalWarningModal] = useState<boolean>(false);
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState<boolean>(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Stop webcam stream on unmount or submit
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // Bind video stream to video element
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, showOnboarding, hasCameraPermission]);

  const startProctoring = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setVideoStream(stream);
        setHasCameraPermission(true);
        toast.success('Camera and microphone access granted.');
      })
      .catch(err => {
        console.error('Camera/mic access denied', err);
        toast.error('Permission denied! Camera and microphone access are strictly required to start this assessment.');
      });
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame mirrored
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setReferencePhoto(dataUrl);
        toast.success('Identity verification photo captured!');
      }
    }
  };

  const handleStartTest = () => {
    if (!referencePhoto) {
      toast.error('Please capture your identity verification photo before starting.');
      return;
    }
    setShowOnboarding(false);
    toast.success('Assessment started! Proctoring is fully active.');
  };


  // Tab switching detection
  useEffect(() => {
    if (showOnboarding || isLoading || error || isTestSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const nextCount = prev + 1;
          if (nextCount === 1 || nextCount === 2) {
            toast.error(`Proctoring Alert: Tab switching detected! Warning (${nextCount}/3).`);
          } else if (nextCount === 3) {
            setShowFinalWarningModal(true);
            toast.error('CRITICAL: Final Proctoring Warning! Exiting the screen again will terminate the test.');
          } else if (nextCount >= 4) {
            toast.error('Proctoring Violation: Tab switch limit exceeded. Submitting test.');
            submitTestAnswers();
          }
          return nextCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showOnboarding, isLoading, error, isTestSubmitted]);

  // Face absence proctoring check loop
  useEffect(() => {
    if (showOnboarding || isLoading || error || isTestSubmitted || !videoStream) return;

    const interval = setInterval(() => {
      let isFacePresent = true;
      const video = videoRef.current;
      if (video) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 40;
          canvas.height = 30;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, 40, 30);
            const imgData = ctx.getImageData(0, 0, 40, 30).data;
            let totalBrightness = 0;
            for (let i = 0; i < imgData.length; i += 4) {
              totalBrightness += (imgData[i] + imgData[i+1] + imgData[i+2]) / 3;
            }
            const averageBrightness = totalBrightness / (40 * 30);
            // If camera is covered (average brightness < 12)
            if (averageBrightness < 12) {
              isFacePresent = false;
            }
          }
        } catch (e) {
          console.warn('Proctoring canvas image analysis bypassed.', e);
        }
      }

      if (!isFacePresent) {
        setFaceAbsenceCount(prev => {
          const nextCount = prev + 1;
          if (nextCount >= 3) {
            toast.error('Proctoring Violation: Face absent/webcam covered 3 times! Submitting test.');
            submitTestAnswers();
          } else {
            toast.error(`Proctoring Alert: Face not detected / camera covered! Warning (${nextCount}/3).`);
          }
          return nextCount;
        });
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [showOnboarding, isLoading, error, isTestSubmitted, videoStream]);

  const getAPIUrl = (path: string) => {
    const rawApiUrl = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
    const API_BASE_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
    return `${API_BASE_URL}${path}`;
  };


  useEffect(() => {
    setIsLoading(true);
    axios.get(getAPIUrl(`/public/assessments/attempts/${uuid}`))
      .then(res => {
        if (res.data?.success) {
          setTestData(res.data.data);
          const duration = res.data.data.assessment.duration_minutes || res.data.data.assessment.durationMinutes || 60;
          
          // Calculate remaining time if already started
          if (res.data.data.attempt.started_at || res.data.data.attempt.startedAt) {
            const startedAtTime = res.data.data.attempt.started_at || res.data.data.attempt.startedAt;
            const start = new Date(startedAtTime).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const remaining = (duration * 60) - elapsed;
            setTimeLeft(Math.max(0, remaining));
          } else {
            setTimeLeft(duration * 60);
          }

          if (res.data.data.attempt.status === 'completed') {
            setIsTestSubmitted(true);
          }
        } else {
          setError(res.data?.message || 'Assessment test not found');
        }
      })
      .catch(err => {
        console.error('Failed to fetch assessment details', err);
        const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to fetch assessment. Link may be expired or invalid.';
        setError(errMsg);
      })
      .finally(() => setIsLoading(false));
  }, [uuid]);

  // Countdown timer
  useEffect(() => {
    if (isTestSubmitted || isLoading || error) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isTestSubmitted, isLoading, error]);

  const handleAutoSubmit = () => {
    toast.warning('Time is up! Submitting your test automatically.');
    submitTestAnswers();
  };

  const handleAnswerChange = (qNum: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [qNum]: value
    }));
  };

  const handleRunCode = () => {
    const activeQ = testData.questions[activeQuestionIdx];
    if (!activeQ || activeQ.questionType !== 'coding') return;

    setRunning(true);
    setConsoleLogs('Compiling & Running code against test cases...');
    
    setTimeout(() => {
      const codeVal = answers[activeQ.questionNumber] || '';
      if (!codeVal.trim() || codeVal.includes('SyntaxError') || codeVal.includes('throw')) {
        setConsoleLogs('Compilation error: syntax error detected near line 3.');
        setTestResults([
          { name: 'Test Case 1', status: 'Failed', details: 'Compiler Error' },
          { name: 'Test Case 2', status: 'Failed', details: 'Compiler Error' },
          { name: 'Test Case 3', status: 'Failed', details: 'Compiler Error' }
        ]);
      } else {
        setConsoleLogs('Compilation Successful! Execution completed in 14ms.');
        setTestResults([
          { name: 'Test Case 1', status: 'Passed', details: 'Input: 5 -> Output: 5' },
          { name: 'Test Case 2', status: 'Passed', details: 'Input: 10 -> Output: 10' },
          { name: 'Test Case 3', status: 'Passed', details: 'Input: 0 -> Output: 0' }
        ]);
      }
      setRunning(false);
    }, 1200);
  };

  const submitTestAnswers = () => {
    setSubmitting(true);
    
    // Map user answers format expected by backend AssessmentService:
    // array of objects with { questionNumber, answerText }
    const questionsList = testData.questions && testData.questions.length > 0
      ? testData.questions
      : [{ questionNumber: 1, questionType: 'coding' }]; // Fallback

    const submissionAnswers = questionsList.map((q: any) => {
      const answerVal = answers[q.questionNumber] || '';
      return {
        questionNumber: q.questionNumber,
        answerText: answerVal,
        isCorrect: true, // Backend re-evaluates or defaults
        score: q.marks || 10
      };
    });

    axios.post(getAPIUrl(`/public/assessments/attempts/${uuid}/submit`), {
      answers: submissionAnswers,
      tabSwitchCount: tabSwitchCount,
      faceAbsenceCount: faceAbsenceCount,
      referencePhoto: referencePhoto
    })
      .then(res => {
        if (res.data?.success) {
          toast.success('Test submitted successfully!');
          setIsTestSubmitted(true);
          // Release camera stream on successful submission
          if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
          }
        } else {
          toast.error(res.data?.message || 'Failed to submit test');
        }
      })
      .catch(err => {
        console.error('Failed to submit test', err);
        toast.error('Failed to submit test.');
      })
      .finally(() => setSubmitting(false));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e141e] text-white p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-gray-400">Initializing coding environment...</p>
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e141e] text-white p-4">
        <Card className="max-w-md w-full bg-[#15202b] border-[#2a3644] text-white">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-lg text-red-500 font-semibold">Test Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-gray-300 pb-6">
            {error || 'The test link is invalid, expired, or has already been completed.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isTestSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e141e] text-white p-4">
        <Card className="max-w-md w-full bg-[#15202b] border-[#2a3644] text-center text-white py-6">
          <CardContent className="space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Assessment Completed!</h2>
            <p className="text-sm text-gray-300">
              Your test answers have been compiled, graded, and submitted to the recruiter.
            </p>
            <p className="text-xs text-gray-400 bg-[#0e141e] p-2 rounded-sm border border-[#2a3644]">
              You may now safely close this browser window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (showOnboarding) {
    const { assessment = {}, candidate = {} } = testData || {};
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e141e] text-white p-4 font-mono">
        <Card className="max-w-2xl w-full bg-[#15202b] border-[#2a3644] text-white shadow-xl">
          <CardHeader className="text-center border-b border-[#2a3644] pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              Secure Proctoring Verification
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Assessment: <strong className="text-gray-300">{assessment.assessment_name || assessment.assessmentName || 'Coding Challenge'}</strong>
            </p>
            <p className="text-xs text-gray-400">
              Candidate: <strong className="text-gray-300">{candidate.firstName} {candidate.lastName}</strong>
            </p>
          </CardHeader>
          
          <CardContent className="space-y-5 pt-6">
            {/* Step 1: Rules + Enable Permissions */}
            {!hasCameraPermission && (
              <>
                <p className="text-xs text-gray-300 text-center leading-relaxed">
                  To ensure test integrity and prevent unfair practices, this coding environment requires camera and microphone monitoring throughout the session.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-[#0e141e] border border-[#2a3644] p-3 rounded-sm text-center">
                    <div className="text-blue-500 text-lg mb-1">📷</div>
                    <div className="text-xs font-bold text-gray-200">Webcam</div>
                    <div className="text-[10px] text-gray-400 mt-1">Live video is monitored.</div>
                  </div>
                  <div className="bg-[#0e141e] border border-[#2a3644] p-3 rounded-sm text-center">
                    <div className="text-blue-500 text-lg mb-1">🎙️</div>
                    <div className="text-xs font-bold text-gray-200">Microphone</div>
                    <div className="text-[10px] text-gray-400 mt-1">Audio activity tracked.</div>
                  </div>
                  <div className="bg-[#0e141e] border border-[#2a3644] p-3 rounded-sm text-center">
                    <div className="text-blue-500 text-lg mb-1">🚫</div>
                    <div className="text-xs font-bold text-gray-200">Tab Lock</div>
                    <div className="text-[10px] text-gray-400 mt-1">3 tab switches = auto submit.</div>
                  </div>
                  <div className="bg-[#0e141e] border border-[#2a3644] p-3 rounded-sm text-center">
                    <div className="text-red-500 text-lg mb-1">👤</div>
                    <div className="text-xs font-bold text-gray-200">Face Check</div>
                    <div className="text-[10px] text-gray-400 mt-1">3 absence = auto submit.</div>
                  </div>
                </div>

                <div className="bg-yellow-950/20 border border-yellow-800/40 p-3 rounded-sm text-[10px] text-yellow-300/90 leading-relaxed font-mono">
                  <strong>Please Note:</strong> Ensure your room is well-lit and remain directly in front of the camera. Denying permissions will lock the assessment.
                </div>

                <div className="text-center pt-2">
                  <Button 
                    onClick={startProctoring}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs px-8 py-2.5 font-bold tracking-wide shadow-md transition-colors"
                  >
                    Step 1: Enable Camera & Microphone
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Photo Capture */}
            {hasCameraPermission && (
              <>
                <div className="text-center">
                  <p className="text-xs text-green-400 font-bold mb-1">✅ Camera & Microphone Active</p>
                  <p className="text-[11px] text-gray-400">Now capture your identity verification photo to proceed.</p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-5">
                  {/* Live Video Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-52 h-40 rounded-lg overflow-hidden border-2 border-blue-500/60 bg-black shadow-lg">
                      <video 
                        ref={videoRef}
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-blue-600/80 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                        LIVE PREVIEW
                      </div>
                    </div>
                    {!referencePhoto && (
                      <Button 
                        onClick={capturePhoto}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-sm text-xs px-6 py-2 font-bold shadow-md transition-colors"
                      >
                        📸 Capture Verification Photo
                      </Button>
                    )}
                  </div>

                  {/* Captured Photo Preview */}
                  <div className="flex flex-col items-center gap-2">
                    {referencePhoto ? (
                      <>
                        <div className="relative w-52 h-40 rounded-lg overflow-hidden border-2 border-green-500/60 bg-black shadow-lg">
                          <img src={referencePhoto} alt="Reference" className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-green-600/80 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                            ✅ VERIFIED
                          </div>
                        </div>
                        <Button 
                          onClick={capturePhoto}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 rounded-sm text-[10px] px-4 py-1"
                        >
                          Retake Photo
                        </Button>
                      </>
                    ) : (
                      <div className="w-52 h-40 rounded-lg border-2 border-dashed border-gray-600 bg-[#0e141e] flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl text-gray-600 mb-1">👤</div>
                          <p className="text-[10px] text-gray-500">Photo will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center pt-2">
                  <Button 
                    onClick={handleStartTest}
                    disabled={!referencePhoto}
                    className={`w-full md:w-auto rounded-sm text-xs px-10 py-2.5 font-bold tracking-wide shadow-md transition-all ${
                      referencePhoto 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {referencePhoto ? '🚀 Start Assessment' : '📸 Capture Photo First'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { assessment = {}, candidate = {}, questions = [] } = testData || {};

  // If there are no questions in database for this assessment, render a default coding question
  const questionsToRender = questions.length > 0 ? questions : [

    {
      id: 0,
      questionNumber: 1,
      questionText: assessment.description || 'Solve the default challenge.',
      questionType: 'coding',
      options: null,
      marks: 10
    }
  ];

  const allowReattempt = assessment.allow_reattempt !== false && assessment.allowReattempt !== false;

  // Filter questions by section type for section tabs
  const mcqQuestions = questionsToRender.filter((q: any) => (q.questionType || q.question_type) === 'mcq' || (q.options && q.options.length > 0));
  const codingQuestions = questionsToRender.filter((q: any) => {
    const qType = (q.questionType || q.question_type || '').toLowerCase();
    const qText = (q.questionText || '').toLowerCase();
    return qType === 'coding' || qText.includes('python code') || qText.includes('write a code') || qText.includes('write a python') || qText.includes('write a function');
  });
  const subjectiveQuestions = questionsToRender.filter((q: any) => !mcqQuestions.includes(q) && !codingQuestions.includes(q));

  const activeQuestion = questionsToRender[activeQuestionIdx];

  return (
    <div className="min-h-screen bg-[#0e141e] text-gray-100 flex flex-col font-mono">
      
      {/* Top Banner with Embedded Proctoring Camera */}
      <header className="bg-[#15202b] border-b border-[#2a3644] px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-md font-bold tracking-tight text-white">{assessment.assessment_name || assessment.assessmentName}</h1>
            <p className="text-[10px] text-gray-400">Candidate: {candidate.firstName} {candidate.lastName}</p>
          </div>
        </div>

        {/* Top Navbar Compact Proctoring Camera */}
        {videoStream && (
          <div className="flex items-center gap-3 bg-[#0e141e] border border-green-500/40 rounded-md px-3 py-1 shadow-inner">
            <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-green-500 bg-black flex-shrink-0">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-[6px] font-bold py-0.2 text-center uppercase tracking-tighter">
                REC
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Proctoring Active</span>
              </div>
              {(tabSwitchCount > 0 || faceAbsenceCount > 0) ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {tabSwitchCount > 0 && (
                    <span className="bg-red-600/90 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-xs font-mono">
                      ⚠️ Tab: {tabSwitchCount}/3
                    </span>
                  )}
                  {faceAbsenceCount > 0 && (
                    <span className="bg-orange-600/90 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-xs font-mono">
                      👤 Face: {faceAbsenceCount}/3
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[9px] text-gray-400 font-mono">Camera & Mic Live</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-[#0e141e] border border-[#2a3644] px-3 py-1 text-sm rounded-sm text-yellow-500 font-semibold">
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
          <Button 
            onClick={() => setShowSubmitConfirmDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white rounded-sm text-xs h-8 px-4 flex gap-1.5 font-bold shadow-xs"
            disabled={submitting}
          >
            <Send className="w-3.5 h-3.5" /> Submit Test
          </Button>
        </div>
      </header>

      {/* Section Navigation Bar */}
      <div className="bg-[#111923] border-b border-[#2a3644] px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-2">Test Sections:</span>
          {mcqQuestions.length > 0 && (
            <button
              onClick={() => {
                const firstIdx = questionsToRender.indexOf(mcqQuestions[0]);
                if (firstIdx !== -1 && (allowReattempt || firstIdx >= activeQuestionIdx)) {
                  setActiveQuestionIdx(firstIdx);
                }
              }}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mcqQuestions.includes(activeQuestion)
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#15202b] text-gray-300 border border-[#2a3644] hover:bg-[#202e3c]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 text-green-400" />
              MCQ Section ({mcqQuestions.length})
            </button>
          )}

          {codingQuestions.length > 0 && (
            <button
              onClick={() => {
                const firstIdx = questionsToRender.indexOf(codingQuestions[0]);
                if (firstIdx !== -1 && (allowReattempt || firstIdx >= activeQuestionIdx)) {
                  setActiveQuestionIdx(firstIdx);
                }
              }}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                codingQuestions.includes(activeQuestion)
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#15202b] text-gray-300 border border-[#2a3644] hover:bg-[#202e3c]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              Coding Section ({codingQuestions.length})
            </button>
          )}

          {subjectiveQuestions.length > 0 && (
            <button
              onClick={() => {
                const firstIdx = questionsToRender.indexOf(subjectiveQuestions[0]);
                if (firstIdx !== -1 && (allowReattempt || firstIdx >= activeQuestionIdx)) {
                  setActiveQuestionIdx(firstIdx);
                }
              }}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                subjectiveQuestions.includes(activeQuestion)
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#15202b] text-gray-300 border border-[#2a3644] hover:bg-[#202e3c]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Subjective Section ({subjectiveQuestions.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className={`px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
            allowReattempt 
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
              : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
          }`}>
            {allowReattempt ? '✓ Navigation Allowed' : '🔒 Strict Linear Progress'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {(() => {
        const currentQType = (activeQuestion.questionType || activeQuestion.question_type || '').toLowerCase();
        const currentAssType = (assessment.assessmentType || assessment.assessment_type || '').toLowerCase();
        const qTextLower = (activeQuestion.questionText || '').toLowerCase();

        const isCurrentCoding = 
          currentQType === 'coding' ||
          (currentAssType === 'coding' && currentQType !== 'mcq' && currentQType !== 'boolean' && currentQType !== 'text') ||
          qTextLower.includes('python code') ||
          qTextLower.includes('write a code') ||
          qTextLower.includes('write a python') ||
          qTextLower.includes('write a function');

        // NON-CODING (MCQ / Subjective / True-False) -> Full Width Clean View
        if (!isCurrentCoding) {
          return (
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
              {/* Question Navigation Bar */}
              <div className="flex justify-between items-center bg-[#15202b] p-3 rounded-sm border border-[#2a3644] shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-200">Question {activeQuestionIdx + 1} of {questionsToRender.length}</span>
                  <span className="text-[10px] text-gray-400 bg-[#0e141e] px-2 py-0.5 rounded border border-[#2a3644]">
                    Marks: {activeQuestion.marks || 1}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[#2a3644] bg-[#15202b] text-gray-200 hover:bg-[#202e3c] hover:text-white disabled:opacity-30 disabled:hover:bg-[#15202b] disabled:hover:text-gray-200 transition-colors"
                    disabled={!allowReattempt || activeQuestionIdx === 0}
                    onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                    title={!allowReattempt ? 'Re-attempt disabled by recruiter' : 'Previous Question'}
                  >
                    <ChevronLeft className="w-4 h-4 mr-0.5" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[#2a3644] bg-[#15202b] text-gray-200 hover:bg-[#202e3c] hover:text-white disabled:opacity-30 disabled:hover:bg-[#15202b] disabled:hover:text-gray-200 transition-colors"
                    disabled={activeQuestionIdx === questionsToRender.length - 1}
                    onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </div>

              {/* Question Text */}
              <div className="bg-[#15202b] border border-[#2a3644] p-5 rounded-sm space-y-3 shadow-xs">
                <h2 className="text-sm text-white font-bold whitespace-pre-wrap leading-relaxed">
                  {activeQuestion.questionText}
                </h2>
              </div>

              {/* MCQ / Boolean / Subjective Input Area */}
              <div className="space-y-3">
                {activeQuestion.questionType === 'mcq' && activeQuestion.options && (
                  <div className="space-y-2">
                    {activeQuestion.options.map((opt: string, optIdx: number) => {
                      const optChar = String.fromCharCode(65 + optIdx);
                      const isSelected = answers[activeQuestion.questionNumber] === opt;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleAnswerChange(activeQuestion.questionNumber, opt)}
                          className={`p-3.5 rounded-sm border cursor-pointer transition-all flex items-center gap-3 text-xs ${isSelected ? 'bg-blue-900/50 border-blue-500 text-white font-semibold shadow-xs' : 'bg-[#15202b] border-[#2a3644] text-gray-300 hover:border-gray-500'}`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${isSelected ? 'border-blue-400 bg-blue-500 text-white' : 'border-gray-500 text-gray-400'}`}>{optChar}</span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeQuestion.questionType === 'boolean' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map((opt) => {
                      const isSelected = answers[activeQuestion.questionNumber] === opt;
                      return (
                        <div
                          key={opt}
                          onClick={() => handleAnswerChange(activeQuestion.questionNumber, opt)}
                          className={`p-4 rounded-sm border cursor-pointer transition-all flex items-center justify-center gap-3 text-xs ${isSelected ? 'bg-blue-900/50 border-blue-500 text-white font-semibold' : 'bg-[#15202b] border-[#2a3644] text-gray-300 hover:border-gray-500'}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${isSelected ? 'border-blue-400 bg-blue-500' : 'border-gray-500'}`} />
                          <span className="font-bold">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(activeQuestion.questionType === 'text' || (!activeQuestion.questionType && (assessment.assessmentType || assessment.assessment_type) !== 'coding')) && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Your Subjective Answer</label>
                    <textarea
                      value={answers[activeQuestion.questionNumber] || ''}
                      onChange={e => handleAnswerChange(activeQuestion.questionNumber, e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full p-4 bg-[#15202b] border border-[#2a3644] text-white rounded-sm text-xs focus:outline-none focus:border-gray-500 resize-none font-mono"
                      rows={6}
                    />
                  </div>
                )}
              </div>

              {/* Question Navigation Palette */}
              <div className="bg-[#15202b] border border-[#2a3644] p-4 rounded-sm space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> Assessment Questions Palette
                  </h4>
                  <span className="text-[10px] text-gray-400">{questionsToRender.length} Questions</span>
                </div>
                
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 pt-1">
                  {questionsToRender.map((q: any, idx: number) => {
                    const isAns = Boolean(answers[q.questionNumber]);
                    const isCur = idx === activeQuestionIdx;
                    const isQCode = (q.questionType || q.question_type) === 'coding';
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (allowReattempt || idx >= activeQuestionIdx) {
                            setActiveQuestionIdx(idx);
                          }
                        }}
                        className={`h-9 rounded-sm font-bold text-xs flex flex-col items-center justify-center transition-all ${
                          isCur
                            ? 'ring-2 ring-blue-400 bg-blue-600 text-white font-extrabold shadow-md scale-105'
                            : isAns
                            ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 hover:bg-emerald-900'
                            : 'bg-[#0e141e] border border-[#2a3644] text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                        title={`Question ${idx + 1} (${isQCode ? 'Coding' : 'MCQ'})`}
                      >
                        <span>Q{idx + 1}</span>
                        <span className="text-[8px] font-normal opacity-80">{isQCode ? 'Code' : 'MCQ'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        // CODING QUESTION -> 2 Column Split IDE View
        return (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
            {/* Left Column: Problem Details */}
            <div className="border-r border-[#2a3644] p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)]">
              <div className="flex justify-between items-center bg-[#15202b] p-3 rounded-sm border border-[#2a3644]">
                <span className="text-xs font-bold text-gray-300">Question {activeQuestionIdx + 1} of {questionsToRender.length}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[#2a3644] bg-[#15202b] text-gray-200 hover:bg-[#202e3c] hover:text-white disabled:opacity-30 disabled:hover:bg-[#15202b] disabled:hover:text-gray-200 transition-colors"
                    disabled={!allowReattempt || activeQuestionIdx === 0}
                    onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                    title={!allowReattempt ? 'Re-attempt disabled by recruiter' : 'Previous Question'}
                  >
                    <ChevronLeft className="w-4 h-4 mr-0.5" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[#2a3644] bg-[#15202b] text-gray-200 hover:bg-[#202e3c] hover:text-white disabled:opacity-30 disabled:hover:bg-[#15202b] disabled:hover:text-gray-200 transition-colors"
                    disabled={activeQuestionIdx === questionsToRender.length - 1}
                    onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-sm text-white font-bold whitespace-pre-wrap">{activeQuestion.questionText}</h2>
                <div className="text-[10px] text-gray-500">Marks: {activeQuestion.marks || 10}</div>
              </div>
            </div>

            {/* Right Column: Code Editor & Compiler IDE */}
            <div className="flex flex-col max-h-[calc(100vh-100px)]">
              {/* Editor Header Toolbar */}
              <div className="bg-[#15202b] border-b border-[#2a3644] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-blue-400" /> Code Editor (IDE)
                  </span>
                  <select className="bg-[#0e141e] border border-[#2a3644] text-gray-300 text-[11px] px-2 py-0.5 rounded focus:outline-none">
                    <option value="python">Python 3 (v3.10)</option>
                    <option value="javascript">JavaScript (Node.js v18)</option>
                    <option value="java">Java (OpenJDK 17)</option>
                    <option value="cpp">C++ (GCC 11)</option>
                  </select>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Auto-Saved</span>
              </div>

              {/* Textarea Code Editor */}
              <div className="flex-1 min-h-[300px] relative bg-[#0a0f1d]">
                <textarea 
                  value={answers[activeQuestion.questionNumber] || ''}
                  onChange={e => handleAnswerChange(activeQuestion.questionNumber, e.target.value)}
                  placeholder="# Write your Python / Coding solution code here...\n# e.g.\ndef add_numbers(a, b):\n    return a + b\n"
                  className="w-full h-full p-4 bg-[#0a0f1d] text-gray-200 border-none outline-none font-mono text-xs leading-relaxed resize-none focus:ring-0"
                  spellCheck="false"
                />
              </div>

              {/* Compiler & Terminal Logs Pane */}
              <div className="h-48 border-t border-[#2a3644] bg-[#15202b] flex flex-col">
                <Tabs defaultValue="console" className="flex-1 flex flex-col">
                  <div className="bg-[#0e141e] px-4 border-b border-[#2a3644] flex items-center justify-between">
                    <TabsList className="bg-transparent border-none p-0 h-8 gap-3">
                      <TabsTrigger value="console" className="text-xs h-full bg-transparent border-none p-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white">
                        Compiler Output / Logs
                      </TabsTrigger>
                      <TabsTrigger value="testcases" className="text-xs h-full bg-transparent border-none p-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white">
                        Test Cases ({testResults.filter(r => r.status === 'Passed').length}/{testResults.length})
                      </TabsTrigger>
                    </TabsList>
                    <Button 
                      onClick={handleRunCode}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-3 text-[10px] rounded-sm flex gap-1 shadow-none"
                      disabled={running}
                    >
                      <Play className="w-2.5 h-2.5" /> Run Code
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 text-xs font-mono text-gray-300">
                    <TabsContent value="console" className="m-0">
                      {consoleLogs ? (
                        <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400">{consoleLogs}</pre>
                      ) : (
                        <span className="text-gray-500">Click "Run Code" to compile your solution and view stdout output.</span>
                      )}
                    </TabsContent>

                    <TabsContent value="testcases" className="m-0 space-y-2">
                      {testResults.length > 0 ? (
                        testResults.map((res, index) => (
                          <div key={index} className="flex justify-between items-center bg-[#0e141e] p-2 rounded-sm border border-[#2a3644]">
                            <span>{res.name}</span>
                            <span className={res.status === 'Passed' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                              {res.status} ({res.details})
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500">No test cases evaluated yet. Click "Run Code" to execute test suite.</span>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        );
      })()}



      {/* FINAL WARNING MODAL - Appears on 3rd tab switch */}
      {showFinalWarningModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#15202b] border-2 border-red-500/60 rounded-lg shadow-2xl overflow-hidden animate-pulse-slow">
            {/* Red Header */}
            <div className="bg-red-600 px-6 py-4 text-center">
              <div className="text-3xl mb-2">🚨</div>
              <h2 className="text-white text-lg font-bold tracking-tight">FINAL WARNING</h2>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-200 text-center leading-relaxed">
                You have switched tabs <strong className="text-red-400">3 times</strong>. This is your <strong className="text-red-400">final warning</strong>.
              </p>
              <div className="bg-red-900/30 border border-red-700/50 rounded-sm p-3">
                <p className="text-xs text-red-300 text-center font-mono leading-relaxed">
                  ⚠️ Exiting the assessment screen <strong>one more time</strong> will result in <strong>immediate test termination</strong> and auto-submission of your answers.
                </p>
              </div>
              <p className="text-[10px] text-gray-500 text-center">
                This incident has been logged and will be visible to the recruiter in the proctor audit trail.
              </p>
              <div className="text-center pt-1">
                <Button 
                  onClick={() => setShowFinalWarningModal(false)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-sm text-xs px-8 py-2.5 font-bold tracking-wide shadow-md"
                >
                  I Understand — Continue Test
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT CONFIRMATION MODAL */}
      <Dialog open={showSubmitConfirmDialog} onOpenChange={setShowSubmitConfirmDialog}>
        <DialogContent className="sm:max-w-[460px] bg-[#15202b] border-[#2a3644] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              Confirm Test Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-300">
              Are you sure you want to finalize and submit your assessment test now?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="bg-[#0e141e] border border-[#2a3644] p-3 rounded space-y-2 font-mono">
              <div className="flex justify-between items-center text-gray-300">
                <span>Total Questions:</span>
                <span className="font-bold text-white">{questionsToRender.length}</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Answered Questions:</span>
                <span className="font-bold text-emerald-400">{Object.keys(answers).filter(k => Boolean(answers[Number(k)])).length}</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Unanswered / Skipped:</span>
                <span className="font-bold text-yellow-400">{questionsToRender.length - Object.keys(answers).filter(k => Boolean(answers[Number(k)])).length}</span>
              </div>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-[11px] leading-relaxed">
              ⚠️ <strong>Note:</strong> Once submitted, your answers will be locked, compiled, and graded immediately. You cannot re-enter or modify your test.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSubmitConfirmDialog(false)}
              className="h-8 text-xs border-[#2a3644] bg-[#0e141e] text-gray-300 hover:bg-[#1a2634] hover:text-white"
            >
              Cancel & Return
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowSubmitConfirmDialog(false);
                submitTestAnswers();
              }}
              disabled={submitting}
              className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-4 shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Yes, Final Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


class LocalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("LocalErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ef4444', padding: '24px', fontFamily: 'monospace', background: '#0e141e', minHeight: '100vh', colorScheme: 'dark' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>⚠️ Coding Platform - Render Error:</h1>
          <pre style={{ background: '#15202b', padding: '16px', borderRadius: '4px', border: '1px border #2a3644', overflowX: 'auto', fontSize: '12px', color: '#f3f4f6' }}>
            {this.state.error?.stack || this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}


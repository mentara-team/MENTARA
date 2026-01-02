import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  Clock, Flag, ChevronLeft, ChevronRight, CheckCircle, 
  AlertCircle, BookOpen, Save, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = (api?.defaults?.baseURL || '').replace(/\/+$/, '');
const BACKEND_ORIGIN = API_BASE.replace(/\/?api\/?$/, '');

const resolveMediaUrl = (maybeUrl) => {
  if (!maybeUrl) return null;
  if (typeof maybeUrl !== 'string') return null;

  // If backend already returned an absolute URL, use it.
  if (/^https?:\/\//i.test(maybeUrl)) {
    // Avoid mixed-content issues if proxy produced http URLs.
    if (window?.location?.protocol === 'https:' && maybeUrl.startsWith('http://') && maybeUrl.includes('onrender.com')) {
      return maybeUrl.replace(/^http:\/\//i, 'https://');
    }
    return maybeUrl;
  }

  // Convert relative /media/... into backend absolute URL.
  if (maybeUrl.startsWith('/')) return `${BACKEND_ORIGIN}${maybeUrl}`;
  return `${BACKEND_ORIGIN}/${maybeUrl}`;
};

const LSK = {
  ATTEMPT_UI: (attemptId) => `mentara_attempt_${attemptId}_ui`,
};

const readAttemptUi = (attemptId) => {
  try {
    const raw = localStorage.getItem(LSK.ATTEMPT_UI(attemptId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeAttemptUi = (attemptId, data) => {
  try {
    localStorage.setItem(LSK.ATTEMPT_UI(attemptId), JSON.stringify({
      ...data,
      _savedAt: Date.now(),
    }));
  } catch {
    // ignore quota / privacy mode
  }
};

const TestTaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [phase, setPhase] = useState('questions'); // questions | upload
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const [fiveMinWarned, setFiveMinWarned] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(null); // { unanswered: number } | null

  const [cheatStrikes, setCheatStrikes] = useState(0);
  const cheatStrikesRef = useRef(0);
  const submittingRef = useRef(false);
  const attemptIdRef = useRef(null);
  const timeRemainingRef = useRef(0);
  const phaseRef = useRef('questions');

  const ANTI_CHEAT = {
    enabled: true,
    maxStrikes: 3,
  };

  useEffect(() => {
    loadTest();
  }, [examId]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Persist UI progress so refresh resumes where the student left off.
  useEffect(() => {
    if (!attemptId) return;
    if (!questions || questions.length === 0) return;
    const currentQ = questions[currentQuestionIndex];
    const currentQuestionId = currentQ?.id ?? null;
    writeAttemptUi(attemptId, {
      currentQuestionId,
      answers,
      flagged: Array.from(flagged || []),
    });
  }, [attemptId, questions, currentQuestionIndex, answers, flagged]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const recordCheatStrike = (reason) => {
    if (!ANTI_CHEAT.enabled) return;
    // Only enforce while the attempt is active.
    if (!attemptIdRef.current) return;
    if (submittingRef.current) return;
    if ((timeRemainingRef.current || 0) <= 0) return;

    setCheatStrikes((prev) => {
      const next = (prev || 0) + 1;
      cheatStrikesRef.current = next;
      try {
        // Persist strikes in the same UI bucket so refresh doesn't reset behavior.
        const existing = readAttemptUi(attemptIdRef.current) || {};
        writeAttemptUi(attemptIdRef.current, {
          ...existing,
          anti_cheat: {
            strikes: next,
            last_reason: reason || null,
            last_at: new Date().toISOString(),
          },
        });
      } catch {
        // ignore
      }

      toast.error(reason ? `Warning: ${reason}` : 'Warning: suspicious activity detected');
      if (next >= ANTI_CHEAT.maxStrikes) {
        toast.error('Too many violations. Submitting now.');
        // Auto-submit (best-effort). This must not throw.
        setTimeout(() => {
          try {
            handleSubmit(true);
          } catch {
            // ignore
          }
        }, 250);
      }
      return next;
    });
  };

  // Anti-cheat listeners: tab switch + leaving fullscreen + back navigation.
  useEffect(() => {
    if (!ANTI_CHEAT.enabled) return;
    if (!attemptId) return;

    const onVisibility = () => {
      if (document.hidden) {
        recordCheatStrike('You switched tabs or minimized the window');
      }
    };

    const onBlur = () => {
      // Some browsers fire blur on alt-tab.
      recordCheatStrike('Window focus lost');
    };

    const onFullscreenChange = () => {
      const inFs = Boolean(document.fullscreenElement);
      // Leaving fullscreen mid-exam is treated as a strike.
      if (!inFs) {
        recordCheatStrike('Fullscreen exited');
      }
    };

    // Back-navigation suppression (best-effort).
    const pushGuard = () => {
      try {
        window.history.pushState({ mentaraExamGuard: true }, '', window.location.href);
      } catch {
        // ignore
      }
    };

    const onPopState = (e) => {
      // Keep user on the attempt route.
      pushGuard();
      toast.error('Back navigation is disabled during an exam.');
    };

    pushGuard();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('popstate', onPopState);
    };
  }, [attemptId]);

  const isStructuredExam = useMemo(() => {
    return Array.isArray(questions) && questions.some((q) => q?.question_type === 'STRUCTURED' || q?.type === 'STRUCT');
  }, [questions]);

  // When on upload phase, re-hydrate any already-uploaded files from server.
  useEffect(() => {
    if (!attemptId) return;
    if (!isStructuredExam) return;
    if (phase !== 'upload') return;
    (async () => {
      try {
        const res = await api.get(`attempts/${attemptId}/review/`);
        const existing = res?.data?.student_uploads;
        if (Array.isArray(existing)) setUploaded(existing);
      } catch {
        // ignore
      }
    })();
  }, [attemptId, isStructuredExam, phase]);

  useEffect(() => {
    if (!isStructuredExam) return;
    if (fiveMinWarned) return;
    if (timeRemaining === 300) {
      setFiveMinWarned(true);
      toast('5 minutes left. If this is a structured paper, upload your answers before time runs out.', { icon: '⏳' });
    }
  }, [isStructuredExam, fiveMinWarned, timeRemaining]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (attemptId && Object.keys(answers).length > 0) {
      const autoSave = setInterval(() => {
        saveProgress();
      }, 10000);
      return () => clearInterval(autoSave);
    }
  }, [answers, attemptId]);

  const loadTest = async () => {
    try {
      console.log('=== LOADING TEST ===');
      console.log('Exam ID:', examId);
      console.log('API Base URL:', api.defaults.baseURL);
      console.log('Full URL:', `${api.defaults.baseURL}exams/${examId}/start/`);
      
      // Start (or resume) the exam attempt - backend returns the same in-progress attempt
      // so refresh will not restart the timer or create duplicate attempts.
      let startRes;
      try {
        startRes = await api.post(`exams/${examId}/start/`);
      } catch (startErr) {
        // If student already attempted this exam, redirect to results.
        if (startErr?.response?.status === 409) {
          const attemptedId = startErr.response?.data?.attempt_id;
          toast.error('You have already attempted this exam. Showing your previous result.');
          if (attemptedId) {
            navigate(`/results/${attemptedId}`);
            return;
          }
          navigate('/dashboard');
          return;
        }
        throw startErr;
      }
      console.log('✅ Start response received:', startRes.data);

      const startedAttemptId = startRes.data.attempt_id;
      setAttemptId(startedAttemptId);
      
      // Map backend question format to frontend format
      const mappedQuestions = (startRes.data.questions || []).map(q => ({
        id: q.id,
        question_text: q.statement,
        question_type: q.type.toUpperCase(),
        type: q.type,
        choices: q.choices || {},
        marks: q.marks || 1,
        time_est: q.time_est,
        image: q.image
      }));
      
      console.log('Mapped questions:', mappedQuestions);
      setQuestions(mappedQuestions);

      const startedExam = startRes.data?.exam;
      setExam(
        startedExam || {
          id: Number(examId),
          title: `Test ${examId}`,
          level: '',
          paper_number: null,
        }
      );
      
      // Calculate time remaining from expires_at
      const expiresAt = new Date(startRes.data.expires_at);
      const now = new Date();
      const secondsRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(secondsRemaining);

      // Restore local UI progress first (so even unsaved selections survive refresh)
      const localUi = readAttemptUi(startedAttemptId);
      if (localUi?.anti_cheat && typeof localUi.anti_cheat === 'object') {
        const strikes = Number(localUi.anti_cheat.strikes);
        if (Number.isFinite(strikes) && strikes > 0) {
          setCheatStrikes(strikes);
          cheatStrikesRef.current = strikes;
        }
      }
      const localAnswers = (localUi && typeof localUi.answers === 'object' && localUi.answers) ? localUi.answers : {};
      const localFlagged = Array.isArray(localUi?.flagged) ? new Set(localUi.flagged) : new Set();

      // Restore saved answers/flags from server (authoritative across devices)
      let serverAnswers = {};
      let serverFlagged = new Set();
      try {
        const resumeRes = await api.get(`attempts/${startedAttemptId}/resume/`);
        const rawAnswers = resumeRes.data?.answers || {};
        for (const [qidRaw, payload] of Object.entries(rawAnswers)) {
          const qid = Number(qidRaw);
          if (!Number.isFinite(qid)) continue;
          if (payload && typeof payload === 'object') {
            if (Array.isArray(payload.answers) && payload.answers.length > 0) {
              serverAnswers[qid] = payload.answers[0];
            } else if (Object.prototype.hasOwnProperty.call(payload, 'answer')) {
              serverAnswers[qid] = payload.answer;
            } else {
              serverAnswers[qid] = payload;
            }
          } else {
            serverAnswers[qid] = payload;
          }
        }

        const flaggedMap = resumeRes.data?.flagged || {};
        serverFlagged = new Set(
          Object.entries(flaggedMap)
            .filter(([, v]) => Boolean(v))
            .map(([k]) => Number(k))
            .filter((n) => Number.isFinite(n))
        );
      } catch (resumeErr) {
        console.warn('Resume attempt failed:', resumeErr);
      }

      // Merge: prefer local for answers (covers not-yet-saved selections), union flags.
      const mergedAnswers = { ...serverAnswers, ...localAnswers };
      const mergedFlagged = new Set([...serverFlagged, ...localFlagged]);
      setAnswers(mergedAnswers);
      setFlagged(mergedFlagged);

      // Restore navigation position (where student left off)
      const desiredQid = localUi?.currentQuestionId;
      if (desiredQid && Array.isArray(mappedQuestions) && mappedQuestions.length > 0) {
        const idx = mappedQuestions.findIndex((q) => q && q.id === desiredQid);
        if (idx >= 0) setCurrentQuestionIndex(idx);
      }
      
      // Exam details are returned by start endpoint; no extra fetch required.
    } catch (error) {
      console.error('❌ FAILED TO LOAD TEST');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error config:', error.config);
      // If backend says the attempt timed out, don't restart; send user back.
      if (error.response?.status === 410) {
        toast.error('Your attempt has timed out.');
        navigate('/dashboard');
        return;
      }

      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Failed to load test';
      toast.error(`Failed to load test: ${errorMsg}`);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const canFullscreen = Boolean(document?.documentElement?.requestFullscreen);
  const isFullscreen = Boolean(document?.fullscreenElement);
  const showFullscreenPrompt = Boolean(ANTI_CHEAT.enabled && canFullscreen && attemptId && !isFullscreen && timeRemaining > 0);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      toast.success('Fullscreen enabled');
    } catch {
      toast.error('Fullscreen request was blocked by the browser.');
    }
  };

  const saveProgress = async () => {
    if (!attemptId || questions.length === 0) return;
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    try {
      const currentAnswer = answers[currentQuestion.id];
      await api.post(`attempts/${attemptId}/save/`, {
        question_id: currentQuestion.id,
        answer: currentAnswer || null,
        time_spent: 0,
        flagged: flagged.has(currentQuestion.id)
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const toggleFlag = (questionId) => {
    setFlagged(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }
      return newFlagged;
    });
  };

  const handleSubmit = async (autoSubmit = false, force = false) => {
    if (submitting) return;

    // Structured papers: guide the student to the upload step before final submit.
    if (isStructuredExam && phase !== 'upload' && !autoSubmit) {
      setPhase('upload');
      return;
    }

    // Structured papers: require upload before final submit (unless timed out auto-submit).
    if (isStructuredExam && phase === 'upload' && !autoSubmit) {
      const hasUploaded = Array.isArray(uploaded) && uploaded.length > 0;
      const hasSelected = Array.isArray(uploadFiles) && uploadFiles.length > 0;

      if (!hasUploaded && hasSelected) {
        // Auto-upload selected files before submitting.
        try {
          await handleUploadSubmissions();
        } catch {
          return;
        }
      }

      const nowHasUploaded = (Array.isArray(uploaded) && uploaded.length > 0);
      if (!nowHasUploaded) {
        toast.error('Please upload your answer file(s) before submitting for evaluation.');
        return;
      }
    }

    // For structured papers, unanswered questions are expected (answers are uploaded as files).
    if (!autoSubmit && !isStructuredExam && !force) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        setSubmitConfirm({ unanswered });
        toast('Review: some questions are unanswered.', { icon: '⚠️' });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Format responses according to backend expectation
      const responses = questions.map(q => {
        const isStruct = q.question_type === 'STRUCTURED' || q.type === 'STRUCT';
        const raw = answers[q.id];
        if (isStruct) {
          return {
            question_id: q.id,
            answer_payload: { answer: null },
            time_spent_seconds: 0,
          };
        }
        return {
          question_id: q.id,
          answer_payload: { answers: raw === undefined ? [] : [raw] },
          time_spent_seconds: 0,
        };
      });
      
      const submitRes = await api.post(
        `exams/${examId}/submit/`,
        {
          attempt_id: attemptId,
          responses: responses,
        },
        {
          // Render free-tier can be slow/cold; avoid hanging forever.
          timeout: 120_000,
        }
      );
      
      console.log('Submit response:', submitRes.data);
      const resolvedAttemptId = submitRes.data?.attempt_id || attemptId;
      navigate(`/results/${resolvedAttemptId}`);
    } catch (error) {
      console.error('Submission failed:', error);
      console.error('Error details:', error.response?.data);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        'Failed to submit test.';
      toast.error(`Failed to submit test: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSubmissions = async () => {
    if (!attemptId) return;
    if (!uploadFiles || uploadFiles.length === 0) {
      toast.error('Please select at least one file to upload.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      uploadFiles.forEach((f) => formData.append('files', f));

      const res = await api.post(`attempts/${attemptId}/upload-submission/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });

      setUploaded(res?.data?.student_uploads || []);
      toast.success('Upload successful.');
    } catch (error) {
      console.error('Upload failed:', error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        'Failed to upload.';
      toast.error(`Upload failed: ${msg}`);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading test...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-bg">
      {/* Fixed Header */}
      <header className="glass border-b border-elevated/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {showFullscreenPrompt && (
            <div className="mb-3 p-3 rounded-xl bg-warning/10 border border-warning/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-warning">Anti-cheat enabled</div>
                  <div className="text-xs text-text-secondary">Enter fullscreen. Switching tabs or leaving fullscreen may auto-submit.</div>
                </div>
              </div>
              <button onClick={requestFullscreen} className="btn-secondary text-sm">Enter Fullscreen</button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <div>
                  <h1 className="font-bold text-text">{exam?.title || `Test ${examId}`}</h1>
                  <p className="text-xs text-text-secondary">
                    {(exam?.curriculum_name || '').trim() ? exam.curriculum_name : '—'}
                    {' • '}
                    {(exam?.topic_name || '').trim() ? exam.topic_name : '—'}
                    {' • '}
                    {(exam?.level || '').trim() ? exam.level : '—'} - Paper {exam?.paper_number ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                timeRemaining < 300 ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>

              {ANTI_CHEAT.enabled && attemptId ? (
                <div className="hidden sm:block text-xs text-text-secondary">
                  Strikes: <span className="font-semibold text-text">{cheatStrikes}</span>/{ANTI_CHEAT.maxStrikes}
                </div>
              ) : null}

              {/* Progress */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-surface">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold text-text">
                  {answeredCount} / {questions.length}
                </span>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Submitting...' : (isStructuredExam && phase !== 'upload' ? 'Finish & Upload' : 'Submit Test')}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 w-full h-2 bg-surface rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {submitConfirm && (
          <div className="card-elevated mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-text">
                You have <span className="font-semibold">{submitConfirm.unanswered}</span> unanswered question(s). Submit anyway?
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setSubmitConfirm(null)}
                  disabled={submitting}
                >
                  Review
                </button>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => {
                    setSubmitConfirm(null);
                    handleSubmit(false, true);
                  }}
                  disabled={submitting}
                >
                  Submit anyway
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            {phase === 'upload' ? (
              <div className="card-elevated">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-text">Upload your answers</h2>
                    <p className="text-text-secondary">
                      Upload your files for teacher evaluation. Supported: PDF, images, Word/Excel, CSV.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/10 border border-warning/20">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <span className="text-sm text-warning">Time left: {formatTime(timeRemaining)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                    className="input-mentara"
                  />

                  {uploadFiles.length > 0 && (
                    <div className="p-4 rounded-xl bg-surface/40 border border-elevated/50">
                      <div className="text-sm font-semibold text-text mb-2">Selected files</div>
                      <div className="space-y-1 text-sm text-text-secondary">
                        {uploadFiles.map((f) => (
                          <div key={f.name} className="truncate">{f.name}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(uploaded) && uploaded.length > 0 && (
                    <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                      <div className="text-sm font-semibold text-text mb-2">Uploaded</div>
                      <div className="space-y-1 text-sm text-text-secondary">
                        {uploaded.map((u, idx) => (
                          <a
                            key={`${u.path || ''}_${idx}`}
                            href={resolveMediaUrl(u.url || u.path)}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate hover:text-text transition-colors"
                            title={u.name || u.path}
                          >
                            {u.name || u.path}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setPhase('questions')}
                      className="btn-secondary"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back to questions
                    </button>

                    <button
                      onClick={handleUploadSubmissions}
                      disabled={uploading || uploadFiles.length === 0}
                      className="btn-secondary"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading…' : 'Upload files'}
                    </button>

                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      className="btn-primary"
                    >
                      {submitting ? 'Submitting…' : 'Submit for evaluation'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="card-elevated"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <span className="font-bold text-primary">{currentQuestionIndex + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <p className="text-sm font-semibold text-text">{currentQuestion.marks} marks</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        flagged.has(currentQuestion.id)
                          ? 'bg-warning/20 text-warning'
                          : 'bg-surface text-text-secondary hover:bg-surface/80'
                      }`}
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="mb-8">
                    <div className="prose prose-invert max-w-none">
                      <p className="text-lg text-text whitespace-pre-wrap">{currentQuestion.question_text}</p>
                    </div>
                    
                    {currentQuestion.image && (
                      <img 
                        src={resolveMediaUrl(currentQuestion.image)} 
                        alt="Question" 
                        className="mt-4 rounded-xl max-w-full"
                      />
                    )}
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3">
                    {currentQuestion.question_type === 'MCQ' && currentQuestion.choices && (
                      <>
                        {Object.entries(currentQuestion.choices).map(([key, value]) => (
                          <motion.div
                            key={key}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleAnswerSelect(currentQuestion.id, key)}
                            className={`choice-block ${
                              answers[currentQuestion.id] === key ? 'selected' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                answers[currentQuestion.id] === key
                                  ? 'border-bg bg-bg'
                                  : 'border-primary'
                              }`}>
                                {answers[currentQuestion.id] === key && (
                                  <CheckCircle className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span className="font-semibold mr-2">{key}.</span>
                                <span>{value}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}

                    {currentQuestion.question_type === 'STRUCTURED' && (
                      <div className="p-4 rounded-2xl bg-surface/40 border border-elevated/50">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                          <div>
                            <div className="font-semibold text-text">Structured question</div>
                            <div className="text-sm text-text-secondary mt-1">
                              Solve this on paper / offline. You will upload your final answers at the end.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-elevated">
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </button>

                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Right Sidebar - Question Navigator */}
          {!isStructuredExam && phase === 'questions' && (
          <div className="lg:col-span-1">
            <div className="card-elevated sticky top-24">
              <h3 className="font-bold text-text mb-4">Questions</h3>
              
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-full aspect-square rounded-lg text-sm font-semibold transition-all ${
                      index === currentQuestionIndex
                        ? 'bg-gradient-to-br from-primary to-accent text-bg'
                        : answers[q.id]
                        ? 'bg-accent/20 text-accent'
                        : flagged.has(q.id)
                        ? 'bg-warning/20 text-warning'
                        : 'bg-surface text-text-secondary hover:bg-elevated'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-accent/20"></div>
                  <span className="text-text-secondary">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-warning/20"></div>
                  <span className="text-text-secondary">Flagged</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-surface"></div>
                  <span className="text-text-secondary">Not answered</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestTaking;

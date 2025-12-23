import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  Clock, Flag, ChevronLeft, ChevronRight, CheckCircle, 
  AlertCircle, BookOpen, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    loadTest();
  }, [examId]);

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
      
      // Start the exam attempt - this returns questions too
      const startRes = await api.post(`exams/${examId}/start/`);
      console.log('✅ Start response received:', startRes.data);
      
      setAttemptId(startRes.data.attempt_id);
      
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
      
      // Calculate time remaining from expires_at
      const expiresAt = new Date(startRes.data.expires_at);
      const now = new Date();
      const secondsRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(secondsRemaining);
      
      // Get exam details
      const examRes = await api.get(`exams/${examId}/`);
      setExam(examRes.data);
    } catch (error) {
      console.error('❌ FAILED TO LOAD TEST');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error config:', error.config);
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Failed to load test';
      alert(`Failed to load test: ${errorMsg}\n\nPlease try again.`);
      navigate('/dashboard');
    } finally {
      setLoading(false);
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

  const handleSubmit = async (autoSubmit = false) => {
    if (submitting) return;
    if (!autoSubmit) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        if (!confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) {
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Format responses according to backend expectation
      const responses = questions.map(q => ({
        question_id: q.id,
        answer_payload: { answers: [answers[q.id]] },
        time_spent_seconds: 0
      }));
      
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
      alert(`Failed to submit test: ${msg}\n\nPlease try again.`);
    } finally {
      setSubmitting(false);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <div>
                  <h1 className="font-bold text-text">{exam.title}</h1>
                  <p className="text-xs text-text-secondary">{exam.level} - Paper {exam.paper_number}</p>
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
                {submitting ? 'Submitting...' : 'Submit Test'}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
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
                      src={currentQuestion.image} 
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
                    <div className="space-y-4">
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="input-mentara min-h-[200px] font-mono text-sm"
                        style={{ resize: 'vertical' }}
                      />
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Save className="w-4 h-4" />
                        <span>Auto-saving every 10 seconds</span>
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
          </div>

          {/* Right Sidebar - Question Navigator */}
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
        </div>
      </div>
    </div>
  );
};

export default TestTaking;

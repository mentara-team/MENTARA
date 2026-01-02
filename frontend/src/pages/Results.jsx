import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Award, TrendingUp, Clock, Target, Home, Download,
  CheckCircle, XCircle, Circle, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AppShell from '../components/layout/AppShell';
import StudentNav from '../components/layout/StudentNav';

const Results = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [needsGrading, setNeedsGrading] = useState(false);
  const [requiresTeacherGrading, setRequiresTeacherGrading] = useState(false);

  const API_BASE = (api?.defaults?.baseURL || '').replace(/\/+$/, '');
  const BACKEND_ORIGIN = API_BASE.replace(/\/?api\/?$/, '');
  const resolveMediaUrl = (maybeUrl) => {
    if (!maybeUrl) return null;
    if (typeof maybeUrl !== 'string') return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    if (maybeUrl.startsWith('/')) return `${BACKEND_ORIGIN}${maybeUrl}`;
    return `${BACKEND_ORIGIN}/${maybeUrl}`;
  };

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      // Get attempt details and review
      const [attemptRes, reviewRes] = await Promise.all([
        api.get(`attempts/${attemptId}/`),
        api.get(`attempts/${attemptId}/review/`)
      ]);
      
      // Calculate results
      const attempt = attemptRes.data;
      const review = reviewRes.data;

      const requiresTG = Boolean(review?.requires_teacher_grading ?? attempt?.requires_teacher_grading);
      const needsTG = Boolean(review?.needs_grading ?? attempt?.needs_grading);
      setRequiresTeacherGrading(requiresTG);
      setNeedsGrading(needsTG);
      
      const responses = Array.isArray(review.responses) ? review.responses : [];
      const totalQuestions = responses.length;

      // STRUCT answers are uploaded as files and are teacher-graded via marks.
      // They should NOT be counted as correct/incorrect/unanswered here.
      const isStructured = (r) => {
        const t = String(r?.question_type || r?.type || '').toUpperCase();
        return t.startsWith('STRUCT');
      };

      const gradableResponses = responses.filter((r) => !isStructured(r));
      const totalGradableQuestions = gradableResponses.length;
      const correctAnswers = gradableResponses.filter((r) => r.correct === true).length;
      const incorrectAnswers = gradableResponses.filter(
        (r) => r.correct === false && r.answer !== null && r.answer !== undefined
      ).length;
      const unanswered = totalGradableQuestions - correctAnswers - incorrectAnswers;

      // Use marks-based percentage from backend (works for both MCQ and teacher-graded STRUCT).
      const scorePercent = Number.isFinite(Number(review?.percentage))
        ? Math.round(Number(review.percentage))
        : (Number.isFinite(Number(attempt?.percentage))
          ? Math.round(Number(attempt.percentage))
          : (review?.total ? Math.round((Number(review?.score || 0) / Number(review.total)) * 100) : 0));
      
      setResult({
        score: scorePercent,
        exam_title: review.exam_title || attempt.exam?.title || 'Test',
        curriculum_name: review.curriculum_name || attempt.exam?.topic?.curriculum?.name || null,
        topic_name: review.topic_name || attempt.exam?.topic?.name || null,
        rank: review.rank ?? attempt.rank ?? null,
        percentile: review.percentile ?? attempt.percentile ?? null,
        grades_finalized: Boolean(review.grades_finalized),
        evaluated_pdf_url: review.evaluated_pdf_url || null,
        evaluated_pdf: review.evaluated_pdf || null,
        student_uploads: Array.isArray(review.student_uploads) ? review.student_uploads : [],
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered: unanswered,
        total_questions: totalQuestions,
        total_gradable_questions: totalGradableQuestions,
        time_taken: attempt.duration_seconds || 0,
        responses,
        total_score: review.score || 0,
        total_possible: review.total || 0
      });
      
    } catch (error) {
      console.error('Failed to load results:', error);
      const msg = error?.response?.data?.detail || error.message || 'Failed to load results';
      toast.error(msg);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell
        brandTitle="Mentara"
        brandSubtitle="Results"
        nav={<StudentNav active="dashboard" />}
      >
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <div className="spinner w-12 h-12 mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading results...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const scorePercent = result.score || 0;
  const isPassing = scorePercent >= 60;
  const getGrade = (score) => {
    if (score >= 90) return { grade: 'A+', color: 'text-accent' };
    if (score >= 80) return { grade: 'A', color: 'text-accent' };
    if (score >= 70) return { grade: 'B', color: 'text-primary' };
    if (score >= 60) return { grade: 'C', color: 'text-primary' };
    if (score >= 50) return { grade: 'D', color: 'text-warning' };
    return { grade: 'F', color: 'text-danger' };
  };

  const gradeInfo = getGrade(scorePercent);

  if (requiresTeacherGrading && needsGrading) {
    return (
      <AppShell
        brandTitle="Mentara"
        brandSubtitle="Results"
        nav={<StudentNav active="dashboard" />}
        right={(
          <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm">
            <Home className="w-4 h-4 mr-2" />
            Back
          </button>
        )}
        containerClassName="max-w-3xl"
        mainClassName="py-12"
      >
        <div className="card-elevated relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <div className="relative z-10 p-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">Submitted — waiting for teacher grading</span>
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Results will appear once graded</h2>
            <p className="text-text-secondary">
              Your answers were submitted successfully for <span className="font-semibold text-text">{result?.exam_title}</span>. A teacher will evaluate your
              structured answers and publish the final score.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/attempt/${attemptId}/review`)}
                className="btn-secondary w-full sm:w-auto"
              >
                Review Answers
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary w-full sm:w-auto"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const hasEvaluatedPdf = Boolean(result?.evaluated_pdf_url || result?.evaluated_pdf);
  const evaluatedPdfUrl = resolveMediaUrl(result?.evaluated_pdf_url || result?.evaluated_pdf);

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle="Test Results"
      nav={<StudentNav active="dashboard" />}
      right={(
        <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm">
          <Home className="w-4 h-4 mr-2" />
          Back
        </button>
      )}
      containerClassName="max-w-5xl"
      mainClassName="py-12"
    >
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated text-center mb-8 relative overflow-hidden"
        >
          {/* Background Decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5"></div>
          
          <div className="relative z-10 py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            >
              <div className="w-28 h-28 rounded-full bg-bg flex items-center justify-center">
                <div>
                  <div className={`text-4xl font-bold ${gradeInfo.color}`}>
                    {scorePercent}%
                  </div>
                  <div className="text-sm text-text-secondary mt-1">{gradeInfo.grade}</div>
                </div>
              </div>
            </motion.div>

            <h2 className="text-3xl font-bold text-text mb-2">
              {isPassing ? 'Great Job!' : 'Keep Practicing!'}
            </h2>
            <p className="text-text-secondary mb-6">
              {result.exam_title}
              {(result?.curriculum_name || result?.topic_name) ? (
                <span className="block mt-1 text-sm">
                  <span className="font-semibold text-text">{result.curriculum_name || '—'}</span>
                  <span className="mx-2">•</span>
                  <span className="font-semibold text-text">{result.topic_name || '—'}</span>
                </span>
              ) : null}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {result?.grades_finalized ? (
                <span className="px-4 py-2 rounded-full bg-accent/20 text-accent border border-accent/20 text-sm font-semibold">
                  Final grades published
                </span>
              ) : (
                <span className="px-4 py-2 rounded-full bg-surface border border-elevated text-sm font-semibold text-text-secondary">
                  Provisional
                </span>
              )}
              {Number.isFinite(Number(result?.rank)) ? (
                <span className="px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold">
                  Rank #{result.rank}
                </span>
              ) : (
                <span className="px-4 py-2 rounded-full bg-surface border border-elevated text-sm font-semibold text-text-secondary">
                  Rank —
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-8 mb-6">
              <div>
                <p className="text-sm text-text-secondary mb-1">Correct Answers</p>
                <p className="text-2xl font-bold text-accent">
                  {(result.total_gradable_questions || 0) > 0
                    ? `${result.correct_answers || 0} / ${result.total_gradable_questions || 0}`
                    : '—'}
                </p>
              </div>
              <div className="w-px h-12 bg-elevated"></div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Time Taken</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.floor((result.time_taken || 0) / 60)} min
                </p>
              </div>
            </div>

            {isPassing ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent/20 text-accent">
                <Award className="w-5 h-5" />
                <span className="font-semibold">Passed!</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-warning/20 text-warning">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">Keep Going!</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-elevated"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{result.correct_answers || 0}</p>
                <p className="text-sm text-text-secondary">Correct</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-elevated"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{result.incorrect_answers || 0}</p>
                <p className="text-sm text-text-secondary">Incorrect</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card-elevated"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                <Circle className="w-5 h-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{result.unanswered || 0}</p>
                <p className="text-sm text-text-secondary">Unanswered</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Teacher Feedback */}
        {(hasEvaluatedPdf || (Array.isArray(result?.student_uploads) && result.student_uploads.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card-elevated mb-8"
          >
            <h3 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Teacher Feedback & Files
            </h3>

            {Array.isArray(result?.student_uploads) && result.student_uploads.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm font-semibold text-text mb-2">Your submission</div>
                <div className="space-y-2">
                  {result.student_uploads.map((u, idx) => (
                    <a
                      key={`${u.path || ''}_${idx}`}
                      href={resolveMediaUrl(u.url || u.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3 rounded-xl bg-surface/40 border border-elevated/50 hover:bg-elevated transition-colors"
                    >
                      <div className="text-sm font-semibold text-text truncate">{u.name || u.path}</div>
                      {u.uploaded_at && <div className="text-xs text-text-secondary">{u.uploaded_at}</div>}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {hasEvaluatedPdf ? (
              <div className="pt-4 border-t border-elevated">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-text">Evaluated paper</div>
                    <div className="text-xs text-text-secondary truncate">{result?.evaluated_pdf || ''}</div>
                  </div>
                  <a
                    href={evaluatedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary inline-flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Open / Download
                  </a>
                </div>

                <div className="rounded-xl overflow-hidden border border-elevated/50 bg-surface">
                  <iframe
                    title="Evaluated PDF"
                    src={evaluatedPdfUrl}
                    className="w-full h-[520px]"
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-text-secondary">
                Evaluated paper not uploaded.
              </div>
            )}
          </motion.div>
        )}

        {/* Question Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card-elevated"
        >
          <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Answer Review
          </h3>

          <div className="space-y-4">
            {(Array.isArray(result?.responses) ? result.responses : []).map((r, index) => {
              const qType = String(r?.question_type || '').toUpperCase();
              const isStruct = qType.startsWith('STRUCT');
              const correct = r?.correct;
              const statusLabel = isStruct ? 'Teacher graded' : (correct === true ? 'Correct' : (correct === false ? 'Incorrect' : '—'));
              const statusTone = isStruct ? 'bg-primary/10 text-primary border-primary/20'
                : (correct === true ? 'bg-accent/20 text-accent border-accent/20'
                  : (correct === false ? 'bg-danger/20 text-danger border-danger/20' : 'bg-surface text-text-secondary border-elevated'));

              const marksObtained = Number.isFinite(Number(r?.marks_obtained)) ? Number(r.marks_obtained) : null;
              const totalMarks = Number.isFinite(Number(r?.total_marks)) ? Number(r.total_marks) : null;
              const answerText = isStruct
                ? ((Array.isArray(result?.student_uploads) && result.student_uploads.length > 0)
                  ? 'Uploaded submission available (see Teacher Feedback & Files).'
                  : '—')
                : (r?.answer === null || r?.answer === undefined ? '—' : JSON.stringify(r.answer));

              return (
                <div key={r?.response_id || r?.question_id || index} className="p-4 rounded-xl bg-surface">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        correct === true ? 'bg-accent/20' : (correct === false ? 'bg-danger/20' : 'bg-primary/10')
                      }`}>
                        {correct === true ? (
                          <CheckCircle className="w-5 h-5 text-accent" />
                        ) : correct === false ? (
                          <XCircle className="w-5 h-5 text-danger" />
                        ) : (
                          <Circle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-text">Question {index + 1}</p>
                        <p className="text-sm text-text-secondary">
                          {marksObtained !== null && totalMarks !== null ? `${marksObtained} / ${totalMarks} marks` : (totalMarks !== null ? `${totalMarks} marks` : '—')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusTone}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <p className="text-text mb-3 whitespace-pre-wrap">{r?.statement || '—'}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-text-secondary mb-1">Your Answer:</p>
                      <p className="font-semibold text-text whitespace-pre-wrap break-words">
                        {answerText}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-1">Teacher remarks:</p>
                      <p className="font-semibold text-text whitespace-pre-wrap break-words">
                        {r?.remarks ? r.remarks : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-4 mt-8"
        >
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <button className="btn-primary">
            <TrendingUp className="w-4 h-4 mr-2" />
            Take Another Test
          </button>
        </motion.div>
    </AppShell>
  );
};

export default Results;

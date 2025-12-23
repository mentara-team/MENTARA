import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [evaluation, setEvaluation] = useState(null);

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
      
      const totalQuestions = review.responses?.length || 0;
      const correctAnswers = review.responses?.filter(r => r.correct).length || 0;
      const incorrectAnswers = review.responses?.filter(r => !r.correct && r.answer).length || 0;
      const unanswered = totalQuestions - correctAnswers - incorrectAnswers;
      const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      setResult({
        score: scorePercent,
        exam_title: review.exam_title || attempt.exam?.title || 'Test',
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered: unanswered,
        total_questions: totalQuestions,
        time_taken: attempt.duration_seconds || 0,
        responses: review.responses || [],
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
            </p>

            <div className="flex items-center justify-center gap-8 mb-6">
              <div>
                <p className="text-sm text-text-secondary mb-1">Correct Answers</p>
                <p className="text-2xl font-bold text-accent">
                  {result.correct_answers || 0} / {result.total_questions || 0}
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

        {/* Teacher Feedback (if evaluated) */}
        {evaluation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card-elevated mb-8"
          >
            <h3 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Teacher Feedback
            </h3>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-text-secondary whitespace-pre-wrap">
                {evaluation.teacher_comments || 'No feedback provided yet.'}
              </p>
            </div>

            {evaluation.evaluated_answer_file && (
              <div className="mt-4 pt-4 border-t border-elevated">
                <a
                  href={evaluation.evaluated_answer_file}
                  download
                  className="btn-secondary inline-flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Evaluated Paper
                </a>
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
            {result.answers && result.answers.map((answer, index) => (
              <div key={index} className="p-4 rounded-xl bg-surface">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      answer.is_correct ? 'bg-accent/20' : 'bg-danger/20'
                    }`}>
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-accent" />
                      ) : (
                        <XCircle className="w-5 h-5 text-danger" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-text">Question {index + 1}</p>
                      <p className="text-sm text-text-secondary">{answer.marks} marks</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    answer.is_correct ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'
                  }`}>
                    {answer.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <p className="text-text mb-3">{answer.question_text}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-text-secondary mb-1">Your Answer:</p>
                    <p className={`font-semibold ${answer.is_correct ? 'text-accent' : 'text-danger'}`}>
                      {answer.user_answer || 'Not answered'}
                    </p>
                  </div>
                  {!answer.is_correct && answer.correct_answer && (
                    <div>
                      <p className="text-text-secondary mb-1">Correct Answer:</p>
                      <p className="font-semibold text-accent">{answer.correct_answer}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
